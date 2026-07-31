import type { Aktivum, Cena, Mena } from '../../domain/types';

export interface PriceProvider {
  id: string;
  fetch(aktivum: Aktivum, datum?: string): Promise<Cena | null>;
}

export interface FxProvider {
  id: string;
  fetch(mena: Mena, datum?: string): Promise<{ datum: string; kurz: number } | null>;
}

/** Výsledek pokusu o načtení — chyba se nikdy neprobublá jako výjimka. */
export interface VysledekNacteni {
  aktivumId: string;
  cena: Cena | null;
  zdroj: string | null;
  chyba: string | null;
}

/**
 * Zkouší poskytovatele v pořadí a bere první úspěch.
 * Když selžou všichni, vrací `cena: null` — UI ukáže poslední známou cenu.
 */
export async function nactiCenu(
  aktivum: Aktivum,
  poskytovatele: readonly PriceProvider[],
  datum?: string,
): Promise<VysledekNacteni> {
  const chyby: string[] = [];
  for (const p of poskytovatele) {
    try {
      const cena = await p.fetch(aktivum, datum);
      if (cena) return { aktivumId: aktivum.id, cena, zdroj: p.id, chyba: null };
      chyby.push(`${p.id}: bez dat`);
    } catch (e) {
      chyby.push(`${p.id}: ${e instanceof Error ? e.message : 'chyba'}`);
    }
  }
  return {
    aktivumId: aktivum.id,
    cena: null,
    zdroj: null,
    chyba: chyby.join('; ') || 'žádný zdroj',
  };
}

export async function sTimeoutem<T>(slib: Promise<T>, ms = 8_000): Promise<T> {
  let casovac: ReturnType<typeof setTimeout>;
  const vyprsi = new Promise<never>((_, odmitni) => {
    casovac = setTimeout(() => odmitni(new Error('vypršel čas')), ms);
  });
  try {
    return await Promise.race([slib, vyprsi]);
  } finally {
    clearTimeout(casovac!);
  }
}
