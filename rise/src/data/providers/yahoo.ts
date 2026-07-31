import type { Aktivum, Cena } from '../../domain/types';
import { sTimeoutem, type PriceProvider } from './index';

/**
 * Yahoo Finance přes vlastní serverless proxy — z prohlížeče to CORS neumožní.
 * Endpoint je neoficiální a může se změnit; proto je za ním ještě Stooq
 * a nad tím vším ruční zadání ceny.
 */
export const YahooProvider: PriceProvider = {
  id: 'yahoo',
  async fetch(aktivum: Aktivum): Promise<Cena | null> {
    if (!aktivum.ticker) return null;
    const odpoved = await sTimeoutem(
      fetch(`/api/price?ticker=${encodeURIComponent(aktivum.ticker)}&zdroj=yahoo`),
    );
    if (!odpoved.ok) throw new Error(`HTTP ${odpoved.status}`);
    const data: unknown = await odpoved.json();
    return prevedNaCenu(data, 'yahoo');
  },
};

export const StooqProvider: PriceProvider = {
  id: 'stooq',
  async fetch(aktivum: Aktivum): Promise<Cena | null> {
    if (!aktivum.ticker) return null;
    const odpoved = await sTimeoutem(
      fetch(`/api/price?ticker=${encodeURIComponent(aktivum.ticker)}&zdroj=stooq`),
    );
    if (!odpoved.ok) throw new Error(`HTTP ${odpoved.status}`);
    const data: unknown = await odpoved.json();
    return prevedNaCenu(data, 'stooq');
  },
};

function prevedNaCenu(data: unknown, zdroj: 'yahoo' | 'stooq'): Cena | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as { datum?: unknown; cena?: unknown };
  if (typeof d.cena !== 'number' || !Number.isFinite(d.cena) || d.cena <= 0) return null;
  if (typeof d.datum !== 'string') return null;
  return { datum: d.datum, cena: d.cena, zdroj };
}

/** Ruční zadání je vždy plnohodnotná cesta, ne nouzovka. */
export const ManualProvider: PriceProvider = {
  id: 'rucne',
  async fetch(): Promise<Cena | null> {
    return null;
  },
};

/** ČSOB penzijní fond — ve verzi 1 jen ruční zadání, scraper až později. */
export const CsobProvider: PriceProvider = {
  id: 'csob',
  async fetch(): Promise<Cena | null> {
    return null;
  },
};

export const POSKYTOVATELE = [YahooProvider, StooqProvider];
