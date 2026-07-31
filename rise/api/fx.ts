/**
 * Záložní proxy na kurzy ECB. Prohlížeč umí frankfurter.dev volat přímo,
 * tohle je pojistka pro případ, že by přímé volání neprošlo.
 *
 *   /api/fx?mena=EUR&datum=2026-07-31
 *
 * ECB nepublikuje o víkendech a svátcích — API vrátí nejbližší předchozí
 * obchodní den a `datum` v odpovědi je právě ten den, ne ten dotázaný.
 */

interface Pozadavek {
  query: Record<string, string | string[] | undefined>;
}

interface Odpoved {
  status(kod: number): Odpoved;
  setHeader(jmeno: string, hodnota: string): void;
  json(telo: unknown): void;
}

const POVOLENE_MENY = new Set(['EUR', 'USD']);
const ISO_DATUM = /^\d{4}-\d{2}-\d{2}$/;

export default async function handler(req: Pozadavek, res: Odpoved): Promise<void> {
  const mena = (prvni(req.query.mena) ?? 'EUR').toUpperCase();
  const datum = prvni(req.query.datum);

  // Historické kurzy se nemění — smí se cachovat dlouho.
  res.setHeader('Cache-Control', datum ? 's-maxage=86400' : 's-maxage=3600');

  if (!POVOLENE_MENY.has(mena)) {
    res.status(400).json({ chyba: `Měna ${mena} není podporovaná.` });
    return;
  }
  if (datum && !ISO_DATUM.test(datum)) {
    res.status(400).json({ chyba: 'Parametr `datum` musí být ve tvaru YYYY-MM-DD.' });
    return;
  }

  try {
    const odpoved = await fetch(
      `https://api.frankfurter.dev/v1/${datum ?? 'latest'}?base=${mena}&symbols=CZK`,
    );
    if (!odpoved.ok) throw new Error(`ECB proxy vrátila HTTP ${odpoved.status}`);

    const data = (await odpoved.json()) as { date?: string; rates?: { CZK?: number } };
    const kurz = data.rates?.CZK;
    if (typeof kurz !== 'number' || !data.date) {
      res.status(502).json({ chyba: 'Kurz se nepodařilo přečíst.' });
      return;
    }

    res.status(200).json({ datum: data.date, mena, kurz });
  } catch (e) {
    res.status(502).json({ chyba: e instanceof Error ? e.message : 'Načtení kurzu selhalo.' });
  }
}

function prvni(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}
