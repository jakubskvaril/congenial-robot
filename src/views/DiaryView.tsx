import { useEffect, useMemo, useState } from 'react';
import type { EnergyResult, MeatItem } from '../types';
import { useLogsStore } from '../store/logs';
import { sumNutrients, todayISO, logMeat } from '../utils/nutrients';
import { computeLifetimeStats } from '../utils/lifetime';
import { recommendDay, weeklyLowNutrients } from '../utils/recommend';
import { NRC_PER_1000KCAL } from '../data/nrc';
import { KcalRing } from '../components/KcalRing';
import { NutrientBars } from '../components/NutrientBars';
import { AddFoodModal } from '../modals/AddFoodModal';

function foodEmoji(m: MeatItem): string {
  if (m.id.startsWith('egg')) return '🥚';
  if (m.id === 'salmon_oil') return '🫗';
  if (/salmon|mackerel|cod|sardin/.test(m.id)) return '🐟';
  if (/liver|heart|kidney|gizzard/.test(m.id)) return '🫀';
  return '🥩';
}

interface DiaryViewProps {
  energy: EnergyResult;
}

export function DiaryView({ energy }: DiaryViewProps) {
  // PWA zkratka "Přidat krmení" (?action=add z manifestu) otevře modal rovnou.
  // Initializer musí být čistý (StrictMode ho spouští 2×) — URL čistí až effect.
  const [addOpen, setAddOpen] = useState(
    () => new URLSearchParams(window.location.search).get('action') === 'add'
  );
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('action') === 'add') {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);
  const logs = useLogsStore(s => s.logs);
  const removeEntry = useLogsStore(s => s.removeEntry);
  const addEntry = useLogsStore(s => s.addEntry);
  const today = todayISO();
  const entries = useMemo(() => logs[today] ?? [], [logs, today]);
  const sorted = useMemo(() => [...entries].sort((a, b) => a.time.localeCompare(b.time)), [entries]);
  const nutrients = useMemo(() => sumNutrients(entries), [entries]);
  const stats = useMemo(() => computeLifetimeStats(logs), [logs]);

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
    omega3_mg: perKcal.omega3_mg[stage] * k,
  };

  // Doporučení na zbytek dne — co dodat, aby se tabulky naplnily
  const weeklyLow = useMemo(() => weeklyLowNutrients(logs, stage), [logs, stage]);
  const recos = useMemo(
    () => recommendDay(nutrients, targets, energy.kcal - nutrients.kcal, weeklyLow),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nutrients, energy.kcal, weeklyLow, stage],
  );

  function quickAdd(meat: MeatItem, grams: number) {
    // Doplňky bez Felini; masa s Felini (dopočítá Ca:P)
    addEntry(logMeat(meat, grams, meat.kind !== 'supplement'));
  }

  const r = nutrients.caP_ratio;
  const caPColor: 'good' | 'warn' | 'bad' | 'none' =
    r === 0 ? 'none'
    : r >= 1.2 && r <= 1.4 ? 'good'
    : (r >= 1.0 && r < 1.2) || (r > 1.4 && r <= 1.6) ? 'warn'
    : 'bad';

  const avgKcalDay = stats.totalDaysLogged > 0
    ? Math.round(stats.totalKcal / stats.totalDaysLogged)
    : 0;

  const fmtBig = (n: number) => {
    if (n < 10_000) return String(n);
    const k = n / 1000;
    return k >= 99.95 ? `${Math.round(k)}k` : `${k.toFixed(1)}k`;
  };
  // Taurin adaptivně: do 1 g v mg (jinak by první týden ukazoval "0 g")
  const taurinLabel = stats.totalTaurin_mg < 1000
    ? `${Math.round(stats.totalTaurin_mg)} mg`
    : `${(stats.totalTaurin_mg / 1000).toFixed(1)} g`;

  return (
    <div className="view">
      {/* ── Hero: dnešek v jednom pohledu ── */}
      <div className="card hero-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <KcalRing value={nutrients.kcal} max={energy.kcal} size={124} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
            <div>
              <div className="section-title">Ca : P dnes</div>
              <span className={`cap-badge cap-badge--${caPColor === 'none' ? 'good' : caPColor}`}
                style={caPColor === 'none' ? { background: 'var(--bg)', color: 'var(--muted)', borderColor: 'var(--border)' } : undefined}>
                {r > 0 ? r.toFixed(2) : '—'} : 1
                {caPColor === 'good' ? ' ✓' : caPColor === 'warn' ? ' ⚠️' : caPColor === 'bad' ? ' ✗' : ''}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 18 }}>
              <div>
                <div className="section-title">Taurin</div>
                <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>{Math.round(nutrients.taurin_mg)}</span>
                <span className="help-text"> / {Math.round(targets.taurin_mg)} mg</span>
              </div>
              <div>
                <div className="section-title">Jídel</div>
                <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>{sorted.length}</span>
                <span className="help-text"> dnes</span>
              </div>
            </div>
          </div>
        </div>
        <button className="btn btn-gold" onClick={() => setAddOpen(true)}
          style={{ width: '100%', marginTop: 14 }}>
          + Přidat jídlo
        </button>
      </div>

      {/* ── Dlouhodobé statistiky ── */}
      {stats.totalDaysLogged > 0 && (
        <div>
          <div className="section-title" style={{ marginBottom: 8 }}>Bob dlouhodobě</div>
          <div className="stat-strip">
            <div className="stat-chip">
              <div className="stat-chip-icon">📅</div>
              <div className="stat-chip-value">{stats.totalDaysLogged}</div>
              <div className="stat-chip-label">dní sledování</div>
            </div>
            <div className="stat-chip">
              <div className="stat-chip-icon">📈</div>
              <div className="stat-chip-value">{avgKcalDay}</div>
              <div className="stat-chip-label">kcal / den ø</div>
            </div>
            <div className="stat-chip">
              <div className="stat-chip-icon">🍽️</div>
              <div className="stat-chip-value">{fmtBig(stats.totalMeals)}</div>
              <div className="stat-chip-label">jídel celkem</div>
            </div>
            <div className="stat-chip">
              <div className="stat-chip-icon">🔥</div>
              <div className="stat-chip-value">{fmtBig(stats.totalKcal)}</div>
              <div className="stat-chip-label">kcal celkem</div>
            </div>
            <div className="stat-chip">
              <div className="stat-chip-icon">💊</div>
              <div className="stat-chip-value">{taurinLabel}</div>
              <div className="stat-chip-label">taurinu</div>
            </div>
            {stats.topMeats[0] && (
              <div className="stat-chip">
                <div className="stat-chip-icon">🏆</div>
                <div className="stat-chip-value" style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                  {stats.topMeats[0].name}
                </div>
                <div className="stat-chip-label">nejoblíbenější</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Doporučení na zbytek dne ── */}
      {entries.length > 0 && recos.length > 0 && (
        <div className="reco-card">
          <div className="section-title" style={{ marginBottom: 4, color: 'var(--accent)' }}>
            💡 Dodej na zbytek dne
          </div>
          <p className="help-text" style={{ marginBottom: 8 }}>
            Ať Bob naplní tabulky — návrh podle dnešního deficitu
            {weeklyLow.size > 0 ? ' i dlouhodobě chybějících hodnot' : ''}:
          </p>
          {recos.map((s, i) => (
            <div key={i} className="reco-item">
              <div className="reco-emoji">{foodEmoji(s.meat)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                  {s.grams} g {s.meat.name.replace(/\s*\(.*?\)/, '')}
                </div>
                <div className="help-text">
                  {s.kcal} kcal{s.fills.length > 0 ? ` · doplní ${s.fills.join(' + ')}` : ''}
                </div>
              </div>
              <button type="button" className="reco-add-btn" title="Přidat"
                onClick={() => quickAdd(s.meat, s.grams)}>＋</button>
            </div>
          ))}
        </div>
      )}
      {entries.length > 0 && recos.length === 0 && (
        <div className="reco-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.4rem' }}>✅</div>
          <p style={{ fontWeight: 600, fontSize: '0.9rem', marginTop: 4 }}>Tabulky jsou naplněné</p>
          <p className="help-text">Bob má dnes klíčové živiny v pořádku.</p>
        </div>
      )}

      {/* ── Denní nutrienty ── */}
      <div className="card">
        <div className="section-title" style={{ marginBottom: 10 }}>Denní nutrienty vs. NRC 2006</div>
        <NutrientBars nutrients={nutrients} targets={targets} />
      </div>

      {/* ── Dnešní jídla ── */}
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
