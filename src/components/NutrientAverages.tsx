import type { DailyNutrients, NRCTargets } from '../types';
import { NUTRIENT_META, nutrientStatus } from '../utils/nutrientStatus';

interface Props {
  avg: DailyNutrients;
  targets: NRCTargets;
  ceilings: Partial<Record<string, number>>;
}

/** Kompaktní seznam: průměr živiny na den vs. cíl + barevný stav. */
export function NutrientAverages({ avg, targets, ceilings }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {NUTRIENT_META.map((meta, i) => {
        const value = meta.decimals
          ? Math.round((avg[meta.key] as number) * 10) / 10
          : Math.round(avg[meta.key] as number);
        const st = nutrientStatus(meta.key, value, targets[meta.key], ceilings[meta.key]);
        return (
          <div key={meta.key} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 0',
            borderTop: i === 0 ? 'none' : '1px solid var(--border)',
          }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: st.color, flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: '0.85rem' }}>{meta.label}</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
              ⌀ {value} / {Math.round(targets[meta.key])} {meta.unit}
            </span>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: st.color, minWidth: 78, textAlign: 'right' }}>
              {st.primary}
            </span>
          </div>
        );
      })}
    </div>
  );
}
