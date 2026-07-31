export type SferaId = 'castle' | 'wall' | 'horde';
export type Mena = 'CZK' | 'EUR' | 'USD';
export type Ocenovani = 'jednotky' | 'sazba';
export type CenaZdroj = 'rucne' | 'yahoo' | 'stooq' | 'csob';

export interface Vklad {
  id: string;
  datum: string; // ISO 'YYYY-MM-DD'
  castka: number; // CZK, kladné číslo
  poplatek?: number; // CZK, odečte se před nákupem jednotek
  cenaZaKus?: number; // v měně aktiva
  poznamka?: string;
}

export interface Cena {
  datum: string;
  cena: number; // v měně aktiva
  zdroj: CenaZdroj;
}

export interface Aktivum {
  id: string;
  sferaId: SferaId;
  nazev: string;
  isin?: string;
  ticker?: string;
  mena: Mena;
  ocenovani: Ocenovani;
  planovanaSazbaPa: number; // desetinné číslo, 0.0742
  akumulacni?: boolean;
  /** 'penzijni' skrývá tříletý časový test — platí tam jiný režim výplaty. */
  rezimDane?: 'casovyTest' | 'penzijni';
  vklady: Vklad[];
  ceny: Cena[]; // seřazeno vzestupně podle data
}

export type UdalostTyp = 'vklad' | 'levelup' | 'cena' | 'pravidlo';

export interface Udalost {
  id: string;
  datum: string;
  typ: UdalostTyp;
  sferaId?: SferaId;
  text: string;
}

/** Kurzy: { '2026-07-31': { EUR: 24.65, USD: 22.1 } } */
export type Kurzy = Record<string, Partial<Record<Mena, number>>>;

export interface Prahy {
  hordaStropVkladu: number;
  itExpoziceMax: number;
  itPodilVeWall: number;
  hradbyMesicniTranse: number;
  hradbyPocetTransi: number;
}

export interface Nastaveni {
  zobrazitProjekce: boolean;
  nocniRezim: 'auto' | 'den' | 'noc';
  prahy: Prahy;
}

export interface Stav {
  verze: 1;
  aktiva: Aktivum[];
  kurzy: Kurzy;
  nastaveni: Nastaveni;
  kronika: Udalost[];
  /** Nejvyšší úroveň sféry, kterou už uživatel viděl odehrát. */
  videnUrovne?: Record<SferaId, number>;
}
