import { useState } from 'react';
import { usePouchesStore } from '../store/pouches';
import type { Pouch } from '../types';
import { AddPouchModal } from '../modals/AddPouchModal';
import { scoreColor } from '../theme';



function PouchCard({ pouch, onRemove, onDecrement }: {
  pouch: Pouch;
  onRemove: (id: string) => void;
  onDecrement: (id: string) => void;
}) {
  const n = pouch.nutrients;
  const caP = n.calcium && n.phosphorus ? (n.calcium / n.phosphorus).toFixed(2) : '—';
  return (
    <div className="pouch-card">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="pouch-brand">{pouch.brand}</div>
          <div className="pouch-name">{pouch.name}</div>
        </div>
        <div className="score-badge" style={{ background: scoreColor(pouch.score) }}>
          {pouch.score}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
        {pouch.grainFree && <span className="tag tag-green">Bez obilovin</span>}
        {pouch.isKitten && <span className="tag tag-blue">Koťata</span>}
        {pouch.isComplete && <span className="tag tag-orange">Kompletní</span>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4, marginTop: 8 }}>
        {[
          ['Bílk.', `${n.protein ?? '—'}%`],
          ['Tuk', `${n.fat ?? '—'}%`],
          ['Vlhk.', `${n.moisture ?? '—'}%`],
          ['Ca:P', caP],
          ['kcal', `${pouch.kcalPer100g}/100g`],
          ['Sklad', `${pouch.stockCount ?? 0}ks`],
        ].map(([l, v]) => (
          <div key={l} style={{ background: 'var(--bg)', borderRadius: 6, padding: '4px 6px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase' }}>{l}</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button type="button" className="btn btn-ghost btn-sm"
          onClick={() => onDecrement(pouch.id)}
          disabled={(pouch.stockCount ?? 0) === 0}
        >
          −1 kapsička
        </button>
        <button type="button" className="btn btn-danger btn-sm" style={{ marginLeft: 'auto' }}
          onClick={() => onRemove(pouch.id)}>
          Smazat
        </button>
      </div>
    </div>
  );
}

export function PouchesView() {
  const pouches = usePouchesStore(s => s.pouches);
  const removePouch = usePouchesStore(s => s.removePouch);
  const decrementStock = usePouchesStore(s => s.decrementStock);
  const [addOpen, setAddOpen] = useState(false);
  const sorted = [...pouches].sort((a, b) => b.score - a.score);

  return (
    <div className="view">
      <div className="view-actions">
        <button className="btn btn-gold" style={{ flex: 1 }} onClick={() => setAddOpen(true)}>
          + Přidat kapsičku
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="empty-state">
          <p>Žádné kapsičky v databázi.</p>
          <p className="help-text">Přidejte naskenováním čárového kódu nebo z URL.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sorted.map(p => (
            <PouchCard key={p.id} pouch={p} onRemove={removePouch} onDecrement={decrementStock} />
          ))}
        </div>
      )}

      {addOpen && <AddPouchModal onClose={() => setAddOpen(false)} />}
    </div>
  );
}
