import type { StavUrovne } from '../domain/levels';
import { lerp } from '../domain/levels';
import { Domek, INK, INK_TENKY, Prapor, Vez } from './parts/zaklady';

/** Hrad stojí uprostřed prstence, na vyvýšenině. Střed sféry je [800, 470]. */
export const HRAD_STRED = { x: 800, y: 470 };

export function Castle({ uroven, noc }: { uroven: StavUrovne; noc: boolean }) {
  const lvl = uroven.lvl;
  const t = uroven.postup;

  // Hlavní věž roste plynule uvnitř úrovně, na lvl 4 se zdvojnásobí.
  const zakladniVyska = lvl >= 4 ? lerp(150, 190, t) : lvl >= 2 ? lerp(84, 120, t) : lerp(52, 68, t);

  return (
    <g>
      <Vyvyseniny />

      {/* lvl 0 — vyznačené základy kolíky */}
      {lvl === 0 && <Zaklady />}

      {/* lvl 1 — dřevěná tvrz */}
      {lvl >= 1 && lvl < 2 && <DrevenaTvrz vyska={zakladniVyska} />}

      {/* lvl 2+ — kamenné jádro */}
      {lvl >= 2 && (
        <>
          <Nadvori lvl={lvl} />
          <Studna x={742} y={504} />
        </>
      )}

      {/* lvl 3 — boční věže, brána, hospodářství */}
      {lvl >= 3 && (
        <>
          <Vez x={676} y={492} sirka={34} vyska={72} okna={2} svitiOkna={noc} cimburi />
          <Vez x={924} y={492} sirka={34} vyska={72} okna={2} svitiOkna={noc} cimburi />
          <HradniBrana />
          <Domek x={952} y={520} sirka={30} vyska={19} komin />
          <Domek x={664} y={528} sirka={26} vyska={17} otoceno komin />
        </>
      )}

      {/* lvl 5 — katedrála a hodinová věž */}
      {lvl >= 5 && <Katedrala noc={noc} />}

      {/* lvl 6 — zahrady */}
      {lvl >= 6 && <Zahrady />}

      {/* lvl 7 — palác a most */}
      {lvl >= 7 && <Palac noc={noc} />}

      {/* hlavní věž / donjon — od lvl 2 kamenný */}
      {lvl >= 2 && (
        <>
          <Vez
            x={800}
            y={492}
            sirka={62}
            vyska={zakladniVyska}
            strecha={lvl >= 6 ? 'kupole' : lvl >= 4 ? 'jehlan' : 'kuzel'}
            barvaStrechy={lvl >= 4 ? 'var(--zlato)' : 'var(--strecha)'}
            okna={lvl >= 4 ? 4 : 2}
            svitiOkna={noc}
            cimburi={lvl >= 3}
          />
          {lvl >= 4 && (
            <path
              d={`M 800 ${492 - zakladniVyska - 52} l 0 -18`}
              stroke="var(--zlato)"
              strokeWidth={3}
              strokeLinecap="round"
            />
          )}
        </>
      )}

      {/* praporce na všech věžích */}
      {lvl >= 6 && (
        <>
          <Prapor x={676} y={492 - 72 - 8} vyska={20} barva="var(--zlato)" />
          <Prapor x={924} y={492 - 72 - 8} vyska={20} barva="var(--zlato)" />
        </>
      )}
      {lvl >= 3 && (
        <Prapor x={800} y={492 - zakladniVyska - 6} vyska={22} barva="var(--rumelka)" />
      )}

      {/* kouř z komína — jen dokud je čím topit */}
      {lvl >= 1 && <Kour x={lvl >= 3 ? 952 : 780} y={lvl >= 3 ? 486 : 470} />}
    </g>
  );
}

function Vyvyseniny() {
  return (
    <g>
      <path
        d="M 610 540 Q 660 494 800 490 Q 940 494 990 540 Q 900 566 800 566 Q 700 566 610 540 Z"
        fill="var(--louka)"
        {...INK}
      />
      <path
        d="M 800 566 Q 900 566 990 540 Q 960 556 900 566 Q 850 572 800 572 Z"
        fill="var(--les)"
        opacity={0.3}
        stroke="none"
      />
    </g>
  );
}

function Zaklady() {
  const koliky = [
    [716, 500], [760, 490], [800, 486], [840, 490], [884, 500],
    [884, 528], [840, 536], [800, 538], [760, 536], [716, 528],
  ] as const;
  return (
    <g>
      <path
        d="M 716 500 Q 800 482 884 500 L 884 528 Q 800 546 716 528 Z"
        fill="none"
        stroke="var(--inkoust)"
        strokeWidth={1.4}
        strokeDasharray="7 6"
      />
      {koliky.map(([x, y], i) => (
        <path
          key={i}
          d={`M ${x} ${y} l 0 -11`}
          stroke="var(--inkoust)"
          strokeWidth={2.2}
          strokeLinecap="round"
        />
      ))}
    </g>
  );
}

function DrevenaTvrz({ vyska }: { vyska: number }) {
  return (
    <g>
      {/* palisáda */}
      {Array.from({ length: 15 }, (_, i) => {
        const x = 712 + i * 12.6;
        const y = 512 - Math.sin((i / 14) * Math.PI) * 20;
        return (
          <path
            key={i}
            d={`M ${x} ${y} l 0 -20`}
            stroke="var(--inkoust)"
            strokeWidth={3}
            strokeLinecap="round"
          />
        );
      })}
      <Vez
        x={800}
        y={494}
        sirka={40}
        vyska={vyska}
        strecha="kuzel"
        barva="#a98a52"
        barvaStrechy="#8f7238"
        okna={1}
      />
      <Domek x={748} y={498} sirka={26} vyska={16} doskova komin />
      <Domek x={854} y={500} sirka={24} vyska={15} doskova otoceno />
    </g>
  );
}

function Nadvori({ lvl }: { lvl: number }) {
  return (
    <g>
      <path
        d="M 690 512 Q 800 490 910 512 L 910 534 Q 800 556 690 534 Z"
        fill={lvl >= 5 ? 'var(--kamen)' : 'var(--pergamen-stin)'}
        {...INK_TENKY}
      />
      {lvl >= 5 &&
        Array.from({ length: 7 }, (_, i) => (
          <path
            key={i}
            d={`M ${706 + i * 30} 502 l -4 40`}
            stroke="var(--kamen-stin)"
            strokeWidth={1}
          />
        ))}
    </g>
  );
}

function Studna({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={0} cy={0} rx={8} ry={4} fill="var(--kamen)" {...INK_TENKY} />
      <path d="M -6 -1 l 0 -12 M 6 -1 l 0 -12" stroke="var(--inkoust)" strokeWidth={1.6} />
      <path d="M -9 -13 L 0 -19 L 9 -13 Z" fill="var(--strecha)" {...INK_TENKY} />
    </g>
  );
}

function HradniBrana() {
  return (
    <g>
      <rect x={784} y={520} width={32} height={26} fill="var(--kamen)" {...INK_TENKY} />
      <path d="M 790 546 L 790 532 Q 800 524 810 532 L 810 546 Z" fill="var(--inkoust)" stroke="none" />
    </g>
  );
}

function Katedrala({ noc }: { noc: boolean }) {
  return (
    <g>
      <path d="M 596 500 L 596 452 L 652 452 L 652 500 Z" fill="var(--kamen)" {...INK} />
      <path d="M 590 452 L 624 420 L 658 452 Z" fill="var(--strecha)" {...INK} />
      <circle cx={624} cy={470} r={11} fill={noc ? 'var(--zlato)' : 'var(--voda)'} {...INK_TENKY} />
      <path
        d="M 624 459 l 0 22 M 613 470 l 22 0 M 616 462 l 16 16 M 632 462 l -16 16"
        stroke="var(--inkoust)"
        strokeWidth={1}
      />
      {/* hodinová věž */}
      <Vez x={968} y={498} sirka={26} vyska={104} strecha="jehlan" barvaStrechy="var(--strecha-stin)" />
      <circle cx={968} cy={424} r={9} fill="var(--pergamen)" {...INK_TENKY} />
      <path d="M 968 424 l 0 -6 M 968 424 l 4 3" stroke="var(--inkoust)" strokeWidth={1.4} strokeLinecap="round" />
    </g>
  );
}

function Zahrady() {
  return (
    <g>
      <ellipse cx={1010} cy={520} rx={44} ry={18} fill="var(--louka)" {...INK_TENKY} />
      {Array.from({ length: 5 }, (_, i) => (
        <circle key={i} cx={980 + i * 15} cy={514 + (i % 2) * 8} r={4.5} fill="var(--les)" {...INK_TENKY} />
      ))}
      <path d="M 968 520 q 42 -12 84 0" fill="none" stroke="var(--inkoust)" strokeWidth={1} strokeDasharray="4 4" />
    </g>
  );
}

function Palac({ noc }: { noc: boolean }) {
  return (
    <g>
      {/* vnitřní prstenec */}
      <path
        d="M 656 506 Q 800 470 944 506 L 944 520 Q 800 484 656 520 Z"
        fill="var(--kamen)"
        {...INK_TENKY}
      />
      {/* palác */}
      <path d="M 700 496 L 700 458 L 776 458 L 776 496 Z" fill="var(--kamen)" {...INK} />
      <path d="M 694 458 L 738 434 L 782 458 Z" fill="var(--strecha)" {...INK} />
      {Array.from({ length: 4 }, (_, i) => (
        <rect
          key={i}
          x={710 + i * 16}
          y={470}
          width={7}
          height={12}
          rx={3.5}
          fill={noc ? 'var(--zlato)' : 'var(--inkoust)'}
          stroke="none"
        />
      ))}
      {/* most přes příkop k bráně */}
      <path d="M 792 546 L 792 592 M 808 546 L 808 592" stroke="var(--inkoust)" strokeWidth={2} />
      <path d="M 792 560 h 16 M 792 576 h 16" stroke="var(--inkoust)" strokeWidth={1.2} />
    </g>
  );
}

function Kour({ x, y }: { x: number; y: number }) {
  return (
    <g aria-hidden="true">
      {[0, 2, 4].map((zpozdeni) => (
        <circle
          key={zpozdeni}
          cx={x}
          cy={y}
          r={5}
          fill="var(--kamen)"
          opacity={0}
          className="a-kour"
          style={{ animationDelay: `${zpozdeni}s` }}
        />
      ))}
    </g>
  );
}
