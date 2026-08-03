import type { SferaId } from './types';

export interface UrovenDef {
  lvl: number;
  prah: number;
  nazev: string;
  pribude: string;
}

export const UROVNE: Record<SferaId, UrovenDef[]> = {
  castle: [
    { lvl: 0, prah: 0, nazev: 'Bare Plain', pribude: 'hill, road, foundations staked out' },
    { lvl: 1, prah: 1, nazev: 'Timber Keep', pribude: 'palisade, wooden tower, thatched roofs, smoke from the chimney' },
    { lvl: 2, prah: 80_000, nazev: 'Stone Keep', pribude: 'stone donjon, red-roofed tower, courtyard, well' },
    { lvl: 3, prah: 150_000, nazev: 'Fortified Manor', pribude: 'two flanking towers, castle gate, farm buildings' },
    { lvl: 4, prah: 250_000, nazev: 'High Tower', pribude: 'keep at double height, gilded spire, chapel' },
    { lvl: 5, prah: 400_000, nazev: 'Cathedral', pribude: 'cathedral with a rose window, clock tower, paving' },
    { lvl: 6, prah: 600_000, nazev: 'Gilded Dome', pribude: 'gilded dome, banners on every tower, gardens' },
    { lvl: 7, prah: 1_000_000, nazev: 'Royal Seat', pribude: 'inner ring, palace, bridge, windows lit at night' },
  ],
  wall: [
    { lvl: 0, prah: 0, nazev: 'Marked Out', pribude: 'stakes and a scored ditch in the grass' },
    { lvl: 1, prah: 1, nazev: 'Palisade', pribude: 'timber stake fence, a single gate' },
    { lvl: 2, prah: 40_000, nazev: 'Low Wall', pribude: 'stone wall at half height, two corner bastions' },
    { lvl: 3, prah: 80_000, nazev: 'Battlements', pribude: 'full height, crenellations, wall walk, four bastions' },
    { lvl: 4, prah: 160_000, nazev: 'Portcullis Gate', pribude: 'portcullis, guardhouses, banners on the bastions' },
    { lvl: 5, prah: 250_000, nazev: 'First Cannon', pribude: 'cannon over the gate, a sentry walking the wall' },
    { lvl: 6, prah: 400_000, nazev: 'Artillery', pribude: 'three cannon, a water moat around the walls' },
    { lvl: 7, prah: 600_000, nazev: 'Second Ring', pribude: 'outer ring of walls, barbican' },
  ],
  horde: [
    { lvl: 0, prah: 0, nazev: 'Empty Camp', pribude: 'a trodden circle, a cold fire pit' },
    { lvl: 1, prah: 1, nazev: 'Scouts', pribude: 'one tent, two footmen, a fire' },
    { lvl: 2, prah: 20_000, nazev: 'Company', pribude: 'six footmen, spearmen, three tents' },
    { lvl: 3, prah: 45_000, nazev: 'Archers', pribude: 'four archers, a standard at the head' },
    { lvl: 4, prah: 80_000, nazev: 'Cavalry', pribude: 'three riders, a horse pen' },
    { lvl: 5, prah: 150_000, nazev: 'Siege Engines', pribude: 'trebuchet, siege tower' },
    { lvl: 6, prah: 250_000, nazev: 'War Drums', pribude: 'a second mounted troop, drummers, ranks formed up' },
    { lvl: 7, prah: 400_000, nazev: 'Army', pribude: 'full formation, standards, marching animation' },
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
    return { hodnota, nalada: 'bourka', saturace: 0.7, popis: 'Storm clouds over the realm' };
  if (z < 0) return { hodnota, nalada: 'zatazeno', saturace: 0.85, popis: 'Overcast' };
  if (z < 0.1) return { hodnota, nalada: 'jasno', saturace: 1, popis: 'Clear skies' };
  if (z < 0.25)
    return { hodnota, nalada: 'paprsky', saturace: 1.06, popis: 'Sunbeams, carts on the roads' };
  return { hodnota, nalada: 'zlataHodina', saturace: 1.12, popis: 'Golden hour' };
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
