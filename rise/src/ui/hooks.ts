import { useEffect, useMemo, useState } from 'react';
import { useStav } from '../data/store';
import { dnesIso } from '../domain/datum';
import { urovenSfery } from '../domain/levels';
import { vyhodnotZakony, type Zakon } from '../domain/rules';
import type { SferaId } from '../domain/types';
import { oceniPortfolio, SFERY, type OceneniPortfolia } from '../domain/valuation';

export function usePortfolio(): {
  portfolio: OceneniPortfolia;
  urovne: Record<SferaId, number>;
  zakony: Zakon[];
} {
  const stav = useStav();
  const dnes = dnesIso();

  return useMemo(() => {
    const portfolio = oceniPortfolio(stav.aktiva, stav.kurzy, dnes);
    const urovne = {} as Record<SferaId, number>;
    for (const s of SFERY) urovne[s] = urovenSfery(s, portfolio.sfery[s].hodnota).lvl;
    return {
      portfolio,
      urovne,
      zakony: vyhodnotZakony(portfolio, stav.aktiva, stav.nastaveni.prahy, dnes),
    };
  }, [stav, dnes]);
}

/** Hash routing bez závislosti na routeru — appka má dvě obrazovky. */
export function useCesta(): string {
  const [cesta, setCesta] = useState(() => window.location.hash.replace(/^#/, '') || '/');
  useEffect(() => {
    const zmena = () => setCesta(window.location.hash.replace(/^#/, '') || '/');
    window.addEventListener('hashchange', zmena);
    return () => window.removeEventListener('hashchange', zmena);
  }, []);
  return cesta;
}

export function useReducedMotion(): boolean {
  const [tlumit, setTlumit] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const zmena = () => setTlumit(mq.matches);
    mq.addEventListener('change', zmena);
    return () => mq.removeEventListener('change', zmena);
  }, []);
  return tlumit;
}

/** Čísla dopočítají tweenem — 800 ms, easeOutCubic. */
export function useTweenCislo(cil: number, tlumit: boolean, doba = 800): number {
  const [hodnota, setHodnota] = useState(cil);

  useEffect(() => {
    if (tlumit) {
      setHodnota(cil);
      return;
    }
    let raf = 0;
    const zacatek = performance.now();
    const od = hodnota;
    const rozdil = cil - od;
    if (Math.abs(rozdil) < 0.5) {
      setHodnota(cil);
      return;
    }
    const krok = (cas: number) => {
      const t = Math.min(1, (cas - zacatek) / doba);
      const e = 1 - Math.pow(1 - t, 3);
      setHodnota(od + rozdil * e);
      if (t < 1) raf = requestAnimationFrame(krok);
    };
    raf = requestAnimationFrame(krok);
    return () => cancelAnimationFrame(raf);
    // hodnota schválně mimo závislosti: tween se má spustit jen při změně cíle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cil, tlumit, doba]);

  return hodnota;
}

/** Denní doba pro atmosféru scény. */
export function useNoc(rezim: 'auto' | 'den' | 'noc'): boolean {
  const [noc, setNoc] = useState(() => jeNoc(rezim));
  useEffect(() => {
    setNoc(jeNoc(rezim));
    if (rezim !== 'auto') return;
    const t = setInterval(() => setNoc(jeNoc(rezim)), 60_000);
    return () => clearInterval(t);
  }, [rezim]);
  return noc;
}

function jeNoc(rezim: 'auto' | 'den' | 'noc'): boolean {
  if (rezim === 'noc') return true;
  if (rezim === 'den') return false;
  const h = new Date().getHours();
  return h >= 20 || h < 6;
}
