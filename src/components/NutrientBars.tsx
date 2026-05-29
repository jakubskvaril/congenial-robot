import type { DailyNutrients, NRCTargets } from '../types';

interface NutrientBarsProps {
  nutrients: DailyNutrients;
  targets: NRCTargets;
}

interface Bar { label: string; value: number; target: number; unit: string }

export function NutrientBars({ nutrients, targets }: NutrientBarsProps) {
  const bars: Bar[] = [
    { label: 'Bílkoviny', value: Math.round(nutrients.protein_g), target: Math.round(targets.protein_g), unit: 'g' },
    { label: 'Taurin', value: Math.round(nutrients.taurin_mg), target: Math.round(targets.taurin_mg), unit: 'mg' },
    { label: 'Vápník', value: Math.round(nutrients.calcium_mg), target: Math.round(targets.calcium_mg), unit: 'mg' },
    { label: 'Fosfor', value: Math.round(nutrients.phosphorus_mg), target: Math.round(targets.phosphorus_mg), unit: 'mg' },
    { label: 'Vit. A', value: Math.round(nutrients.vitA_IU), target: Math.round(targets.vitA_IU), unit: 'IU' },
    { label: 'Vit. D3', value: Math.round(nutrients.vitD3_IU), target: Math.round(targets.vitD3_IU), unit: 'IU' },
    { label: 'Železo', value: Math.round(nutrients.iron_mg * 10) / 10, target: Math.round(targets.iron_mg), unit: 'mg' },
    { label: 'Zinek', value: Math.round(nutrients.zinc_mg * 10) / 10, target: Math.round(targets.zinc_mg), unit: 'mg' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {bars.map(b => {
        const pct = b.target > 0 ? Math.min((b.value / b.target) * 100, 120) : 0;
        const color = pct > 110 ? '#c03030' : pct >= 80 ? '#2d8a4e' : '#a07828';
        return (
          <div key={b.label} className="nutrient-bar-row">
            <div className="nutrient-bar-label">
              <span>{b.label}</span>
              <span style={{ color }}>{b.value} / {b.target} {b.unit}</span>
            </div>
            <div className="nutrient-bar-track">
              <div className="nutrient-bar-fill" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
