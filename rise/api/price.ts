/**
 * Proxy na kurzy cenných papírů. Z prohlížeče to kvůli CORS nejde.
 *
 *   /api/price?ticker=VWCE.DE&zdroj=yahoo
 *   /api/price?ticker=VWCE.DE&zdroj=stooq
 *
 * Vrací vždy `{ datum, cena, mena, zdroj }`, nebo 502 s popisem.
 * Historii vrací při `&historie=1` jako pole bodů pro sparkline.
 */

interface Pozadavek {
  query: Record<string, string | string[] | undefined>;
}

interface Odpoved {
  status(kod: number): Odpoved;
  setHeader(jmeno: string, hodnota: string): void;
  json(telo: unknown): void;
}

const POVOLENY_TICKER = /^[A-Za-z0-9.\-^=]{1,20}$/;

export default async function handler(req: Pozadavek, res: Odpoved): Promise<void> {
  const ticker = prvni(req.query.ticker);
  const zdroj = prvni(req.query.zdroj) ?? 'yahoo';
  const chceHistorii = prvni(req.query.historie) === '1';

  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');

  if (!ticker || !POVOLENY_TICKER.test(ticker)) {
    res.status(400).json({ chyba: 'Chybí nebo je neplatný parametr `ticker`.' });
    return;
  }

  try {
    const vysledek =
      zdroj === 'stooq' ? await zeStooq(ticker, chceHistorii) : await zYahoo(ticker, chceHistorii);
    if (!vysledek) {
      res.status(502).json({ chyba: `Zdroj ${zdroj} nevrátil pro ${ticker} žádná data.` });
      return;
    }
    res.status(200).json(vysledek);
  } catch (e) {
    res.status(502).json({ chyba: e instanceof Error ? e.message : 'Načtení selhalo.' });
  }
}

function prvni(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

interface Vysledek {
  datum: string;
  cena: number;
  mena: string | null;
  zdroj: string;
  historie?: { datum: string; cena: number }[];
}

async function zYahoo(ticker: string, chceHistorii: boolean): Promise<Vysledek | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    ticker,
  )}?range=1y&interval=1d`;
  const odpoved = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; rise/1.0)' },
  });
  if (!odpoved.ok) throw new Error(`Yahoo vrátil HTTP ${odpoved.status}`);

  const data = (await odpoved.json()) as {
    chart?: {
      result?: {
        meta?: { currency?: string; regularMarketPrice?: number };
        timestamp?: number[];
        indicators?: { quote?: { close?: (number | null)[] }[] };
      }[];
      error?: { description?: string } | null;
    };
  };

  const vysledek = data.chart?.result?.[0];
  if (!vysledek) throw new Error(data.chart?.error?.description ?? 'Yahoo nevrátil výsledek.');

  const casy = vysledek.timestamp ?? [];
  const zaviraci = vysledek.indicators?.quote?.[0]?.close ?? [];

  const historie: { datum: string; cena: number }[] = [];
  for (let i = 0; i < casy.length; i++) {
    const cena = zaviraci[i];
    const cas = casy[i];
    if (typeof cena === 'number' && Number.isFinite(cena) && typeof cas === 'number') {
      historie.push({ datum: new Date(cas * 1000).toISOString().slice(0, 10), cena });
    }
  }

  const posledni = historie[historie.length - 1];
  if (!posledni) return null;

  return {
    datum: posledni.datum,
    cena: posledni.cena,
    mena: vysledek.meta?.currency ?? null,
    zdroj: 'yahoo',
    ...(chceHistorii ? { historie } : {}),
  };
}

async function zeStooq(ticker: string, chceHistorii: boolean): Promise<Vysledek | null> {
  const symbol = ticker.toLowerCase();
  const odpoved = await fetch(`https://stooq.com/q/d/l/?s=${encodeURIComponent(symbol)}&i=d`);
  if (!odpoved.ok) throw new Error(`Stooq vrátil HTTP ${odpoved.status}`);

  const csv = await odpoved.text();
  const radky = csv.trim().split('\n');
  if (radky.length < 2) return null;

  const hlavicka = radky[0]!.split(',').map((h) => h.trim().toLowerCase());
  const iDatum = hlavicka.indexOf('date');
  const iZavrit = hlavicka.indexOf('close');
  if (iDatum < 0 || iZavrit < 0) return null;

  const historie: { datum: string; cena: number }[] = [];
  for (const radek of radky.slice(1)) {
    const bunky = radek.split(',');
    const datum = bunky[iDatum]?.trim();
    const cena = Number(bunky[iZavrit]);
    if (datum && Number.isFinite(cena) && cena > 0) historie.push({ datum, cena });
  }

  const posledni = historie[historie.length - 1];
  if (!posledni) return null;

  return {
    datum: posledni.datum,
    cena: posledni.cena,
    mena: null, // Stooq měnu nehlásí — bere se z aktiva
    zdroj: 'stooq',
    ...(chceHistorii ? { historie: historie.slice(-260) } : {}),
  };
}
