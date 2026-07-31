import type { SferaId } from './types';

export interface UrovenDef {
  lvl: number;
  prah: number;
  nazev: string;
  pribude: string;
}

export const UROVNE: Record<SferaId, UrovenDef[]> = {
  castle: [
    { lvl: 0, prah: 0, nazev: 'Holá pláň', pribude: 'kopec, cesta, vyznačené základy kolíky' },
    { lvl: 1, prah: 1, nazev: 'Dřevěná tvrz', pribude: 'palisáda, dřevěná věž, doškové střechy, kouř z komína' },
    { lvl: 2, prah: 80_000, nazev: 'Kamenná tvrz', pribude: 'kamenný donjon, věž s červenou střechou, nádvoří, studna' },
    { lvl: 3, prah: 150_000, nazev: 'Opevněný dvorec', pribude: 'dvě boční věže, hradní brána, hospodářská stavení' },
    { lvl: 4, prah: 250_000, nazev: 'Vysoká věž', pribude: 'hlavní věž dvojnásobné výšky, zlatá špička, kaple' },
    { lvl: 5, prah: 400_000, nazev: 'Katedrála', pribude: 'katedrála s růžicovým oknem, hodinová věž, dlažba' },
    { lvl: 6, prah: 600_000, nazev: 'Zlatá kupole', pribude: 'zlacená kupole, praporce na všech věžích, zahrady' },
    { lvl: 7, prah: 1_000_000, nazev: 'Královské sídlo', pribude: 'vnitřní prstenec, palác, most, v noci rozsvícená okna' },
  ],
  wall: [
    { lvl: 0, prah: 0, nazev: 'Vyměřeno', pribude: 'kolíky a vyrytý příkop v trávě' },
    { lvl: 1, prah: 1, nazev: 'Palisáda', pribude: 'dřevěný kůlový plot, jedna brána' },
    { lvl: 2, prah: 40_000, nazev: 'Nízká zeď', pribude: 'kamenná zeď do poloviny výšky, dvě rohové bašty' },
    { lvl: 3, prah: 80_000, nazev: 'Cimbuří', pribude: 'plná výška, cimbuří, ochoz, čtyři bašty' },
    { lvl: 4, prah: 160_000, nazev: 'Brána s mříží', pribude: 'padací mříž, strážnice, praporce na baštách' },
    { lvl: 5, prah: 250_000, nazev: 'První dělo', pribude: 'dělo na bráně, hlídka chodící po ochozu' },
    { lvl: 6, prah: 400_000, nazev: 'Dělostřelectvo', pribude: 'tři děla, vodní příkop kolem hradeb' },
    { lvl: 7, prah: 600_000, nazev: 'Druhý prstenec', pribude: 'vnější prstenec hradeb, barbakán' },
  ],
  horde: [
    { lvl: 0, prah: 0, nazev: 'Prázdné tábořiště', pribude: 'vyšlapaný kruh, vyhaslé ohniště' },
    { lvl: 1, prah: 1, nazev: 'Průzkumníci', pribude: 'stan, dva pěšáci, oheň' },
    { lvl: 2, prah: 20_000, nazev: 'Setnina', pribude: 'šest pěšáků, kopiníci, tři stany' },
    { lvl: 3, prah: 45_000, nazev: 'Lučištníci', pribude: 'čtyři lučištníci, korouhev v čele' },
    { lvl: 4, prah: 80_000, nazev: 'Jízda', pribude: 'tři jezdci, ohrada pro koně' },
    { lvl: 5, prah: 150_000, nazev: 'Obléhací stroje', pribude: 'trebuchet, obléhací věž' },
    { lvl: 6, prah: 250_000, nazev: 'Válečné bubny', pribude: 'druhý jízdní oddíl, bubeníci, formace do šiku' },
    { lvl: 7, prah: 400_000, nazev: 'Vojsko', pribude: 'plná formace, standarty, pochodová animace' },
  ],
};

export interface StavUrovne {
  sferaId: SferaId;
  lvl: number;
  def: UrovenDef;
  dalsi: UrovenDef | null;
  /** Kolik Kč chybí do dalšího prahu; null na maximální úrovni. */
  chybi: number | null;
  /** 0–1, postup uvnitř současné úrovně. Na maximu vždy 1. */
  postup: number;
}

export function urovenSfery(sferaId: SferaId, hodnota: number): StavUrovne {
  const skala = UROVNE[sferaId];
  let index = 0;
  for (let i = 0; i < skala.length; i++) {
    if (hodnota >= skala[i]!.prah) index = i;
  }
  const def = skala[index]!;
  const dalsi = skala[index + 1] ?? null;
  const chybi = dalsi ? Math.max(0, dalsi.prah - hodnota) : null;
  const rozpeti = dalsi ? dalsi.prah - def.prah : 0;
  const postup = dalsi && rozpeti > 0 ? clamp((hodnota - def.prah) / rozpeti, 0, 1) : 1;
  return { sferaId, lvl: def.lvl, def, dalsi, chybi, postup };
}

export function clamp(x: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, x));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

/* --------------------------------------------------------- plynulý růst -- */

/** Počet zubů cimbuří — i vklad 5 000 Kč je vidět. */
export function pocetZubu(hodnotaHradeb: number): number {
  return Math.min(48, Math.floor(hodnotaHradeb / 2_000));
}

/** Výška zdi v jednotkách scény, plynule uvnitř úrovně. */
export function vyskaZdi(uroven: StavUrovne): number {
  const H_MIN = [0, 10, 26, 44, 50, 54, 58, 62];
  const H_MAX = [0, 24, 42, 50, 54, 58, 62, 68];
  const min = H_MIN[uroven.lvl] ?? 0;
  const max = H_MAX[uroven.lvl] ?? min;
  return lerp(min, max, uroven.postup);
}

/** Jedna figura ≈ 5 000 Kč, strop 40 figur na scéně. */
export function pocetFigur(hodnotaHordy: number): number {
  return Math.min(40, Math.floor(hodnotaHordy / 5_000));
}

/* ------------------------------------------------------------ prosperita -- */

export type Nalada = 'bourka' | 'zatazeno' | 'jasno' | 'paprsky' | 'zlataHodina';

export interface Prosperita {
  /** zisk_pct oříznuté na ⟨−0,25; +0,35⟩ */
  hodnota: number;
  nalada: Nalada;
  saturace: number;
  popis: string;
}

export function prosperita(ziskPct: number | null): Prosperita {
  const z = ziskPct ?? 0;
  const hodnota = clamp(z, -0.25, 0.35);
  if (z < -0.1)
    return { hodnota, nalada: 'bourka', saturace: 0.7, popis: 'Bouřkové mraky nad říší' };
  if (z < 0) return { hodnota, nalada: 'zatazeno', saturace: 0.85, popis: 'Zataženo' };
  if (z < 0.1) return { hodnota, nalada: 'jasno', saturace: 1, popis: 'Jasno' };
  if (z < 0.25)
    return { hodnota, nalada: 'paprsky', saturace: 1.06, popis: 'Sluneční paprsky, na cestách povozy' };
  return { hodnota, nalada: 'zlataHodina', saturace: 1.12, popis: 'Zlatá hodina' };
}

/** Jedna drobnost za každé procento zhodnocení, strop 30. Deterministické. */
export function pocetDrobnosti(ziskPct: number | null): number {
  if (ziskPct == null) return 0;
  return clamp(Math.floor(ziskPct * 100), 0, 30);
}

/* --------------------------------------------------------------- level-up -- */

export interface LevelUp {
  sferaId: SferaId;
  zUrovne: number;
  naUroven: number;
  def: UrovenDef;
}

/**
 * Porovná viděné úrovně s aktuálními. Vrací jen *nejvyšší* dosaženou úroveň
 * per sféra — po delší nepřítomnosti se nepřehraje řetěz pěti animací.
 */
export function zjistiLevelUpy(
  videne: Partial<Record<SferaId, number>> | undefined,
  aktualni: Record<SferaId, number>,
): LevelUp[] {
  const vysledek: LevelUp[] = [];
  for (const sferaId of Object.keys(aktualni) as SferaId[]) {
    const predchozi = videne?.[sferaId] ?? 0;
    const nova = aktualni[sferaId];
    if (nova > predchozi) {
      vysledek.push({
        sferaId,
        zUrovne: predchozi,
        naUroven: nova,
        def: UROVNE[sferaId][nova]!,
      });
    }
  }
  return vysledek;
}
