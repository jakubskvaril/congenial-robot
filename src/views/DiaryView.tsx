import { useEffect, useMemo, useState } from 'react';
import type { EnergyResult, MeatItem } from '../types';
import { useLogsStore } from '../store/logs';
import { sumNutrients, todayISO, logMeat, avgNutrientsPerDay, loggedDays } from '../utils/nutrients';
import { recommendDay, weeklyLowNutrients } from '../utils/recommend';
import { NUTRIENT_CLASSES } from '../data/nrc';
import { NUTRIENT_META, dailyTargets, dailyCeilings } from '../utils/nutrientStatus';
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

const labelOf = (key: string) => NUTRIENT_META.find(m => m.key === key)?.label ?? key;

interface DiaryViewProps {
  energy: EnergyResult;
}

export function DiaryView({ energy }: DiaryViewProps) {
  // PWA zkratka "Přidat krmení" (?action=add z manifestu) otevře modal rovnou.
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

  const stage = energy.lifeStage === 'kitten' ? 'kitten' : 'adult';
  const targets = dailyTargets(energy.kcal, stage);
  const ceilings = dailyCeilings(energy.kcal);

  // Týdenní průměr na den (posledních 7 zaznamenaných dní) — pro orientační živiny
  const last7 = useMemo(() => loggedDays(logs).slice(-7), [logs]);
  const weekAvg = useMemo(() => avgNutrientsPerDay(logs, last7), [logs, last7]);
  const haveWeek = last7.length >= 3;
  const weeklyAvgMap = haveWeek
    ? Object.fromEntries(NUTRIENT_META.map(m => [m.key, weekAvg[m.key] as number]))
    : undefined;

  // Doporučení na zbytek dne
  const weeklyLow = useMemo(() => weeklyLowNutrients(logs, stage), [logs, stage]);
  const recos = useMemo(
    () => recommendDay(nutrients, targets, energy.kcal - nutrients.kcal, weeklyLow),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nutrients, energy.kcal, weeklyLow, stage],
  );

  function quickAdd(meat: MeatItem, grams: number) {
    addEntry(logMeat(meat, grams, meat.kind !== 'supplement'));
  }

  const remainingKcal = energy.kcal - nutrients.kcal;

  // Klíčové (min./přesně/strop) živiny pod cílem dnes; orientační podle týdne
  const keyShort = NUTRIENT_META
    .filter(m => NUTRIENT_CLASSES[m.key] !== 'flex')
    .filter(m => (nutrients[m.key] as number) < targets[m.key])
    .map(m => m.key);
  const flexShort = NUTRIENT_META
    .filter(m => NUTRIENT_CLASSES[m.key] === 'flex')
    .filter(m => (haveWeek ? (weekAvg[m.key] as number) : (nutrients[m.key] as number)) < targets[m.key])
    .map(m => m.key);

  const r = nutrients.caP_ratio;
  const caPColor: 'good' | 'warn' | 'bad' | 'none' =
    r === 0 ? 'none'
    : r >= 1.2 && r <= 1.4 ? 'good'
    : (r >= 1.0 && r < 1.2) || (r > 1.4 && r <= 1.6) ? 'warn'
    : 'bad';

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

      {/* ── Doporučení / stav na zbytek dne ── */}
      {entries.length > 0 && (
        recos.length > 0 ? (
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
                  aria-label={`Přidat ${s.grams} g ${s.meat.name}`}
                  onClick={() => quickAdd(s.meat, s.grams)}>＋</button>
              </div>
            ))}
          </div>
        ) : keyShort.length === 0 ? (
          <div className="reco-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem' }}>✅</div>
            <p style={{ fontWeight: 600, fontSize: '0.9rem', marginTop: 4 }}>
              {flexShort.length === 0 ? 'Tabulky jsou naplněné' : 'Klíčové živiny v pořádku'}
            </p>
            <p className="help-text">
              {flexShort.length === 0
                ? 'Bob má dnes vše důležité v normě.'
                : `${flexShort.map(labelOf).join(' a ')} klidně doženeš zítra — je to orientační živina.`}
            </p>
          </div>
        ) : remainingKcal < 8 ? (
          <div className="reco-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem' }}>🍽️</div>
            <p style={{ fontWeight: 600, fontSize: '0.9rem', marginTop: 4 }}>Denní kalorie vyčerpané</p>
            <p className="help-text">
              Ještě chybí {keyShort.map(labelOf).join(', ')} — doplň zítra ráno, ať Boba nepřekrmíš.
            </p>
          </div>
        ) : (
          <div className="reco-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem' }}>ℹ️</div>
            <p style={{ fontWeight: 600, fontSize: '0.9rem', marginTop: 4 }}>Ještě chybí {keyShort.map(labelOf).join(', ')}</p>
            <p className="help-text">
              Běžným masem to teď nedoženeš — řeš přes Felini nebo doplněk (žloutek, skořápka, olej).
            </p>
          </div>
        )
      )}

      {/* ── Denní nutrienty ── */}
      <div className="card">
        <div className="section-title" style={{ marginBottom: 10 }}>Denní nutrienty vs. NRC 2006</div>
        <NutrientBars nutrients={nutrients} targets={targets} ceilings={ceilings} weeklyAvg={weeklyAvgMap} entries={entries} />
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
                aria-label={`Smazat ${e.name}`}
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
