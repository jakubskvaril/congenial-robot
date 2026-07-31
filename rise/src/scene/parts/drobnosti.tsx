import type { SferaId } from '../../domain/types';
import { INK_TENKY, Ohniste, Pochoden, Prapor, Stan, Strom } from './zaklady';

/**
 * Třicet drobností na sféru s pevnými souřadnicemi a pevným pořadím.
 * Při stejném zhodnocení vypadá mapa vždycky stejně; když výnos klesne,
 * mizí odzadu — a to je záměr, je to hned vidět.
 */
export interface Drobnost {
  t: string;
  x: number;
  y: number;
}

export const DROBNOSTI: Record<SferaId, Drobnost[]> = {
  castle: [
    { t: 'okno', x: 782, y: 372 }, { t: 'okno', x: 818, y: 372 },
    { t: 'prapor', x: 742, y: 352 }, { t: 'holub', x: 800, y: 300 },
    { t: 'sud', x: 726, y: 486 }, { t: 'strom', x: 906, y: 470 },
    { t: 'okno', x: 782, y: 398 }, { t: 'socha', x: 800, y: 496 },
    { t: 'strom', x: 690, y: 466 }, { t: 'prapor', x: 858, y: 372 },
    { t: 'holub', x: 856, y: 330 }, { t: 'sud', x: 742, y: 486 },
    { t: 'okno', x: 818, y: 398 }, { t: 'strom', x: 924, y: 452 },
    { t: 'kere', x: 754, y: 500 }, { t: 'prapor', x: 916, y: 424 },
    { t: 'okno', x: 764, y: 424 }, { t: 'holub', x: 744, y: 318 },
    { t: 'sud', x: 872, y: 488 }, { t: 'strom', x: 672, y: 448 },
    { t: 'kere', x: 848, y: 502 }, { t: 'okno', x: 836, y: 424 },
    { t: 'prapor', x: 684, y: 424 }, { t: 'socha', x: 878, y: 452 },
    { t: 'kere', x: 700, y: 500 }, { t: 'holub', x: 880, y: 352 },
    { t: 'okno', x: 800, y: 448 }, { t: 'sud', x: 890, y: 492 },
    { t: 'kere', x: 918, y: 496 }, { t: 'socha', x: 722, y: 452 },
  ],
  wall: [
    { t: 'pochoden', x: 560, y: 380 }, { t: 'pochoden', x: 1040, y: 380 },
    { t: 'stit', x: 640, y: 330 }, { t: 'hlidka', x: 800, y: 306 },
    { t: 'vlajka', x: 508, y: 424 }, { t: 'vlajka', x: 1092, y: 424 },
    { t: 'pochoden', x: 620, y: 620 }, { t: 'kos', x: 700, y: 316 },
    { t: 'stit', x: 960, y: 330 }, { t: 'zebrik', x: 566, y: 560 },
    { t: 'pochoden', x: 980, y: 620 }, { t: 'hlidka', x: 560, y: 470 },
    { t: 'vlajka', x: 640, y: 300 }, { t: 'kos', x: 900, y: 316 },
    { t: 'stit', x: 540, y: 500 }, { t: 'pochoden', x: 800, y: 646 },
    { t: 'hlidka', x: 1040, y: 470 }, { t: 'zebrik', x: 1034, y: 560 },
    { t: 'vlajka', x: 960, y: 300 }, { t: 'stit', x: 1060, y: 500 },
    { t: 'kos', x: 620, y: 632 }, { t: 'pochoden', x: 700, y: 640 },
    { t: 'hlidka', x: 700, y: 640 }, { t: 'kos', x: 980, y: 632 },
    { t: 'stit', x: 740, y: 314 }, { t: 'vlajka', x: 800, y: 292 },
    { t: 'zebrik', x: 880, y: 640 }, { t: 'pochoden', x: 900, y: 640 },
    { t: 'stit', x: 860, y: 314 }, { t: 'hlidka', x: 900, y: 640 },
  ],
  horde: [
    { t: 'stan', x: 236, y: 744 }, { t: 'ohniste', x: 300, y: 762 },
    { t: 'kun', x: 176, y: 786 }, { t: 'zbrane', x: 268, y: 792 },
    { t: 'korouhev', x: 340, y: 720 }, { t: 'stan', x: 366, y: 762 },
    { t: 'kovadlina', x: 208, y: 810 }, { t: 'vozka', x: 396, y: 796 },
    { t: 'stan', x: 300, y: 712 }, { t: 'ohniste', x: 372, y: 806 },
    { t: 'kun', x: 152, y: 758 }, { t: 'zbrane', x: 330, y: 800 },
    { t: 'stan', x: 190, y: 726 }, { t: 'korouhev', x: 250, y: 706 },
    { t: 'kovadlina', x: 410, y: 748 }, { t: 'ohniste', x: 230, y: 786 },
    { t: 'vozka', x: 148, y: 812 }, { t: 'stan', x: 420, y: 720 },
    { t: 'zbrane', x: 196, y: 762 }, { t: 'kun', x: 428, y: 780 },
    { t: 'korouhev', x: 400, y: 706 }, { t: 'ohniste', x: 160, y: 730 },
    { t: 'stan', x: 268, y: 736 }, { t: 'kovadlina', x: 300, y: 820 },
    { t: 'zbrane', x: 380, y: 736 }, { t: 'kun', x: 240, y: 822 },
    { t: 'vozka', x: 340, y: 826 }, { t: 'stan', x: 140, y: 700 },
    { t: 'ohniste', x: 420, y: 826 }, { t: 'korouhev', x: 180, y: 690 },
  ],
};

export function Drobnosti({
  sferaId,
  pocet,
  noc,
}: {
  sferaId: SferaId;
  pocet: number;
  noc: boolean;
}) {
  return (
    <g aria-hidden="true">
      {DROBNOSTI[sferaId].slice(0, pocet).map((d, i) => (
        <VykresliDrobnost key={`${sferaId}-${i}`} d={d} noc={noc} />
      ))}
    </g>
  );
}

function VykresliDrobnost({ d, noc }: { d: Drobnost; noc: boolean }) {
  switch (d.t) {
    case 'okno':
      return (
        <rect
          x={d.x - 3}
          y={d.y}
          width={6}
          height={9}
          rx={3}
          fill={noc ? 'var(--zlato)' : 'var(--inkoust)'}
          stroke="none"
        />
      );
    case 'holub':
      return (
        <path
          d={`M ${d.x - 5} ${d.y} q 5 -4 10 0 q -5 -1 -10 0`}
          fill="none"
          stroke="var(--inkoust)"
          strokeWidth={1.4}
          strokeLinecap="round"
        />
      );
    case 'prapor':
      return <Prapor x={d.x} y={d.y} vyska={16} barva="var(--rumelka)" />;
    case 'vlajka':
      return <Prapor x={d.x} y={d.y} vyska={20} barva="var(--zlato)" />;
    case 'sud':
      return (
        <g>
          <ellipse cx={d.x} cy={d.y - 5} rx={4.5} ry={5.5} fill="#a98a52" {...INK_TENKY} />
          <path d={`M ${d.x - 4.5} ${d.y - 5} h 9`} stroke="var(--inkoust)" strokeWidth={1} />
        </g>
      );
    case 'strom':
      return <Strom x={d.x} y={d.y} velikost={0.85} />;
    case 'kere':
      return (
        <path
          d={`M ${d.x - 7} ${d.y} q 3 -8 7 -8 q 4 0 7 8 z`}
          fill="var(--louka)"
          {...INK_TENKY}
        />
      );
    case 'socha':
      return (
        <g>
          <rect x={d.x - 4} y={d.y - 6} width={8} height={6} fill="var(--kamen)" {...INK_TENKY} />
          <rect x={d.x - 2.5} y={d.y - 16} width={5} height={10} fill="var(--kamen)" {...INK_TENKY} />
          <circle cx={d.x} cy={d.y - 18.5} r={2.6} fill="var(--kamen)" {...INK_TENKY} />
        </g>
      );
    case 'pochoden':
      return <Pochoden x={d.x} y={d.y} sviti={noc} />;
    case 'stit':
      return (
        <path
          d={`M ${d.x - 5} ${d.y - 8} h 10 v 5 q 0 6 -5 9 q -5 -3 -5 -9 z`}
          fill="var(--rumelka)"
          {...INK_TENKY}
        />
      );
    case 'hlidka':
      return (
        <g>
          <rect x={d.x - 2.5} y={d.y - 11} width={5} height={7} rx={1.4} fill="var(--kamen-stin)" {...INK_TENKY} />
          <circle cx={d.x} cy={d.y - 13.5} r={2.3} fill="var(--pergamen-stin)" {...INK_TENKY} />
          <path d={`M ${d.x + 3.5} ${d.y - 18} l 0 14`} stroke="var(--inkoust)" strokeWidth={1.3} strokeLinecap="round" />
        </g>
      );
    case 'kos':
      return (
        <g>
          <path d={`M ${d.x - 5} ${d.y - 8} l 1.5 8 h 7 l 1.5 -8 z`} fill="#a98a52" {...INK_TENKY} />
          <circle cx={d.x - 1.5} cy={d.y - 9} r={2} fill="var(--kamen-stin)" stroke="none" />
          <circle cx={d.x + 2} cy={d.y - 9.5} r={2} fill="var(--kamen-stin)" stroke="none" />
        </g>
      );
    case 'zebrik':
      return (
        <g stroke="var(--inkoust)" strokeWidth={1.3} strokeLinecap="round">
          <path d={`M ${d.x - 3} ${d.y} l 2 -20`} />
          <path d={`M ${d.x + 3} ${d.y} l -2 -20`} />
          <path d={`M ${d.x - 2.5} ${d.y - 5} h 5.5`} />
          <path d={`M ${d.x - 2} ${d.y - 11} h 5`} />
          <path d={`M ${d.x - 1.5} ${d.y - 17} h 4.5`} />
        </g>
      );
    case 'stan':
      return <Stan x={d.x} y={d.y} velikost={0.72} />;
    case 'ohniste':
      return <Ohniste x={d.x} y={d.y} hori />;
    case 'kun':
      return (
        <g>
          <path
            d={`M ${d.x - 10} ${d.y} l 1 -7 l 4 -4 h 10 l 4 4 l 1 7 h -3 l 0 -5 h -14 l 0 5 z`}
            fill="#8a6a48"
            {...INK_TENKY}
          />
          <path d={`M ${d.x - 9} ${d.y - 11} l -4 -4 h 5 z`} fill="#8a6a48" {...INK_TENKY} />
        </g>
      );
    case 'zbrane':
      return (
        <g stroke="var(--inkoust)" strokeWidth={1.4} strokeLinecap="round">
          <path d={`M ${d.x - 6} ${d.y} l 5 -14`} />
          <path d={`M ${d.x + 6} ${d.y} l -5 -14`} />
          <path d={`M ${d.x} ${d.y} l 0 -15`} />
        </g>
      );
    case 'vozka':
      return (
        <g>
          <rect x={d.x - 10} y={d.y - 10} width={20} height={7} fill="#a98a52" {...INK_TENKY} />
          <circle cx={d.x - 6} cy={d.y - 1.5} r={3.4} fill="none" {...INK_TENKY} />
          <circle cx={d.x + 6} cy={d.y - 1.5} r={3.4} fill="none" {...INK_TENKY} />
        </g>
      );
    case 'kovadlina':
      return (
        <g>
          <path d={`M ${d.x - 7} ${d.y - 7} h 14 l -3 4 h -8 z`} fill="var(--kamen-stin)" {...INK_TENKY} />
          <rect x={d.x - 3} y={d.y - 3} width={6} height={3} fill="var(--kamen-stin)" {...INK_TENKY} />
        </g>
      );
    case 'korouhev':
      return (
        <g>
          <path d={`M ${d.x} ${d.y} l 0 -26`} stroke="var(--inkoust)" strokeWidth={1.8} strokeLinecap="round" />
          <g className="a-vlaje" style={{ transformOrigin: `${d.x}px ${d.y - 26}px` }}>
            <path
              d={`M ${d.x} ${d.y - 26} l 14 4 l -14 4 l 4 -4 z`}
              fill="var(--zlato)"
              {...INK_TENKY}
            />
          </g>
        </g>
      );
    default:
      return null;
  }
}
