import {
  formatCislo,
  formatKcSeZnamenkem,
  formatProcenta,
  formatProcentaSeZnamenkem,
} from '../domain/money';
import { NAZVY_SFER, type OceneniPortfolia } from '../domain/valuation';

/**
 * The accessible equivalent of the map: it carries every figure the scene
 * visualises. Horizontal rules like a hand-ruled ledger — no boxes, no shadows.
 */
export function Ledger({ portfolio }: { portfolio: OceneniPortfolia }) {
  return (
    <table className="ucetni" id="souhrn">
      <caption className="sr-only">
        Portfolio summary by sphere: paid in, value, gain and annualised return.
      </caption>
      <thead>
        <tr>
          <th scope="col">Sphere</th>
          <th scope="col">Instrument</th>
          <th scope="col" className="cislo">
            Paid in
          </th>
          <th scope="col" className="cislo">
            Value
          </th>
          <th scope="col" className="cislo">
            Gain
          </th>
          <th scope="col" className="cislo">
            %
          </th>
          <th scope="col" className="cislo">
            p.a.
          </th>
        </tr>
      </thead>
      <tbody>
        {portfolio.poradi.map((sferaId) => {
          const s = portfolio.sfery[sferaId];
          const prazdna = s.vlozeno === 0;
          return (
            <tr key={sferaId}>
              <th scope="row" className="font-display text-[13px] tracking-[0.08em] font-normal">
                {NAZVY_SFER[sferaId]}
              </th>
              <td className="text-[15px]">
                {s.aktiva.map((a) => a.aktivum.ticker ?? a.aktivum.nazev).join(', ') || '—'}
              </td>
              <td className="cislo">{prazdna ? '—' : formatCislo(s.vlozeno)}</td>
              <td className="cislo">{prazdna ? '—' : formatCislo(s.hodnota)}</td>
              <td className={`cislo ${barva(s.zisk, prazdna)}`}>
                {prazdna ? '—' : formatKcSeZnamenkem(s.zisk).replace(' CZK', '')}
              </td>
              <td className={`cislo ${barva(s.zisk, prazdna)}`}>
                {formatProcentaSeZnamenkem(s.ziskPct)}
              </td>
              <td className="cislo">{formatProcentaSeZnamenkem(s.vynosPa)}</td>
            </tr>
          );
        })}
        <tr className="soucet">
          <th scope="row" className="font-display text-[13px] tracking-[0.12em]">
            Total
          </th>
          <td />
          <td className="cislo">{formatCislo(portfolio.vlozeno)}</td>
          <td className="cislo">{formatCislo(portfolio.hodnota)}</td>
          <td className={`cislo ${barva(portfolio.zisk, portfolio.vlozeno === 0)}`}>
            {formatKcSeZnamenkem(portfolio.zisk).replace(' CZK', '')}
          </td>
          <td className={`cislo ${barva(portfolio.zisk, portfolio.vlozeno === 0)}`}>
            {formatProcentaSeZnamenkem(portfolio.ziskPct)}
          </td>
          <td className="cislo">{formatProcentaSeZnamenkem(portfolio.vynosPa)}</td>
        </tr>
      </tbody>
    </table>
  );
}

function barva(zisk: number, prazdna: boolean): string {
  if (prazdna || Math.round(zisk) === 0) return '';
  return zisk > 0 ? 'zisk' : 'ztrata';
}

/** The same table on mobile — one card per sphere, still without a frame. */
export function LedgerKarty({ portfolio }: { portfolio: OceneniPortfolia }) {
  return (
    <div>
      {portfolio.poradi.map((sferaId) => {
        const s = portfolio.sfery[sferaId];
        const prazdna = s.vlozeno === 0;
        return (
          <div key={sferaId} className="border-b border-[var(--inkoust-vlas)] py-3">
            <div className="flex items-baseline justify-between">
              <h3 className="font-display text-[14px]">{NAZVY_SFER[sferaId]}</h3>
              <span className="cislo text-[17px]">
                {prazdna ? '—' : `${formatCislo(s.hodnota)} CZK`}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 text-[14px] opacity-80">
              <span>
                paid in <span className="cislo">{prazdna ? '—' : formatCislo(s.vlozeno)}</span>
              </span>
              <span className={barva(s.zisk, prazdna)}>
                gain{' '}
                <span className="cislo">
                  {prazdna ? '—' : formatKcSeZnamenkem(s.zisk).replace(' CZK', '')}
                </span>{' '}
                <span className="cislo">({formatProcentaSeZnamenkem(s.ziskPct)})</span>
              </span>
              <span>
                p.a. <span className="cislo">{formatProcenta(s.vynosPa)}</span>
              </span>
            </div>
          </div>
        );
      })}
      <div className="flex items-baseline justify-between border-t-[1.8px] border-[var(--inkoust)] pt-3">
        <h3 className="font-display text-[14px] tracking-[0.12em]">Total</h3>
        <span className="cislo text-[19px]">{formatCislo(portfolio.hodnota)} CZK</span>
      </div>
    </div>
  );
}
