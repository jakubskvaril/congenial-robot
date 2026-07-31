/**
 * Ověření akceptačních kritérií ze sekce 13 zadání proti běžícímu buildu.
 * Spouští se ručně: `npx vite preview --port 4173` a pak `node e2e.mjs`.
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE ?? 'http://127.0.0.1:4173';
const CHROME = process.env.CHROME ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const browser = await chromium.launch({ executablePath: CHROME });
const vysledky = [];

/** Intl sází úzkou nedělitelnou mezeru — pro porovnání ji srovnáme na obyčejnou. */
const mezery = (s) => (s ?? '').replace(/[\u00a0\u202f\u2009]/g, ' ');

function tvrd(nazev, podminka, detail = '') {
  vysledky.push({ nazev, ok: !!podminka, detail });
  console.log(`${podminka ? '  ok  ' : ' CHYBA'} ${nazev}${detail ? ` — ${detail}` : ''}`);
}

async function novaStranka(ctx) {
  const page = await ctx.newPage();
  page.on('pageerror', (e) => tvrd(`bez chyby na stránce`, false, e.message));
  return page;
}

/* 1 — první otevření */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await novaStranka(ctx);
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  const popis = await page.getAttribute('svg[role="img"]', 'aria-label');
  tvrd('1a: hrad startuje na Kamenné tvrzi (80 000 Kč)', popis.includes('Hrad: Kamenná tvrz'), popis.slice(0, 60));
  tvrd('1b: hradby jsou Vyměřeno', popis.includes('Hradby: Vyměřeno'));
  tvrd('1c: horda je Prázdné tábořiště', popis.includes('Horda: Prázdné tábořiště'));

  const radky = await page.$$eval('#souhrn tbody tr', (rs) => rs.map((r) => r.innerText));
  tvrd('1d: prázdné buňky jsou pomlčka, ne nula', radky[1].includes('—'), radky[1].replace(/\n/g, ' | '));
  await ctx.close();
}

/* 2 — hover nad hradem */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await novaStranka(ctx);
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await page.hover('[aria-label^="Hrad —"]');
  await page.waitForTimeout(400);
  const karta = mezery(await page.innerText('[aria-label="Podrobnosti sféry Hrad"]'));
  tvrd('2a: kartuše ukazuje vloženo 80 000', karta.includes('80 000'));
  tvrd('2b: kartuše ukazuje, kolik chybí do další úrovně', /chybí/.test(karta));
  tvrd('2c: kartuše jmenuje další úroveň', karta.includes('Opevněný dvorec'));
  await ctx.close();
}

/* 3 + 4 — vklad spustí level-up, po reloadu se neopakuje */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await novaStranka(ctx);
  await page.goto(`${BASE}#/kronika`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);

  await page.selectOption('select', 'vwce'); // Hradby — VWCE
  await page.fill('input[type="number"] >> nth=0', '40000');
  await page.click('button:has-text("Zapsat do účtů")');
  await page.waitForTimeout(600);

  await page.click('a:has-text("Zpět na mapu")');
  await page.waitForTimeout(1600);

  const toast = await page.$('[role="status"]');
  const toastText = mezery(toast ? await toast.innerText() : '');
  tvrd('3a: vklad 40 000 do Hradeb spustí level-up', /HRADBY POV/i.test(toastText), toastText.replace(/\n/g, ' '));
  tvrd('3b: nová úroveň je Nízká zeď', /Nízká zeď/.test(toastText));

  const popis = await page.getAttribute('svg[role="img"]', 'aria-label');
  tvrd('3c: scéna se změnila', popis.includes('Hradby: Nízká zeď'));

  await page.goto(`${BASE}#/kronika`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const kronika = mezery(await page.innerText('section[aria-labelledby="sekce-7"]'));
  tvrd('3d: do Kroniky přibyl řádek o vkladu', /Na stavbu hradeb vydáno/.test(kronika));
  tvrd('3e: do Kroniky přibyl řádek o povýšení', /Hradby povýšeny — Nízká zeď/.test(kronika));

  // reload — level-up se nesmí přehrát znovu
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);
  const toast2 = await page.$('[role="status"]');
  tvrd('4a: po reloadu se level-up nepřehraje znovu', toast2 === null);
  const popis2 = await page.getAttribute('svg[role="img"]', 'aria-label');
  tvrd('4b: stav přežil reload', popis2.includes('Hradby: Nízká zeď'));
  await ctx.close();
}

/* 5 — export → vymazat → import */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await novaStranka(ctx);
  await page.goto(`${BASE}#/kronika`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  await page.selectOption('select', 'xdwt'); // Horda — XDWT
  await page.fill('input[type="number"] >> nth=0', '25000');
  await page.click('button:has-text("Zapsat do účtů")');
  await page.waitForTimeout(400);

  const pred = await page.evaluate(() => localStorage.getItem('rise.v1'));

  await page.click('button:has-text("Vymazat vše")');
  await page.click('button:has-text("Ano, pokračovat")');
  await page.click('button:has-text("Vymazat nenávratně")');
  await page.waitForTimeout(400);
  const po = await page.evaluate(() => localStorage.getItem('rise.v1'));
  tvrd('5a: vymazání skutečně vrátí výchozí stav', pred !== po);

  // import přes UI: podstrčíme soubor do file inputu
  await page.setInputFiles('input[type="file"]', {
    name: 'rise.json',
    mimeType: 'application/json',
    buffer: Buffer.from(pred, 'utf8'),
  });
  await page.waitForTimeout(600);
  const zpet = await page.evaluate(() => localStorage.getItem('rise.v1'));
  tvrd(
    '5b: import obnoví identický stav',
    JSON.stringify(JSON.parse(zpet)) === JSON.stringify(JSON.parse(pred)),
  );
  await ctx.close();
}

/* 7 — výpadek sítě */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await novaStranka(ctx);
  await page.route('**/api/**', (r) => r.abort());
  await page.route('**frankfurter**', (r) => r.abort());
  await page.goto(`${BASE}#/kronika`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.click('button:has-text("Načíst ceny")');
  await page.waitForTimeout(3000);
  const zprava = mezery(await page.innerText('section[aria-labelledby="sekce-4"]'));
  tvrd('7a: výpadek sítě appku neshodí', await page.$('svg, table') !== null);
  tvrd('7b: neúspěch se hlásí jako stav, ne jako pád', /nenačteno|nepodařilo/.test(zprava), zprava.slice(0, 120).replace(/\n/g, ' '));
  await ctx.close();
}

/* 8 — reduced motion */
{
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
  });
  const page = await novaStranka(ctx);
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const bezi = await page.evaluate(
    () => document.getAnimations().filter((a) => a.playState === 'running').length,
  );
  tvrd('8a: prefers-reduced-motion vypne pohyb', bezi === 0, `běžících animací: ${bezi}`);
  await ctx.close();
}

/* 9 — nikde žádné doporučení co koupit/prodat */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await novaStranka(ctx);
  // \b je v JS ASCII-only, takže „NÁKUP" by se chytilo jako „KUP" — hranice
  // se proto hlídají přes \p{L}. „Nákup" a „nákupní cena" jsou účetní pojmy,
  // ne rada; hledají se rozkazovací a doporučovací tvary.
  const zakazane =
    /(?<!\p{L})(kup|kupte|kupuj|kupovat|koupit|prodej|prodejte|prodat|doporučujeme|doporučeno|vyplatí se|nevyplatí se)(?!\p{L})/iu;
  for (const cesta of ['', '#/kronika']) {
    await page.goto(`${BASE}${cesta}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const text = mezery(await page.innerText('body'));
    const nalez = text.match(zakazane);
    tvrd(`9: bez investičních doporučení (${cesta || 'mapa'})`, !nalez, nalez ? nalez[0] : '');
  }
  await ctx.close();
}

/* výkon — strop 1 500 SVG uzlů */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await novaStranka(ctx);
  await page.addInitScript(() => {
    localStorage.setItem(
      'rise.v1',
      JSON.stringify({
        verze: 1,
        aktiva: ['castle', 'wall', 'horde'].map((s, i) => ({
          id: `a${i}`,
          sferaId: s,
          nazev: s,
          mena: 'CZK',
          ocenovani: 'sazba',
          planovanaSazbaPa: 0.12,
          vklady: [{ id: `v${i}`, datum: '2015-01-01', castka: 400000 }],
          ceny: [],
        })),
        kurzy: {},
        nastaveni: { zobrazitProjekce: true, nocniRezim: 'den', prahy: {} },
        kronika: [],
        videnUrovne: { castle: 7, wall: 7, horde: 7 },
      }),
    );
  });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const uzlu = await page.evaluate(
    () => document.querySelector('svg[role="img"]').querySelectorAll('*').length,
  );
  tvrd('výkon: plná scéna do 1 500 SVG uzlů', uzlu <= 1500, `${uzlu} uzlů`);

  const bezFocusRingu = await page.evaluate(() => {
    const h = document.querySelector('svg[role="img"] [role="button"]');
    h.focus();
    return document.activeElement !== h;
  });
  tvrd('a11y: SVG hitbox jde zaostřit klávesnicí', !bezFocusRingu);
  await ctx.close();
}

await browser.close();

const chyby = vysledky.filter((v) => !v.ok);
console.log(`\n${vysledky.length - chyby.length}/${vysledky.length} prošlo`);
if (chyby.length) {
  console.log('NEPROŠLO:', chyby.map((c) => c.nazev).join(', '));
  process.exit(1);
}
