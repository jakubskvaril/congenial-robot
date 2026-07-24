import type { DailyNutrients, NRCTargets } from '../types';
import { CLASS_INFO } from '../data/nrc';
import { NUTRIENT_META, nutrientStatus, type BadgeTone } from '../utils/nutrientStatus';

interface NutrientBarsProps {
  nutrients: DailyNutrients;
  targets: NRCTargets;
  /** Bezpečné horní limity (SUL) škálované na denní kcal — jen kde existují. */
  ceilings: Partial<Record<string, number>>;
  /** Týdenní průměr na den — pro orientační (flex) živiny místo dnešního stavu. */
  weeklyAvg?: Partial<Record<string, number>>;
}

function badgeClass(tone: BadgeTone, defaultCls: string): string {
  switch (tone) {
    case 'neutral': return 'nut-badge nut-badge--flex';
    case 'amber':   return 'nut-badge nut-badge--ceiling';
    case 'red':     return 'nut-badge nut-badge--critical';
    default:        return `nut-badge nut-badge--${defaultCls}`;
  }
}

export function NutrientBars({ nutrients, targets, ceilings, weeklyAvg }: NutrientBarsProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {NUTRIENT_META.map(meta => {
        const target = targets[meta.key];
        const sul = ceilings[meta.key];
        const info = CLASS_INFO[nutrientStatus(meta.key, 0, target, sul).cls];

        // Orientační živiny: ukaž týdenní průměr na den (jeden slabý den nevadí)
        const useWeekly = info === CLASS_INFO.flex && weeklyAvg?.[meta.key] !== undefined;
        const raw = useWeekly ? weeklyAvg![meta.key]! : (nutrients[meta.key] as number);
        const value = meta.decimals ? Math.round(raw * 10) / 10 : Math.round(raw);

        const st = nutrientStatus(meta.key, value, target, sul);
        return (
          <div key={meta.key} className="nutrient-bar-row">
            <div className="nutrient-bar-label">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {meta.label}
                <span className={badgeClass(st.badgeTone, st.cls)} title={info.hint}>{info.badge}</span>
                {useWeekly && <span className="week-tag" title="týdenní průměr na den">⌀ 7 d</span>}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
                  {value} {meta.unit}
                </span>
                <span style={{ color: st.color, fontWeight: 600 }}>{st.primary}</span>
              </span>
            </div>
            <div className="nutrient-bar-track">
              <div className="nutrient-bar-fill" style={{ width: `${Math.min(st.fillFrac, 1) * 100}%`, backgroundColor: st.color }} />
              {st.raTickFrac !== undefined && st.raTickFrac < 1 && (
                <div className="nutrient-bar-tick" style={{ left: `${st.raTickFrac * 100}%` }}
                  title="doporučená denní dávka" />
              )}
            </div>
          </div>
        );
      })}
      <p className="help-text" style={{ marginTop: 2, lineHeight: 1.6 }}>
        U vitamínů A a D3 bar ukazuje cestu k <strong>bezpečnému stropu</strong> (riziko předávkování);
        značka ┃ je doporučená dávka. Vápník a fosfor mají být v rozmezí; orientační živiny (≈) se počítají
        jako týdenní průměr.
      </p>
    </div>
  );
}
