import type { DailyNutrients, NRCTargets } from '../types';
import { NUTRIENT_META, NUTRIENT_GROUPS, nutrientStatus } from '../utils/nutrientStatus';

interface NutrientBarsProps {
  nutrients: DailyNutrients;
  targets: NRCTargets;
  /** Bezpečné horní limity (SUL) škálované na denní kcal — jen kde existují. */
  ceilings: Partial<Record<string, number>>;
  /** Týdenní průměr na den — pro dlouhodobé živiny místo dnešního stavu. */
  weeklyAvg?: Partial<Record<string, number>>;
}

const metaOf = (key: string) => NUTRIENT_META.find(m => m.key === key)!;

export function NutrientBars({ nutrients, targets, ceilings, weeklyAvg }: NutrientBarsProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {NUTRIENT_GROUPS.map(group => {
        // Poslední skupina se počítá z týdenního průměru, pokud je k dispozici
        const isLongTerm = group.title === 'Dlouhodobě';
        const useWeekly = isLongTerm && weeklyAvg !== undefined;

        return (
          <div key={group.title}>
            <div className="nut-group-head">
              <span className="nut-group-title">{group.title}</span>
              <span className="nut-group-note">{group.note}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {group.keys.map(key => {
                const meta = metaOf(key);
                const raw = useWeekly && weeklyAvg![key] !== undefined
                  ? weeklyAvg![key]!
                  : (nutrients[key] as number);
                const value = meta.decimals ? Math.round(raw * 10) / 10 : Math.round(raw);
                const st = nutrientStatus(key, value, targets[key], ceilings[key]);

                return (
                  <div key={key} className="nutrient-bar-row" title={st.detail}>
                    <div className="nutrient-bar-label">
                      <span style={{ fontWeight: 500 }}>{meta.label}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8 }}>
                        <span style={{ color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
                          {value} / {Math.round(targets[key])} {meta.unit}
                        </span>
                        <span style={{ color: st.color, fontWeight: 600, minWidth: 62, textAlign: 'right' }}>
                          {st.primary}
                        </span>
                      </span>
                    </div>
                    <div className="nutrient-bar-track">
                      <div className="nutrient-bar-fill"
                        style={{ width: `${st.fillFrac * 100}%`, backgroundColor: st.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
