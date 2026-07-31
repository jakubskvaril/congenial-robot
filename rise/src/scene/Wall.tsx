import { pocetZubu, vyskaZdi, type StavUrovne } from '../domain/levels';
import { Delo, INK, INK_TENKY, Prapor, Vez } from './parts/zaklady';

/**
 * Nepravidelný osmiúhelníkový prstenec — ne kružnice, ne čtverec.
 * Body jsou pevné; mění se jen výška zdi a výbava.
 */
const BODY: readonly (readonly [number, number])[] = [
  [790, 292], // sever
  [966, 322],
  [1074, 428], // východ
  [1046, 596],
  [858, 656], // jih — tady je brána
  [654, 646],
  [528, 540], // západ
  [556, 356],
];

const BRANA_HRANA = 4; // index hrany, na které stojí brána (mezi bodem 4 a 5)

function hrany() {
  return BODY.map((a, i) => ({ a, b: BODY[(i + 1) % BODY.length]!, i }));
}

function cesta(body: readonly (readonly [number, number])[], posunY = 0): string {
  return `${body.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y + posunY}`).join(' ')} Z`;
}

/** Mnohoúhelník zvětšený/zmenšený od středu prstence. */
function skaluj(k: number): (readonly [number, number])[] {
  return BODY.map(([x, y]) => [800 + (x - 800) * k, 470 + (y - 470) * k] as const);
}

/** Tloušťka koruny zdi — koruna je prstenec, ne vyplněná deska. */
const VNITRNI = skaluj(0.925);

export function Wall({
  uroven,
  hodnota,
  noc,
}: {
  uroven: StavUrovne;
  hodnota: number;
  noc: boolean;
}) {
  const lvl = uroven.lvl;
  const vyska = vyskaZdi(uroven);
  const zubu = pocetZubu(hodnota);

  return (
    <g>
      <Nadvori lvl={lvl} />

      {lvl === 0 && <Vymereno />}
      {lvl === 1 && <Palisada />}

      {lvl >= 6 && <VodniPrikop />}

      {lvl >= 2 && (
        <>
          <Zed vyska={vyska} zubu={lvl >= 3 ? zubu : 0} lvl={lvl} />
          <Basty lvl={lvl} vyska={vyska} noc={noc} />
          <Brana lvl={lvl} vyska={vyska} />
        </>
      )}

      {lvl >= 7 && <VnejsiPrstenec />}
    </g>
  );
}

/** Uvnitř prstence je udusaná země — hrad na ní stojí. */
function Nadvori({ lvl }: { lvl: number }) {
  return (
    <path
      d={cesta(BODY)}
      fill={lvl >= 2 ? 'var(--pergamen-stin)' : 'var(--louka)'}
      opacity={lvl >= 2 ? 0.55 : 0.35}
      stroke="none"
    />
  );
}

function Vymereno() {
  return (
    <g>
      {/* vyrytý příkop */}
      <path
        d={cesta(BODY)}
        fill="none"
        stroke="var(--pergamen-stin)"
        strokeWidth={11}
        strokeLinejoin="round"
      />
      <path
        d={cesta(BODY)}
        fill="none"
        stroke="var(--inkoust)"
        strokeWidth={1.4}
        strokeDasharray="9 8"
        strokeLinejoin="round"
      />
      {/* kolíky */}
      {hrany().flatMap(({ a, b }, hi) =>
        Array.from({ length: 5 }, (_, i) => {
          const t = (i + 1) / 6;
          const x = a[0] + (b[0] - a[0]) * t;
          const y = a[1] + (b[1] - a[1]) * t;
          return (
            <path
              key={`${hi}-${i}`}
              d={`M ${x} ${y} l 0 -10`}
              stroke="var(--inkoust)"
              strokeWidth={2.2}
              strokeLinecap="round"
            />
          );
        }),
      )}
    </g>
  );
}

function Palisada() {
  return (
    <g>
      {hrany().flatMap(({ a, b }, hi) => {
        const delka = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const pocet = Math.max(3, Math.round(delka / 13));
        return Array.from({ length: pocet }, (_, i) => {
          const t = i / (pocet - 1);
          const x = a[0] + (b[0] - a[0]) * t;
          const y = a[1] + (b[1] - a[1]) * t;
          if (hi === BRANA_HRANA && t > 0.4 && t < 0.6) return null;
          return (
            <path
              key={`${hi}-${i}`}
              d={`M ${x} ${y} l 0 -19`}
              stroke="var(--inkoust)"
              strokeWidth={3.2}
              strokeLinecap="round"
            />
          );
        });
      })}
      {/* jedna brána */}
      <path d="M 748 646 l 0 -24 l 30 0 l 0 24" fill="none" {...INK} />
    </g>
  );
}

function Zed({ vyska, zubu, lvl }: { vyska: number; zubu: number; lvl: number }) {
  return (
    <g>
      {/*
        Vnitřní líc jen u vzdálených hran. U přední zdi míří dovnitř od
        diváka, takže vidět není — kdyby se nakreslil, položí přes nádvoří
        tmavý pás.
      */}
      {VNITRNI.map((a, i) => {
        const b = VNITRNI[(i + 1) % VNITRNI.length]!;
        if ((a[1] + b[1]) / 2 >= 470) return null;
        return (
          <path
            key={`v${i}`}
            d={`M ${a[0]} ${a[1]} L ${b[0]} ${b[1]} L ${b[0]} ${b[1] - vyska} L ${a[0]} ${a[1] - vyska} Z`}
            fill="var(--kamen-stin)"
            {...INK_TENKY}
          />
        );
      })}

      {/* vnější líc — extruze hran, stín se kreslí jako tmavší plocha */}
      {hrany().map(({ a, b, i }) => (
        <path
          key={i}
          d={`M ${a[0]} ${a[1]} L ${b[0]} ${b[1]} L ${b[0]} ${b[1] - vyska} L ${a[0]} ${a[1] - vyska} Z`}
          fill={b[0] - a[0] >= 0 ? 'var(--kamen)' : 'var(--kamen-stin)'}
          {...INK_TENKY}
        />
      ))}

      {/* koruna zdi — prstenec, aby nádvoří zůstalo vidět */}
      <path
        d={`${cesta(BODY, -vyska)} ${cesta(VNITRNI, -vyska)}`}
        fillRule="evenodd"
        fill="var(--kamen)"
        {...INK}
      />

      {/* ochoz */}
      {lvl >= 3 && (
        <path
          d={cesta(skaluj(0.962), -vyska)}
          fill="none"
          stroke="var(--kamen-stin)"
          strokeWidth={1.2}
          strokeLinejoin="round"
        />
      )}

      {/* cimbuří — zuby rozprostřené po obvodu */}
      {zubu > 0 && <Zuby vyska={vyska} pocet={zubu} />}
    </g>
  );
}

function Zuby({ vyska, pocet }: { vyska: number; pocet: number }) {
  const useky = hrany();
  const delky = useky.map(({ a, b }) => Math.hypot(b[0] - a[0], b[1] - a[1]));
  const celkem = delky.reduce((s, d) => s + d, 0);

  return (
    <g>
      {useky.flatMap(({ a, b }, hi) => {
        const naUsek = Math.max(0, Math.round((delky[hi]! / celkem) * pocet));
        return Array.from({ length: naUsek }, (_, i) => {
          const t = (i + 0.5) / naUsek;
          const x = a[0] + (b[0] - a[0]) * t;
          const y = a[1] + (b[1] - a[1]) * t - vyska;
          return (
            <rect
              key={`${hi}-${i}`}
              x={x - 4}
              y={y - 8}
              width={8}
              height={9}
              fill="var(--kamen)"
              {...INK_TENKY}
            />
          );
        });
      })}
    </g>
  );
}

function Basty({ lvl, vyska, noc }: { lvl: number; vyska: number; noc: boolean }) {
  // lvl 2 → dvě rohové bašty, lvl 3+ → čtyři
  const indexy = lvl >= 3 ? [0, 2, 4, 6] : [2, 6];
  return (
    <g>
      {indexy.map((i) => {
        const [x, y] = BODY[i]!;
        return (
          <g key={i}>
            <Vez
              x={x}
              y={y + 6}
              sirka={30}
              vyska={vyska + 22}
              strecha={lvl >= 4 ? 'kuzel' : 'zadna'}
              barvaStrechy="var(--strecha)"
              cimburi={lvl < 4}
              okna={lvl >= 5 ? 1 : 0}
              svitiOkna={noc}
            />
            {lvl >= 4 && <Prapor x={x} y={y - vyska - 34} vyska={18} barva="var(--rumelka)" />}
            {lvl >= 6 && <Delo x={x + 16} y={y - vyska - 14} otoceno={x < 800} />}
          </g>
        );
      })}
    </g>
  );
}

function Brana({ lvl, vyska }: { lvl: number; vyska: number }) {
  const stred = { x: 756, y: 651 };
  return (
    <g>
      <rect
        x={stred.x - 24}
        y={stred.y - vyska - 12}
        width={48}
        height={vyska + 12}
        fill="var(--kamen)"
        {...INK}
      />
      {/* průjezd */}
      <path
        d={`M ${stred.x - 13} ${stred.y} L ${stred.x - 13} ${stred.y - vyska * 0.55} Q ${stred.x} ${stred.y - vyska * 0.8} ${stred.x + 13} ${stred.y - vyska * 0.55} L ${stred.x + 13} ${stred.y} Z`}
        fill="var(--inkoust)"
        stroke="none"
      />
      {/* lvl 4 — padací mříž a strážnice */}
      {lvl >= 4 && (
        <>
          <g stroke="var(--zlato)" strokeWidth={1.4}>
            {[0, 1, 2, 3, 4].map((i) => (
              <path
                key={i}
                d={`M ${stred.x - 11 + i * 5.5} ${stred.y} l 0 ${-vyska * 0.5}`}
              />
            ))}
            {[0, 1, 2].map((i) => (
              <path
                key={`h${i}`}
                d={`M ${stred.x - 12} ${stred.y - 6 - i * 9} h 24`}
              />
            ))}
          </g>
          <Vez x={stred.x - 36} y={stred.y + 2} sirka={20} vyska={vyska + 16} strecha="jehlan" />
          <Vez x={stred.x + 36} y={stred.y + 2} sirka={20} vyska={vyska + 16} strecha="jehlan" />
        </>
      )}
      {/* lvl 5 — první dělo na bráně */}
      {lvl >= 5 && <Delo x={stred.x} y={stred.y - vyska - 14} />}
      {lvl >= 6 && (
        <>
          <Delo x={stred.x - 30} y={stred.y - vyska - 12} />
          <Delo x={stred.x + 30} y={stred.y - vyska - 12} otoceno />
        </>
      )}
    </g>
  );
}

function VodniPrikop() {
  const vnejsi = skaluj(1.16);
  return (
    <g>
      <path
        d={cesta(vnejsi)}
        fill="none"
        stroke="var(--voda)"
        strokeWidth={20}
        strokeLinejoin="round"
        className="a-voda"
      />
      <path
        d={cesta(vnejsi)}
        fill="none"
        stroke="var(--inkoust)"
        strokeWidth={1.2}
        strokeLinejoin="round"
        opacity={0.5}
      />
    </g>
  );
}

function VnejsiPrstenec() {
  const vnejsi = skaluj(1.3);
  return (
    <g>
      <path d={cesta(vnejsi)} fill="none" stroke="var(--kamen)" strokeWidth={13} strokeLinejoin="round" />
      <path d={cesta(vnejsi)} fill="none" {...INK} strokeWidth={1.6} />
      {/* barbakán před branou */}
      <g>
        <path d="M 716 700 L 716 676 L 796 676 L 796 700 Z" fill="var(--kamen)" {...INK} />
        <path d="M 744 700 L 744 686 Q 756 678 768 686 L 768 700 Z" fill="var(--inkoust)" stroke="none" />
      </g>
    </g>
  );
}

export { BODY as HRADBY_BODY };
