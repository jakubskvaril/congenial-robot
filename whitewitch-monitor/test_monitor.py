"""Offline tests for monitor.py using mock pages (run: python -m unittest -v).

The HTML below is synthetic and imitates common WordPress layouts; it is NOT a
copy of the real whitewitch.cz markup.
"""

import shutil
import tempfile
import unittest
from pathlib import Path

import monitor as m

LIST_URL = "https://whitewitch.cz/en/for-sale/"

PAGE = """<!DOCTYPE html><html><head><title>For sale - White Witch</title></head><body>
<header class="site-header"><nav class="main-navigation"><ul>
  <li><a href="/en/">Home</a></li><li><a href="/en/our-cats/">Our cats</a></li>
  <li><a href="/en/contact/">Contact</a></li></ul></nav>
  <div class="lang-switcher"><a href="/cs/na-prodej/">CZ</a></div></header>
<main id="main"><article class="page"><header class="entry-header"><h1>Kittens for sale</h1></header>
<div class="entry-content">
<p>We currently offer these kittens. Ask via the <a href="/en/contact/">contact form</a>.</p>
{cards}
</div></article></main>
<footer class="site-footer"><p>&copy; White Witch</p><a href="/en/contact/">Contact</a></footer>
</body></html>"""

CARD = """<div class="kitten-card">
  <a href="{href}"><img src="{img}" alt="{name}"></a>
  <h3><a href="{href}">{name}</a></h3>
  <p>Born: {born}<br>Sex: {sex}<br>Colour: {color}<br>Price: {price}<br>Status: {status}</p>
  <a href="/en/contact/">Ask about this kitten</a>
</div>"""

DETAIL = """<html><body><nav class="menu"><a href="/en/">Home</a></nav><main>
<h1>{name}</h1><div class="entry-content">
<p>{desc}</p>
<table><tr><td>Father</td><td>WW Merlin</td></tr><tr><td>Mother</td><td>WW Luna</td></tr></table>
<img src="{img}"><a href="/wp-content/uploads/2026/09/{name}-2.jpg"><img src="/wp-content/uploads/2026/09/{name}-2-150x150.jpg"></a>
</div></main><footer>footer</footer></body></html>"""


def kitten(name, slug=None, born="1.8.2026", sex="female", color="blue tabby", price="25 000 Kč",
           status="available", href=None, img=None):
    slug = slug or name.lower()
    return dict(name=name, href=href or f"/en/kitten/{slug}/", born=born, sex=sex, color=color, price=price,
                status=status, img=img or f"/wp-content/uploads/2026/09/{slug}-300x200.jpg")


def listing(*kittens):
    return PAGE.replace("{cards}", "\n".join(CARD.format(**k) for k in kittens))


def detail(name, desc="Lovely kitten.", slug=None):
    slug = slug or name.lower()
    return DETAIL.format(name=name, desc=desc, img=f"/wp-content/uploads/2026/09/{slug}.jpg")


class FakeFetcher:
    def __init__(self):
        self.pages = {}
        self.calls = []

    def get(self, url):
        self.calls.append(url)
        page = self.pages.get(url)
        if page is None:
            raise m.ScanError(f"HTTP 404 for {url}")
        if isinstance(page, Exception):
            raise page
        return page


class FakeMailer:
    def __init__(self):
        self.sent = []
        self.fail = False

    def configured(self):
        return True

    def send(self, subject, text, html=None):
        if self.fail:
            raise m.MailError("SMTP down")
        self.sent.append((subject, text, html))


class MonitorTest(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.cfg = m.Config({"TARGET_URL": LIST_URL, "STATE_FILE": str(self.tmp / "state.json"),
                             "REMOVAL_CONFIRMATIONS": "2"})
        self.fetcher = FakeFetcher()
        self.mailer = FakeMailer()
        self.kittens = [kitten("Amber"), kitten("Bella", sex="male", price="27 000 Kč")]
        self.publish(*self.kittens)

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def publish(self, *kittens):
        self.fetcher.pages[LIST_URL] = listing(*kittens)
        for k in kittens:
            self.fetcher.pages.setdefault("https://whitewitch.cz" + k["href"], detail(k["name"]))

    def new_monitor(self):
        return m.Monitor(self.cfg, fetcher=self.fetcher, mailer=self.mailer)

    def run_scan(self, mon=None):
        mon = mon or self.mon
        ok = mon.run_once()
        sent = list(self.mailer.sent)
        self.mailer.sent.clear()
        return ok, sent

    def baseline(self):
        self.mon = self.new_monitor()
        ok, sent = self.run_scan()
        self.assertTrue(ok)
        return sent

    # ---------------------------------------------------------------- tests
    def test_baseline_sends_nothing(self):
        self.assertEqual(self.baseline(), [])
        cats = self.mon.state["cats"]
        self.assertEqual(sorted(c["name"] for c in cats.values()), ["Amber", "Bella"])
        amber = cats["https://whitewitch.cz/en/kitten/amber"]
        self.assertEqual(amber["url"], "https://whitewitch.cz/en/kitten/amber/")
        v = amber["view"]
        self.assertEqual(v["born"], "1.8.2026")
        self.assertEqual(v["sex"], "female")
        self.assertEqual(v["color"], "blue tabby")
        self.assertEqual(v["price"], "25 000 Kč")
        self.assertEqual(v["status"], "available")
        self.assertEqual(v["sire"], "WW Merlin")
        self.assertEqual(v["dam"], "WW Luna")
        self.assertIn("https://whitewitch.cz/wp-content/uploads/2026/09/amber.jpg", v["photos"])
        self.assertIn("https://whitewitch.cz/wp-content/uploads/2026/09/Amber-2.jpg", v["photos"])
        self.assertNotIn("contact", " ".join(cats))  # nav/footer/contact links are not cats

    def test_unchanged_page_sends_nothing(self):
        self.baseline()
        for _ in range(3):
            self.assertEqual(self.run_scan()[1], [])

    def test_new_cat_notification(self):
        self.baseline()
        self.publish(*self.kittens, kitten("Cleo", price="30 000 Kč"))
        ok, sent = self.run_scan()
        self.assertEqual(len(sent), 1)
        subject, text, html = sent[0]
        self.assertEqual(subject, "[White Witch] NEW CAT: Cleo")
        self.assertIn("Name: Cleo", text)
        self.assertIn("Direct link: https://whitewitch.cz/en/kitten/cleo/", text)
        self.assertIn("Price: 30 000 Kč", text)
        self.assertIn("Date of birth: 1.8.2026", text)
        self.assertIn("https://whitewitch.cz/wp-content/uploads/2026/09/cleo.jpg", text)
        self.assertIn('<a href="https://whitewitch.cz/en/kitten/cleo/">', html)
        self.assertEqual(self.run_scan()[1], [])  # no repeat

    def test_removal_needs_confirmation_and_reports_last_details(self):
        self.baseline()
        self.publish(self.kittens[0])
        self.assertEqual(self.run_scan()[1], [])  # 1st miss: wait for confirmation
        sent = self.run_scan()[1]
        self.assertEqual(len(sent), 1)
        subject, text, _ = sent[0]
        self.assertEqual(subject, "[White Witch] CAT REMOVED: Bella")
        self.assertIn("Last known direct link: https://whitewitch.cz/en/kitten/bella/", text)
        self.assertIn("Price: 27 000 Kč", text)
        self.assertEqual(self.run_scan()[1], [])
        self.assertEqual(len(self.mon.state["cats"]), 1)

    def test_cat_reappearing_before_confirmation_is_not_reported(self):
        self.baseline()
        self.publish(self.kittens[0])
        self.run_scan()
        self.publish(*self.kittens)
        self.assertEqual(self.run_scan()[1], [])
        self.assertEqual(self.run_scan()[1], [])

    def test_changed_fields_show_old_and_new(self):
        self.baseline()
        self.publish(self.kittens[0], dict(self.kittens[1], price="22 000 Kč", status="reserved"))
        sent = self.run_scan()[1]
        self.assertEqual(len(sent), 1)
        subject, text, _ = sent[0]
        self.assertEqual(subject, "[White Witch] DETAILS CHANGED: Bella")
        self.assertIn("Direct link: https://whitewitch.cz/en/kitten/bella/", text)
        self.assertIn("- Price\n    Previous: 27 000 Kč\n    New:      22 000 Kč", text)
        self.assertIn("- Availability / status\n    Previous: available\n    New:      reserved", text)
        self.assertEqual(self.run_scan()[1], [])

    def test_photo_and_description_change(self):
        self.baseline()
        self.fetcher.pages["https://whitewitch.cz/en/kitten/amber/"] = detail("Amber", desc="Now vaccinated.")
        self.publish(dict(self.kittens[0], img="/wp-content/uploads/2026/10/amber-new.jpg"), self.kittens[1])
        sent = self.run_scan()[1]
        self.assertEqual(len(sent), 1)
        text = sent[0][1]
        self.assertIn("Added:   https://whitewitch.cz/wp-content/uploads/2026/10/amber-new.jpg", text)
        self.assertIn("+ Now vaccinated.", text)
        self.assertIn("- Lovely kitten.", text)

    def test_rename_with_same_url_is_an_update(self):
        self.baseline()
        self.publish(dict(self.kittens[0], name="Amber Rose"), self.kittens[1])
        sent = self.run_scan()[1]
        self.assertEqual([s[0] for s in sent], ["[White Witch] DETAILS CHANGED: Amber Rose"])
        self.assertIn("Previous: Amber\n    New:      Amber Rose", sent[0][1])
        self.assertEqual(self.run_scan()[1], [])

    def test_failed_scans_never_report_removals(self):
        self.baseline()
        bad = [m.ScanError("network error"), m.ScanError("HTTP 500"),
               "<html><body><main></main></body></html>" + " " * 400]  # empty content area
        for page in bad:
            self.fetcher.pages[LIST_URL] = page
            for _ in range(3):
                ok, sent = self.run_scan()
                self.assertEqual(sent, [], page)
        self.assertEqual(len(self.mon.state["cats"]), 2)
        self.publish(*self.kittens)
        self.assertEqual(self.run_scan()[1], [])

    def test_no_duplicates_after_restart(self):
        self.baseline()
        self.publish(*self.kittens, kitten("Cleo"))
        self.assertEqual(len(self.run_scan()[1]), 1)
        restarted = self.new_monitor()
        self.assertEqual(self.run_scan(restarted)[1], [])

    def test_email_failure_keeps_notification_until_sent(self):
        self.baseline()
        self.mailer.fail = True
        self.publish(*self.kittens, kitten("Cleo"))
        self.assertEqual(self.run_scan()[1], [])
        self.assertEqual(len(self.mon.state["outbox"]), 1)
        restarted = self.new_monitor()  # survives a restart too
        self.assertEqual(len(restarted.state["outbox"]), 1)
        self.mailer.fail = False
        sent = self.run_scan(restarted)[1]
        self.assertEqual([s[0] for s in sent], ["[White Witch] NEW CAT: Cleo"])
        self.assertEqual(restarted.state["outbox"], [])

    def test_new_cats_are_sent_first(self):
        self.baseline()
        self.mailer.fail = True
        self.publish(dict(self.kittens[0], price="1 Kč"), kitten("Cleo"), kitten("Dora"))
        self.run_scan()
        self.run_scan()  # Bella removal confirmed
        self.mailer.fail = False
        subjects = [s[0] for s in self.run_scan()[1]]
        self.assertEqual(subjects[:2], ["[White Witch] NEW CAT: Cleo", "[White Witch] NEW CAT: Dora"])
        self.assertEqual(sorted(subjects[2:]), ["[White Witch] CAT REMOVED: Bella",
                                                "[White Witch] DETAILS CHANGED: Amber"])

    def test_irrelevant_differences_are_ignored(self):
        self.baseline()
        page = listing(*self.kittens)
        page = page.replace('href="/en/kitten/amber/"', 'href="https://www.whitewitch.cz/en/kitten/amber?utm_source=fb"')
        page = page.replace("amber-300x200.jpg", "amber-1024x683.jpg?ver=2").replace("<p>", "<p>\n\n   ")
        page = page.replace("Sex: female", "Sex:   female  ")
        self.fetcher.pages[LIST_URL] = page
        self.fetcher.pages["https://www.whitewitch.cz/en/kitten/amber"] = detail("Amber")
        self.assertEqual(self.run_scan()[1], [])

    def test_detail_failure_keeps_previous_details(self):
        self.baseline()
        self.cfg.detail_refresh = 0
        for k in self.kittens:
            self.fetcher.pages["https://whitewitch.cz" + k["href"]] = m.ScanError("timeout")
        self.assertEqual(self.run_scan()[1], [])
        self.assertEqual(self.mon.state["cats"]["https://whitewitch.cz/en/kitten/amber"]["view"]["sire"], "WW Merlin")

    def test_detail_pages_not_fetched_every_scan(self):
        self.baseline()
        self.fetcher.calls.clear()
        self.run_scan()
        self.assertEqual(self.fetcher.calls, [LIST_URL])


class LayoutTest(unittest.TestCase):
    """The parser must cope with layouts without detail pages and without headings."""

    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.cfg = m.Config({"TARGET_URL": LIST_URL, "STATE_FILE": str(self.tmp / "s.json"),
                             "REMOVAL_CONFIRMATIONS": "1"})
        self.fetcher = FakeFetcher()
        self.mailer = FakeMailer()

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    FLAT = """<html><body><div id="content"><h2>Litter B (born 2. 9. 2026)</h2>
    <h3 id="{aid}">{name}</h3><p>Pohlaví: kocour</p><p>Barva: modrá</p><p>Cena: 20 000,- Kč</p>
    <img src="/wp-content/uploads/b1.jpg">
    <h3>Bobík</h3><p>Pohlaví: kočka</p><p>REZERVOVÁNA</p><img src="/wp-content/uploads/b2.jpg">
    </div></body></html>"""

    def test_headings_without_detail_pages_and_rename_by_photo(self):
        self.fetcher.pages[LIST_URL] = self.FLAT.format(aid="bonbon", name="Bonbon")
        entries = m.parse_listing(self.fetcher.pages[LIST_URL], LIST_URL)
        self.assertEqual([e["listing"]["name"] for e in entries], ["Bonbon", "Bobík"])
        first, second = entries
        self.assertEqual(first["url"], LIST_URL + "#bonbon")
        self.assertEqual(second["url"], LIST_URL)
        self.assertEqual(first["listing"]["section"], "Litter B (born 2. 9. 2026)")
        self.assertEqual(first["listing"]["fields"]["sex"], "kocour")
        self.assertEqual(first["listing"]["fields"]["color"], "modrá")
        self.assertEqual(first["listing"]["fields"]["price"], "20 000,- Kč")
        self.assertEqual(second["listing"]["fields"]["status"], "reserved")

        mon = m.Monitor(self.cfg, self.fetcher, self.mailer)
        mon.run_once()
        self.fetcher.pages[LIST_URL] = self.FLAT.format(aid="bonbon", name="Bonbon Blue")
        mon.run_once()
        self.assertEqual([s[0] for s in self.mailer.sent], ["[White Witch] DETAILS CHANGED: Bonbon Blue"])
        self.assertIn(LIST_URL + "#bonbon", self.mailer.sent[0][1])

    def test_links_without_headings(self):
        html = """<html><body><main><ul>
          <li><a href="/en/kitten/zara/"><img src="/wp-content/uploads/zara.jpg" alt="Zara"></a> Zara, female</li>
          <li><a href="/en/kitten/yuki/">Yuki</a> male, 25 000 Kč</li></ul></main></body></html>"""
        entries = m.parse_listing(html, LIST_URL)
        self.assertEqual([(e["listing"]["name"], e["url"]) for e in entries],
                         [("Zara", "https://whitewitch.cz/en/kitten/zara/"),
                          ("Yuki", "https://whitewitch.cz/en/kitten/yuki/")])
        self.assertEqual(entries[1]["listing"]["fields"]["price"], "25 000 Kč")

    def test_plain_text_page_is_one_entry(self):
        html = "<html><head><title>For sale</title></head><body><main><p>No kittens available now.</p></main></body></html>"
        entries = m.parse_listing(html, LIST_URL)
        self.assertEqual(len(entries), 1)
        self.assertEqual(entries[0]["url"], LIST_URL)

    def test_robots_txt_is_respected(self):
        import requests

        class Resp:
            def __init__(self, status, text, ctype="text/plain"):
                self.status_code, self.text, self.headers = status, text, {"Content-Type": ctype}

        fetcher = m.Fetcher(self.cfg)
        seen = []

        def fake_get(url, **kw):
            seen.append(url)
            return Resp(200, "User-agent: *\nDisallow: /en/\n")

        fetcher.session.get = fake_get
        with self.assertRaises(m.ScanError):
            fetcher.get(LIST_URL)
        self.assertEqual(seen, ["https://whitewitch.cz/robots.txt"])
        self.assertIsInstance(fetcher.session, requests.Session)

    def test_fetcher_rejects_error_truncated_and_non_html_responses(self):
        fetcher = m.Fetcher(self.cfg)
        fetcher.robots["https://whitewitch.cz"] = (9e18, None)
        full = "<html><body>" + "x" * 500 + "</body></html>"
        cases = [(503, full, "text/html"), (200, "<html><body><main>" + "x" * 500, "text/html; charset=UTF-8"),
                 (200, "", "text/html"), (200, '{"a": 1}' * 100, "application/json")]
        for status, text, ctype in cases:
            fetcher.session.get = lambda url, _r=(status, text, ctype), **kw: type(
                "R", (), {"status_code": _r[0], "text": _r[1], "headers": {"Content-Type": _r[2]}})()
            with self.assertRaises(m.ScanError, msg=(status, text[:30])):
                fetcher.get(LIST_URL)
        fetcher.session.get = lambda url, **kw: type(
            "R", (), {"status_code": 200, "text": full, "headers": {"Content-Type": "text/html; charset=utf-8"}})()
        self.assertEqual(fetcher.get(LIST_URL), full)


if __name__ == "__main__":
    unittest.main()
