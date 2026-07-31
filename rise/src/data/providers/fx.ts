import type { Mena } from '../../domain/types';
import { sTimeoutem, type FxProvider } from './index';

/**
 * ECB přes frankfurter.dev — CORS povolený, jde volat přímo z prohlížeče.
 * O víkendech a svátcích se kurzy nepublikují; API samo vrátí nejbližší
 * předchozí obchodní den a jeho datum, takže se nikdy neuloží kurz „k sobotě".
 */
export const FrankfurterProvider: FxProvider = {
  id: 'frankfurter',
  async fetch(mena: Mena, datum?: string) {
    if (mena === 'CZK') return { datum: datum ?? new Date().toISOString().slice(0, 10), kurz: 1 };
    const cesta = datum ?? 'latest';
    const odpoved = await sTimeoutem(
      fetch(`https://api.frankfurter.dev/v1/${cesta}?base=${mena}&symbols=CZK`),
    );
    if (!odpoved.ok) throw new Error(`HTTP ${odpoved.status}`);
    const data: unknown = await odpoved.json();
    if (!data || typeof data !== 'object') return null;
    const d = data as { date?: unknown; rates?: { CZK?: unknown } };
    const kurz = d.rates?.CZK;
    if (typeof kurz !== 'number' || !Number.isFinite(kurz)) return null;
    if (typeof d.date !== 'string') return null;
    return { datum: d.date, kurz };
  },
};

/** Záloha přes vlastní proxy, kdyby ECB nebyla dostupná přímo. */
export const ProxyFxProvider: FxProvider = {
  id: 'proxy',
  async fetch(mena: Mena, datum?: string) {
    if (mena === 'CZK') return { datum: datum ?? new Date().toISOString().slice(0, 10), kurz: 1 };
    const odpoved = await sTimeoutem(
      fetch(`/api/fx?mena=${mena}${datum ? `&datum=${datum}` : ''}`),
    );
    if (!odpoved.ok) throw new Error(`HTTP ${odpoved.status}`);
    const data: unknown = await odpoved.json();
    const d = data as { datum?: unknown; kurz?: unknown };
    if (typeof d?.kurz !== 'number' || typeof d?.datum !== 'string') return null;
    return { datum: d.datum, kurz: d.kurz };
  },
};

export const FX_POSKYTOVATELE = [FrankfurterProvider, ProxyFxProvider];

export async function nactiKurz(
  mena: Mena,
  datum?: string,
): Promise<{ datum: string; kurz: number } | null> {
  for (const p of FX_POSKYTOVATELE) {
    try {
      const v = await p.fetch(mena, datum);
      if (v) return v;
    } catch {
      // zkusíme dalšího; výpadek kurzu nesmí nic rozbít
    }
  }
  return null;
}
