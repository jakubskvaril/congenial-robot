import { useMemo } from 'react';
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { WeightEntry } from '../types';
import { BOB } from '../types';
import { WEIGHT_CURVE_MALE } from '../data/weightCurve';

interface WeightChartProps {
  weights: WeightEntry[];
}

export function WeightChart({ weights }: WeightChartProps) {
  const birthDate = new Date(BOB.birthDate).getTime();

  const chartData = useMemo(() => {
    // Reference curve points
    const refPoints = WEIGHT_CURVE_MALE.map(p => ({
      months: p.months,
      reference: p.kg,
      refLow: p.kg * 0.85,
      refHigh: p.kg * 1.15,
      actual: undefined as number | undefined,
    }));

    // Add actual weight points
    for (const w of weights) {
      const ageMonths = (new Date(w.date).getTime() - birthDate) / (1000 * 60 * 60 * 24 * 30.4375);
      const rounded = Math.round(ageMonths * 10) / 10;
      // Find or create point
      const existing = refPoints.find(p => Math.abs(p.months - rounded) < 0.5);
      if (existing) {
        existing.actual = w.kg;
      } else {
        refPoints.push({ months: rounded, reference: undefined as unknown as number, refLow: undefined as unknown as number, refHigh: undefined as unknown as number, actual: w.kg });
      }
    }

    return refPoints.sort((a, b) => a.months - b.months);
  }, [weights, birthDate]);

  return (
    <div className="weight-chart-wrap" data-testid="weight-chart">
      <ResponsiveContainer width="100%" height={250}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="months"
            type="number"
            domain={[0, 36]}
            ticks={[0, 6, 12, 18, 24, 30, 36]}
            tick={{ fontSize: 10 }}
            label={{ value: 'věk (měs.)', position: 'insideBottom', offset: -2, fontSize: 10 }}
          />
          <YAxis tick={{ fontSize: 10 }} unit=" kg" />
          <Tooltip formatter={(v: number) => `${v} kg`} labelFormatter={(l: number) => `${l} měs.`} />
          <Legend />
          <Area type="monotone" dataKey="refHigh" fill="#e8f5e9" stroke="none" name="Ideální pásmo" fillOpacity={0.5} connectNulls />
          <Area type="monotone" dataKey="refLow" fill="var(--bg)" stroke="none" fillOpacity={1} connectNulls legendType="none" />
          <Line type="monotone" dataKey="reference" stroke="#2d8a4e" strokeWidth={1.5} dot={false} strokeDasharray="4 2" name="Referenční křivka" connectNulls />
          <Line type="monotone" dataKey="actual" stroke="#a07828" strokeWidth={2.5} dot={{ r: 4, fill: '#a07828' }} name="Bob (reálná váha)" connectNulls />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
