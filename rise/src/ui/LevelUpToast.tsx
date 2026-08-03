import { AnimatePresence, motion } from 'framer-motion';
import type { LevelUp } from '../domain/levels';
import { NAZVY_SFER } from '../domain/valuation';

const SLOVESA: Record<string, string> = {
  castle: 'THE CASTLE RISES',
  wall: 'THE WALLS RISE',
  horde: 'THE HORDE GROWS',
};

/** A toast shaped like a wax seal: „THE WALLS RISE — Battlements". */
export function LevelUpToast({
  levelUp,
  tlumit,
  onHotovo,
}: {
  levelUp: LevelUp | null;
  tlumit: boolean;
  onHotovo: () => void;
}) {
  return (
    <AnimatePresence>
      {levelUp && (
        <motion.div
          key={`${levelUp.sferaId}-${levelUp.naUroven}`}
          role="status"
          aria-live="polite"
          className="fixed left-1/2 top-8 z-50 -translate-x-1/2"
          initial={tlumit ? { opacity: 0 } : { opacity: 0, y: -24, scale: 0.92 }}
          animate={tlumit ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={
            tlumit ? { duration: 0.15 } : { type: 'spring', stiffness: 320, damping: 22 }
          }
          onAnimationComplete={() => {
            setTimeout(onHotovo, tlumit ? 2600 : 3400);
          }}
        >
          <div className="relative border-2 border-[var(--inkoust)] bg-[var(--pergamen)] px-8 py-4 text-center">
            {/* pečeť */}
            <div
              aria-hidden="true"
              className="absolute -left-5 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full border-2 border-[var(--inkoust)] bg-[var(--rumelka)]"
            >
              <span className="flex h-full items-center justify-center font-display text-[16px] font-bold text-[var(--pergamen)]">
                R
              </span>
            </div>
            <p className="font-display text-[13px] font-semibold tracking-[0.16em]">
              {SLOVESA[levelUp.sferaId] ?? NAZVY_SFER[levelUp.sferaId].toUpperCase()}
            </p>
            <p className="mt-1 font-display text-[19px] tracking-[0.06em] text-[var(--zlato)]">
              {levelUp.def.nazev}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
