import type { DailyNutrients, NRCTargets } from '../types';
import { NUTRIENT_CLASSES, CLASS_INFO, type NutrientClass } from '../data/nrc';

interface NutrientBarsProps {
  nutrients: DailyNutrients;
  targets: NRCTargets;
}

interface Bar {
  key: string;
  label: string;
  value: number;
  target: number;
  unit: string;
  cls: NutrientClass;
}

// Barva plnění podle třídy nutrientu a toho, jak je na tom
function fillColor(pct: number, cls: NutrientClass): string {
  if (cls === 'ceiling') {
    // strop: přebytek je špatný (červená), v normě zelená, málo je OK (šedá)
    if (pct > 100) return '#B91C1C';
    if (pct >= 50) return '#15803D';
    return '#A8A29E';
  }
  if (cls === 'critical') {
    // přesně: nejlíp kolem 100 %, málo i moc = varovná
    if (pct < 70 || pct > 130) return '#B91C1C';
    if (pct >= 85 && pct <= 115) return '#15803D';
    return '#C2410C';
  }
  // floor / flex: hlavně ať to není málo
  if (pct >= 90) return '#15803D';
  if (pct >= 60) return '#B8922A';
  return '#C2410C';
}

export function NutrientBars({ nutrients, targets }: NutrientBarsProps) {
  const bars: Bar[] = [
    { key: 'protein_g',     label: 'Bílkoviny', value: Math.round(nutrients.protein_g),        target: Math.round(targets.protein_g),     unit: 'g' },
    { key: 'taurin_mg',     label: 'Taurin',    value: Math.round(nutrients.taurin_mg),        target: Math.round(targets.taurin_mg),     unit: 'mg' },
    { key: 'calcium_mg',    label: 'Vápník',    value: Math.round(nutrients.calcium_mg),       target: Math.round(targets.calcium_mg),    unit: 'mg' },
    { key: 'phosphorus_mg', label: 'Fosfor',    value: Math.round(nutrients.phosphorus_mg),    target: Math.round(targets.phosphorus_mg), unit: 'mg' },
    { key: 'omega3_mg',     label: 'Omega-3',   value: Math.round(nutrients.omega3_mg),        target: Math.round(targets.omega3_mg),     unit: 'mg' },
    { key: 'vitA_IU',       label: 'Vit. A',    value: Math.round(nutrients.vitA_IU),          target: Math.round(targets.vitA_IU),       unit: 'IU' },
    { key: 'vitD3_IU',      label: 'Vit. D3',   value: Math.round(nutrients.vitD3_IU),         target: Math.round(targets.vitD3_IU),      unit: 'IU' },
    { key: 'iron_mg',       label: 'Železo',    value: Math.round(nutrients.iron_mg * 10) / 10, target: Math.round(targets.iron_mg),      unit: 'mg' },
    { key: 'zinc_mg',       label: 'Zinek',     value: Math.round(nutrients.zinc_mg * 10) / 10, target: Math.round(targets.zinc_mg),      unit: 'mg' },
  ].map(b => ({ ...b, cls: NUTRIENT_CLASSES[b.key] ?? 'flex' }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {bars.map(b => {
        const pct = b.target > 0 ? (b.value / b.target) * 100 : 0;
        const color = fillColor(pct, b.cls);
        const info = CLASS_INFO[b.cls];
        return (
          <div key={b.key} className="nutrient-bar-row">
            <div className="nutrient-bar-label">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {b.label}
                <span className={`nut-badge nut-badge--${b.cls}`} title={info.hint}>{info.badge}</span>
              </span>
              <span style={{ color }}>{b.value} / {b.target} {b.unit}</span>
            </div>
            <div className="nutrient-bar-track">
              {/* U stropových nutrientů značka 100 % = maximum */}
              <div className="nutrient-bar-fill" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }} />
            </div>
          </div>
        );
      })}
      <p className="help-text" style={{ marginTop: 4, lineHeight: 1.6 }}>
        🎯 <strong>přesně</strong> = trefit rozmezí · ⬇ <strong>min.</strong> = nesmí chybět ·
        ⬆ <strong>pozor</strong> = přebytek škodí · ≈ <strong>orientačně</strong> = dlouhodobý průměr
      </p>
    </div>
  );
}
