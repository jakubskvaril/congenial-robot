import { useState } from 'react';
import type { EnergyResult, MeatItem } from '../types';
import { useLogsStore } from '../store/logs';
import { usePouchesStore } from '../store/pouches';
import { useCustomMeatsStore } from '../store/customMeats';
import { MEATS, SUPPLEMENTS } from '../data/meats';
import { logMeat, logPouch, logFelini } from '../utils/nutrients';
import { calcFeliniDose } from '../utils/felini';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { lookupEanAsMeat, isStoreInternalEan, suggestSimilarMeat, type MeatDraft } from '../utils/barcode';
import { CZECH_MEAT_PRESETS } from '../data/meatPresets';

type Mode = 'meat' | 'pouch' | 'felini';
type ScanState = 'idle' | 'scanning' | 'loading' | 'form';

interface AddFoodModalProps {
  energy: EnergyResult;
  onClose: () => void;
}

export function AddFoodModal({ onClose }: AddFoodModalProps) {
  const [mode, setMode] = useState<Mode>('meat');
  const addEntry = useLogsStore(s => s.addEntry);
  const pouches = usePouchesStore(s => s.pouches);
  const decrementStock = usePouchesStore(s => s.decrementStock);
  const customMeats = useCustomMeatsStore(s => s.meats);
  const addCustomMeat = useCustomMeatsStore(s => s.addMeat);

  const allMeats: MeatItem[] = [
    ...MEATS,
    ...SUPPLEMENTS,
    ...customMeats,
  ];

  // ── Meat state ──────────────────────────────────────────────────────
  const [meatId, setMeatId] = useState(MEATS[0].id);
  const [grams, setGrams] = useState('100');
  const [withFelini, setWithFelini] = useState(true);

  // Změna druhu: u doplňku s pevnou porcí ji předvyplň
  function handleMeatChange(id: string) {
    setMeatId(id);
    const m = allMeats.find(x => x.id === id);
    if (m?.defaultGrams) setGrams(String(m.defaultGrams));
  }

  // ── EAN scan sub-state ───────────────────────────────────────────────
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [scanError, setScanError] = useState('');
  const [showPresets, setShowPresets] = useState(false);
  const [saveCustom, setSaveCustom] = useState(true);

  // Editable draft fields (filled from OFF after scan)
  const [draftName, setDraftName]       = useState('');
  const [draftKcal, setDraftKcal]       = useState('');
  const [draftProtein, setDraftProtein] = useState('');
  const [draftFat, setDraftFat]         = useState('');
  const [draftCa, setDraftCa]           = useState('');
  const [draftP, setDraftP]             = useState('');
  const [draftTaurin, setDraftTaurin]   = useState('50');
  const [draftVitA, setDraftVitA]       = useState('0');
  const [draftVitD3, setDraftVitD3]     = useState('0');
  const [draftIron, setDraftIron]       = useState('0');
  const [draftZinc, setDraftZinc]       = useState('0');
  const [similarHint, setSimilarHint]   = useState<MeatItem | null>(null);

  // ── Pouch state ──────────────────────────────────────────────────────
  const [pouchId, setPouchId] = useState(pouches[0]?.id ?? '');
  const [pouchGrams, setPouchGrams] = useState('85');

  // ── Felini state ─────────────────────────────────────────────────────
  const [feliniGrams, setFeliniGrams] = useState('1');

  // ── Computed ─────────────────────────────────────────────────────────
  const selectedMeat = allMeats.find(m => m.id === meatId) ?? allMeats[0];
  const isSupplement = selectedMeat.kind === 'supplement';
  // U doplňků (skořápka, olej…) Felini nedává smysl
  const effectiveFelini = withFelini && !isSupplement;
  const gramsNum = parseFloat(grams) || 0;
  const feliniDosePreview = gramsNum > 0 && effectiveFelini
    ? calcFeliniDose(selectedMeat.ca_mg, selectedMeat.p_mg, gramsNum)
    : 0;
  const kcalPreview = gramsNum > 0 ? Math.round(selectedMeat.kcal * gramsNum / 100) : 0;
  const meatWarning =
    selectedMeat.id.includes('liver')
      ? '⚠️ Játra: při kombinaci s Felini hrozí přebytek vit. A'
      : selectedMeat.id.startsWith('pork')
      ? '⚠️ Vepřové: před podáváním přemrazte (−20°C, 72h)'
      : selectedMeat.id === 'chicken_neck'
      ? '⚠️ Krky s kostí: podávejte syrové, nikdy vařené (vařená kost se tříští)'
      : '';

  const selectedPouch = pouches.find(p => p.id === pouchId);

  // ── EAN scan handlers ─────────────────────────────────────────────────
  function applyDraft(draft: MeatDraft) {
    setDraftName(draft.name);
    setDraftKcal(String(draft.kcal || ''));
    setDraftProtein(String(draft.protein || ''));
    setDraftFat(String(draft.fat || ''));
    setDraftCa(String(draft.ca_mg || ''));
    setDraftP(String(draft.p_mg || ''));
    setDraftTaurin(String(draft.taurin_mg || 50));
    setDraftVitA(String(draft.vitA_IU || 0));
    setDraftVitD3(String(draft.vitD3_IU || 0));
    setDraftIron(String(draft.iron_mg || 0));
    setDraftZinc(String(draft.zinc_mg || 0));
    const hint = suggestSimilarMeat(draft.name, MEATS);
    setSimilarHint(hint);
    setScanState('form');
  }

  async function handleEanScanned(ean: string) {
    setScanState('loading');
    setScanError('');
    setShowPresets(false);

    if (isStoreInternalEan(ean)) {
      // Interní kód obchodu (proměnlivá váha, začíná 20–29) — není v žádné DB
      applyDraft({ name: '', kcal: 0, protein: 0, fat: 0, ca_mg: 0, p_mg: 0, taurin_mg: 50, vitA_IU: 0, vitD3_IU: 0, iron_mg: 0, zinc_mg: 0 });
      setScanError(`Kód ${ean} je interní kód obchodu (čerstvé maso, váhová etiketa) — vyberte druh masa níže:`);
      setShowPresets(true);
      setScanState('form');
      return;
    }

    const draft = await lookupEanAsMeat(ean);
    if (draft) {
      applyDraft(draft);
    } else {
      applyDraft({ name: '', kcal: 0, protein: 0, fat: 0, ca_mg: 0, p_mg: 0, taurin_mg: 50, vitA_IU: 0, vitD3_IU: 0, iron_mg: 0, zinc_mg: 0 });
      setScanError(`EAN ${ean} nenalezen v databázi — vyberte druh masa nebo vyplňte ručně:`);
      setShowPresets(true);
      setScanState('form');
    }
  }

  function useSimilarHint() {
    if (!similarHint) return;
    setDraftCa(String(similarHint.ca_mg));
    setDraftP(String(similarHint.p_mg));
    setDraftTaurin(String(similarHint.taurin_mg));
    setDraftVitA(String(similarHint.vitA_IU));
    setDraftVitD3(String(similarHint.vitD3_IU));
    setDraftIron(String(similarHint.iron_mg));
    setDraftZinc(String(similarHint.zinc_mg));
  }

  function buildMeatFromDraft(): MeatItem {
    return {
      id: `scan-${Date.now()}`,
      name: draftName.trim() || 'Skenované maso',
      kcal:      parseFloat(draftKcal)   || 0,
      protein:   parseFloat(draftProtein)|| 0,
      fat:       parseFloat(draftFat)    || 0,
      ca_mg:     parseFloat(draftCa)     || 0,
      p_mg:      parseFloat(draftP)      || 0,
      taurin_mg: parseFloat(draftTaurin) || 50,
      vitA_IU:   parseFloat(draftVitA)   || 0,
      vitD3_IU:  parseFloat(draftVitD3)  || 0,
      iron_mg:   parseFloat(draftIron)   || 0,
      zinc_mg:   parseFloat(draftZinc)   || 0,
      omega3_mg: 0, // OFF neposkytuje EPA/DHA — uživatel doplní přes doplňky
    };
  }

  function handleConfirmDraft() {
    const meat = buildMeatFromDraft();
    let finalId = meat.id;
    if (saveCustom) {
      finalId = addCustomMeat({
        name: meat.name, kcal: meat.kcal, protein: meat.protein, fat: meat.fat,
        ca_mg: meat.ca_mg, p_mg: meat.p_mg, taurin_mg: meat.taurin_mg,
        vitA_IU: meat.vitA_IU, vitD3_IU: meat.vitD3_IU,
        iron_mg: meat.iron_mg, zinc_mg: meat.zinc_mg,
      });
    }
    // Okamžitě zaloguj a zavři modal
    const entry = logMeat({ ...meat, id: finalId }, gramsNum || 100, withFelini);
    addEntry(entry);
    onClose();
  }

  // ── Main submit ────────────────────────────────────────────────────────
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === 'meat') {
      addEntry(logMeat(selectedMeat, gramsNum, effectiveFelini));
    } else if (mode === 'pouch' && selectedPouch) {
      const g = parseFloat(pouchGrams) || 85;
      addEntry(logPouch(selectedPouch, g));
      if ((selectedPouch.stockCount ?? 0) > 0) decrementStock(selectedPouch.id);
    } else if (mode === 'felini') {
      addEntry(logFelini(parseFloat(feliniGrams) || 0));
    }
    onClose();
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Přidat jídlo</h2>
          <button type="button" className="btn-icon" onClick={onClose}>✕</button>
        </div>

        {/* Mode tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
          {(['meat', 'pouch', 'felini'] as Mode[]).map(m => (
            <button key={m} type="button"
              onClick={() => { setMode(m); setScanState('idle'); setShowPresets(false); setScanError(''); }}
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

        {/* ── EAN scan panel (maso) ── */}
        {mode === 'meat' && scanState !== 'idle' && (
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
            {scanState === 'scanning' && (
              <>
                <BarcodeScanner onResult={handleEanScanned} />
                <button type="button" className="btn btn-ghost btn-sm"
                  style={{ marginTop: 8, width: '100%' }}
                  onClick={() => setScanState('idle')}>
                  Zrušit skenování
                </button>
              </>
            )}

            {scanState === 'loading' && (
              <div className="loading-state" style={{ padding: 20 }}>
                <div className="spinner" />
                <p>Hledám v Open Food Facts…</p>
              </div>
            )}

            {scanState === 'form' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="section-title">Nové maso ze skeneru</div>
                  <button type="button" className="btn-icon"
                    onClick={() => setScanState('idle')}>✕</button>
                </div>

                {scanError && <p className="error-text" style={{ fontSize: '0.78rem' }}>{scanError}</p>}

                {showPresets && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {CZECH_MEAT_PRESETS.map(preset => (
                      <button
                        key={preset.name}
                        type="button"
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          padding: '5px 10px', borderRadius: 20,
                          border: '1px solid var(--border)',
                          background: 'var(--surface)', cursor: 'pointer',
                          fontSize: '0.78rem', fontFamily: 'inherit',
                          color: 'var(--text)',
                        }}
                        onClick={() => {
                          applyDraft(preset);
                          setShowPresets(false);
                          setScanError('');
                        }}
                      >
                        {preset.emoji} {preset.name}
                      </button>
                    ))}
                  </div>
                )}

                {similarHint && (
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: '0.78rem' }}>
                    <span className="help-text">Podobné v databázi: <strong>{similarHint.name}</strong></span>
                    {' '}
                    <button type="button" className="btn btn-ghost btn-sm"
                      style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                      onClick={useSimilarHint}>
                      Použít Ca/P/taurin
                    </button>
                  </div>
                )}

                <div className="form-group">
                  <label>Název masa</label>
                  <input type="text" value={draftName} onChange={e => setDraftName(e.target.value)}
                    placeholder="Kuřecí prso…" />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>kcal / 100g</label>
                    <input type="number" min="0" step="1" value={draftKcal}
                      onChange={e => setDraftKcal(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Bílkoviny %</label>
                    <input type="number" min="0" step="0.1" value={draftProtein}
                      onChange={e => setDraftProtein(e.target.value)} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Tuky %</label>
                    <input type="number" min="0" step="0.1" value={draftFat}
                      onChange={e => setDraftFat(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Taurin mg/100g</label>
                    <input type="number" min="0" step="1" value={draftTaurin}
                      onChange={e => setDraftTaurin(e.target.value)}
                      placeholder="50" />
                  </div>
                </div>

                {/* Ca a P jsou kritické pro Felini výpočet */}
                <div style={{ background: '#fff8e1', border: '1px solid #f0d060', borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#8a6010', marginBottom: 6 }}>
                    ⚠️ Ca a P — klíčové pro výpočet Felini dávky
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Ca mg/100g</label>
                      <input type="number" min="0" step="1" value={draftCa}
                        onChange={e => setDraftCa(e.target.value)}
                        placeholder="12" />
                    </div>
                    <div className="form-group">
                      <label>P mg/100g</label>
                      <input type="number" min="0" step="1" value={draftP}
                        onChange={e => setDraftP(e.target.value)}
                        placeholder="189" />
                    </div>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Vit. A IU/100g</label>
                    <input type="number" min="0" step="1" value={draftVitA}
                      onChange={e => setDraftVitA(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Vit. D3 IU/100g</label>
                    <input type="number" min="0" step="1" value={draftVitD3}
                      onChange={e => setDraftVitD3(e.target.value)} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Železo mg/100g</label>
                    <input type="number" min="0" step="0.01" value={draftIron}
                      onChange={e => setDraftIron(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Zinek mg/100g</label>
                    <input type="number" min="0" step="0.01" value={draftZinc}
                      onChange={e => setDraftZinc(e.target.value)} />
                  </div>
                </div>

                <div className="form-row" style={{ alignItems: 'center' }}>
                  <div className="form-group">
                    <label>Gramáž pro Boba (g)</label>
                    <input type="number" min="1" max="500" value={grams}
                      onChange={e => setGrams(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ justifyContent: 'flex-end' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input type="checkbox" checked={withFelini}
                        onChange={e => setWithFelini(e.target.checked)} />
                      Přidat Felini
                    </label>
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem' }}>
                  <input type="checkbox" checked={saveCustom}
                    onChange={e => setSaveCustom(e.target.checked)} />
                  Uložit do Moje masa (pro příště)
                </label>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn btn-ghost" style={{ flex: 1 }}
                    onClick={() => setScanState('idle')}>
                    Zrušit
                  </button>
                  <button type="button" className="btn btn-gold" style={{ flex: 1 }}
                    onClick={handleConfirmDraft}>
                    Přidat Bobovi
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="modal-body">

            {/* ── Maso tab ── */}
            {mode === 'meat' && scanState === 'idle' && (
              <>
                <div className="form-group">
                  <label>Druh masa / doplněk</label>
                  <select value={meatId} onChange={e => handleMeatChange(e.target.value)}>
                    <optgroup label="Vestavěná masa">
                      {MEATS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </optgroup>
                    <optgroup label="Vejce a doplňky">
                      {SUPPLEMENTS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </optgroup>
                    {customMeats.length > 0 && (
                      <optgroup label="Moje masa (skenovaná)">
                        {customMeats.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </optgroup>
                    )}
                  </select>
                </div>

                {/* EAN scan + manual buttons */}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ flex: 1, borderStyle: 'dashed', borderWidth: 1, borderColor: 'var(--gold)', color: 'var(--gold)' }}
                    onClick={() => setScanState('scanning')}>
                    📷 Skenovat EAN
                  </button>
                  <button type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ flex: 1, borderStyle: 'dashed', borderWidth: 1, borderColor: 'var(--border)' }}
                    onClick={() => {
                      setShowPresets(true);
                      setScanError('Vyberte druh masa:');
                      applyDraft({ name: '', kcal: 0, protein: 0, fat: 0, ca_mg: 0, p_mg: 0, taurin_mg: 50, vitA_IU: 0, vitD3_IU: 0, iron_mg: 0, zinc_mg: 0 });
                    }}>
                    + Přidat maso ručně
                  </button>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Gramáž (g)</label>
                    <input type="number" min="1" max="500" value={grams}
                      onChange={e => setGrams(e.target.value)} required />
                  </div>
                  <div className="form-group" style={{ justifyContent: 'flex-end' }}>
                    {isSupplement ? (
                      <span className="help-text">Doplněk — bez Felini</span>
                    ) : (
                      <>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input type="checkbox" checked={withFelini}
                            onChange={e => setWithFelini(e.target.checked)} />
                          Přidat Felini
                        </label>
                        {effectiveFelini && gramsNum > 0 && (
                          <div className="help-text">→ {feliniDosePreview} g Felini</div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {meatWarning && <p className="error-text">{meatWarning}</p>}
                {gramsNum > 0 && (
                  <div className="help-text" style={{ background: 'var(--bg)', padding: 10, borderRadius: 8 }}>
                    Preview: {kcalPreview} kcal
                    {!isSupplement && <> · Ca:P po Felini ≈{' '}
                    {effectiveFelini ? '1.30' : (selectedMeat.p_mg > 0 ? (selectedMeat.ca_mg / selectedMeat.p_mg).toFixed(2) : '—')} : 1</>}
                  </div>
                )}
              </>
            )}

            {/* ── Kapsička tab ── */}
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
                        Preview: {Math.round(selectedPouch.kcalPer100g * (parseFloat(pouchGrams) || 0) / 100)} kcal
                        {(selectedPouch.stockCount ?? 0) > 0 && ' · sklad se sníží o 1'}
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* ── Felini tab ── */}
            {mode === 'felini' && (
              <div className="form-group">
                <label>Dávka Felini Complete (g)</label>
                <input type="number" min="0.1" max="10" step="0.1"
                  value={feliniGrams} onChange={e => setFeliniGrams(e.target.value)} required />
                <span className="help-text">
                  Zvlášť (bez masa) — Ca: {Math.round(193 * (parseFloat(feliniGrams) || 0))} mg
                </span>
              </div>
            )}
          </div>

          {/* Footer — skryj když je otevřen scan form */}
          {scanState === 'idle' && (
            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={onClose}>Zrušit</button>
              <button type="submit" className="btn btn-gold"
                disabled={mode === 'pouch' && pouches.length === 0}>
                Přidat
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
