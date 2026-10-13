#!/usr/bin/env python3
"""White Witch cattery - for-sale listing change monitor.

Polls https://whitewitch.cz/en/for-sale/ (configurable) and sends one e-mail
per cat whenever a cat is added, removed, or any of its details change.

Usage:
    python monitor.py               run continuously (Ctrl+C to stop)
    python monitor.py --once        run one scan now, send notifications, exit
    python monitor.py --show        fetch + parse and print what was found
                                    (no e-mails, state untouched)
    python monitor.py --test-email  send a test notification and exit

While the monitor is running, creating a file named SCAN_NOW next to this
script triggers an immediate scan.
"""

import argparse
import difflib
import hashlib
import json
import logging
import os
import re
import smtplib
import ssl
import sys
import time
import unicodedata
from datetime import datetime
from email.message import EmailMessage
from html import escape
from logging.handlers import RotatingFileHandler
from pathlib import Path
from urllib import robotparser
from urllib.parse import parse_qsl, urlencode, urljoin, urlsplit, urlunsplit

import requests
from bs4 import BeautifulSoup, NavigableString, Tag
from dotenv import load_dotenv
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_URL = "https://whitewitch.cz/en/for-sale/"
DEFAULT_UA = "WhiteWitchListingMonitor/1.0 (personal kitten-availability alert; 1 request/min)"
SUBJECT_PREFIX = "[White Witch]"

log = logging.getLogger("monitor")


class ScanError(Exception):
    """A scan could not be completed reliably. Never treated as 'cats removed'."""


class MailError(Exception):
    pass


# --------------------------------------------------------------------------
# Configuration
# --------------------------------------------------------------------------

def _int(env, name, default):
    try:
        return int(str(env.get(name, "")).strip() or default)
    except ValueError:
        return default


class Config:
    def __init__(self, env=None):
        env = os.environ if env is None else env
        self.url = env.get("TARGET_URL", "").strip() or DEFAULT_URL
        self.interval = max(10, _int(env, "CHECK_INTERVAL_SECONDS", 60))
        self.detail_refresh = max(60, _int(env, "DETAIL_REFRESH_SECONDS", 300))
        self.max_detail_refresh = max(1, _int(env, "MAX_DETAIL_REFRESH_PER_SCAN", 3))
        self.removal_confirmations = max(1, _int(env, "REMOVAL_CONFIRMATIONS", 2))
        self.alert_after_failures = max(1, _int(env, "ALERT_AFTER_FAILURES", 10))
        self.timeout = max(5, _int(env, "HTTP_TIMEOUT_SECONDS", 20))
        self.state_file = Path(env.get("STATE_FILE", "").strip() or BASE_DIR / "state.json")
        self.content_selector = env.get("CONTENT_SELECTOR", "").strip()
        self.cat_link_pattern = env.get("CAT_LINK_PATTERN", "").strip()
        self.user_agent = env.get("USER_AGENT", "").strip() or DEFAULT_UA
        self.smtp_host = env.get("SMTP_HOST", "").strip()
        self.smtp_port = _int(env, "SMTP_PORT", 587)
        self.smtp_security = (env.get("SMTP_SECURITY", "").strip() or "starttls").lower()
        self.smtp_user = env.get("SMTP_USER", "").strip()
        self.smtp_password = env.get("SMTP_PASSWORD", "")
        self.email_from = env.get("EMAIL_FROM", "").strip() or self.smtp_user
        self.email_to = [a.strip() for a in env.get("EMAIL_TO", "").split(",") if a.strip()]


# --------------------------------------------------------------------------
# Normalisation helpers
# --------------------------------------------------------------------------

TRACKING_PARAM = re.compile(
    r"^(utm_\w+|fbclid|gclid|dclid|gbraid|wbraid|msclkid|mc_cid|mc_eid|_ga|_gl|igshid|yclid|ref|ver)$", re.I)
IMG_SIZE_SUFFIX = re.compile(r"(-\d{2,5}x\d{2,5}|-scaled|-e\d{10,})(?=\.[a-z0-9]{3,4}$)", re.I)
IMG_EXT = re.compile(r"\.(jpe?g|png|gif|webp|avif|bmp|tiff?)$", re.I)
FILE_EXT = re.compile(r"\.(jpe?g|png|gif|webp|avif|bmp|tiff?|svg|pdf|zip|docx?|xlsx?|mp4|mov|mp3)$", re.I)
NON_CAT_PATH = re.compile(
    r"/(wp-content|wp-admin|wp-json|wp-login|feed|tag|category|author|page/\d+|cart|checkout|my-account)(/|$)", re.I)
LANG_ROOT = re.compile(r"^/([a-z]{2}(-[a-z]{2})?/?)?$", re.I)
ICON_IMG = re.compile(r"(logo|icon|favicon|emoji|gravatar|placeholder|spinner|loader|flag|blank\.gif)", re.I)


def clean_text(text):
    """Collapse whitespace, keep line structure, drop empty lines."""
    text = unicodedata.normalize("NFC", text or "").replace("\xa0", " ").replace("​", "")
    lines = (" ".join(line.split()) for line in text.splitlines())
    return "\n".join(line for line in lines if line)


def one_line(text):
    return " ".join(clean_text(text).split())


def strip_accents(text):
    return "".join(c for c in unicodedata.normalize("NFKD", text) if not unicodedata.combining(c))


def slugify(text):
    slug = re.sub(r"[^a-z0-9]+", "-", strip_accents(text).lower()).strip("-")
    return slug or "item"


def norm_url(url, base=None, keep_fragment=False):
    """Absolute URL with tracking parameters removed."""
    url = urljoin(base, url.strip()) if base else url.strip()
    p = urlsplit(url)
    query = [(k, v) for k, v in parse_qsl(p.query, keep_blank_values=True) if not TRACKING_PARAM.match(k)]
    return urlunsplit(((p.scheme or "https").lower(), p.netloc.lower(), p.path or "/",
                       urlencode(query), p.fragment if keep_fragment else ""))


def url_key(url):
    """Identity key: ignores scheme, 'www.', trailing slash and tracking params."""
    p = urlsplit(norm_url(url, keep_fragment=True))
    host = p.netloc[4:] if p.netloc.startswith("www.") else p.netloc
    return urlunsplit(("https", host, p.path.rstrip("/") or "/", p.query, p.fragment))


def host_of(url):
    host = urlsplit(url).netloc.lower()
    return host[4:] if host.startswith("www.") else host


def norm_image(url, base):
    """Canonical image URL: ignores WordPress size variants (-300x200), query strings, www."""
    url = urljoin(base, url.strip())
    p = urlsplit(url)
    if p.scheme not in ("http", "https"):
        return None
    path = IMG_SIZE_SUFFIX.sub("", p.path)
    host = p.netloc.lower()
    host = host[4:] if host.startswith("www.") else host
    return urlunsplit((p.scheme, host, path, "", ""))


# --------------------------------------------------------------------------
# HTML parsing (all site-specific assumptions live in this section)
# --------------------------------------------------------------------------

CONTENT_CANDIDATES = ["main", "[role=main]", "#main", "#primary", "#content", ".site-content", ".content", "body"]
ALWAYS_NOISE_TAGS = {"script", "style", "noscript", "template", "svg", "nav", "form", "iframe",
                     "button", "select", "input", "textarea", "link", "meta", "object", "embed"}
NOISE_CLASS = re.compile(
    r"(^|[-_])(menu|nav|navbar|navigation|breadcrumbs?|sidebar|cookies?|cookie-notice|gdpr|share|sharing|"
    r"social|wpml|pll|language|languages|lang|comments?|site-header|site-footer|masthead|colophon|"
    r"skip-link|screen-reader-text|pagination|post-navigation|related|location-header|location-footer)([-_]|$)",
    re.I)
HEADING_TAGS = ["h2", "h3", "h4", "h5"]
BLOCK_TAGS = {"p", "div", "li", "ul", "ol", "tr", "table", "tbody", "thead", "section", "article", "aside",
              "header", "footer", "main", "figure", "figcaption", "blockquote", "dl", "dd", "dt",
              "h1", "h2", "h3", "h4", "h5", "h6", "pre", "address"}

# Canonical field names and the labels (EN + CZ, accents stripped) that map to them.
FIELD_LABELS = {
    "born": ["date of birth", "born", "birth date", "birthdate", "dob", "d o b", "birthday", "narozen",
             "narozena", "narozeni", "narozeno", "datum narozeni", "date of birth/born"],
    "age": ["age", "vek", "stari"],
    "sex": ["sex", "gender", "pohlavi"],
    "color": ["color", "colour", "colors", "colours", "barva", "zbarveni", "ems", "ems code", "ems kod",
              "coloring", "colouring"],
    "breed": ["breed", "plemeno"],
    "price": ["price", "cena", "prize"],
    "status": ["status", "availability", "available", "dostupnost", "stav", "k dispozici"],
    "sire": ["father", "sire", "otec", "tata"],
    "dam": ["mother", "dam", "matka", "mama"],
    "litter": ["litter", "vrh"],
}
LABEL_TO_FIELD = {label: field for field, labels in FIELD_LABELS.items() for label in labels}
RESERVED_KEYS = {"name", "section", "photos", "listing_text", "description", "detail_title"}
FIELD_TITLES = {
    "name": "Name", "section": "Section / litter", "born": "Date of birth", "age": "Age", "sex": "Sex",
    "color": "Color", "breed": "Breed", "price": "Price", "status": "Availability / status",
    "sire": "Father", "dam": "Mother", "litter": "Litter", "photos": "Photographs",
    "listing_text": "Text on the for-sale page", "description": "Description (detail page)",
    "detail_title": "Detail page title",
}
STATUS_WORDS = [
    ("sold", re.compile(r"\b(sold|prodan[aoy]?|prodano)\b")),
    ("reserved", re.compile(r"\b(reserved|reservation|booked|on hold|rezervovan[aoy]?|rezervace|zamluven[aoy]?)\b")),
    ("available", re.compile(r"\b(available|volna|volny|volne|k dispozici)\b")),
]
MALE = re.compile(r"(\b(male|tomcat|boy|kocour|kocourek)\b|♂)")
FEMALE = re.compile(r"(\b(female|queen|girl|kocka|kocicka|kocicky)\b|♀)")
PRICE = re.compile(r"((?:€|eur|czk)\s*\d[\d\s.,]*\d|\d[\d\s.,]*\d\s*(?:,-\s*)?(?:kč|kc|czk|eur|€|euro))", re.I)
DATE = re.compile(r"\b(\d{1,2}\.\s?\d{1,2}\.\s?\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}/\d{1,2}/\d{4})\b")
LABEL_LINE = re.compile(r"^([^:\n]{2,30}?)\s*:\s*(.*)$")


def _is_noise(el):
    if el.name in ALWAYS_NOISE_TAGS:
        return True
    if el.name in ("header", "footer") and not el.find_parent("article") and not el.find(["main", "article"]):
        return True
    tokens = list(el.get("class") or [])
    if el.get("id"):
        tokens.append(el["id"])
    if el.get("role") in ("navigation", "banner", "contentinfo", "search"):
        return True
    return any(NOISE_CLASS.search(t) for t in tokens)


def _protected(el, root_len):
    """Never strip a wrapper that obviously holds the page content (e.g. class 'has-sidebar')."""
    if el.name in ALWAYS_NOISE_TAGS:
        return False
    if el.find(["main", "article"]):
        return True
    return el.find(HEADING_TAGS) is not None and len(el.get_text()) >= 0.5 * root_len


def content_root(soup, selector=""):
    """Return the main content element with menus/footers/etc. removed and line breaks marked."""
    root = None
    if selector:
        root = soup.select_one(selector)
        if root is None:
            raise ScanError(f"CONTENT_SELECTOR {selector!r} matched nothing - page layout changed?")
    else:
        for sel in CONTENT_CANDIDATES:
            root = soup.select_one(sel)
            if root is not None and root.get_text(strip=True):
                break
    if root is None:
        raise ScanError("page has no <body>")
    for comment in root.find_all(string=lambda s: type(s) is not NavigableString):
        comment.extract()
    root_len = len(root.get_text())
    for el in list(root.find_all(True)):
        if getattr(el, "decomposed", False) or el.parent is None:
            continue
        if _is_noise(el) and not _protected(el, root_len):
            el.decompose()
    _mark_line_breaks(root)
    return root


def _mark_line_breaks(root):
    for br in root.find_all("br"):
        br.replace_with("\n")
    for tr in root.find_all("tr"):
        cells = tr.find_all(["td", "th"], recursive=False)
        for i, cell in enumerate(cells[:-1]):
            cell.insert_after(": " if len(cells) == 2 and i == 0 else " | ")
    for dt in root.find_all("dt"):
        dt.insert_after(": ")
    for el in root.find_all(BLOCK_TAGS):
        if el.name == "dt":
            el.insert_before("\n")
            continue
        el.insert_before("\n")
        el.insert_after("\n")


def _style_images(el):
    out = []
    for node in [el] + el.find_all(style=True):
        for m in re.finditer(r"url\(['\"]?([^'\")]+)['\"]?\)", node.get("style", "") or ""):
            out.append(m.group(1))
    return out


def images_in(elements, base):
    """Canonical image URLs inside the given elements, de-duplicated, in page order."""
    found = []
    for el in elements:
        if not isinstance(el, Tag):
            continue
        imgs = [el] if el.name == "img" else el.find_all("img")
        for img in imgs:
            src = img.get("data-src") or img.get("data-lazy-src") or img.get("data-orig-file") or img.get("src")
            if (not src or src.startswith("data:")) and img.get("srcset"):
                src = img["srcset"].split(",")[0].split()[0]
            if src and not src.startswith("data:"):
                found.append(src)
        anchors = [el] if el.name == "a" else el.find_all("a")
        found += [a["href"] for a in anchors if a.get("href") and IMG_EXT.search(urlsplit(a["href"]).path)]
        found += _style_images(el)
    out = []
    for src in found:
        img = norm_image(src, base)
        if img and IMG_EXT.search(img) and not ICON_IMG.search(img) and img not in out:
            out.append(img)
    return out


def text_of(elements):
    return clean_text("".join(el.get_text() if isinstance(el, Tag) else str(el) for el in elements))


def is_cat_link(href, page_url, pattern=""):
    """Could this href point at an individual cat/kitten/litter page?"""
    if not href or href.startswith(("#", "mailto:", "tel:", "javascript:", "data:")):
        return False
    url = norm_url(href, page_url)
    p = urlsplit(url)
    if p.scheme not in ("http", "https") or host_of(url) != host_of(page_url):
        return False
    if pattern:
        return re.search(pattern, url) is not None
    if url_key(url) == url_key(page_url) or LANG_ROOT.match(p.path):
        return False
    if FILE_EXT.search(p.path) or NON_CAT_PATH.search(p.path):
        return False
    if any(k.lower() in ("lang", "replytocom", "add-to-cart", "s") for k, _ in parse_qsl(p.query)):
        return False
    return True


def extract_fields(text):
    """Pull 'Label: value' pairs and well-known facts (sex, price, status, date) out of text."""
    fields = {}
    lines = text.splitlines()

    def add(key, value):
        value = one_line(value)
        if not value:
            return
        if key in fields and value not in fields[key].split(" | "):
            fields[key] += " | " + value
        else:
            fields.setdefault(key, value)

    for i, line in enumerate(lines):
        m = LABEL_LINE.match(line)
        if not m or re.search(r"\d|https?|www\.", m.group(1)):
            continue
        label = re.sub(r"[^a-z ]+", " ", strip_accents(m.group(1)).lower())
        label = " ".join(label.split())
        if not label:
            continue
        value = m.group(2).strip()
        if not value and i + 1 < len(lines) and not LABEL_LINE.match(lines[i + 1]):
            value = lines[i + 1]
        key = LABEL_TO_FIELD.get(label, label)
        if key in RESERVED_KEYS:
            key = "info " + key
        add(key, value[:300])

    plain = strip_accents(text).lower()
    if "status" not in fields:
        words = [word for word, rx in STATUS_WORDS if rx.search(plain)]
        if words:
            fields["status"] = ", ".join(words)
    if "sex" not in fields:
        sexes = [s for s, rx in (("male", MALE), ("female", FEMALE)) if rx.search(plain)]
        if sexes:
            fields["sex"] = ", ".join(sexes)
    if "price" not in fields:
        prices = list(dict.fromkeys(one_line(m.group(1)) for m in PRICE.finditer(text)))
        if prices:
            fields["price"] = " | ".join(prices)
    if "born" not in fields:
        dates = list(dict.fromkeys(m.group(1).replace(" ", "") for m in DATE.finditer(text)))
        if dates:
            fields["born"] = " | ".join(dates)
    return fields


def _boundary_headings(root):
    """Pick the heading level used for individual cats (the most common one, ties -> deeper)."""
    heads = [h for h in root.find_all(HEADING_TAGS) if one_line(h.get_text())]
    if not heads:
        return None, []
    counts = {}
    for h in heads:
        counts[h.name] = counts.get(h.name, 0) + 1
    level = max(counts, key=lambda n: (counts[n], int(n[1])))
    return int(level[1]), heads


PAGE_CONTAINER = re.compile(r"^(entry-content|page-content|post-content|site-main|content-area|wp-site-blocks|"
                            r"elementor|elementor-section-wrap|elementor-location-single|hentry|type-page)$")


def _is_page_container(el):
    """Wrappers that hold the whole page body - a single cat's card never extends past these."""
    return el.name in ("main", "article", "body", "html") or el.get("id") in ("content", "main", "primary") \
        or any(PAGE_CONTAINER.match(c) for c in el.get("class") or [])


def _count_in(el, items):
    return sum(1 for x in items if x is el or el in x.parents)


def parse_listing(html, page_url, content_selector="", link_pattern=""):
    """Split the for-sale page into one entry per cat.

    Strategy (first that applies):
      1. Headings: every heading at the most common level (h2-h5) starts a cat.
      2. Links: every distinct internal link to a sub-page is a cat.
      3. Whole page: the entire content area is one entry (any change is reported).
    """
    soup = BeautifulSoup(html, "html.parser")
    root = content_root(soup, content_selector)
    if not text_of([root]) and not images_in([root], page_url):
        if len(soup.find_all("script")) > 3:
            raise ScanError("content area is empty - the page may require JavaScript rendering")
        raise ScanError("content area is empty")

    blocks = []
    level, heads = _boundary_headings(root)
    if level:
        bounds = [h for h in heads if int(h.name[1]) <= level]
        for h in (h for h in heads if int(h.name[1]) == level):
            el = h
            while el.parent is not None and el.parent is not root and not _is_page_container(el.parent) \
                    and _count_in(el.parent, bounds) == 1:
                el = el.parent
            parts = [el]
            for sib in el.next_siblings:
                if isinstance(sib, Tag) and _count_in(sib, bounds):
                    break
                parts.append(sib)
            section = None
            for prev in h.find_all_previous(HEADING_TAGS):
                if int(prev.name[1]) < level and root in prev.parents:
                    section = one_line(prev.get_text())
                    break
            anchor = h.find("a", href=True) or h.find_parent("a", href=True)
            blocks.append({"name": one_line(h.get_text()), "parts": parts, "section": section,
                           "anchor_id": h.get("id"),
                           "heading_link": anchor.get("href") if anchor else None})
    else:
        links = [a for a in root.find_all("a", href=True) if is_cat_link(a["href"], page_url, link_pattern)]
        keys = list(dict.fromkeys(url_key(norm_url(a["href"], page_url)) for a in links))
        for key in keys:
            anchors = [a for a in links if url_key(norm_url(a["href"], page_url)) == key]
            el = anchors[0]
            while el.parent is not None and el.parent is not root and not _is_page_container(el.parent) and len(
                    {url_key(norm_url(a["href"], page_url)) for a in el.parent.find_all("a", href=True)
                     if is_cat_link(a["href"], page_url, link_pattern)}) == 1:
                el = el.parent
            name = next((one_line(a.get_text()) for a in anchors if one_line(a.get_text())), "")
            if not name:
                img = el.find("img") if el.name != "img" else el
                name = (img.get("alt") or img.get("title") or "").strip() if img else ""
            if not name:
                name = slugify(urlsplit(key).path.rstrip("/").split("/")[-1]).replace("-", " ").title()
            blocks.append({"name": name, "parts": [el], "section": None, "anchor_id": None,
                           "heading_link": anchors[0]["href"]})
        if not blocks:
            blocks.append({"name": one_line(soup.title.get_text()) if soup.title else "For-sale page",
                           "parts": [root], "section": None, "anchor_id": None, "heading_link": None,
                           "whole_page": True})

    # Links shared by several blocks (e.g. "contact us" in every card) are not cat-specific.
    for b in blocks:
        tags = [p for p in b["parts"] if isinstance(p, Tag)]
        b["links"] = []
        for p in tags:
            for a in ([p] if p.name == "a" else []) + p.find_all("a", href=True):
                if a.get("href") and is_cat_link(a["href"], page_url, link_pattern):
                    b["links"].append(norm_url(a["href"], page_url))
        if b["heading_link"] and is_cat_link(b["heading_link"], page_url, link_pattern):
            b["links"].insert(0, norm_url(b["heading_link"], page_url))
    usage = {}
    for b in blocks:
        for key in {url_key(u) for u in b["links"]}:
            usage[key] = usage.get(key, 0) + 1

    entries, used_ids = [], set()
    for b in blocks:
        link = next((u for u in b["links"] if usage[url_key(u)] == 1 or len(blocks) == 1), None)
        text = text_of(b["parts"])
        if link:
            cat_id = url_key(link)
            url = link
        else:
            # No individual page: identify by name, link to the heading's anchor if it has one.
            cat_id = url_key(page_url) + ("" if b.get("whole_page") else "#" + slugify(b["name"]))
            url = norm_url(page_url) + ("#" + b["anchor_id"] if b.get("anchor_id") else "")
        base_id, n = cat_id, 2
        while cat_id in used_ids:
            cat_id, n = f"{base_id}-{n}", n + 1
        used_ids.add(cat_id)
        listing = {"name": b["name"], "section": b["section"], "text": text,
                   "images": images_in(b["parts"], page_url), "fields": extract_fields(text)}
        entries.append({"id": cat_id, "url": url, "has_detail_page": bool(link), "listing": listing})
    return entries


def parse_detail(html, page_url, content_selector=""):
    """Extract the useful parts of an individual cat page."""
    soup = BeautifulSoup(html, "html.parser")
    h1 = soup.find("h1")
    title = one_line(h1.get_text()) if h1 else ""
    root = content_root(soup, content_selector)
    text = text_of([root])
    if not text:
        raise ScanError("detail page content is empty")
    return {"title": title, "text": text, "images": images_in([root], page_url), "fields": extract_fields(text)}


def build_view(listing, detail):
    """Merge listing + detail data into the flat dict that is compared between scans."""
    detail = detail or {}
    view = {"name": listing["name"] or detail.get("title") or "(unnamed)"}
    if listing.get("section"):
        view["section"] = listing["section"]
    lf, df = listing.get("fields", {}), detail.get("fields", {})
    for key in sorted(set(lf) | set(df)):
        view[key] = lf.get(key) or df.get(key)  # the for-sale page is fresher, so it wins
    view["photos"] = sorted(set(listing.get("images", [])) | set(detail.get("images", [])))
    view["listing_text"] = listing.get("text", "")
    if detail.get("text"):
        view["description"] = detail["text"]
    if detail.get("title"):
        view["detail_title"] = detail["title"]
    return view


def view_hash(view):
    return hashlib.sha256(json.dumps(view, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


# --------------------------------------------------------------------------
# HTTP
# --------------------------------------------------------------------------

class Fetcher:
    """Persistent HTTP session with retries, robots.txt and conditional GETs."""

    ROBOTS_TTL = 6 * 3600

    def __init__(self, cfg):
        self.cfg = cfg
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": cfg.user_agent,
            "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
            "Accept-Language": "en,cs;q=0.8",
        })
        retry = Retry(total=2, connect=2, read=2, backoff_factor=1.5,
                      status_forcelist=(500, 502, 503, 504), allowed_methods=("GET",))
        adapter = HTTPAdapter(max_retries=retry)
        self.session.mount("https://", adapter)
        self.session.mount("http://", adapter)
        self.cache = {}  # url -> (etag, last_modified, text)
        self.robots = {}  # origin -> (fetched_at, parser or None)

    def allowed(self, url):
        p = urlsplit(url)
        origin = f"{p.scheme}://{p.netloc}"
        cached = self.robots.get(origin)
        if not cached or time.time() - cached[0] > self.ROBOTS_TTL:
            parser = cached[1] if cached else None
            try:
                r = self.session.get(origin + "/robots.txt", timeout=self.cfg.timeout)
                if r.status_code == 200:
                    parser = robotparser.RobotFileParser()
                    parser.parse(r.text.splitlines())
                elif 400 <= r.status_code < 500:
                    parser = None  # no robots.txt -> everything allowed
                self.robots[origin] = (time.time(), parser)
            except requests.RequestException as exc:
                log.debug("robots.txt unavailable (%s); keeping previous rules", exc)
                self.robots[origin] = (time.time() - self.ROBOTS_TTL + 300, parser)
        parser = self.robots[origin][1]
        return parser is None or parser.can_fetch(self.cfg.user_agent, url)

    def get(self, url):
        if not self.allowed(url):
            raise ScanError(f"robots.txt disallows {url} - not fetching")
        headers = {}
        cached = self.cache.get(url)
        if cached:
            if cached[0]:
                headers["If-None-Match"] = cached[0]
            if cached[1]:
                headers["If-Modified-Since"] = cached[1]
        try:
            r = self.session.get(url, timeout=self.cfg.timeout, headers=headers)
        except requests.RequestException as exc:
            raise ScanError(f"network error for {url}: {exc.__class__.__name__}: {exc}") from exc
        if r.status_code == 304 and cached:
            return cached[2]
        if r.status_code != 200:
            raise ScanError(f"HTTP {r.status_code} for {url}")
        ctype = r.headers.get("Content-Type", "")
        if "html" not in ctype.lower():
            raise ScanError(f"unexpected content type {ctype!r} for {url}")
        if "charset" not in ctype.lower():
            r.encoding = "utf-8"
        text = r.text
        low = text[-5000:].lower()
        if len(text) < 300 or ("</html>" not in low and "</body>" not in low):
            raise ScanError(f"incomplete/truncated page for {url} ({len(text)} chars)")
        self.cache[url] = (r.headers.get("ETag"), r.headers.get("Last-Modified"), text)
        return text


# --------------------------------------------------------------------------
# E-mail
# --------------------------------------------------------------------------

class Mailer:
    def __init__(self, cfg):
        self.cfg = cfg

    def configured(self):
        return bool(self.cfg.smtp_host and self.cfg.email_to and self.cfg.email_from)

    def send(self, subject, text, html=None):
        cfg = self.cfg
        if not self.configured():
            raise MailError("e-mail is not configured (set SMTP_HOST, EMAIL_FROM/SMTP_USER and EMAIL_TO in .env)")
        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = cfg.email_from
        msg["To"] = ", ".join(cfg.email_to)
        msg.set_content(text)
        if html:
            msg.add_alternative(html, subtype="html")
        try:
            context = ssl.create_default_context()
            if cfg.smtp_security == "ssl":
                server = smtplib.SMTP_SSL(cfg.smtp_host, cfg.smtp_port, timeout=30, context=context)
            else:
                server = smtplib.SMTP(cfg.smtp_host, cfg.smtp_port, timeout=30)
            with server:
                if cfg.smtp_security == "starttls":
                    server.starttls(context=context)
                if cfg.smtp_user:
                    server.login(cfg.smtp_user, cfg.smtp_password)
                server.send_message(msg)
        except (smtplib.SMTPException, OSError) as exc:
            raise MailError(f"{exc.__class__.__name__}: {exc}") from exc


# --------------------------------------------------------------------------
# Notifications
# --------------------------------------------------------------------------

PRIORITY = {"new": 0, "changed": 1, "removed": 2, "test": 0, "problem": 1, "recovered": 1}
TEXT_FIELDS = {"listing_text", "description"}


def _now_str():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def _title(key):
    return FIELD_TITLES.get(key, key[:1].upper() + key[1:])


def _details_lines(view):
    lines = []
    for key, value in view.items():
        if key in ("name", "photos") or key in TEXT_FIELDS or not value:
            continue
        lines.append(f"  {_title(key)}: {value}")
    return lines


def _describe_change(key, old, new):
    if key == "photos":
        old, new = old or [], new or []
        added = [u for u in new if u not in old]
        removed = [u for u in old if u not in new]
        out = [f"- {_title(key)}: {len(old)} before, {len(new)} now"]
        out += [f"    Added:   {u}" for u in added] + [f"    Removed: {u}" for u in removed]
        return out
    old_s, new_s = str(old or "(none)"), str(new or "(none)")
    if key in TEXT_FIELDS or len(old_s) > 200 or len(new_s) > 200:
        out = [f"- {_title(key)} (changed lines; '-' = previous, '+' = new):"]
        for line in difflib.ndiff(old_s.splitlines(), new_s.splitlines()):
            if line[:1] in "-+":
                out.append("    " + line)
        return out[:80]
    return [f"- {_title(key)}", f"    Previous: {old_s}", f"    New:      {new_s}"]


def _to_html(text, photos=()):
    body = escape(text)
    body = re.sub(r"(https?://[^\s<]+)", r'<a href="\1">\1</a>', body)
    imgs = "".join(f'<a href="{escape(u)}"><img src="{escape(u)}" alt="" width="220" '
                   f'style="margin:4px;border-radius:6px"></a>' for u in list(photos)[:8])
    return ('<html><body><pre style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;'
            f'white-space:pre-wrap">{body}</pre>{imgs}</body></html>')


def make_notification(kind, cat, changes=None, extra=None):
    view = cat["view"]
    name = view.get("name") or "(unnamed)"
    url = cat["url"]
    if kind == "new":
        subject = f"{SUBJECT_PREFIX} NEW CAT: {name}"
        lines = ["New cat detected", "", f"Name: {name}", "Change: New cat added to the sale listings.",
                 f"Direct link: {url}", f"Detected at: {_now_str()}"]
        details = _details_lines(view)
        if details:
            lines += ["", "Details:"] + details
        if view.get("photos"):
            lines += ["", "Photos:"] + [f"  {u}" for u in view["photos"]]
        lines += ["", "Listing text:", view.get("description") or view.get("listing_text") or "(none)"]
    elif kind == "changed":
        subject = f"{SUBJECT_PREFIX} DETAILS CHANGED: {name}"
        what = ", ".join(_title(k) for k, _, _ in changes)
        lines = ["Cat details changed", "", f"Name: {name}", f"Change: {what} changed.",
                 f"Direct link: {url}", f"Detected at: {_now_str()}"]
        if extra:
            lines.append(extra)
        lines += ["", "Changed fields:"]
        for key, old, new in changes:
            lines += _describe_change(key, old, new)
    else:
        subject = f"{SUBJECT_PREFIX} CAT REMOVED: {name}"
        lines = ["Cat removed from the sale listings", "", f"Name: {name}",
                 "Change: No longer listed on the for-sale page.",
                 f"Last known direct link: {url}", f"Detected at: {_now_str()}",
                 f"Last seen listed: {cat.get('last_seen', '?')}"]
        details = _details_lines(view)
        if details:
            lines += ["", "Last known details:"] + details
        if view.get("photos"):
            lines += ["", "Last known photos:"] + [f"  {u}" for u in view["photos"]]
    lines += ["", f"For-sale page: {cat.get('listing_url', '')}".rstrip()]
    text = "\n".join(lines) + "\n"
    return {"kind": kind, "cat_id": cat["id"], "name": name, "url": url, "subject": subject, "text": text,
            "html": _to_html(text, view.get("photos", []) if kind != "changed" else []),
            "created_at": _now_str(), "priority": PRIORITY[kind], "attempts": 0}


def make_status_notification(kind, cfg, failures, error=None):
    """E-mail saying the monitor itself stopped (or resumed) being able to read the website."""
    run = ""
    if os.environ.get("GITHUB_RUN_ID"):
        run = (f"{os.environ.get('GITHUB_SERVER_URL', 'https://github.com')}/"
               f"{os.environ.get('GITHUB_REPOSITORY', '')}/actions/runs/{os.environ['GITHUB_RUN_ID']}")
    if kind == "problem":
        subject = f"{SUBJECT_PREFIX} MONITOR PROBLEM: website cannot be checked"
        lines = ["The monitor could not read the for-sale page.", "",
                 f"Failed checks in a row: {failures}", f"Last error: {error}",
                 "New kittens will NOT be detected until this is fixed. You will get another e-mail",
                 "when checks work again."]
    else:
        subject = f"{SUBJECT_PREFIX} MONITOR OK again"
        lines = ["The monitor can read the for-sale page again.", "",
                 f"It failed {failures} check(s) in a row before recovering.",
                 "Any changes made in the meantime are reported in separate e-mails."]
    lines += [f"Direct link: {cfg.url}", f"Detected at: {_now_str()}"]
    if run:
        lines.append(f"Monitor log: {run}")
    text = "\n".join(lines) + "\n"
    return {"kind": kind, "cat_id": None, "name": "", "url": cfg.url, "subject": subject, "text": text,
            "html": _to_html(text), "created_at": _now_str(), "priority": PRIORITY[kind], "attempts": 0}


def diff_views(old, new):
    keys = list(dict.fromkeys(list(new) + list(old)))
    return [(k, old.get(k), new.get(k)) for k in keys if old.get(k) != new.get(k)]


# --------------------------------------------------------------------------
# State + monitor
# --------------------------------------------------------------------------

class Monitor:
    def __init__(self, cfg, fetcher=None, mailer=None):
        self.cfg = cfg
        self.fetcher = fetcher or Fetcher(cfg)
        self.mailer = mailer or Mailer(cfg)
        self.state = self._load()

    # --- persistence ---
    def _load(self):
        path = self.cfg.state_file
        if path.exists():
            try:
                state = json.loads(path.read_text(encoding="utf-8"))
                state.setdefault("cats", {})
                state.setdefault("outbox", [])
                return state
            except (OSError, ValueError) as exc:
                backup = path.with_name(f"{path.stem}.corrupt-{int(time.time())}{path.suffix}")
                path.replace(backup)
                log.error("State file was unreadable (%s); moved to %s and starting a new baseline", exc, backup)
        return {"initialized": False, "cats": {}, "outbox": []}

    def save(self):
        path = self.cfg.state_file
        tmp = path.with_suffix(path.suffix + ".tmp")
        data = json.dumps(self.state, ensure_ascii=False, indent=1, sort_keys=True)
        with open(tmp, "w", encoding="utf-8") as fh:
            fh.write(data)
            fh.flush()
            os.fsync(fh.fileno())
        for attempt in range(10):  # Windows: antivirus/indexer may briefly lock the file
            try:
                os.replace(tmp, path)
                return
            except PermissionError:
                time.sleep(0.3 * (attempt + 1))
        os.replace(tmp, path)

    # --- scanning ---
    def collect(self):
        """Fetch and parse everything. Raises ScanError if the result can't be trusted."""
        html = self.fetcher.get(self.cfg.url)
        entries = parse_listing(html, self.cfg.url, self.cfg.content_selector, self.cfg.cat_link_pattern)
        if not entries:
            raise ScanError("no listing content found")
        old = self.state["cats"]
        now = time.time()
        # New cats first: their details matter most and should not wait behind refreshes.
        entries.sort(key=lambda e: e["id"] in old)
        refreshed = 0
        current = {}
        for e in entries:
            prev = old.get(e["id"])
            detail = prev.get("detail") if prev else None
            fetched_at = prev.get("detail_fetched_at", 0) if prev else 0
            if e["has_detail_page"] and url_key(e["url"]) != url_key(self.cfg.url):
                is_new = prev is None
                listing_changed = prev is not None and prev.get("listing") != e["listing"]
                stale = now - fetched_at >= self.cfg.detail_refresh
                if is_new or listing_changed or (stale and refreshed < self.cfg.max_detail_refresh):
                    if not is_new and not listing_changed:
                        refreshed += 1
                    try:
                        detail = parse_detail(self.fetcher.get(e["url"]), e["url"], self.cfg.content_selector)
                        fetched_at = now
                    except ScanError as exc:
                        log.warning("Could not load detail page %s (%s) - keeping previous details", e["url"], exc)
            view = build_view(e["listing"], detail)
            current[e["id"]] = {"id": e["id"], "url": e["url"], "listing_url": self.cfg.url,
                                "name": view["name"], "listing": e["listing"], "detail": detail,
                                "detail_fetched_at": fetched_at, "view": view, "hash": view_hash(view),
                                "missing_scans": 0}
        return current

    def scan(self):
        """One complete scan. Returns the list of queued notifications."""
        current = self.collect()
        self._note_success()
        stamp = _now_str()
        for cat in current.values():
            cat["last_seen"] = stamp
        old = self.state["cats"]

        if not self.state.get("initialized"):
            for cat in current.values():
                cat["first_seen"] = stamp
            self.state.update(initialized=True, cats=current, last_scan=stamp)
            self.save()
            log.info("Baseline established: %d listing(s) recorded, no notifications sent.", len(current))
            for cat in current.values():
                log.info("  - %s  <%s>", cat["name"], cat["url"])
            return []

        events, renamed_from = [], set()
        for cid, cat in current.items():
            prev = old.get(cid)
            if prev is None:
                # Same cat under a new identifier? (no individual URL, heading renamed) -> match by photo.
                prev = next((p for pid, p in old.items() if pid not in current and pid not in renamed_from
                             and set(p["view"].get("photos", [])) & set(cat["view"].get("photos", []))), None)
                if prev is not None:
                    renamed_from.add(prev["id"])
                    cat["first_seen"] = prev.get("first_seen", stamp)
                    changes = diff_views(prev["view"], cat["view"])
                    events.append(make_notification("changed", cat, changes or [("name", prev["name"], cat["name"])],
                                                    extra="(Matched to the earlier listing by its photos.)"))
                    continue
                cat["first_seen"] = stamp
                events.append(make_notification("new", cat))
                continue
            cat["first_seen"] = prev.get("first_seen", stamp)
            if prev["hash"] != cat["hash"]:
                changes = diff_views(prev["view"], cat["view"])
                if changes:
                    events.append(make_notification("changed", cat, changes))

        new_cats = dict(current)
        for pid, prev in old.items():
            if pid in current or pid in renamed_from:
                continue
            prev = dict(prev, missing_scans=prev.get("missing_scans", 0) + 1)
            if prev["missing_scans"] >= self.cfg.removal_confirmations:
                events.append(make_notification("removed", prev))
            else:
                log.info("'%s' not on the page (%d/%d scans) - will report removal if it stays missing",
                         prev["name"], prev["missing_scans"], self.cfg.removal_confirmations)
                new_cats[pid] = prev

        self.state["cats"] = new_cats
        self.state["last_scan"] = stamp
        self.state["outbox"].extend(events)
        self.save()  # persist before sending, so nothing is lost if e-mail fails or we crash
        counts = {k: sum(1 for e in events if e["kind"] == k) for k in ("new", "changed", "removed")}
        log.info("Check OK: %d listed, %d new, %d changed, %d removed.", len(current),
                 counts["new"], counts["changed"], counts["removed"])
        for e in events:
            log.warning("%s  ->  %s", e["subject"], e["url"])
        return events

    def flush_outbox(self):
        """Send queued notifications, highest priority (new cats) first. Keeps failures for retry."""
        outbox = self.state["outbox"]
        if not outbox:
            return 0
        outbox.sort(key=lambda e: (e.get("priority", 1), e.get("created_at", "")))
        sent = 0
        while outbox:
            item = outbox[0]
            try:
                self.mailer.send(item["subject"], item["text"], item.get("html"))
            except MailError as exc:
                item["attempts"] = item.get("attempts", 0) + 1
                item["last_error"] = str(exc)
                log.error("E-mail failed (%s); %d notification(s) kept and will be retried.", exc, len(outbox))
                break
            outbox.pop(0)
            sent += 1
            log.info("E-mail sent: %s", item["subject"])
        self.save()
        return sent

    def _note_success(self):
        failures = self.state.get("consecutive_failures", 0)
        if failures >= self.cfg.alert_after_failures:
            self.state["outbox"].append(make_status_notification("recovered", self.cfg, failures))
        self.state["consecutive_failures"] = 0
        self.state.pop("last_error", None)

    def note_failure(self, exc):
        """Count failed checks (cats untouched); e-mail once when they keep failing."""
        failures = self.state.get("consecutive_failures", 0) + 1
        self.state["consecutive_failures"] = failures
        self.state["last_error"] = str(exc)
        if failures == self.cfg.alert_after_failures:
            self.state["outbox"].append(make_status_notification("problem", self.cfg, failures, exc))
        self.save()
        return failures

    def run_once(self):
        ok = True
        try:
            self.scan()
        except ScanError as exc:
            ok = False
            n = self.note_failure(exc)
            log.warning("Check failed (#%d in a row; cats in saved state untouched): %s", n, exc)
        except Exception as exc:  # parsing bug etc. - still count it so a stuck monitor gets reported
            ok = False
            n = self.note_failure(f"{exc.__class__.__name__}: {exc}")
            log.exception("Unexpected error during check (#%d in a row)", n)
        self.flush_outbox()
        return ok

    def run_forever(self):
        log.info("Monitoring %s every %ds (Ctrl+C to stop). State: %s", self.cfg.url, self.cfg.interval,
                 self.cfg.state_file)
        if not self.mailer.configured():
            log.warning("E-mail is NOT configured - notifications will be queued and only printed here.")
        failures = 0
        flag = BASE_DIR / "SCAN_NOW"
        while True:
            started = time.monotonic()
            try:
                self.scan()
                failures = 0
            except ScanError as exc:
                failures = self.note_failure(exc)
                log.warning("Check failed (#%d in a row; cats in saved state untouched): %s", failures, exc)
            except Exception as exc:  # never die on an unexpected parsing bug
                failures = self.note_failure(f"{exc.__class__.__name__}: {exc}")
                log.exception("Unexpected error during check (#%d in a row)", failures)
            try:
                self.flush_outbox()
            except Exception:
                log.exception("Unexpected error while sending e-mail")
            delay = self.cfg.interval if failures == 0 else min(self.cfg.interval * 2 ** min(failures - 1, 3),
                                                                max(self.cfg.interval, 300))
            while time.monotonic() - started < delay:
                if flag.exists():
                    try:
                        flag.unlink()
                    except OSError:
                        pass
                    log.info("SCAN_NOW file found - scanning immediately.")
                    break
                time.sleep(1)


# --------------------------------------------------------------------------
# CLI
# --------------------------------------------------------------------------

def setup_logging(verbose=False):
    fmt = logging.Formatter("%(asctime)s %(levelname)-7s %(message)s", "%Y-%m-%d %H:%M:%S")
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(errors="replace")
        except (ValueError, OSError):
            pass
    console = logging.StreamHandler(sys.stdout)
    console.setFormatter(fmt)
    logfile = RotatingFileHandler(BASE_DIR / "monitor.log", maxBytes=1_000_000, backupCount=3, encoding="utf-8")
    logfile.setFormatter(fmt)
    log.handlers[:] = [console, logfile]
    log.setLevel(logging.DEBUG if verbose else logging.INFO)


def show(cfg):
    fetcher = Fetcher(cfg)
    html = fetcher.get(cfg.url)
    entries = parse_listing(html, cfg.url, cfg.content_selector, cfg.cat_link_pattern)
    print(f"Found {len(entries)} listing(s) on {cfg.url}\n")
    for e in entries:
        detail = None
        if e["has_detail_page"]:
            try:
                detail = parse_detail(fetcher.get(e["url"]), e["url"], cfg.content_selector)
            except ScanError as exc:
                print(f"  (detail page failed: {exc})")
        view = build_view(e["listing"], detail)
        print("=" * 70)
        print(f"Name: {view['name']}\nID:   {e['id']}\nLink: {e['url']}")
        for line in _details_lines(view):
            print(line)
        for u in view["photos"]:
            print(f"  photo: {u}")
        print("  text: " + (view.get("description") or view["listing_text"])[:400].replace("\n", " / "))
    print("=" * 70)


def main(argv=None):
    ap = argparse.ArgumentParser(description="Monitor the White Witch for-sale page and e-mail changes.")
    ap.add_argument("--once", action="store_true", help="run a single scan now, send notifications, exit")
    ap.add_argument("--show", action="store_true", help="print what the parser finds (no e-mail, no state)")
    ap.add_argument("--test-email", action="store_true", help="send a test notification and exit")
    ap.add_argument("--verbose", action="store_true", help="debug logging")
    args = ap.parse_args(argv)

    load_dotenv(BASE_DIR / ".env")
    setup_logging(args.verbose)
    cfg = Config()

    if args.test_email:
        cat = {"id": "test", "url": cfg.url, "listing_url": cfg.url,
               "view": {"name": "Test Kitten", "sex": "female", "price": "(example)"}}
        note = make_notification("new", cat)
        note["subject"] = f"{SUBJECT_PREFIX} TEST NOTIFICATION"
        note["text"] = "This is a test e-mail from the White Witch monitor. E-mail is working.\n\n" + note["text"]
        note["html"] = _to_html(note["text"])
        try:
            Mailer(cfg).send(note["subject"], note["text"], note["html"])
        except MailError as exc:
            log.error("Test e-mail FAILED: %s", exc)
            return 1
        log.info("Test e-mail sent to %s", ", ".join(cfg.email_to))
        return 0
    if args.show:
        try:
            show(cfg)
        except ScanError as exc:
            log.error("Could not read the page: %s", exc)
            return 1
        return 0

    monitor = Monitor(cfg)
    if args.once:
        return 0 if monitor.run_once() else 1
    try:
        monitor.run_forever()
    except KeyboardInterrupt:
        log.info("Stopped.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
