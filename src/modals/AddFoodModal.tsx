import { useState } from 'react';
import type { EnergyResult } from '../types';
import { useLogsStore } from '../store/logs';
import { usePouchesStore } from '../store/pouches';
import { MEATS } from '../data/meats';
import { logMeat, logPouch, logFelini } from '../utils/nutrients';
import { calcFeliniDose } from '../utils/felini';

type Mode = 'meat' | 'pouch' | 'felini';

interface AddFoodModalProps {
  energy: EnergyResult;
  onClose: () => void;
}

export function AddFoodModal({ onClose }: AddFoodModalProps) {
  const [mode, setMode] = useState<Mode>('meat');
  const addEntry = useLogsStore(s => s.addEntry);
  const pouches = usePouchesStore(s => s.pouches);
  const decrementStock = usePouchesStore(s => s.decrementStock);

  // Meat state
  const [meatId, setMeatId] = useState(MEATS[0].id);
  const [grams, setGrams] = useState('100');
  const [withFelini, setWithFelini] = useState(true);

  // Pouch state
  const [pouchId, setPouchId] = useState(pouches[0]?.id ?? '');
  const [pouchGrams, setPouchGrams] = useState('85');

  // Felini state
  const [feliniGrams, setFeliniGrams] = useState('1');

  const selectedMeat = MEATS.find(m => m.id === meatId) ?? MEATS[0];
  const gramsNum = parseFloat(grams) || 0;
  const feliniDosePreview = gramsNum > 0 && withFelini
    ? calcFeliniDose(selectedMeat.ca_mg, selectedMeat.p_mg, gramsNum)
    : 0;
  const kcalPreview = gramsNum > 0 ? Math.round(selectedMeat.kcal * gramsNum / 100) : 0;
  const meatWarning = selectedMeat.id === 'chicken_liver' ? '⚠️ Játra: při kombinaci s Felini hrozí přebytek vit. A' :
    selectedMeat.id === 'pork_leg' ? '⚠️ Vepřové: před podáváním přemrazte (−20°C, 72h)' : '';

  const selectedPouch = pouches.find(p => p.id === pouchId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === 'meat') {
      const entry = logMeat(selectedMeat, gramsNum, withFelini);
      addEntry(entry);
    } else if (mode === 'pouch' && selectedPouch) {
      const g = parseFloat(pouchGrams) || 85;
      addEntry(logPouch(selectedPouch, g));
      if ((selectedPouch.stockCount ?? 0) > 0) decrementStock(selectedPouch.id);
    } else if (mode === 'felini') {
      addEntry(logFelini(parseFloat(feliniGrams) || 0));
    }
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Přidat jídlo</h2>
          <button type="button" className="btn-icon" onClick={onClose}>✕</button>
        </div>

        {/* Mode selector */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)' }}>
          {(['meat', 'pouch', 'felini'] as Mode[]).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              style={{
                flex: 1, padding: '10px', border: 'none', background: 'transparent',
                borderBottom: mode === m ? '3px solid var(--gold)' : '3px solid transparent',
                fontWeight: mode === m ? 700 : 400,
                color: mode === m ? 'var(--gold)' : 'var(--muted)',
                cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem',
              }}
            >
              {m === 'meat' ? '🥩 Maso' : m === 'pouch' ? '🥫 Kapsička' : '💊 Felini'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {mode === 'meat' && (
              <>
                <div className="form-group">
                  <label>Druh masa</label>
                  <select value={meatId} onChange={e => setMeatId(e.target.value)}>
                    {MEATS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Gramáž (g)</label>
                    <input type="number" min="1" max="500" value={grams}
                      onChange={e => setGrams(e.target.value)} required />
                  </div>
                  <div className="form-group" style={{ justifyContent: 'flex-end' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="checkbox" checked={withFelini}
                        onChange={e => setWithFelini(e.target.checked)} />
                      Přidat Felini
                    </label>
                    {withFelini && gramsNum > 0 && (
                      <div className="help-text">→ {feliniDosePreview} g Felini</div>
                    )}
                  </div>
                </div>
                {meatWarning && <p className="error-text">{meatWarning}</p>}
                {gramsNum > 0 && (
                  <div className="help-text" style={{ background: 'var(--bg)', padding: 10, borderRadius: 8 }}>
                    Preview: {kcalPreview} kcal · Ca:P po Felini ≈ {withFelini ? '1.30' : ((selectedMeat.ca_mg / selectedMeat.p_mg).toFixed(2))} : 1
                  </div>
                )}
              </>
            )}

            {mode === 'pouch' && (
              <>
                {pouches.length === 0 ? (
                  <p className="help-text">Nejsou žádné kapsičky. Přidejte je v záložce Kapsičky.</p>
                ) : (
                  <>
                    <div className="form-group">
                      <label>Kapsička</label>
                      <select value={pouchId} onChange={e => setPouchId(e.target.value)}>
                        {pouches.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.brand} – {p.name} ({p.kcalPer100g} kcal/100g)
                            {(p.stockCount ?? 0) > 0 ? ` · sklad: ${p.stockCount}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Gramáž (g)</label>
                      <input type="number" min="1" max="500" value={pouchGrams}
                        onChange={e => setPouchGrams(e.target.value)} required />
                    </div>
                    {selectedPouch && (
                      <div className="help-text" style={{ background: 'var(--bg)', padding: 10, borderRadius: 8 }}>
                        Preview: {Math.round(selectedPouch.kcalPer100g * (parseFloat(pouchGrams)||0) / 100)} kcal
                        {(selectedPouch.stockCount ?? 0) > 0 && ' · sklad se sníží o 1'}
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {mode === 'felini' && (
              <div className="form-group">
                <label>Dávka Felini Complete (g)</label>
                <input type="number" min="0.1" max="10" step="0.1"
                  value={feliniGrams} onChange={e => setFeliniGrams(e.target.value)} required />
                <span className="help-text">Zvlášť (bez masa) — Ca: {Math.round(193 * (parseFloat(feliniGrams)||0))} mg</span>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Zrušit</button>
            <button type="submit" className="btn btn-gold"
              disabled={mode === 'pouch' && pouches.length === 0}>
              Přidat
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
