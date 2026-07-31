import { useSyncExternalStore } from 'react';
import { dnesIso } from '../domain/datum';
import { formatLetopis } from '../domain/money';
import type { Aktivum, Cena, SferaId, Stav, Udalost, UdalostTyp, Vklad } from '../domain/types';
import { vychoziStav } from './vychozi';

const KLIC = 'rise.v1';

/* ------------------------------------------------------------- migrace -- */

/**
 * Uložený stav se nesmí ztratit, až se model změní. Každá migrace posune
 * `verze` o jednu a vrací stav ve tvaru, který umí načíst další krok.
 */
type NeznamyStav = Record<string, unknown>;

const MIGRACE: Record<number, (s: NeznamyStav) => NeznamyStav> = {
  // 0 → 1: první publikované schéma. Doplní pole, která tehdy chyběla.
  0: (s) => ({ ...s, verze: 1, kurzy: s.kurzy ?? {}, kronika: s.kronika ?? [] }),
};

export function migruj(vstup: unknown): Stav {
  if (!vstup || typeof vstup !== 'object') return vychoziStav();
  let s = vstup as NeznamyStav;
  let verze = typeof s.verze === 'number' ? s.verze : 0;

  while (verze < 1) {
    const krok = MIGRACE[verze];
    if (!krok) break;
    s = krok(s);
    verze += 1;
  }

  return srovnej(s);
}

/** Doplní chybějící pole na výchozí hodnoty, ať načtení nikdy nespadne. */
function srovnej(s: NeznamyStav): Stav {
  const vychozi = vychoziStav();
  const aktiva = Array.isArray(s.aktiva) ? (s.aktiva as Aktivum[]) : vychozi.aktiva;
  const nastaveni = (s.nastaveni ?? {}) as Partial<Stav['nastaveni']>;
  return {
    verze: 1,
    aktiva: aktiva.map((a) => ({
      ...a,
      vklady: Array.isArray(a.vklady) ? a.vklady : [],
      ceny: Array.isArray(a.ceny) ? [...a.ceny].sort(podleData) : [],
    })),
    kurzy: (s.kurzy as Stav['kurzy']) ?? {},
    nastaveni: {
      zobrazitProjekce: nastaveni.zobrazitProjekce ?? true,
      nocniRezim: nastaveni.nocniRezim ?? 'auto',
      prahy: { ...vychozi.nastaveni.prahy, ...(nastaveni.prahy ?? {}) },
    },
    kronika: Array.isArray(s.kronika) ? (s.kronika as Udalost[]) : [],
    videnUrovne: (s.videnUrovne as Stav['videnUrovne']) ?? undefined,
  };
}

const podleData = (a: { datum: string }, b: { datum: string }) =>
  a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : 0;

/* --------------------------------------------------------------- store -- */

let stav: Stav = nacti();
const posluchaci = new Set<() => void>();

function nacti(): Stav {
  if (typeof localStorage === 'undefined') return vychoziStav();
  try {
    const syrovy = localStorage.getItem(KLIC);
    if (!syrovy) return vychoziStav();
    return migruj(JSON.parse(syrovy));
  } catch {
    // Poškozený stav nesmí zabránit spuštění appky.
    return vychoziStav();
  }
}

function uloz(novy: Stav): void {
  stav = novy;
  try {
    localStorage.setItem(KLIC, JSON.stringify(novy));
  } catch {
    // Plné úložiště nebo privátní režim — appka běží dál, jen bez perzistence.
  }
  for (const p of posluchaci) p();
}

export function ziskejStav(): Stav {
  return stav;
}

export function nastavStav(zmena: (s: Stav) => Stav): void {
  uloz(zmena(stav));
}

function odebirej(posluchac: () => void): () => void {
  posluchaci.add(posluchac);
  return () => posluchaci.delete(posluchac);
}

export function useStav(): Stav {
  return useSyncExternalStore(odebirej, ziskejStav, ziskejStav);
}

/* ------------------------------------------------------------- kronika -- */

export function zapisDoKroniky(
  s: Stav,
  typ: UdalostTyp,
  text: string,
  sferaId?: SferaId,
  datum = dnesIso(),
): Stav {
  const udalost: Udalost = { id: id(), datum, typ, text, ...(sferaId ? { sferaId } : {}) };
  return { ...s, kronika: [...s.kronika, udalost] };
}

export function letopisnyRadek(u: Udalost): string {
  return `${formatLetopis(u.datum)} — ${u.text}`;
}

/* --------------------------------------------------------------- akce -- */

export function id(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function pridejVklad(aktivumId: string, vklad: Omit<Vklad, 'id'>): void {
  nastavStav((s) => {
    const aktivum = s.aktiva.find((a) => a.id === aktivumId);
    if (!aktivum) return s;
    const novy: Vklad = { ...vklad, id: id() };
    const aktiva = s.aktiva.map((a) =>
      a.id === aktivumId ? { ...a, vklady: [...a.vklady, novy].sort(podleData) } : a,
    );
    return zapisDoKroniky(
      { ...s, aktiva },
      'vklad',
      `${textVkladu(aktivum.sferaId)} ${formatCastku(vklad.castka)}.`,
      aktivum.sferaId,
      vklad.datum,
    );
  });
}

function textVkladu(sferaId: SferaId): string {
  switch (sferaId) {
    case 'castle':
      return 'Do pokladny hradu uloženo';
    case 'wall':
      return 'Na stavbu hradeb vydáno';
    case 'horde':
      return 'Hordě na výpravu předáno';
  }
}

function formatCastku(castka: number): string {
  return `${new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 0 }).format(castka)} Kč`;
}

export function upravVklad(aktivumId: string, vkladId: string, zmena: Partial<Vklad>): void {
  nastavStav((s) => ({
    ...s,
    aktiva: s.aktiva.map((a) =>
      a.id === aktivumId
        ? {
            ...a,
            vklady: a.vklady.map((v) => (v.id === vkladId ? { ...v, ...zmena } : v)).sort(podleData),
          }
        : a,
    ),
  }));
}

export function smazVklad(aktivumId: string, vkladId: string): void {
  nastavStav((s) => {
    const aktivum = s.aktiva.find((a) => a.id === aktivumId);
    const vklad = aktivum?.vklady.find((v) => v.id === vkladId);
    const aktiva = s.aktiva.map((a) =>
      a.id === aktivumId ? { ...a, vklady: a.vklady.filter((v) => v.id !== vkladId) } : a,
    );
    if (!aktivum || !vklad) return { ...s, aktiva };
    return zapisDoKroniky(
      { ...s, aktiva },
      'vklad',
      `Zápis o vkladu ${formatCastku(vklad.castka)} vymazán z účtů.`,
      aktivum.sferaId,
    );
  });
}

export function pridejCenu(aktivumId: string, cena: Cena): void {
  nastavStav((s) => ({
    ...s,
    aktiva: s.aktiva.map((a) =>
      a.id === aktivumId
        ? { ...a, ceny: [...a.ceny.filter((c) => c.datum !== cena.datum), cena].sort(podleData) }
        : a,
    ),
  }));
}

export function upravAktivum(aktivumId: string, zmena: Partial<Aktivum>): void {
  nastavStav((s) => ({
    ...s,
    aktiva: s.aktiva.map((a) => (a.id === aktivumId ? { ...a, ...zmena } : a)),
  }));
}

export function nastavKurz(datum: string, mena: 'EUR' | 'USD', kurz: number): void {
  nastavStav((s) => ({
    ...s,
    kurzy: { ...s.kurzy, [datum]: { ...(s.kurzy[datum] ?? {}), [mena]: kurz } },
  }));
}

export function nastavPrahy(prahy: Partial<Stav['nastaveni']['prahy']>): void {
  nastavStav((s) => ({
    ...s,
    nastaveni: { ...s.nastaveni, prahy: { ...s.nastaveni.prahy, ...prahy } },
  }));
}

export function nastavNastaveni(zmena: Partial<Omit<Stav['nastaveni'], 'prahy'>>): void {
  nastavStav((s) => ({ ...s, nastaveni: { ...s.nastaveni, ...zmena } }));
}

export function zapamatujUrovne(urovne: Record<SferaId, number>): void {
  nastavStav((s) => ({ ...s, videnUrovne: urovne }));
}

const LEVELUP_VETY: Record<SferaId, string> = {
  castle: 'Hrad povýšen',
  wall: 'Hradby povýšeny',
  horde: 'Horda povýšena',
};

export function zaznamenejLevelUp(sferaId: SferaId, nazevUrovne: string): void {
  nastavStav((s) =>
    zapisDoKroniky(s, 'levelup', `${LEVELUP_VETY[sferaId]} — ${nazevUrovne}.`, sferaId),
  );
}

/* ------------------------------------------------------- export/import -- */

export function exportJson(s: Stav = stav): string {
  return JSON.stringify(s, null, 2);
}

export function importJson(text: string): { ok: true } | { ok: false; chyba: string } {
  try {
    const vstup: unknown = JSON.parse(text);
    if (!vstup || typeof vstup !== 'object') return { ok: false, chyba: 'Soubor není platný JSON objekt.' };
    if (!Array.isArray((vstup as NeznamyStav).aktiva))
      return { ok: false, chyba: 'V souboru chybí pole `aktiva`.' };
    uloz(migruj(vstup));
    return { ok: true };
  } catch (e) {
    return { ok: false, chyba: e instanceof Error ? e.message : 'Soubor se nepodařilo přečíst.' };
  }
}

export function exportCsv(s: Stav = stav): string {
  const hlavicka = ['aktivum', 'isin', 'sfera', 'datum', 'castka_czk', 'poplatek_czk', 'cena_za_kus', 'mena', 'poznamka'];
  const radky = s.aktiva.flatMap((a) =>
    a.vklady.map((v) => [
      a.nazev,
      a.isin ?? '',
      a.sferaId,
      v.datum,
      String(v.castka),
      String(v.poplatek ?? 0),
      v.cenaZaKus == null ? '' : String(v.cenaZaKus),
      a.mena,
      v.poznamka ?? '',
    ]),
  );
  return [hlavicka, ...radky].map((r) => r.map(csvBunka).join(',')).join('\n');
}

function csvBunka(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function vymazVse(): void {
  try {
    localStorage.removeItem(KLIC);
  } catch {
    // nevadí, stav se stejně přepíše v paměti
  }
  uloz(vychoziStav());
}
