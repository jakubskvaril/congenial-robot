import { INK, INK_TENKY, Jehlicnan, Strom } from './parts/zaklady';

/** Kopce, řeka, lesy a cesty vedoucí k bráně. Pod všemi třemi sférami. */
export function Teren({ zivo }: { zivo: boolean }) {
  return (
    <g aria-hidden="true">
      {/* travnatý podklad mapy */}
      <path
        d="M 52 120 Q 400 78 800 92 Q 1200 106 1548 84 L 1548 862 Q 1100 894 800 878 Q 460 862 52 886 Z"
        fill="var(--louka)"
        opacity={0.42}
        stroke="none"
      />

      <Kopce />
      <Reka />
      <Cesty />
      <Lesy />

      {zivo && <Povozy />}
    </g>
  );
}

function Kopce() {
  const kopce = [
    'M 90 260 Q 170 194 260 258 Q 176 286 90 260 Z',
    'M 250 200 Q 330 146 410 202 Q 330 228 250 200 Z',
    'M 1290 240 Q 1380 176 1470 242 Q 1382 272 1290 240 Z',
    'M 1180 176 Q 1250 132 1322 180 Q 1250 204 1180 176 Z',
    'M 1160 760 Q 1250 700 1344 762 Q 1252 792 1160 760 Z',
  ];
  return (
    <g>
      {kopce.map((d, i) => (
        <g key={i}>
          <path d={d} fill="var(--louka)" {...INK_TENKY} />
          <path
            d={d}
            fill="var(--les)"
            opacity={0.18}
            stroke="none"
            transform="translate(6 4)"
          />
        </g>
      ))}
    </g>
  );
}

function Reka() {
  const d =
    'M 52 330 Q 240 372 330 470 Q 410 556 560 700 Q 690 826 900 860 Q 1160 900 1420 846 Q 1500 828 1548 806';
  return (
    <g>
      <path d={d} fill="none" stroke="var(--voda)" strokeWidth={26} strokeLinecap="round" />
      <path d={d} fill="none" stroke="var(--inkoust)" strokeWidth={1.4} opacity={0.45} />
      <path
        d={d}
        fill="none"
        stroke="var(--pergamen)"
        strokeWidth={5}
        strokeDasharray="18 40"
        opacity={0.5}
        className="a-voda"
      />
      {/* brod / most na cestě k bráně */}
      <g>
        <path d="M 604 736 L 660 704" stroke="#a98a52" strokeWidth={11} strokeLinecap="round" />
        <path d="M 604 736 L 660 704" stroke="var(--inkoust)" strokeWidth={1.4} />
      </g>
    </g>
  );
}

function Cesty() {
  const cesty = [
    'M 756 660 Q 748 760 700 830 Q 650 900 560 940',
    'M 756 660 Q 900 720 1080 740 Q 1300 764 1520 700',
    'M 790 292 Q 760 200 640 150 Q 500 96 360 118',
  ];
  return (
    <g>
      {cesty.map((d, i) => (
        <g key={i}>
          <path d={d} fill="none" stroke="var(--pergamen-stin)" strokeWidth={13} strokeLinecap="round" />
          <path
            d={d}
            fill="none"
            stroke="var(--inkoust)"
            strokeWidth={1.1}
            strokeDasharray="5 9"
            opacity={0.55}
          />
        </g>
      ))}
    </g>
  );
}

function Lesy() {
  const listnaty: [number, number, number][] = [
    [96, 620, 1.1], [140, 648, 0.9], [76, 676, 1], [118, 700, 1.15],
    [160, 616, 0.85], [1440, 380, 1], [1490, 412, 0.9], [1420, 440, 1.1],
    [1500, 470, 0.95], [1452, 500, 1.05], [244, 172, 0.9], [200, 148, 1],
  ];
  const jehlicnaty: [number, number, number][] = [
    [1380, 640, 1.1], [1428, 672, 0.95], [1348, 700, 1.05], [1400, 726, 0.9],
    [1470, 640, 1], [130, 330, 1], [88, 366, 1.1], [166, 372, 0.9],
    [1150, 190, 1], [1096, 216, 0.9], [1206, 224, 1.05],
  ];
  return (
    <g>
      {listnaty.map(([x, y, v], i) => (
        <Strom key={`l${i}`} x={x} y={y} velikost={v} />
      ))}
      {jehlicnaty.map(([x, y, v], i) => (
        <Jehlicnan key={`j${i}`} x={x} y={y} velikost={v} />
      ))}
    </g>
  );
}

/** Povozy na cestách — objeví se, až se říši daří. */
function Povozy() {
  return (
    <g>
      {[
        [1042, 742],
        [686, 838],
      ].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <rect x={-11} y={-11} width={22} height={8} fill="#a98a52" {...INK_TENKY} />
          <circle cx={-7} cy={-1} r={3.6} fill="none" {...INK_TENKY} />
          <circle cx={7} cy={-1} r={3.6} fill="none" {...INK_TENKY} />
          <path d="M -11 -8 l -9 3" stroke="var(--inkoust)" strokeWidth={1.4} strokeLinecap="round" />
        </g>
      ))}
      {/* trh u brány */}
      <g>
        <path d="M 826 690 l -8 -12 l 34 0 l -8 12 z" fill="var(--rumelka)" {...INK_TENKY} />
        <path d="M 862 706 l -8 -12 l 34 0 l -8 12 z" fill="var(--zlato)" {...INK} strokeWidth={1.2} />
      </g>
    </g>
  );
}
