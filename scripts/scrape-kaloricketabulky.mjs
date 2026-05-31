#!/usr/bin/env node
/**
 * Scraper pro kaloricketabulky.cz — stáhne nutritivní hodnoty čerstvých mas
 * a uloží je do src/data/ktMeatDb.ts pro offline použití v aplikaci.
 *
 * Požadavky: Node.js 18+
 * Spuštění:  KT_EMAIL="vas@email.cz" KT_PASSWORD="heslo" node scripts/scrape-kaloricketabulky.mjs
 */

import { createHash } from 'crypto';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = 'https://www.kaloricketabulky.cz';

const email    = process.env.KT_EMAIL;
const password = process.env.KT_PASSWORD;

if (!email || !password) {
  console.error('Nastav KT_EMAIL a KT_PASSWORD jako env proměnné.');
  console.error('Příklad: KT_EMAIL="vas@email.cz" KT_PASSWORD="heslo" node scripts/scrape-kaloricketabulky.mjs');
  process.exit(1);
}

function md5(str) {
  return createHash('md5').update(str).digest('hex');
}

async function login() {
  console.log('Přihlašuji se na kaloricketabulky.cz…');
  const res = await fetch(`${BASE}/login/create?format=json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: md5(password) }),
  });
  const body = await res.json();
  if (body.code !== 0) throw new Error(`Přihlášení selhalo: ${JSON.stringify(body)}`);
  const cookies = res.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
  console.log('  Přihlášen.');
  return cookies;
}

async function searchFood(query, cookies) {
  // Zkusíme různé endpointy — nevíme který přesně funguje
  const endpoints = [
    `/potraviny/search?format=json&query=${encodeURIComponent(query)}`,
    `/jidla/search?format=json&query=${encodeURIComponent(query)}`,
    `/food/search?format=json&query=${encodeURIComponent(query)}`,
    `/api/foods?format=json&search=${encodeURIComponent(query)}`,
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(`${BASE}${ep}`, { headers: { Cookie: cookies } });
      if (!res.ok) continue;
      const text = await res.text();
      if (!text.startsWith('{') && !text.startsWith('[')) continue;
      const data = JSON.parse(text);
      if (data && (data.code === 0 || Array.isArray(data) || data.items || data.data)) {
        console.log(`  ✓ Fungující endpoint: ${ep}`);
        return { endpoint: ep, data };
      }
    } catch { /* zkus dál */ }
  }
  return null;
}

async function searchByEan(ean, cookies) {
  const endpoints = [
    `/potraviny/barcode/${ean}?format=json`,
    `/food/barcode/${ean}?format=json`,
    `/potraviny/ean/${ean}?format=json`,
    `/api/food/ean/${ean}?format=json`,
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(`${BASE}${ep}`, { headers: { Cookie: cookies } });
      if (!res.ok) continue;
      const text = await res.text();
      if (!text.startsWith('{')) continue;
      const data = JSON.parse(text);
      if (data && data.code === 0) {
        console.log(`  ✓ EAN endpoint funguje: ${ep}`);
        return data;
      }
    } catch { /* zkus dál */ }
  }
  return null;
}

// Česká masa která chceme stáhnout
const MEAT_QUERIES = [
  'hovězí maso',
  'mleté hovězí',
  'kuřecí prso',
  'kuřecí stehno',
  'vepřové maso',
  'krůtí prso',
  'losos',
  'treska',
  'jehněčí',
  'králík',
  'kuřecí srdce',
  'kuřecí játra',
];

function extractNutrients(item) {
  // KT API může vracet různé struktury — zkusíme nejobvyklejší
  const n = item.nutrients ?? item.nutritions ?? item.nutrition ?? item;
  return {
    kcal:     parseFloat(n.energy_kcal ?? n.kcal ?? n.energy ?? 0),
    protein:  parseFloat(n.protein ?? n.proteins ?? 0),
    fat:      parseFloat(n.fat ?? n.fats ?? 0),
    ca_mg:    parseFloat(n.calcium ?? n.ca ?? 0),
    p_mg:     parseFloat(n.phosphorus ?? n.phosphor ?? n.p ?? 0),
    iron_mg:  parseFloat(n.iron ?? n.fe ?? 0),
    zinc_mg:  parseFloat(n.zinc ?? n.zn ?? 0),
    vitA_IU:  parseFloat(n.vitamin_a ?? n.vitaminA ?? n.vita ?? 0),
    vitD3_IU: parseFloat(n.vitamin_d ?? n.vitaminD ?? n.vitd ?? 0),
  };
}

async function main() {
  const cookies = await login();

  // Test EAN lookup (zkusíme na libovolném kódu)
  console.log('\nTestuji EAN lookup…');
  const eanTest = await searchByEan('4003400126756', cookies);
  if (eanTest) {
    console.log('EAN lookup FUNGUJE:', JSON.stringify(eanTest).slice(0, 200));
  } else {
    console.log('  EAN lookup není podporován nebo nenalezen.');
  }

  // Hledáme masa
  console.log('\nHledám nutritivní hodnoty pro česká masa…');
  const results = {};
  let workingEndpoint = null;

  for (const query of MEAT_QUERIES) {
    process.stdout.write(`  "${query}"… `);
    const found = await searchFood(query, cookies);
    if (found) {
      workingEndpoint = found.endpoint;
      const items = found.data?.items ?? found.data?.data ?? found.data ?? [];
      const list = Array.isArray(items) ? items : [];
      if (list.length > 0) {
        const item = list[0];
        const name = item.name ?? item.title ?? item.label ?? query;
        const n = extractNutrients(item);
        results[query] = { name, ...n };
        console.log(`OK → ${name} (${n.kcal} kcal)`);
      } else {
        console.log(`endpoint nalezen, ale žádné výsledky`);
      }
    } else {
      console.log(`nenalezeno`);
    }
    await new Promise(r => setTimeout(r, 300)); // zdvořilostní pauza
  }

  if (Object.keys(results).length === 0) {
    console.error('\n❌ Nepodařilo se stáhnout žádná data.');
    console.error('kaloricketabulky.cz pravděpodobně blokuje programatický přístup k potravinové databázi.');
    console.error('\nFungující endpointy:', workingEndpoint ?? 'žádný');
    console.error('\nRAW odpověď z food search pro hovězí maso:');
    try {
      const r = await fetch(`${BASE}/potraviny/search?format=json&query=hovez%C3%AD+maso`, {
        headers: { Cookie: cookies, 'User-Agent': 'Mozilla/5.0 (Linux; Android 13)' },
      });
      console.error('Status:', r.status);
      console.error('Body:', (await r.text()).slice(0, 500));
    } catch (e) {
      console.error(e.message);
    }
    process.exit(1);
  }

  // Generujeme TypeScript soubor
  const ts = `// Generováno scriptem scripts/scrape-kaloricketabulky.mjs
// Zdroj: kaloricketabulky.cz
// Datum: ${new Date().toISOString().slice(0,10)}
import type { MeatDraft } from '../utils/barcode';

export const KT_MEAT_DB: Record<string, MeatDraft & { name: string }> = ${JSON.stringify(results, null, 2)};
`;

  const outPath = join(__dirname, '../src/data/ktMeatDb.ts');
  writeFileSync(outPath, ts, 'utf8');
  console.log(`\n✅ Uloženo do ${outPath}`);
  console.log(`Nalezeno ${Object.keys(results).length} položek.`);
}

main().catch(e => { console.error(e); process.exit(1); });
