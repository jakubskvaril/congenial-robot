import type { DailyNutrients, NRCTargets } from '../types';
import { NUTRIENT_META, nutrientStatus } from '../utils/nutrientStatus';

interface Props {
  avg: DailyNutrients;
  targets: NRCTargets;
  ceilings: Partial<Record<string, number>>;
  /** Bez váhy kočky nejsou cíle spolehlivé → jen holé průměry, žádné hodnocení. */
  plain?: boolean;
}

/** Kompaktní seznam: průměr živiny na den vs. cíl + barevný stav. */
export function NutrientAverages({ avg, targets, ceilings, plain = false }: Props) {
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
            <span style={{ width: 8, height: 8, borderRadius: 999, background: plain ? 'var(--border-2)' : st.color, flexShrink: 0 }} />
            <span style={{ flex: 1, minWidth: 0, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {meta.label}
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
              ⌀ {value}{plain ? '' : ` / ${Math.round(targets[meta.key])}`} {meta.unit}
            </span>
            {!plain && (
              <span style={{ fontSize: '0.76rem', fontWeight: 600, color: st.color, minWidth: 60, textAlign: 'right', flexShrink: 0 }}>
                {st.primary}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
