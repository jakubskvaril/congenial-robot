import { useState } from 'react';
import { useWeightsStore } from '../store/weights';
import { useHealthStore } from '../store/health';
import { getEnergy } from '../utils/energy';
import { BOB } from '../types';
import { WeightChart } from '../components/WeightChart';
import { RemindersSettings } from '../components/RemindersSettings';
import { PetSharing } from '../components/PetSharing';
import type { HealthRecord } from '../types';

interface ProfileViewProps {
  onAddWeight: () => void;
}

export function ProfileView({ onAddWeight }: ProfileViewProps) {
  const weights = useWeightsStore(s => s.weights);
  const removeWeight = useWeightsStore(s => s.removeWeight);
  const records = useHealthStore(s => s.records);
  const addRecord = useHealthStore(s => s.addRecord);
  const removeRecord = useHealthStore(s => s.removeRecord);
  const [activeSection, setActiveSection] = useState<'weight' | 'health' | 'reminders' | 'sharing'>('weight');
  const [healthType, setHealthType] = useState<HealthRecord['type']>('vet');
  const [healthDesc, setHealthDesc] = useState('');
  const [healthDate, setHealthDate] = useState(new Date().toISOString().slice(0, 10));

  const latestWeight = weights.length > 0 ? weights[weights.length - 1].kg : null;
  const energy = getEnergy(latestWeight ?? 1.5);

  function handleAddHealth(e: React.FormEvent) {
    e.preventDefault();
    if (!healthDesc.trim()) return;
    addRecord({ type: healthType, date: healthDate, description: healthDesc.trim() });
    setHealthDesc('');
  }

  // CSV export
  function exportWeights() {
    const csv = 'Datum,Hmotnost (kg),Poznámka\n' +
      weights.map(w => `${w.date},${w.kg},${w.note ?? ''}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'bob-vahy.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="view">
      {/* Bob info */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem' }}>{BOB.name}</h2>
            <p className="help-text">{BOB.breedLabel} · {energy.lifeStageLabel} · {energy.ageMonths.toFixed(1)} měs.</p>
            <p className="help-text">Narozen: {BOB.birthDate}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Denní potřeba</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--gold)' }}>{energy.kcal}</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>kcal/den (RER×{energy.factor})</div>
          </div>
        </div>
        {latestWeight && (
          <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{latestWeight} kg</span>
            <span className="help-text">aktuální váha</span>
          </div>
        )}
      </div>

      {/* Section tabs */}
      <div style={{ display: 'flex', gap: 0, background: 'var(--surface)', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
        {(['weight', 'health', 'reminders', 'sharing'] as const).map(s => (
          <button key={s} type="button"
            onClick={() => setActiveSection(s)}
            style={{
              flex: 1, padding: '10px 4px', border: 'none',
              background: activeSection === s ? 'var(--primary)' : 'transparent',
              color: activeSection === s ? 'white' : 'var(--muted)',
              fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.72rem',
            }}
          >
            {s === 'weight' ? '⚖️ Váha' : s === 'health' ? '🏥 Zdraví' : s === 'reminders' ? '🔔 Alarm' : '☁️ Sync'}
          </button>
        ))}
      </div>

      {activeSection === 'weight' && (
        <>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div className="section-title">Graf vývoje hmotnosti</div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={exportWeights}>⬇ CSV</button>
            </div>
            <WeightChart weights={weights} />
          </div>
          <button className="btn btn-gold" style={{ width: '100%' }} onClick={onAddWeight} data-testid="add-weight-btn">
            + Přidat vážení
          </button>
          {weights.length > 0 && (
            <div className="card">
              <div className="section-title" style={{ marginBottom: 8 }}>Historie vážení</div>
              {[...weights].reverse().map(w => (
                <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ flex: 1, fontSize: '0.85rem' }}>{w.date} — <strong>{w.kg} kg</strong></span>
                  {w.note && <span className="help-text">{w.note}</span>}
                  <button type="button" className="btn-icon" onClick={() => removeWeight(w.id)}>✕</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeSection === 'health' && (
        <>
          <div className="card">
            <div className="section-title" style={{ marginBottom: 10 }}>Přidat záznam</div>
            <form onSubmit={handleAddHealth} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="form-row">
                <div className="form-group">
                  <label>Typ</label>
                  <select value={healthType} onChange={e => setHealthType(e.target.value as HealthRecord['type'])}>
                    <option value="vet">🏥 Vet. návštěva</option>
                    <option value="deworming">💊 Odčervení</option>
                    <option value="vaccination">💉 Vakcinace</option>
                    <option value="daily">📝 Denní log</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Datum</label>
                  <input type="date" value={healthDate} onChange={e => setHealthDate(e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label>Popis</label>
                <input type="text" value={healthDesc} onChange={e => setHealthDesc(e.target.value)}
                  placeholder="Popis záznamu…" required />
              </div>
              <button type="submit" className="btn btn-gold btn-sm" style={{ alignSelf: 'flex-end' }}>Přidat</button>
            </form>
          </div>
          {records.length === 0 ? (
            <div className="empty-state"><p className="help-text">Žádné záznamy</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {records.map(r => (
                <div key={r.id} className="card" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                      {r.type === 'vet' ? '🏥' : r.type === 'deworming' ? '💊' : r.type === 'vaccination' ? '💉' : '📝'}{' '}
                      {r.description}
                    </div>
                    <div className="help-text">{r.date}</div>
                  </div>
                  <button type="button" className="btn-icon" onClick={() => removeRecord(r.id)}>✕</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeSection === 'reminders' && <RemindersSettings />}
      {activeSection === 'sharing' && <PetSharing />}
    </div>
  );
}
