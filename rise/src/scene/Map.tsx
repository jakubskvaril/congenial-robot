import { useEffect, useRef, useState } from 'react';
import { pocetDrobnosti, prosperita, urovenSfery } from '../domain/levels';
import type { SferaId } from '../domain/types';
import { NAZVY_SFER, type OceneniPortfolia } from '../domain/valuation';
import { Atmosphere, AtmosferaDefs } from './Atmosphere';
import { Castle } from './Castle';
import { Horde } from './Horde';
import { Drobnosti } from './parts/drobnosti';
import { Kartus, Ramec } from './Ramec';
import { Teren } from './Teren';
import { Wall } from './Wall';

/** Neviditelné hitboxy nad sférami — pořadí odpovídá pořadí v Tabu. */
const HITBOXY: Record<SferaId, string> = {
  castle: 'M 640 300 Q 800 268 962 300 L 1010 470 Q 970 580 800 590 Q 630 580 590 470 Z',
  wall:
    'M 790 268 L 990 302 L 1104 424 L 1074 610 L 866 678 L 640 668 L 500 546 L 532 340 Z ' +
    'M 790 336 L 930 360 L 1010 440 L 990 570 L 848 616 L 686 610 L 588 528 L 610 386 Z',
  horde: 'M 108 690 Q 292 654 476 690 Q 500 790 476 872 Q 292 908 108 872 Q 84 790 108 690 Z',
};

export interface MapaProps {
  portfolio: OceneniPortfolia;
  noc: boolean;
  aktivni: SferaId | null;
  onAktivni: (s: SferaId | null) => void;
  onOtevri: (s: SferaId) => void;
  /** Sféra, na kterou má „kamera" najet při level-upu. */
  kameraNa?: SferaId | null;
  tlumit: boolean;
}

const KAMERA: Record<SferaId, [number, number, number, number]> = {
  castle: [520, 240, 560, 350],
  wall: [420, 220, 780, 488],
  horde: [40, 600, 560, 350],
};

const PLNY: [number, number, number, number] = [0, 0, 1600, 1000];

export function Map({
  portfolio,
  noc,
  aktivni,
  onAktivni,
  onOtevri,
  kameraNa,
  tlumit,
}: MapaProps) {
  const urovne = {
    castle: urovenSfery('castle', portfolio.sfery.castle.hodnota),
    wall: urovenSfery('wall', portfolio.sfery.wall.hodnota),
    horde: urovenSfery('horde', portfolio.sfery.horde.hodnota),
  };
  const nalada = prosperita(portfolio.ziskPct);
  const viewBox = useKamera(kameraNa ?? null, tlumit);

  const zivo = nalada.nalada === 'paprsky' || nalada.nalada === 'zlataHodina';
  const ztrata = (portfolio.ziskPct ?? 0) < 0;

  return (
    <svg
      viewBox={viewBox}
      className="block h-auto w-full select-none"
      role="img"
      aria-label={popisMapy(portfolio)}
      style={{ filter: `saturate(${nalada.saturace})` }}
    >
      <defs>
        <AtmosferaDefs noc={noc} nalada={nalada.nalada} />
      </defs>

      {/* 1 — pergamen */}
      <rect x={0} y={0} width={1600} height={1000} fill="var(--pergamen)" />
      <g filter="url(#roztrepeni)">
        <rect x={36} y={36} width={1528} height={844} fill="var(--pergamen)" />
      </g>
      <rect x={36} y={36} width={1528} height={844} fill="url(#vinetace)" />
      <rect x={0} y={0} width={1600} height={1000} filter="url(#zrno)" opacity={0.5} />

      {/* 3 — terén */}
      <Teren zivo={zivo} />

      {/* 4–6 — sféry; neaktivní ustoupí do pozadí */}
      <g style={vrstva('horde', aktivni)}>
        <Horde uroven={urovne.horde} hodnota={portfolio.sfery.horde.hodnota} noc={noc} />
        <Drobnosti sferaId="horde" pocet={pocetDrobnosti(portfolio.sfery.horde.ziskPct)} noc={noc} />
      </g>

      <g style={vrstva('wall', aktivni)}>
        <Wall uroven={urovne.wall} hodnota={portfolio.sfery.wall.hodnota} noc={noc} />
        <Drobnosti sferaId="wall" pocet={pocetDrobnosti(portfolio.sfery.wall.ziskPct)} noc={noc} />
      </g>

      <g style={vrstva('castle', aktivni)}>
        <Castle uroven={urovne.castle} noc={noc} />
        <Drobnosti sferaId="castle" pocet={pocetDrobnosti(portfolio.sfery.castle.ziskPct)} noc={noc} />
      </g>

      {/* 7 — atmosféra */}
      <Atmosphere nalada={nalada.nalada} noc={noc} />

      {/* 8 — kartuše */}
      <Kartus podtitul={nalada.popis} />

      {/* 2 — rám a marginálie nad vším */}
      <Ramec ztrata={ztrata} zisk={(portfolio.ziskPct ?? 0) > 0} />

      {/* hitboxy */}
      <g>
        {(Object.keys(HITBOXY) as SferaId[]).map((s) => (
          <path
            key={s}
            d={HITBOXY[s]}
            fillRule="evenodd"
            fill="transparent"
            tabIndex={0}
            role="button"
            aria-label={`${NAZVY_SFER[s]} — ${urovne[s].def.nazev}. Open details.`}
            className="cursor-pointer outline-offset-4"
            onMouseEnter={() => onAktivni(s)}
            onMouseLeave={() => onAktivni(null)}
            onFocus={() => onAktivni(s)}
            onBlur={() => onAktivni(null)}
            onClick={() => onOtevri(s)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOtevri(s);
              }
            }}
          />
        ))}
      </g>
    </svg>
  );
}

/** Neaktivní sféry desaturují, aktivní se jemně nadzvedne. */
function vrstva(s: SferaId, aktivni: SferaId | null): React.CSSProperties {
  if (!aktivni) return { transition: 'filter 220ms ease-out, transform 220ms ease-out' };
  if (aktivni === s) {
    return {
      transform: 'translateY(-4px)',
      transition: 'filter 220ms ease-out, transform 220ms ease-out',
    };
  }
  return {
    filter: 'saturate(0.35) brightness(0.88)',
    transition: 'filter 220ms ease-out, transform 220ms ease-out',
  };
}

/** Kamera je jen animovaný viewBox — žádné přepočítávání scény. */
function useKamera(cil: SferaId | null, tlumit: boolean): string {
  const [ramec, setRamec] = useState<[number, number, number, number]>(PLNY);
  const raf = useRef(0);

  useEffect(() => {
    if (tlumit) {
      setRamec(PLNY);
      return;
    }
    const konec = cil ? KAMERA[cil] : PLNY;
    const zacatek = ramec;
    const start = performance.now();
    const doba = 400;

    const krok = (cas: number) => {
      const t = Math.min(1, (cas - start) / doba);
      const e = 1 - Math.pow(1 - t, 3);
      setRamec([
        zacatek[0] + (konec[0] - zacatek[0]) * e,
        zacatek[1] + (konec[1] - zacatek[1]) * e,
        zacatek[2] + (konec[2] - zacatek[2]) * e,
        zacatek[3] + (konec[3] - zacatek[3]) * e,
      ]);
      if (t < 1) raf.current = requestAnimationFrame(krok);
    };
    raf.current = requestAnimationFrame(krok);
    return () => cancelAnimationFrame(raf.current);
    // ramec schválně mimo závislosti — jinak by se animace restartovala sama
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cil, tlumit]);

  return ramec.join(' ');
}

function popisMapy(p: OceneniPortfolia): string {
  const casti = p.poradi.map((s) => {
    const u = urovenSfery(s, p.sfery[s].hodnota);
    return `${NAZVY_SFER[s]}: ${u.def.nazev}, ${Math.round(p.sfery[s].hodnota)} CZK`;
  });
  return `Map of the realm. ${casti.join('. ')}. The full figures are in the summary table below the map.`;
}
