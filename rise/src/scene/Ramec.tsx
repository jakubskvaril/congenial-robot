import { INK, INK_TENKY } from './parts/zaklady';

/**
 * Rumělkový ilustrovaný rám s margináliemi v dolních rozích.
 * Tohle je signature prvek celé appky — všechno ostatní kolem drží tiché.
 */
export function Ramec({ ztrata, zisk }: { ztrata: boolean; zisk: boolean }) {
  return (
    <g aria-hidden="true">
      {/* vnější pás rámu */}
      <path
        d="M 0 0 H 1600 V 1000 H 0 Z M 36 36 V 880 H 1564 V 36 Z"
        fill="var(--rumelka)"
        fillRule="evenodd"
        stroke="none"
      />
      <rect x={0.9} y={0.9} width={1598.2} height={998.2} fill="none" {...INK} />
      <rect x={36} y={36} width={1528} height={844} fill="none" {...INK} />
      <rect x={13} y={13} width={1574} height={974} fill="none" {...INK_TENKY} opacity={0.7} />

      <RamovyVzor />
      <RohoveOzdoby />

      <Lucistnik x={128} y={968} pripraven={ztrata} />
      <Kupec x={1452} y={968} smutny={ztrata} pocitaMince={zisk} />
    </g>
  );
}

/** Opakovaný ornament v pásu rámu — přes <symbol>/<use>, ne stovky uzlů. */
function RamovyVzor() {
  return (
    <g>
      <defs>
        <symbol id="ornament" viewBox="0 0 40 30" overflow="visible">
          <path
            d="M 20 3 Q 30 10 20 27 Q 10 10 20 3 Z"
            fill="var(--pergamen)"
            stroke="var(--inkoust)"
            strokeWidth={1.4}
          />
          <circle cx={20} cy={15} r={2.6} fill="var(--zlato)" stroke="none" />
        </symbol>
      </defs>
      {/* horní pás */}
      {Array.from({ length: 30 }, (_, i) => (
        <use key={`h${i}`} href="#ornament" x={40 + i * 51} y={3} width={40} height={30} />
      ))}
      {/* levý a pravý pás */}
      {Array.from({ length: 16 }, (_, i) => (
        <g key={`s${i}`}>
          <use href="#ornament" x={3} y={70 + i * 50} width={30} height={30} />
          <use href="#ornament" x={1567} y={70 + i * 50} width={30} height={30} />
        </g>
      ))}
      {/* dolní pás — jen po okrajích, střed patří textu */}
      {Array.from({ length: 12 }, (_, i) => (
        <use key={`d${i}`} href="#ornament" x={330 + i * 78} y={958} width={40} height={30} />
      ))}
    </g>
  );
}

function RohoveOzdoby() {
  const rohy: [number, number, number][] = [
    [36, 36, 0],
    [1564, 36, 90],
    [1564, 880, 180],
    [36, 880, 270],
  ];
  return (
    <g>
      {rohy.map(([x, y, otoc], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${otoc})`}>
          <path
            d="M 0 0 L 52 0 Q 26 6 20 26 Q 12 8 0 0 Z"
            fill="var(--zlato)"
            stroke="var(--inkoust)"
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        </g>
      ))}
    </g>
  );
}

/* -------------------------------------------------------- marginálie -- */

/** Lučištník vlevo dole. Při ztrátě napíná luk, jinak stojí v klidu. */
function Lucistnik({ x, y, pripraven }: { x: number; y: number; pripraven: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {/* zem pod figurou */}
      <ellipse cx={0} cy={2} rx={44} ry={7} fill="var(--pergamen)" opacity={0.35} stroke="none" />

      {/* nohy */}
      <path d="M -6 0 l -3 -26 M 8 0 l -1 -26" stroke="var(--inkoust)" strokeWidth={3.4} strokeLinecap="round" />
      {/* tunika */}
      <path d="M -13 -26 L -9 -58 L 11 -58 L 15 -26 Z" fill="var(--les)" {...INK} />
      {/* hlava a kapuce */}
      <circle cx={1} cy={-67} r={9} fill="var(--pergamen-stin)" {...INK} />
      <path d="M -9 -67 Q -8 -80 1 -80 Q 10 -80 11 -67 Q 1 -73 -9 -67 Z" fill="var(--les)" {...INK_TENKY} />
      {/* luk */}
      <path
        d={
          pripraven
            ? 'M 24 -86 Q 44 -56 24 -26'
            : 'M 26 -84 Q 34 -55 26 -26'
        }
        fill="none"
        stroke="var(--inkoust)"
        strokeWidth={3}
        strokeLinecap="round"
      />
      <path
        d={pripraven ? 'M 24 -86 L 8 -56 L 24 -26' : 'M 26 -84 L 26 -26'}
        stroke="var(--inkoust)"
        strokeWidth={1.3}
      />
      {pripraven && <path d="M 6 -56 L 42 -56" stroke="var(--inkoust)" strokeWidth={1.8} strokeLinecap="round" />}
      {/* toulec */}
      <path d="M -18 -30 L -22 -58 L -14 -60 L -10 -32 Z" fill="var(--strecha-stin)" {...INK_TENKY} />
      <path d="M -20 -60 l -2 -8 M -16 -61 l 0 -8" stroke="var(--inkoust)" strokeWidth={1.3} strokeLinecap="round" />
    </g>
  );
}

/**
 * Kupec vpravo dole. Při zisku počítá mince, při ztrátě se drží za hlavu.
 * Žádný komentář, žádná rada — jen reakce.
 */
function Kupec({ x, y, smutny, pocitaMince }: { x: number; y: number; smutny: boolean; pocitaMince: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={0} cy={2} rx={56} ry={7} fill="var(--pergamen)" opacity={0.35} stroke="none" />

      {/* lavice */}
      <path d="M -46 0 L -46 -20 L 46 -20 L 46 0" fill="none" stroke="var(--inkoust)" strokeWidth={3} strokeLinecap="round" />
      <path d="M -50 -20 L 50 -20" stroke="var(--inkoust)" strokeWidth={4} strokeLinecap="round" />

      {/* nohy sedícího */}
      <path d="M -10 -20 l 0 14 M 4 -20 l 2 14" stroke="var(--inkoust)" strokeWidth={3.2} strokeLinecap="round" />
      {/* plášť */}
      <path d="M -20 -20 L -15 -56 L 13 -56 L 18 -20 Z" fill="var(--rumelka)" {...INK} />
      <path d="M 4 -20 L 8 -56 L 13 -56 L 18 -20 Z" fill="var(--strecha-stin)" opacity={0.5} stroke="none" />
      {/* hlava */}
      <circle cx={-1} cy={-65} r={9.5} fill="var(--pergamen-stin)" {...INK} />
      {/* čapka */}
      <path d="M -11 -68 Q -10 -80 -1 -80 Q 8 -80 9 -68 Z" fill="var(--strecha)" {...INK_TENKY} />

      {smutny ? (
        <>
          {/* ruce u hlavy */}
          <path d="M -12 -56 Q -20 -66 -12 -72" fill="none" stroke="var(--inkoust)" strokeWidth={3} strokeLinecap="round" />
          <path d="M 10 -56 Q 18 -66 10 -72" fill="none" stroke="var(--inkoust)" strokeWidth={3} strokeLinecap="round" />
          <path d="M -6 -62 l 3 3 M 2 -62 l 3 3" stroke="var(--inkoust)" strokeWidth={1.5} strokeLinecap="round" />
          {/* převrácený měšec */}
          <path d="M 30 -20 q -7 -12 0 -18 q 7 6 0 18 z" fill="#a98a52" {...INK_TENKY} />
          <circle cx={36} cy={-6} r={3} fill="var(--kamen-stin)" {...INK_TENKY} />
          <circle cx={43} cy={-4} r={3} fill="var(--kamen-stin)" {...INK_TENKY} />
        </>
      ) : (
        <>
          {/* ruce nad stolkem s mincemi */}
          <path d="M -12 -54 Q -22 -44 -14 -36" fill="none" stroke="var(--inkoust)" strokeWidth={3} strokeLinecap="round" />
          <path d="M 10 -54 Q 20 -44 12 -36" fill="none" stroke="var(--inkoust)" strokeWidth={3} strokeLinecap="round" />
          <path d="M -7 -62 l 5 0 M 1 -62 l 5 0" stroke="var(--inkoust)" strokeWidth={1.5} strokeLinecap="round" />
          {/* sloupky mincí */}
          {[0, 1, 2].map((i) => (
            <g key={i}>
              {Array.from({ length: pocitaMince ? 3 + i : 1 }, (_, j) => (
                <ellipse
                  key={j}
                  cx={26 + i * 12}
                  cy={-23 - j * 4}
                  rx={5}
                  ry={2.4}
                  fill="var(--zlato)"
                  {...INK_TENKY}
                />
              ))}
            </g>
          ))}
        </>
      )}
    </g>
  );
}

/* ---------------------------------------------------------- kartuše -- */

/** Iluminovaná iniciála a titul v levém horním rohu mapy. */
export function Kartus({ podtitul }: { podtitul: string }) {
  return (
    <g>
      <g transform="translate(72 72)">
        {/* rám kartuše */}
        <path
          d="M 0 0 L 336 0 L 348 22 L 336 128 L 12 128 L 0 106 Z"
          fill="var(--pergamen)"
          {...INK}
        />
        <path
          d="M 8 8 L 330 8 L 340 24 L 329 120 L 18 120 L 8 104 Z"
          fill="none"
          stroke="var(--rumelka)"
          strokeWidth={1.6}
        />

        {/* iluminovaná iniciála */}
        <rect x={20} y={20} width={84} height={88} fill="var(--rumelka)" {...INK_TENKY} />
        <rect x={26} y={26} width={72} height={76} fill="var(--zlato)" stroke="none" />
        <text
          x={62}
          y={90}
          textAnchor="middle"
          fontFamily="Cinzel, serif"
          fontSize={72}
          fontWeight={700}
          fill="var(--inkoust)"
        >
          Ř
        </text>
        {/* úponky */}
        <path
          d="M 20 20 q -12 -8 -16 4 M 104 108 q 12 8 16 -4"
          fill="none"
          stroke="var(--les)"
          strokeWidth={2}
          strokeLinecap="round"
        />

        <text
          x={112}
          y={72}
          fontFamily="Cinzel, serif"
          fontSize={50}
          fontWeight={700}
          letterSpacing="8"
          fill="var(--inkoust)"
        >
          ÍŠE
        </text>
        <text
          x={114}
          y={102}
          fontFamily="'IBM Plex Mono', monospace"
          fontSize={15}
          fill="var(--inkoust)"
          opacity={0.75}
        >
          {podtitul}
        </text>
      </g>
    </g>
  );
}
