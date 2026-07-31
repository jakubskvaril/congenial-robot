/**
 * Parametrické díly scény. Všechno ploché plochy s inkoustovým obrysem —
 * žádné gradienty, žádné CSS stíny. Stín je vždycky tmavší plocha.
 */

export const INK = {
  stroke: 'var(--inkoust)',
  strokeWidth: 1.8,
  strokeLinejoin: 'round' as const,
  strokeLinecap: 'round' as const,
};

export const INK_TENKY = { ...INK, strokeWidth: 1.2 };

/* --------------------------------------------------------------- věž -- */

export function Vez({
  x,
  y,
  sirka,
  vyska,
  strecha = 'kuzel',
  barvaStrechy = 'var(--strecha)',
  barva = 'var(--kamen)',
  cimburi = false,
  okna = 0,
  svitiOkna = false,
}: {
  x: number;
  y: number; // pata věže
  sirka: number;
  vyska: number;
  strecha?: 'kuzel' | 'jehlan' | 'zadna' | 'kupole';
  barvaStrechy?: string;
  barva?: string;
  cimburi?: boolean;
  okna?: number;
  svitiOkna?: boolean;
}) {
  const p = sirka / 2;
  const stinSirka = sirka * 0.3;

  return (
    <g transform={`translate(${x} ${y})`}>
      {/* tělo */}
      <path d={`M ${-p} 0 L ${-p} ${-vyska} L ${p} ${-vyska} L ${p} 0 Z`} fill={barva} {...INK} />
      {/* vlastní stín jako plocha, ne filtr */}
      <path
        d={`M ${p - stinSirka} 0 L ${p - stinSirka} ${-vyska} L ${p} ${-vyska} L ${p} 0 Z`}
        fill="var(--kamen-stin)"
        opacity={0.55}
        stroke="none"
      />

      {cimburi && <CimburiPas x={-p} y={-vyska} sirka={sirka} zub={sirka / 7} vyskaZubu={7} />}

      {strecha === 'kuzel' && (
        <path
          d={`M ${-p - 4} ${-vyska} L 0 ${-vyska - sirka * 1.15} L ${p + 4} ${-vyska} Z`}
          fill={barvaStrechy}
          {...INK}
        />
      )}
      {strecha === 'jehlan' && (
        <>
          <path
            d={`M ${-p - 5} ${-vyska} L 0 ${-vyska - sirka * 0.8} L ${p + 5} ${-vyska} Z`}
            fill={barvaStrechy}
            {...INK}
          />
          <path
            d={`M 0 ${-vyska - sirka * 0.8} L ${p + 5} ${-vyska} L ${p * 0.35} ${-vyska} Z`}
            fill="var(--strecha-stin)"
            stroke="none"
          />
        </>
      )}
      {strecha === 'kupole' && (
        <>
          <path
            d={`M ${-p - 2} ${-vyska} Q ${-p - 2} ${-vyska - sirka} 0 ${-vyska - sirka} Q ${p + 2} ${-vyska - sirka} ${p + 2} ${-vyska} Z`}
            fill="var(--zlato)"
            {...INK}
          />
          <path
            d={`M 0 ${-vyska - sirka} l 0 ${-sirka * 0.34}`}
            stroke="var(--inkoust)"
            strokeWidth={2}
            strokeLinecap="round"
          />
        </>
      )}

      {Array.from({ length: okna }, (_, i) => (
        <rect
          key={i}
          x={-3.5}
          y={-vyska + 14 + i * 20}
          width={7}
          height={11}
          rx={3.5}
          fill={svitiOkna ? 'var(--zlato)' : 'var(--inkoust)'}
          stroke="none"
        />
      ))}
    </g>
  );
}

/* ------------------------------------------------------------ cimbuří -- */

export function CimburiPas({
  x,
  y,
  sirka,
  zub = 9,
  vyskaZubu = 8,
  barva = 'var(--kamen)',
}: {
  x: number;
  y: number;
  sirka: number;
  zub?: number;
  vyskaZubu?: number;
  barva?: string;
}) {
  const pocet = Math.max(2, Math.floor(sirka / (zub * 2)));
  const krok = sirka / pocet;
  let d = `M ${x} ${y}`;
  for (let i = 0; i < pocet; i++) {
    const zx = x + i * krok;
    d += ` L ${zx} ${y - vyskaZubu} L ${zx + krok * 0.55} ${y - vyskaZubu} L ${zx + krok * 0.55} ${y}`;
    if (i < pocet - 1) d += ` L ${zx + krok} ${y}`;
  }
  d += ` L ${x + sirka} ${y} Z`;
  return <path d={d} fill={barva} {...INK_TENKY} />;
}

/* ------------------------------------------------------------- domek -- */

export function Domek({
  x,
  y,
  sirka = 26,
  vyska = 18,
  barvaStrechy = 'var(--strecha)',
  doskova = false,
  komin = false,
  otoceno = false,
}: {
  x: number;
  y: number;
  sirka?: number;
  vyska?: number;
  barvaStrechy?: string;
  doskova?: boolean;
  komin?: boolean;
  otoceno?: boolean;
}) {
  const p = sirka / 2;
  const strechaV = sirka * 0.42;
  return (
    <g transform={`translate(${x} ${y})${otoceno ? ' scale(-1 1)' : ''}`}>
      <path d={`M ${-p} 0 L ${-p} ${-vyska} L ${p} ${-vyska} L ${p} 0 Z`} fill="var(--pergamen-stin)" {...INK_TENKY} />
      <path
        d={`M ${p * 0.4} 0 L ${p * 0.4} ${-vyska} L ${p} ${-vyska} L ${p} 0 Z`}
        fill="var(--kamen-stin)"
        opacity={0.4}
        stroke="none"
      />
      <path
        d={`M ${-p - 4} ${-vyska} L 0 ${-vyska - strechaV} L ${p + 4} ${-vyska} Z`}
        fill={doskova ? '#a98a52' : barvaStrechy}
        {...INK_TENKY}
      />
      {komin && (
        <rect x={p * 0.3} y={-vyska - strechaV * 0.75} width={5} height={11} fill="var(--kamen-stin)" {...INK_TENKY} />
      )}
    </g>
  );
}

/* ------------------------------------------------------------- strom -- */

export function Strom({
  x,
  y,
  velikost = 1,
  barva = 'var(--les)',
}: {
  x: number;
  y: number;
  velikost?: number;
  barva?: string;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${velikost})`}>
      <path d="M 0 0 l 0 -7" stroke="var(--inkoust)" strokeWidth={2.4} strokeLinecap="round" />
      <path
        d="M 0 -26 C -9 -26 -11 -16 -8 -11 C -12 -9 -9 -4 0 -5 C 9 -4 12 -9 8 -11 C 11 -16 9 -26 0 -26 Z"
        fill={barva}
        {...INK_TENKY}
      />
      <path d="M 3 -22 C 8 -20 9 -12 6 -8 L 0 -5 C 9 -4 12 -9 8 -11 C 11 -16 9 -24 3 -22 Z" fill="#2f4623" stroke="none" />
    </g>
  );
}

export function Jehlicnan({ x, y, velikost = 1 }: { x: number; y: number; velikost?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${velikost})`}>
      <path d="M 0 0 l 0 -6" stroke="var(--inkoust)" strokeWidth={2.2} strokeLinecap="round" />
      <path d="M 0 -30 L -8 -14 L -5 -14 L -9 -5 L 9 -5 L 5 -14 L 8 -14 Z" fill="var(--les)" {...INK_TENKY} />
    </g>
  );
}

/* ------------------------------------------------------------ prapor -- */

export function Prapor({
  x,
  y,
  vyska = 22,
  barva = 'var(--rumelka)',
  animovat = true,
}: {
  x: number;
  y: number;
  vyska?: number;
  barva?: string;
  animovat?: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d={`M 0 0 l 0 ${-vyska}`} stroke="var(--inkoust)" strokeWidth={1.8} strokeLinecap="round" />
      <g className={animovat ? 'a-vlaje' : undefined} style={{ transformOrigin: `0px ${-vyska}px` }}>
        <path
          d={`M 0 ${-vyska} L 17 ${-vyska + 5} L 0 ${-vyska + 10} Z`}
          fill={barva}
          {...INK_TENKY}
        />
      </g>
    </g>
  );
}

/* ----------------------------------------------------------- pochodeň -- */

export function Pochoden({ x, y, sviti }: { x: number; y: number; sviti: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M 0 0 l 0 -7" stroke="var(--inkoust)" strokeWidth={1.6} strokeLinecap="round" />
      <ellipse
        cx={0}
        cy={-10}
        rx={3.2}
        ry={4.6}
        fill={sviti ? 'var(--zlato)' : 'var(--kamen-stin)'}
        className={sviti ? 'a-pochoden' : undefined}
        stroke="none"
      />
    </g>
  );
}

/* ------------------------------------------------------------ figury -- */
/* Age of Empires II: malé čitelné siluety, ne detailní postavy.           */

export function Pesak({ x, y, barva = 'var(--rumelka)' }: { x: number; y: number; barva?: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M 0 0 L -2.5 -6 L 2.5 -6 Z" fill="var(--inkoust)" stroke="none" />
      <rect x={-3} y={-13} width={6} height={8} rx={1.6} fill={barva} {...INK_TENKY} />
      <circle cx={0} cy={-16} r={2.6} fill="var(--pergamen-stin)" {...INK_TENKY} />
      <path d="M 4 -16 l 0 12" stroke="var(--inkoust)" strokeWidth={1.5} strokeLinecap="round" />
    </g>
  );
}

export function Lucistnik({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M 0 0 L -2.5 -6 L 2.5 -6 Z" fill="var(--inkoust)" stroke="none" />
      <rect x={-3} y={-13} width={6} height={8} rx={1.6} fill="var(--les)" {...INK_TENKY} />
      <circle cx={0} cy={-16} r={2.6} fill="var(--pergamen-stin)" {...INK_TENKY} />
      <path d="M 5 -18 Q 9 -11 5 -4" stroke="var(--inkoust)" strokeWidth={1.4} fill="none" />
      <path d="M 5 -18 L 5 -4" stroke="var(--inkoust)" strokeWidth={0.9} />
    </g>
  );
}

export function Kopinik({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M 0 0 L -2.5 -6 L 2.5 -6 Z" fill="var(--inkoust)" stroke="none" />
      <rect x={-3} y={-13} width={6} height={8} rx={1.6} fill="var(--kamen-stin)" {...INK_TENKY} />
      <circle cx={0} cy={-16} r={2.6} fill="var(--pergamen-stin)" {...INK_TENKY} />
      <path d="M 4.5 -24 l 0 20" stroke="var(--inkoust)" strokeWidth={1.5} strokeLinecap="round" />
      <path d="M 4.5 -24 l -2 4 l 4 0 Z" fill="var(--inkoust)" stroke="none" />
    </g>
  );
}

export function Jezdec({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path
        d="M -11 0 L -10 -8 L -6 -12 L 6 -12 L 11 -8 L 10 0 L 7 0 L 7 -6 L -7 -6 L -7 0 Z"
        fill="#8a6a48"
        {...INK_TENKY}
      />
      <path d="M -10 -12 L -14 -16 L -9 -16 Z" fill="#8a6a48" {...INK_TENKY} />
      <rect x={-2} y={-22} width={6} height={9} rx={1.6} fill="var(--rumelka)" {...INK_TENKY} />
      <circle cx={1} cy={-25} r={2.6} fill="var(--pergamen-stin)" {...INK_TENKY} />
      <path d="M 6 -27 l 0 16" stroke="var(--inkoust)" strokeWidth={1.5} strokeLinecap="round" />
    </g>
  );
}

export function Stan({ x, y, velikost = 1 }: { x: number; y: number; velikost?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${velikost})`}>
      <path d="M -14 0 L 0 -20 L 14 0 Z" fill="var(--pergamen-stin)" {...INK_TENKY} />
      <path d="M 4 0 L 0 -20 L 14 0 Z" fill="var(--kamen-stin)" opacity={0.35} stroke="none" />
      <path d="M -4 0 L 0 -11 L 4 0 Z" fill="var(--inkoust)" stroke="none" />
    </g>
  );
}

export function Ohniste({ x, y, hori }: { x: number; y: number; hori: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={0} cy={0} rx={9} ry={4} fill="var(--kamen-stin)" {...INK_TENKY} />
      {hori && (
        <path
          d="M 0 -14 C -5 -8 -5 -2 0 -1 C 5 -2 5 -8 0 -14 Z"
          fill="var(--zlato)"
          className="a-pochoden"
          stroke="none"
        />
      )}
    </g>
  );
}

/* ------------------------------------------------------- obléhací stroje -- */

export function Trebuchet({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M -16 0 L -8 -20 L 0 0 Z" fill="none" {...INK} />
      <path d="M 8 0 L 0 -20 L -8 0" fill="none" {...INK_TENKY} />
      <path d="M -26 -30 L 14 -12" stroke="var(--inkoust)" strokeWidth={2.4} strokeLinecap="round" />
      <circle cx={-26} cy={-30} r={4.5} fill="var(--kamen-stin)" {...INK_TENKY} />
      <path d="M -18 0 L 10 0" stroke="var(--inkoust)" strokeWidth={2} strokeLinecap="round" />
    </g>
  );
}

export function Delo({ x, y, otoceno = false }: { x: number; y: number; otoceno?: boolean }) {
  return (
    <g transform={`translate(${x} ${y})${otoceno ? ' scale(-1 1)' : ''}`}>
      <path d="M -7 -3 L 12 -7 L 13 -2 L -7 2 Z" fill="var(--kamen-stin)" {...INK_TENKY} />
      <circle cx={-6} cy={1} r={4} fill="#8a6a48" {...INK_TENKY} />
      <path d="M -11 2 L 1 2" stroke="var(--inkoust)" strokeWidth={2} strokeLinecap="round" />
    </g>
  );
}
