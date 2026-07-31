import { useState } from 'react';
import type { DailyNutrients, NRCTargets, LogEntry } from '../types';
import { NUTRIENT_META, NUTRIENT_GROUPS, nutrientStatus, type NutrientKey } from '../utils/nutrientStatus';

interface NutrientBarsProps {
  nutrients: DailyNutrients;
  targets: NRCTargets;
  /** Bezpečné horní limity (SUL) škálované na denní kcal — jen kde existují. */
  ceilings: Partial<Record<string, number>>;
  /** Týdenní průměr na den — pro dlouhodobé živiny místo dnešního stavu. */
  weeklyAvg?: Partial<Record<string, number>>;
  /** Dnešní záznamy — pro rozpad "co tuhle živinu dodalo". */
  entries?: LogEntry[];
}

const metaOf = (key: string) => NUTRIENT_META.find(m => m.key === key)!;

/** Příspěvek jednotlivých jídel k dané živině, sestupně. */
function contributions(entries: LogEntry[], key: NutrientKey) {
  return entries
    .map(e => ({ name: e.name, time: e.time, grams: e.grams, value: (e[key] as number | undefined) ?? 0 }))
    .filter(c => c.value > 0)
    .sort((a, b) => b.value - a.value);
}

export function NutrientBars({ nutrients, targets, ceilings, weeklyAvg, entries }: NutrientBarsProps) {
  const [openKey, setOpenKey] = useState<NutrientKey | null>(null);

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

                const parts = entries ? contributions(entries, key) : [];
                const canOpen = parts.length > 0 && !useWeekly;
                const isOpen = openKey === key;

                return (
                  <div key={key}>
                    <div
                      className={`nutrient-bar-row${canOpen ? ' nutrient-bar-row--tappable' : ''}`}
                      title={st.detail}
                      role={canOpen ? 'button' : undefined}
                      tabIndex={canOpen ? 0 : undefined}
                      aria-expanded={canOpen ? isOpen : undefined}
                      aria-label={canOpen ? `${meta.label}: ${value} z ${Math.round(targets[key])} ${meta.unit}, ${st.primary}. Zobrazit zdroje` : undefined}
                      onClick={canOpen ? () => setOpenKey(isOpen ? null : key) : undefined}
                      onKeyDown={canOpen ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenKey(isOpen ? null : key); }
                      } : undefined}
                    >
                      <div className="nutrient-bar-label">
                        <span style={{ flex: 1, minWidth: 0, fontWeight: 800 }}>{meta.label}</span>
                        <span style={{ color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
                          {value} / {Math.round(targets[key])} {meta.unit}
                        </span>
                        <span style={{ minWidth: 74, textAlign: 'right', fontWeight: 800, color: st.color }}>
                          {st.primary}
                        </span>
                        {canOpen && <span className="nut-chevron" aria-hidden="true">{isOpen ? '⌃' : '›'}</span>}
                      </div>
                      <div className="nutrient-bar-track">
                        <div className="nutrient-bar-fill"
                          style={{ width: `${st.fillFrac * 100}%`, backgroundColor: st.color }} />
                      </div>
                    </div>

                    {isOpen && (
                      <div className="nut-sources">
                        {parts.map((c, i) => (
                          <div key={i} className="nut-source-row">
                            <span className="nut-source-name">{c.name}</span>
                            <span className="nut-source-meta">{c.time} · {c.grams} g</span>
                            <span className="nut-source-value">
                              {meta.decimals ? Math.round(c.value * 10) / 10 : Math.round(c.value)} {meta.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
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
