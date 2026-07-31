import { useState } from 'react';
import { nastavPrahy, useStav } from '../data/store';
import type { Zakon } from '../domain/rules';

const ZNAKY: Record<Zakon['stav'], { znak: string; trida: string; popis: string }> = {
  ok: { znak: '✔', trida: 'zisk', popis: 'v pořádku' },
  varovani: { znak: '⚠', trida: 'text-[#8a6a12]', popis: 'blíží se mez' },
  poruseno: { znak: '✖', trida: 'ztrata', popis: 'překročeno' },
  neurceno: { znak: '·', trida: 'opacity-45', popis: 'sleduje se' },
};

export function ZakonyRise({ zakony }: { zakony: readonly Zakon[] }) {
  const [nastaveni, setNastaveni] = useState(false);

  return (
    <div>
      <ul className="list-none">
        {zakony.map((z) => {
          const znak = ZNAKY[z.stav];
          return (
            <li key={z.id} className="border-b border-[var(--inkoust-vlas)] py-4 last:border-b-0">
              <div className="flex items-baseline gap-3">
                <span className={`text-[16px] ${znak.trida}`} aria-hidden="true">
                  {znak.znak}
                </span>
                <div className="grow">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                    <h3 className="text-[16px] font-semibold leading-snug">
                      {z.nazev}
                      <span className="sr-only"> — {znak.popis}</span>
                    </h3>
                    <span className={`cislo text-[14px] ${znak.trida}`}>{z.hodnota}</span>
                  </div>
                  <p className="mt-0.5 text-[14px] opacity-70">{z.detail}</p>
                  {z.postup != null && (
                    <div
                      className="mt-2 h-[6px] w-full max-w-[420px] border border-[var(--inkoust)]"
                      role="img"
                      aria-label={`Naplněno na ${Math.round(z.postup * 100)} %`}
                    >
                      <div
                        className="h-full"
                        style={{
                          width: `${Math.min(100, z.postup * 100)}%`,
                          background: z.stav === 'poruseno' ? 'var(--rumelka)' : 'var(--inkoust)',
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        className="tlacitko mt-6"
        onClick={() => setNastaveni((v) => !v)}
        aria-expanded={nastaveni}
      >
        {nastaveni ? 'Skrýt prahy' : 'Upravit prahy'}
      </button>

      {nastaveni && <PrahyFormular />}
    </div>
  );
}

function PrahyFormular() {
  const { prahy } = useStav().nastaveni;

  return (
    <div className="mt-5 grid grid-cols-1 gap-x-8 gap-y-5 border-t-[1.8px] border-[var(--inkoust)] pt-5 sm:grid-cols-2 lg:grid-cols-3">
      <Prah
        popisek="Strop vkladů do Hordy (Kč)"
        hodnota={prahy.hordaStropVkladu}
        krok={1000}
        onZmena={(v) => nastavPrahy({ hordaStropVkladu: v })}
      />
      <Prah
        popisek="Max. IT expozice (%)"
        hodnota={prahy.itExpoziceMax * 100}
        krok={1}
        onZmena={(v) => nastavPrahy({ itExpoziceMax: v / 100 })}
      />
      <Prah
        popisek="Odhad IT podílu v Hradbách (%)"
        hodnota={prahy.itPodilVeWall * 100}
        krok={1}
        onZmena={(v) => nastavPrahy({ itPodilVeWall: v / 100 })}
      />
      <Prah
        popisek="Měsíční tranše do Hradeb (Kč)"
        hodnota={prahy.hradbyMesicniTranse}
        krok={100}
        onZmena={(v) => nastavPrahy({ hradbyMesicniTranse: v })}
      />
      <Prah
        popisek="Počet tranší"
        hodnota={prahy.hradbyPocetTransi}
        krok={1}
        onZmena={(v) => nastavPrahy({ hradbyPocetTransi: v })}
      />
    </div>
  );
}

function Prah({
  popisek,
  hodnota,
  krok,
  onZmena,
}: {
  popisek: string;
  hodnota: number;
  krok: number;
  onZmena: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="popisek">{popisek}</span>
      <input
        type="number"
        className="pole"
        value={Math.round(hodnota * 100) / 100}
        step={krok}
        min={0}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v) && v >= 0) onZmena(v);
        }}
      />
    </label>
  );
}
