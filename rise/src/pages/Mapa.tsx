import { motion, useReducedMotion as fmReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useStav } from '../data/store';
import type { SferaId } from '../domain/types';
import { Map } from '../scene/Map';
import { Cartouche } from '../ui/Cartouche';
import { useNoc, usePortfolio, useReducedMotion } from '../ui/hooks';
import { Ledger, LedgerKarty } from '../ui/Ledger';
import { LevelUpToast } from '../ui/LevelUpToast';
import { useLevelUp } from '../ui/useLevelUp';

export default function Mapa() {
  const stav = useStav();
  const { portfolio, urovne } = usePortfolio();
  const tlumit = useReducedMotion() || !!fmReducedMotion();
  const noc = useNoc(stav.nastaveni.nocniRezim);

  const [hover, setHover] = useState<SferaId | null>(null);
  const [sheet, setSheet] = useState<SferaId | null>(null);
  const { prehravany, hotovo } = useLevelUp(urovne);

  // Kamera najede na sféru, která právě povyšuje; s reduced-motion zůstává celek.
  const kameraNa = prehravany?.sferaId ?? null;

  // Jednorázový rumělkový záblesk vinětace při ztrátě.
  const ztrata = (portfolio.ziskPct ?? 0) < -0.0005;
  const [zablesk, setZablesk] = useState(false);
  useEffect(() => {
    if (ztrata && !tlumit) {
      setZablesk(true);
      const t = setTimeout(() => setZablesk(false), 900);
      return () => clearTimeout(t);
    }
  }, [ztrata, tlumit]);

  const aktivni = sheet ?? hover;

  return (
    <div className="mx-auto max-w-[1280px] px-3 py-6 sm:px-6">
      <LevelUpToast levelUp={prehravany} tlumit={tlumit} onHotovo={hotovo} />

      <motion.main
        initial={tlumit ? false : { scaleY: 0.94, opacity: 0 }}
        animate={{ scaleY: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{ transformOrigin: 'top center' }}
        className="relative"
      >
        <Map
          portfolio={portfolio}
          noc={noc}
          aktivni={aktivni}
          onAktivni={setHover}
          onOtevri={(s) => setSheet((v) => (v === s ? null : s))}
          kameraNa={kameraNa}
          tlumit={tlumit}
        />

        {/* rumělkový záblesk — jednorázově, bez opakování */}
        {zablesk && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse at center, transparent 55%, var(--rumelka) 130%)',
              opacity: 0.4,
              transition: 'opacity 900ms ease-out',
            }}
          />
        )}

        {/* kartuše na desktopu (hover), skrytá na mobilu */}
        {hover && !sheet && (
          <div className="hidden sm:block">
            <Cartouche sferaId={hover} portfolio={portfolio} />
          </div>
        )}
      </motion.main>

      {/* bottom sheet po tapu/Enteru */}
      {sheet && (
        <>
          <div
            className="fixed inset-0 z-30 bg-[var(--inkoust)]/25"
            onClick={() => setSheet(null)}
            aria-hidden="true"
          />
          <Cartouche
            sferaId={sheet}
            portfolio={portfolio}
            bottomSheet
            onZavrit={() => setSheet(null)}
          />
        </>
      )}

      <section aria-label="Souhrn portfolia" className="mx-auto mt-6 max-w-[1080px] px-1 sm:px-4">
        <div className="hidden sm:block">
          <Ledger portfolio={portfolio} />
        </div>
        <div className="sm:hidden">
          <LedgerKarty portfolio={portfolio} />
        </div>

        <p className="mt-6 text-right text-[15px]">
          <a href="#/kronika" className="underline underline-offset-4">
            Kronika a správa →
          </a>
        </p>
      </section>
    </div>
  );
}
