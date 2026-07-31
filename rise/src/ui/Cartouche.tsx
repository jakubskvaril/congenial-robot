import { useMemo } from 'react';
import { useStav } from '../data/store';
import { dnesIso, dniMezi } from '../domain/datum';
import { urovenSfery } from '../domain/levels';
import {
  formatDatum,
  formatKc,
  formatKcSeZnamenkem,
  formatProcentaSeZnamenkem,
} from '../domain/money';
import type { SferaId } from '../domain/types';
import { historieHodnoty, NAZVY_SFER, type OceneniPortfolia } from '../domain/valuation';

/**
 * Karta ve tvaru rozvinutého svitku. Na desktopu se ukazuje u mapy při
 * hoveru, na mobilu jako bottom sheet po tapu.
 */
export function Cartouche({
  sferaId,
  portfolio,
  bottomSheet = false,
  onZavrit,
}: {
  sferaId: SferaId;
  portfolio: OceneniPortfolia;
  bottomSheet?: boolean;
  onZavrit?: () => void;
}) {
  const stav = useStav();
  const s = portfolio.sfery[sferaId];
  const uroven = urovenSfery(sferaId, s.hodnota);
  const prazdna = s.vlozeno === 0;
  const nastroje = s.aktiva.map((a) => a.aktivum.ticker ?? a.aktivum.nazev).join(', ');

  const body = useMemo(() => {
    const aktiva = stav.aktiva.filter((a) => a.sferaId === sferaId);
    if (aktiva.every((a) => a.vklady.length === 0)) return [];
    return historieHodnoty(aktiva, stav.kurzy, portfolio.dnes, 90, 5).map((b) => b.hodnota);
  }, [stav, sferaId, portfolio.dnes]);

  const posledniCena = s.aktiva
    .map((o) => o.aktualniCena)
    .filter((c): c is NonNullable<typeof c> => c != null)
    .sort((a, b) => (a.datum < b.datum ? 1 : -1))[0];
  const cenaStara = posledniCena ? dniMezi(posledniCena.datum, dnesIso()) > 7 : false;

  return (
    <div
      role={bottomSheet ? 'dialog' : undefined}
      aria-label={`Podrobnosti sféry ${NAZVY_SFER[sferaId]}`}
      className={
        bottomSheet
          ? 'fixed inset-x-0 bottom-0 z-40 max-h-[75vh] overflow-y-auto border-t-2 border-[var(--inkoust)] bg-[var(--pergamen)] px-5 pb-8 pt-4'
          : 'pointer-events-none absolute right-4 top-4 z-30 w-[330px] max-w-[calc(100%-2rem)]'
      }
    >
      <div
        className={
          bottomSheet
            ? ''
            : 'border-2 border-[var(--inkoust)] bg-[var(--pergamen)] px-5 py-4'
        }
        style={
          bottomSheet
            ? undefined
            : {
                clipPath:
                  'polygon(0 8px, 3% 0, 97% 0, 100% 8px, 99% 96%, 96% 100%, 4% 100%, 0 97%)',
              }
        }
      >
        {bottomSheet && (
          <button
            type="button"
            className="tlacitko float-right !min-h-0 !px-2 !py-1"
            onClick={onZavrit}
          >
            Zavřít
          </button>
        )}

        <h3 className="font-display text-[16px] tracking-[0.1em]">{NAZVY_SFER[sferaId]}</h3>
        <p className="text-[13px] opacity-65">{nastroje}</p>

        <p className="cislo mt-3 text-[30px] leading-none">
          {prazdna ? '0 Kč' : formatKc(s.hodnota)}
        </p>

        {prazdna ? (
          <PrazdnaVyzva sferaId={sferaId} />
        ) : (
          <>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[14px]">
              <dt className="opacity-65">Vloženo</dt>
              <dd className="cislo text-right">{formatKc(s.vlozeno)}</dd>
              <dt className="opacity-65">Zisk</dt>
              <dd className={`cislo text-right ${barva(s.zisk)}`}>
                {formatKcSeZnamenkem(s.zisk)} ({formatProcentaSeZnamenkem(s.ziskPct)})
              </dd>
              <dt className="opacity-65">Výnos p.a.</dt>
              <dd className="cislo text-right">{formatProcentaSeZnamenkem(s.vynosPa)}</dd>
            </dl>

            {body.length > 1 && <Sparkline body={body} />}
          </>
        )}

        <div className="mt-4 border-t border-[var(--inkoust-vlas)] pt-3">
          <p className="flex items-baseline justify-between text-[13px]">
            <span className="font-display tracking-[0.08em]">{uroven.def.nazev}</span>
            <span className="cislo opacity-65">úroveň {uroven.lvl}/7</span>
          </p>
          {uroven.dalsi && (
            <>
              <div
                className="mt-2 h-[7px] w-full border border-[var(--inkoust)]"
                role="img"
                aria-label={`Postup do další úrovně: ${Math.round(uroven.postup * 100)} %`}
              >
                <div
                  className="h-full bg-[var(--zlato)]"
                  style={{ width: `${uroven.postup * 100}%` }}
                />
              </div>
              <p className="mt-1.5 text-[13px]">
                Do úrovně <em>{uroven.dalsi.nazev}</em> chybí{' '}
                <span className="cislo">{formatKc(uroven.chybi)}</span>
              </p>
            </>
          )}
        </div>

        {(posledniCena || s.aktiva.some((a) => a.aktivum.ocenovani === 'jednotky')) && (
          <p className="mt-2 text-[12px] opacity-65">
            {posledniCena ? (
              <>
                Cena k <span className="cislo">{formatDatum(posledniCena.datum)}</span>
                {cenaStara && (
                  <span className="stitek stitek-zluty ml-2">starší než 7 dní</span>
                )}
              </>
            ) : (
              <span className="stitek stitek-cerveny">cena zatím nenačtena</span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}

function barva(zisk: number): string {
  if (Math.round(zisk) === 0) return '';
  return zisk > 0 ? 'zisk' : 'ztrata';
}

/** Prázdný stav je výzva k akci, ne omluva. */
function PrazdnaVyzva({ sferaId }: { sferaId: SferaId }) {
  const text: Record<SferaId, { veta: string; akce: string }> = {
    castle: { veta: 'Pokladna hradu je prázdná.', akce: 'Ulož první vklad' },
    wall: { veta: 'Hradby zatím jen vyměřené.', akce: 'Postav první úsek' },
    horde: { veta: 'Horda čeká na rozkaz.', akce: 'Vyprav první oddíl' },
  };
  return (
    <div className="mt-3">
      <p className="text-[14px] italic">{text[sferaId].veta}</p>
      <a
        href="#/kronika"
        className="tlacitko pointer-events-auto mt-3 inline-block no-underline"
      >
        {text[sferaId].akce}
      </a>
    </div>
  );
}

/** Sparkline za 90 dní — čistý inkoust, žádná osa. */
function Sparkline({ body }: { body: number[] }) {
  const min = Math.min(...body);
  const max = Math.max(...body);
  const rozpeti = max - min || 1;
  const w = 290;
  const h = 40;
  const d = body
    .map((v, i) => {
      const x = (i / (body.length - 1)) * w;
      const y = h - 4 - ((v - min) / rozpeti) * (h - 8);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="mt-3 h-[40px] w-full"
      role="img"
      aria-label="Vývoj hodnoty za posledních 90 dní"
    >
      <path d={d} fill="none" stroke="var(--inkoust)" strokeWidth={1.6} strokeLinejoin="round" />
      <circle
        cx={w}
        cy={h - 4 - ((body[body.length - 1]! - min) / rozpeti) * (h - 8)}
        r={2.6}
        fill="var(--zlato)"
        stroke="var(--inkoust)"
        strokeWidth={1}
      />
    </svg>
  );
}
