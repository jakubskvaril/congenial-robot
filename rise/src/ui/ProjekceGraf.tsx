import { useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCislo, formatKc } from '../domain/money';
import type { SferaId } from '../domain/types';
import { NAZVY_SFER, projekce, type OceneniPortfolia } from '../domain/valuation';

const BARVY: Record<SferaId, string> = {
  castle: 'var(--kamen-stin)',
  wall: 'var(--strecha)',
  horde: 'var(--les)',
};

export function ProjekceSekce({
  portfolio,
  vychoziSazbySfer,
}: {
  portfolio: OceneniPortfolia;
  vychoziSazbySfer: Record<SferaId, number>;
}) {
  const [sazby, setSazby] = useState(vychoziSazbySfer);
  const body = projekce(portfolio, sazby, [0, 1, 3, 5, 10]);

  return (
    <div>
      <div className="mb-6 grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-3">
        {portfolio.poradi.map((s) => (
          <label key={s} className="block">
            <span className="popisek">{NAZVY_SFER[s]} rate (% p.a.)</span>
            <input
              type="number"
              className="pole"
              step="0.01"
              value={Math.round(sazby[s] * 10_000) / 100}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v)) setSazby({ ...sazby, [s]: v / 100 });
              }}
            />
          </label>
        ))}
      </div>

      <div className="h-[320px] w-full" role="img" aria-label="Projected portfolio value chart">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={body} margin={{ top: 8, right: 8, bottom: 4, left: 8 }}>
            <CartesianGrid stroke="var(--inkoust-vlas)" vertical={false} />
            <XAxis
              dataKey="rok"
              tickFormatter={(r: number) => (r === 0 ? 'today' : `+${r}y`)}
              stroke="var(--inkoust)"
              tick={{ fontFamily: 'IBM Plex Mono', fontSize: 12 }}
            />
            <YAxis
              tickFormatter={(v: number) => formatCislo(v)}
              stroke="var(--inkoust)"
              width={78}
              tick={{ fontFamily: 'IBM Plex Mono', fontSize: 12 }}
            />
            <Tooltip
              formatter={(v: number, n: string) => [formatKc(v), n]}
              labelFormatter={(r: number) => (r === 0 ? 'Today' : `In ${r} years`)}
              contentStyle={{
                background: 'var(--pergamen)',
                border: '1.8px solid var(--inkoust)',
                borderRadius: 0,
                fontFamily: 'IBM Plex Mono',
                fontSize: 13,
              }}
            />
            <Legend wrapperStyle={{ fontFamily: 'EB Garamond', fontSize: 15 }} />
            {portfolio.poradi.map((s) => (
              <Area
                key={s}
                type="monotone"
                dataKey={s}
                name={NAZVY_SFER[s]}
                stackId="1"
                stroke="var(--inkoust)"
                strokeWidth={1.5}
                fill={BARVY[s]}
                fillOpacity={0.85}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <table className="ucetni mt-8 max-w-[640px]">
        <caption className="sr-only">Projected value by sphere</caption>
        <thead>
          <tr>
            <th scope="col">Horizon</th>
            {portfolio.poradi.map((s) => (
              <th key={s} scope="col" className="cislo">
                {NAZVY_SFER[s]}
              </th>
            ))}
            <th scope="col" className="cislo">Total</th>
          </tr>
        </thead>
        <tbody>
          {body.map((b) => (
            <tr key={b.rok}>
              <th scope="row" className="font-normal">
                {b.rok === 0 ? 'today' : `in ${b.rok} years`}
              </th>
              {portfolio.poradi.map((s) => (
                <td key={s} className="cislo">
                  {formatCislo(b[s])}
                </td>
              ))}
              <td className="cislo font-semibold">{formatCislo(b.celkem)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-4 max-w-[62ch] text-[14px] opacity-60">
        The projection is plain compounding of today's value at the rate you enter. The defaults
        come from long-run returns since 2000, not from extrapolating the last decade. Future
        returns are unknown.
      </p>
    </div>
  );
}
