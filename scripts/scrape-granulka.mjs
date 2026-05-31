#!/usr/bin/env node
/**
 * Scraper granulka.cz → lokální EAN databáze kočičích kapsiček
 * Spuštění:  node scripts/scrape-granulka.mjs
 * Výstup:    src/data/localEanDb.ts
 *
 * Vyžaduje Node.js 18+ (nativní fetch).
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_FILE = join(__dirname, '..', 'src', 'data', 'localEanDb.ts');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'cs-CZ,cs;q=0.9,en;q=0.5',
};

const DELAY_MS = 800; // slušné tempo, nechceme server zahltit

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function fetchPage(url) {
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) {
      console.warn(`  ⚠️  ${url} → HTTP ${res.status}`);
      return null;
    }
    return await res.text();
  } catch (e) {
    console.warn(`  ⚠️  ${url} → ${e.message}`);
    return null;
  }
}

/** Najde všechny EAN linky na stránce kategorie */
function extractEanLinks(html) {
  const matches = [...html.matchAll(/href="\/ean\/(\d{8,14})\/"/g)];
  return [...new Set(matches.map(m => m[1]))];
}

/** Parsuje detailovou stránku produktu */
function parseProductPage(html, ean) {
  // Název produktu
  const nameMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/) ||
                    html.match(/class="[^"]*product[^"]*title[^"]*"[^>]*>([^<]+)</);
  const name = nameMatch ? nameMatch[1].trim() : 'Neznámý produkt';

  // Výrobce / značka
  const brandMatch = html.match(/Výrobce[^:]*:\s*<[^>]+>([^<]+)</) ||
                     html.match(/značka[^:]*:\s*<[^>]+>([^<]+)</i) ||
                     html.match(/brand[^:]*:\s*"([^"]+)"/i);
  const brand = brandMatch ? brandMatch[1].trim() : '';

  // Analytické složky — hledáme typické české vzory
  function extractNum(pattern) {
    const m = html.match(pattern);
    return m ? parseFloat(m[1].replace(',', '.')) : null;
  }

  const protein   = extractNum(/[Bb]ílkovina\w*\s*:?\s*([\d,\.]+)\s*%/)  ??
                    extractNum(/protein[^:]*:?\s*([\d,\.]+)\s*%/i);
  const fat       = extractNum(/[Tt]uk\w*\s*:?\s*([\d,\.]+)\s*%/)        ??
                    extractNum(/fat[^:]*:?\s*([\d,\.]+)\s*%/i);
  const moisture  = extractNum(/[Vv]lhk\w*\s*:?\s*([\d,\.]+)\s*%/)       ??
                    extractNum(/moisture[^:]*:?\s*([\d,\.]+)\s*%/i);
  const ash       = extractNum(/[Pp]epel\w*\s*:?\s*([\d,\.]+)\s*%/)      ??
                    extractNum(/ash[^:]*:?\s*([\d,\.]+)\s*%/i);
  const fiber     = extractNum(/[Vv]lákn\w*\s*:?\s*([\d,\.]+)\s*%/)      ??
                    extractNum(/fibre?[^:]*:?\s*([\d,\.]+)\s*%/i);

  // Procento masa
  const meatMatch = html.match(/([\d]+)\s*%\s*[Mm]as/) ||
                    html.match(/[Mm]as[oa][^:]*:\s*([\d]+)\s*%/);
  const meatPercent = meatMatch ? parseInt(meatMatch[1]) : null;

  // Grain free — hledáme klíčová slova
  const grainFree = /bez[- ]obilovin|grain[- ]free|getreide[- ]frei/i.test(html);
  const isKitten  = /kote|kitten|junior/i.test(name + html.slice(0, 500));

  // kcal / 100g
  const kcalMatch = html.match(/([\d]+)\s*kcal\s*\/?\s*100\s*g/i) ||
                    html.match(/energetick[^:]*:?\s*([\d]+)\s*kcal/i);
  const kcalPer100g = kcalMatch ? parseInt(kcalMatch[1]) : 75;

  return {
    ean,
    name,
    brand,
    meatPercent,
    isKitten,
    grainFree,
    isComplete: true,
    nutrients: {
      protein:  protein  ?? 10,
      fat:      fat      ?? 5,
      moisture: moisture ?? 80,
      ...(ash   != null ? { ash }   : {}),
      ...(fiber != null ? { fiber } : {}),
    },
    kcalPer100g,
    score: 5,
    notes: '',
  };
}

async function scrapeCategory(categoryUrl) {
  console.log(`\n📄 Načítám kategorii: ${categoryUrl}`);
  const eans = [];

  for (let page = 1; page <= 20; page++) {
    const url = page === 1 ? categoryUrl : `${categoryUrl}?page=${page}`;
    const html = await fetchPage(url);
    if (!html) break;

    const found = extractEanLinks(html);
    if (found.length === 0) {
      console.log(`  Strana ${page}: žádné další produkty, konec.`);
      break;
    }
    console.log(`  Strana ${page}: nalezeno ${found.length} EAN kódů`);
    eans.push(...found);
    await sleep(DELAY_MS);
  }

  return [...new Set(eans)];
}

async function main() {
  console.log('🐾 Scraper granulka.cz → EAN databáze kočičích kapsiček\n');

  // Kategorie k projití — uprav dle aktuálních URL na granulka.cz
  const CATEGORIES = [
    'https://granulka.cz/kocky/kapsicky/',
    'https://granulka.cz/kocky/konzervy/',
    'https://granulka.cz/kocky/varicka/',
  ];

  const allEans = [];
  for (const cat of CATEGORIES) {
    const eans = await scrapeCategory(cat);
    allEans.push(...eans);
  }

  const uniqueEans = [...new Set(allEans)];
  console.log(`\n✅ Celkem unikátních EAN kódů: ${uniqueEans.length}`);
  console.log('🔍 Načítám detaily produktů...\n');

  const products = [];
  for (let i = 0; i < uniqueEans.length; i++) {
    const ean = uniqueEans[i];
    process.stdout.write(`  [${i + 1}/${uniqueEans.length}] EAN ${ean}... `);

    const html = await fetchPage(`https://granulka.cz/ean/${ean}/`);
    if (html) {
      const product = parseProductPage(html, ean);
      products.push(product);
      process.stdout.write(`✓ ${product.brand} – ${product.name}\n`);
    } else {
      process.stdout.write(`✗ přeskočeno\n`);
    }
    await sleep(DELAY_MS);
  }

  // Generuj TypeScript soubor
  const ts = `// Automaticky vygenerováno scriptem scripts/scrape-granulka.mjs
// ${new Date().toISOString()}
// Celkem produktů: ${products.length}

export interface LocalEanEntry {
  ean: string;
  name: string;
  brand: string;
  meatPercent: number | null;
  isKitten: boolean;
  grainFree: boolean;
  isComplete: boolean;
  nutrients: {
    protein: number;
    fat: number;
    moisture: number;
    ash?: number;
    fiber?: number;
  };
  kcalPer100g: number;
  score: number;
  notes: string;
}

export const LOCAL_EAN_DB: Record<string, LocalEanEntry> = ${JSON.stringify(
    Object.fromEntries(products.map(p => [p.ean, p])),
    null, 2
  )};
`;

  mkdirSync(dirname(OUT_FILE), { recursive: true });
  writeFileSync(OUT_FILE, ts, 'utf-8');
  console.log(`\n💾 Uloženo: ${OUT_FILE}`);
  console.log(`   ${products.length} produktů v databázi`);
}

main().catch(console.error);
