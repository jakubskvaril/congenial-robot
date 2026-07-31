import type { Nalada } from '../domain/levels';

/** Obloha, počasí, ptáci, denní doba. Jediné místo, kde smí být gradient. */
export function Atmosphere({ nalada, noc }: { nalada: Nalada; noc: boolean }) {
  return (
    <g aria-hidden="true">
      <rect x={36} y={36} width={1528} height={844} fill="url(#obloha)" opacity={noc ? 0.5 : 0.34} />

      {nalada === 'zlataHodina' && !noc && (
        <rect x={36} y={36} width={1528} height={844} fill="var(--zlato)" opacity={0.1} />
      )}

      {(nalada === 'paprsky' || nalada === 'zlataHodina') && !noc && <Paprsky />}

      <Mraky nalada={nalada} />

      {nalada === 'bourka' && <Dest />}

      {!noc && nalada !== 'bourka' && <Ptak />}

      {noc && <Hvezdy />}
    </g>
  );
}

function Paprsky() {
  return (
    <g opacity={0.2}>
      {[0, 1, 2, 3].map((i) => (
        <path
          key={i}
          d={`M ${1180 + i * 40} 36 L ${900 + i * 120} 880 L ${970 + i * 120} 880 Z`}
          fill="var(--zlato)"
          stroke="none"
        />
      ))}
    </g>
  );
}

function Mraky({ nalada }: { nalada: Nalada }) {
  const bourkove = nalada === 'bourka';
  const zatazeno = bourkove || nalada === 'zatazeno';
  const mraky = zatazeno
    ? [
        { x: 200, y: 130, m: 1.5 },
        { x: 620, y: 100, m: 1.9 },
        { x: 1080, y: 140, m: 1.6 },
        { x: 1380, y: 108, m: 1.3 },
        { x: 400, y: 190, m: 1.2 },
      ]
    : [
        { x: 300, y: 118, m: 1 },
        { x: 1180, y: 132, m: 1.2 },
      ];

  return (
    <g>
      {mraky.map((m, i) => (
        <g
          key={i}
          className="a-mrak"
          style={{ animationDuration: `${120 + i * 26}s`, animationDelay: `${-i * 24}s` }}
        >
          <g transform={`translate(${m.x} ${m.y}) scale(${m.m})`}>
            <path
              d="M -46 0 Q -52 -18 -30 -20 Q -24 -36 -2 -30 Q 14 -42 30 -26 Q 52 -26 48 -6 Q 52 2 36 2 L -40 2 Q -48 2 -46 0 Z"
              fill={bourkove ? '#8f93a0' : 'var(--pergamen)'}
              stroke="var(--inkoust)"
              strokeWidth={1.4}
              strokeLinejoin="round"
              opacity={bourkove ? 0.9 : 0.8}
            />
          </g>
        </g>
      ))}
    </g>
  );
}

function Dest() {
  const kapky = Array.from({ length: 60 }, (_, i) => ({
    x: 80 + ((i * 137) % 1440),
    y: 120 + ((i * 211) % 700),
  }));
  return (
    <g opacity={0.35} stroke="var(--voda)" strokeWidth={1.4} strokeLinecap="round">
      {kapky.map((k, i) => (
        <path key={i} d={`M ${k.x} ${k.y} l -4 12`} />
      ))}
    </g>
  );
}

function Ptak() {
  return (
    <g className="a-ptak">
      <g transform="translate(0 200)">
        <path
          d="M 0 0 q 7 -6 14 0 q -7 -2 -14 0"
          fill="none"
          stroke="var(--inkoust)"
          strokeWidth={1.6}
          strokeLinecap="round"
        />
        <path
          d="M 22 10 q 6 -5 12 0 q -6 -2 -12 0"
          fill="none"
          stroke="var(--inkoust)"
          strokeWidth={1.4}
          strokeLinecap="round"
        />
      </g>
    </g>
  );
}

function Hvezdy() {
  const hvezdy = Array.from({ length: 26 }, (_, i) => ({
    x: 80 + ((i * 317) % 1420),
    y: 60 + ((i * 143) % 240),
    r: 1 + ((i * 7) % 3) * 0.4,
  }));
  return (
    <g fill="var(--pergamen)" opacity={0.8} stroke="none">
      {hvezdy.map((h, i) => (
        <circle key={i} cx={h.x} cy={h.y} r={h.r} />
      ))}
    </g>
  );
}

/** Gradient oblohy + zrno pergamenu. Jediné filtry ve scéně. */
export function AtmosferaDefs({ noc, nalada }: { noc: boolean; nalada: Nalada }) {
  const horni = noc ? '#2a3550' : nalada === 'bourka' ? '#8f93a0' : 'var(--obloha-1)';
  const dolni = noc ? '#4a4a5c' : 'var(--obloha-2)';
  return (
    <>
      <linearGradient id="obloha" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={horni} />
        <stop offset="100%" stopColor={dolni} stopOpacity={0} />
      </linearGradient>

      {/* papírové zrno — jemně, aby scéna nešuměla */}
      <filter id="zrno" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={3} seed={7} result="sum" />
        <feColorMatrix type="saturate" values="0" in="sum" result="sedy" />
        <feComponentTransfer in="sedy" result="kontrast">
          <feFuncA type="linear" slope="0.16" intercept="0" />
        </feComponentTransfer>
        <feComposite operator="in" in="kontrast" in2="SourceGraphic" />
      </filter>

      {/* jemné rozvlnění okrajů pergamenu */}
      <filter id="roztrepeni">
        <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves={3} seed={3} result="sum" />
        <feDisplacementMap in="SourceGraphic" in2="sum" scale="7" xChannelSelector="R" yChannelSelector="G" />
      </filter>

      <radialGradient id="vinetace" cx="50%" cy="50%" r="72%">
        <stop offset="55%" stopColor="var(--pergamen-stin)" stopOpacity="0" />
        <stop offset="100%" stopColor="var(--pergamen-stin)" stopOpacity="0.85" />
      </radialGradient>
    </>
  );
}
