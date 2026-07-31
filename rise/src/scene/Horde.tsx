import { pocetFigur, type StavUrovne } from '../domain/levels';
import {
  INK_TENKY,
  Jezdec,
  Kopinik,
  Lucistnik,
  Ohniste,
  Pesak,
  Prapor,
  Stan,
  Trebuchet,
} from './parts/zaklady';

/** Tábor v poli, vně hradeb, vlevo dole u lesa. */
export const HORDA_STRED = { x: 292, y: 764 };

/**
 * Rozestavení figur je pevné pole souřadnic — pořadí se nemění, takže
 * při stejné hodnotě stojí vojsko vždycky stejně. Nad strop 40 figur se
 * místo přidávání mění výzbroj a formace.
 */
const POZICE: readonly (readonly [number, number])[] = [
  [268, 786], [292, 792], [244, 790], [316, 788], [220, 796],
  [340, 792], [268, 806], [292, 812], [244, 810], [316, 808],
  [196, 800], [364, 796], [220, 816], [340, 812], [172, 806],
  [388, 802], [196, 822], [364, 818], [268, 826], [292, 832],
  [244, 830], [316, 828], [148, 812], [412, 808], [172, 828],
  [388, 824], [220, 836], [340, 834], [148, 834], [412, 830],
  [196, 842], [364, 840], [268, 846], [292, 852], [244, 850],
  [316, 848], [172, 848], [388, 844], [220, 856], [340, 854],
];

export function Horde({
  uroven,
  hodnota,
  noc,
}: {
  uroven: StavUrovne;
  hodnota: number;
  noc: boolean;
}) {
  const lvl = uroven.lvl;
  const figur = pocetFigur(hodnota);

  return (
    <g>
      <Taboriste vyhasle={lvl === 0} />

      {lvl >= 1 && <Ohniste x={292} y={764} hori />}

      {/* stany podle úrovně */}
      {lvl >= 1 && <Stan x={236} y={756} velikost={0.9} />}
      {lvl >= 2 && (
        <>
          <Stan x={340} y={752} velikost={0.85} />
          <Stan x={188} y={772} velikost={0.8} />
        </>
      )}
      {lvl >= 4 && <Ohrada />}
      {lvl >= 5 && (
        <>
          <Trebuchet x={452} y={784} />
          <ObleaciVez x={120} y={790} />
        </>
      )}

      {/* korouhev v čele od lvl 3 */}
      {lvl >= 3 && <Prapor x={292} y={742} vyska={30} barva="var(--rumelka)" />}
      {lvl >= 6 && (
        <>
          <Prapor x={236} y={738} vyska={24} barva="var(--zlato)" />
          <Prapor x={348} y={738} vyska={24} barva="var(--zlato)" />
          <Bubenici />
        </>
      )}

      <Vojsko lvl={lvl} figur={figur} />

      {noc && lvl >= 1 && (
        <ellipse cx={292} cy={764} rx={78} ry={30} fill="var(--zlato)" opacity={0.1} stroke="none" />
      )}
    </g>
  );
}

function Taboriste({ vyhasle }: { vyhasle: boolean }) {
  return (
    <g>
      <ellipse cx={292} cy={790} rx={168} ry={82} fill="var(--pergamen-stin)" opacity={0.5} stroke="none" />
      <ellipse
        cx={292}
        cy={790}
        rx={168}
        ry={82}
        fill="none"
        stroke="var(--inkoust)"
        strokeWidth={1.2}
        strokeDasharray="8 9"
        opacity={0.6}
      />
      {vyhasle && (
        <g>
          <ellipse cx={292} cy={764} rx={11} ry={5} fill="var(--kamen-stin)" {...INK_TENKY} />
          <path d="M 286 762 l 12 -4 M 288 758 l 9 6" stroke="var(--inkoust)" strokeWidth={1.4} strokeLinecap="round" />
        </g>
      )}
    </g>
  );
}

function Ohrada() {
  return (
    <g>
      <path
        d="M 396 736 L 470 744 L 470 776 L 396 768 Z"
        fill="none"
        stroke="var(--inkoust)"
        strokeWidth={1.6}
      />
      {[0, 1, 2, 3].map((i) => (
        <path
          key={i}
          d={`M ${404 + i * 20} ${738 + i * 2} l 0 ${28}`}
          stroke="var(--inkoust)"
          strokeWidth={1.2}
        />
      ))}
      <Kun x={432} y={762} />
      <Kun x={452} y={756} />
    </g>
  );
}

function Kun({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M -10 0 l 1 -7 l 4 -4 h 10 l 4 4 l 1 7 h -3 l 0 -5 h -14 l 0 5 z" fill="#8a6a48" {...INK_TENKY} />
      <path d="M -9 -11 l -4 -4 h 5 z" fill="#8a6a48" {...INK_TENKY} />
    </g>
  );
}

function ObleaciVez({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M -14 0 L -11 -44 L 11 -44 L 14 0 Z" fill="#a98a52" {...INK_TENKY} />
      <path d="M 4 0 L 6 -44 L 11 -44 L 14 0 Z" fill="var(--kamen-stin)" opacity={0.4} stroke="none" />
      <path d="M -12 -14 h 24 M -13 -29 h 26" stroke="var(--inkoust)" strokeWidth={1.2} />
      <path d="M -11 -44 L 0 -54 L 11 -44 Z" fill="var(--strecha-stin)" {...INK_TENKY} />
      <circle cx={-9} cy={2} r={4} fill="none" {...INK_TENKY} />
      <circle cx={9} cy={2} r={4} fill="none" {...INK_TENKY} />
    </g>
  );
}

function Bubenici() {
  return (
    <g>
      {[
        [252, 728],
        [332, 728],
      ].map(([x, y], i) => (
        <g key={i}>
          <ellipse cx={x} cy={y! - 6} rx={7} ry={5} fill="#a98a52" {...INK_TENKY} />
          <rect x={x! - 3} y={y! - 18} width={6} height={9} rx={1.6} fill="var(--rumelka)" {...INK_TENKY} />
          <circle cx={x} cy={y! - 21} r={2.6} fill="var(--pergamen-stin)" {...INK_TENKY} />
        </g>
      ))}
    </g>
  );
}

/**
 * Skladba vojska podle úrovně: nejdřív pěšáci, pak kopiníci, lučištníci
 * a jízda. Nad stropem se mění výzbroj, ne počet.
 */
function Vojsko({ lvl, figur }: { lvl: number; figur: number }) {
  if (lvl === 0 || figur === 0) {
    return lvl >= 1 ? (
      <g>
        <Pesak x={272} y={786} />
        <Pesak x={312} y={790} />
      </g>
    ) : null;
  }

  return (
    <g>
      {POZICE.slice(0, figur).map(([x, y], i) => {
        const typ = vyberTyp(i, lvl);
        if (typ === 'jezdec') return <Jezdec key={i} x={x} y={y} />;
        if (typ === 'lucistnik') return <Lucistnik key={i} x={x} y={y} />;
        if (typ === 'kopinik') return <Kopinik key={i} x={x} y={y} />;
        return <Pesak key={i} x={x} y={y} barva={i % 3 === 0 ? 'var(--rumelka)' : 'var(--strecha-stin)'} />;
      })}
    </g>
  );
}

function vyberTyp(i: number, lvl: number): 'pesak' | 'kopinik' | 'lucistnik' | 'jezdec' {
  if (lvl >= 4 && i % 7 === 3) return 'jezdec';
  if (lvl >= 3 && i % 5 === 1) return 'lucistnik';
  if (lvl >= 2 && i % 3 === 2) return 'kopinik';
  return 'pesak';
}
