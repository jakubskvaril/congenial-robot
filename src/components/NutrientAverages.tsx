import type { DailyNutrients, NRCTargets } from '../types';
import { NUTRIENT_META, NUTRIENT_GROUPS, nutrientStatus } from '../utils/nutrientStatus';

interface Props {
  avg: DailyNutrients;
  targets: NRCTargets;
  ceilings: Partial<Record<string, number>>;
  /** Bez váhy kočky nejsou cíle spolehlivé → jen holé průměry, žádné hodnocení. */
  plain?: boolean;
}

const metaOf = (key: string) => NUTRIENT_META.find(m => m.key === key)!;

/** Kompaktní seznam: průměr živiny na den vs. cíl + barevný stav. */
export function NutrientAverages({ avg, targets, ceilings, plain = false }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {NUTRIENT_GROUPS.map(group => (
        <div key={group.title}>
          <div className="nut-group-head" style={{ marginBottom: 4, paddingBottom: 4 }}>
            <span className="nut-group-title">{group.title}</span>
          </div>
          {group.keys.map(key => {
            const meta = metaOf(key);
            const value = meta.decimals
              ? Math.round((avg[key] as number) * 10) / 10
              : Math.round(avg[key] as number);
            const st = nutrientStatus(key, value, targets[key], ceilings[key]);
            return (
              <div key={key} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: 999, flexShrink: 0,
                  background: plain ? 'var(--border-2)' : st.color,
                }} />
                <span style={{
                  flex: 1, minWidth: 0, fontSize: '0.85rem',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {meta.label}
                </span>
                <span style={{
                  fontSize: '0.78rem', color: 'var(--muted)',
                  fontVariantNumeric: 'tabular-nums', flexShrink: 0,
                }}>
                  ⌀ {value}{plain ? '' : ` / ${Math.round(targets[key])}`} {meta.unit}
                </span>
                {!plain && (
                  <span style={{
                    fontSize: '0.76rem', fontWeight: 600, color: st.color,
                    minWidth: 60, textAlign: 'right', flexShrink: 0,
                  }}>
                    {st.primary}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
