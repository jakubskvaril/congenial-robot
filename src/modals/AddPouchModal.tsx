import { useState } from 'react';
import { usePouchesStore } from '../store/pouches';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { lookupBarcode } from '../utils/barcode';
import type { PouchDraft } from '../utils/barcode';

type Mode = 'barcode' | 'url' | 'manual';
type State = 'idle' | 'loading' | 'result' | 'error';

export function AddPouchModal({ onClose }: { onClose: () => void }) {
  const addPouch = usePouchesStore(s => s.addPouch);
  const [mode, setMode] = useState<Mode>('barcode');
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<PouchDraft | null>(null);
  const [url, setUrl] = useState('');
  const [ean, setEan] = useState('');

  // Edit fields
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [score, setScore] = useState('5');
  const [stock, setStock] = useState('0');
  const [notes, setNotes] = useState('');

  function applyDraft(d: PouchDraft) {
    setDraft(d);
    setName(d.name);
    setBrand(d.brand);
    setScore(String(d.score));
    setNotes(d.notes);
    setState('result');
  }

  async function handleBarcodeScan(ean: string) {
    setState('loading');
    const result = await lookupBarcode(ean);
    if (result) {
      applyDraft(result);
    } else {
      setError(`EAN ${ean} nenalezen v databázi`);
      setState('error');
    }
  }

  async function handleEanManual() {
    if (!ean.trim()) return;
    setState('loading');
    const result = await lookupBarcode(ean.trim());
    if (result) {
      applyDraft(result);
    } else {
      setError(`EAN ${ean} nenalezen`);
      setState('error');
    }
  }

  async function handleUrlAnalyze() {
    if (!url.trim()) return;
    setState('loading');
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json() as { ok: boolean; data?: PouchDraft; error?: string };
      if (data.ok && data.data) {
        applyDraft(data.data);
      } else {
        setError(data.error ?? 'Analýza selhala');
        setState('error');
      }
    } catch {
      setError('Síťová chyba');
      setState('error');
    }
  }

  function handleAdd() {
    if (!draft) return;
    addPouch({
      ...draft,
      name: name.trim() || draft.name,
      brand: brand.trim() || draft.brand,
      score: parseInt(score) || 5,
      notes: notes.trim(),
      stockCount: parseInt(stock) || 0,
    });
    onClose();
  }

  function handleManualAdd(e: React.FormEvent) {
    e.preventDefault();
    addPouch({
      name: name.trim() || 'Kapsička',
      brand: brand.trim() || 'Neznámá',
      meatPercent: null,
      isKitten: false,
      grainFree: false,
      isComplete: true,
      nutrients: { protein: 10, fat: 5, moisture: 80 },
      kcalPer100g: 75,
      score: parseInt(score) || 5,
      notes: notes.trim(),
      stockCount: parseInt(stock) || 0,
    });
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Přidat kapsičku</h2>
          <button type="button" className="btn-icon" onClick={onClose}>✕</button>
        </div>

        {/* Mode tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
          {(['barcode', 'url', 'manual'] as Mode[]).map(m => (
            <button key={m} type="button"
              onClick={() => { setMode(m); setState('idle'); setError(''); setDraft(null); }}
              style={{
                flex: 1, padding: '10px 4px', border: 'none', background: 'transparent',
                borderBottom: mode === m ? '3px solid var(--gold)' : '3px solid transparent',
                color: mode === m ? 'var(--gold)' : 'var(--muted)',
                fontWeight: mode === m ? 700 : 400,
                cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.78rem',
              }}
            >
              {m === 'barcode' ? '📷 Skener' : m === 'url' ? '🔗 URL' : '✏️ Ručně'}
            </button>
          ))}
        </div>

        <div className="modal-body">
          {state === 'loading' && (
            <div className="loading-state">
              <div className="spinner" />
              <p>Hledám produkt…</p>
            </div>
          )}

          {state === 'error' && (
            <>
              <p className="error-text">{error}</p>
              <button className="btn btn-ghost btn-sm" onClick={() => setState('idle')}>Zpět</button>
            </>
          )}

          {state === 'idle' && mode === 'barcode' && (
            <>
              <BarcodeScanner onResult={handleBarcodeScan} />
              <div className="section-title" style={{ marginTop: 12 }}>Nebo zadejte ručně</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  data-testid="ean-manual-input"
                  type="number" placeholder="EAN kód…"
                  value={ean} onChange={e => setEan(e.target.value)}
                  style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontFamily: 'inherit' }}
                />
                <button
                  data-testid="ean-lookup-btn"
                  type="button" className="btn btn-gold btn-sm"
                  onClick={handleEanManual}
                >Hledat</button>
              </div>
            </>
          )}

          {state === 'idle' && mode === 'url' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="url" placeholder="https://…"
                value={url} onChange={e => setUrl(e.target.value)}
                style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontFamily: 'inherit' }}
              />
              <button type="button" className="btn btn-gold btn-sm" onClick={handleUrlAnalyze}>Analyzovat</button>
            </div>
          )}

          {state === 'idle' && mode === 'manual' && (
            <form onSubmit={handleManualAdd} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-row">
                <div className="form-group">
                  <label>Název</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Značka</label>
                  <input type="text" value={brand} onChange={e => setBrand(e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Skóre (1–10)</label>
                  <input type="number" min="1" max="10" value={score} onChange={e => setScore(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Sklad (ks)</label>
                  <input type="number" min="0" value={stock} onChange={e => setStock(e.target.value)} />
                </div>
              </div>
              <div className="modal-footer" style={{ padding: 0, border: 'none' }}>
                <button type="button" className="btn btn-ghost" onClick={onClose}>Zrušit</button>
                <button type="submit" className="btn btn-gold">Přidat</button>
              </div>
            </form>
          )}

          {state === 'result' && draft && (
            <>
              <div data-testid="barcode-result" style={{ background: 'var(--bg)', padding: 12, borderRadius: 8 }}>
                <div className="section-title">Nalezeno</div>
                <div style={{ fontWeight: 700 }}>{draft.brand} – {draft.name}</div>
                <div className="help-text">{draft.kcalPer100g} kcal/100g · skóre {draft.score}/10</div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Název</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Značka</label>
                  <input type="text" value={brand} onChange={e => setBrand(e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Skóre (1–10)</label>
                  <input type="number" min="1" max="10" value={score} onChange={e => setScore(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Sklad (ks)</label>
                  <input type="number" min="0" value={stock} onChange={e => setStock(e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label>Poznámky</label>
                <input type="text" value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setState('idle')}>Zpět</button>
                <button type="button" className="btn btn-gold" onClick={handleAdd}>Přidat do databáze</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
