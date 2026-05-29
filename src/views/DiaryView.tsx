import { useState } from 'react';
import type { EnergyResult } from '../types';
import { useLogsStore } from '../store/logs';
import { sumNutrients, todayISO } from '../utils/nutrients';
import { NRC_PER_1000KCAL } from '../data/nrc';
import { KcalRing } from '../components/KcalRing';
import { NutrientBars } from '../components/NutrientBars';
import { AddFoodModal } from '../modals/AddFoodModal';

interface DiaryViewProps {
  energy: EnergyResult;
}

export function DiaryView({ energy }: DiaryViewProps) {
  const [addOpen, setAddOpen] = useState(false);
  const logs = useLogsStore(s => s.logs);
  const removeEntry = useLogsStore(s => s.removeEntry);
  const today = todayISO();
  const entries = logs[today] ?? [];
  const sorted = [...entries].sort((a, b) => a.time.localeCompare(b.time));
  const nutrients = sumNutrients(entries);

  const stage = energy.lifeStage === 'kitten' ? 'kitten' : 'adult';
  const perKcal = NRC_PER_1000KCAL;
  const k = energy.kcal / 1000;
  const targets = {
    protein_g: perKcal.protein_g[stage] * k,
    calcium_mg: perKcal.calcium_mg[stage] * k,
    phosphorus_mg: perKcal.phosphorus_mg[stage] * k,
    taurin_mg: perKcal.taurin_mg[stage] * k,
    vitA_IU: perKcal.vitA_IU[stage] * k,
    vitD3_IU: perKcal.vitD3_IU[stage] * k,
    vitE_mg: perKcal.vitE_mg[stage] * k,
    iron_mg: perKcal.iron_mg[stage] * k,
    zinc_mg: perKcal.zinc_mg[stage] * k,
  };

  const caPColor = nutrients.caP_ratio >= 1.2 && nutrients.caP_ratio <= 1.4
    ? 'good' : nutrients.caP_ratio >= 1.0 && nutrients.caP_ratio < 1.2
    ? 'warn' : 'bad';

  return (
    <div className="view">
      {/* Kaloric ring + Ca:P */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <KcalRing value={nutrients.kcal} max={energy.kcal} size={130} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div>
            <div className="section-title">Ca:P poměr dnes</div>
            <span className={`cap-badge cap-badge--${caPColor}`}>
              {nutrients.caP_ratio > 0 ? nutrients.caP_ratio.toFixed(2) : '—'} : 1
              {caPColor === 'good' ? ' ✓' : caPColor === 'warn' ? ' ⚠️' : ' ✗'}
            </span>
            <div className="help-text" style={{ marginTop: 4 }}>
              Ideál 1,2–1,4:1 (NRC 2006)
            </div>
          </div>
          <div>
            <div className="section-title">Taurin</div>
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{Math.round(nutrients.taurin_mg)} mg</span>
            <span className="help-text"> / {Math.round(targets.taurin_mg)} mg</span>
          </div>
        </div>
      </div>

      {/* Nutrient bars */}
      <div className="card">
        <div className="section-title" style={{ marginBottom: 10 }}>Denní nutrienty vs. NRC 2006</div>
        <NutrientBars nutrients={nutrients} targets={targets} />
      </div>

      {/* Actions */}
      <div className="view-actions">
        <button className="btn btn-gold" onClick={() => setAddOpen(true)} style={{ flex: 1 }}>
          + Přidat jídlo
        </button>
      </div>

      {/* Today's log */}
      {sorted.length === 0 ? (
        <div className="empty-state">
          <p>Dnes ještě nic nezapsáno 🐾</p>
          <p className="help-text">Přidejte první jídlo Boba</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="section-title">Dnešní jídla</div>
          {sorted.map(e => (
            <div key={e.id} className="log-entry">
              <div className="log-entry-info">
                <div className="log-entry-name">
                  {e.type === 'meat' ? '🥩' : e.type === 'pouch' ? '🥫' : e.type === 'felini' ? '💊' : '🍽️'}{' '}
                  {e.name}
                </div>
                <div className="log-entry-meta">
                  {e.time} · {e.grams}g
                  {e.feliniDose_g ? ` · Felini ${e.feliniDose_g}g` : ''}
                </div>
              </div>
              <div className="log-entry-stats">
                <div>{e.kcal} kcal</div>
                <div>Ca:P {e.phosphorus_mg > 0 ? (e.calcium_mg / e.phosphorus_mg).toFixed(1) : '—'}</div>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={(ev) => { ev.stopPropagation(); removeEntry(today, e.id); }}
              >✕</button>
            </div>
          ))}
        </div>
      )}

      {addOpen && (
        <AddFoodModal
          energy={energy}
          onClose={() => setAddOpen(false)}
        />
      )}
    </div>
  );
}
