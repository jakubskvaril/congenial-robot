import { useState } from 'react';
import { useWeightsStore } from '../store/weights';

interface AddWeightModalProps {
  onClose: () => void;
}

export function AddWeightModal({ onClose }: AddWeightModalProps) {
  const addWeight = useWeightsStore(s => s.addWeight);
  const [kg, setKg] = useState('');
  const [note, setNote] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const val = parseFloat(kg);
    if (!val || val <= 0) return;
    addWeight(val, note.trim() || undefined);
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Přidat vážení</h2>
          <button type="button" className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label>Hmotnost (kg)</label>
              <input type="number" step="0.01" min="0.1" max="15"
                value={kg} onChange={e => setKg(e.target.value)}
                placeholder="např. 1.80" autoFocus required />
            </div>
            <div className="form-group">
              <label>Poznámka (volitelné)</label>
              <input type="text" value={note}
                onChange={e => setNote(e.target.value)} placeholder="Po krmení, ráno…" />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Zrušit</button>
            <button type="submit" className="btn btn-gold">Uložit</button>
          </div>
        </form>
      </div>
    </div>
  );
}
