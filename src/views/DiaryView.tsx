import { useEffect, useMemo, useState } from 'react';
import type { EnergyResult, MeatItem } from '../types';
import { useLogsStore } from '../store/logs';
import { useCustomMeatsStore } from '../store/customMeats';
import { MEATS, SUPPLEMENTS } from '../data/meats';
import {
  sumNutrients, todayISO, logMeat, avgNutrientsPerDay, loggedDays, topLoggedFoodIds,
} from '../utils/nutrients';
import { recommendDay, weeklyLowNutrients } from '../utils/recommend';
import { NUTRIENT_CLASSES } from '../data/nrc';
import { NUTRIENT_META, dailyTargets, dailyCeilings } from '../utils/nutrientStatus';
import { EnergyBar } from '../components/EnergyBar';
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

const DAYS = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'];
function todayLabel(): string {
  const d = new Date();
  return `${DAYS[d.getDay()]} ${d.getDate()}. ${d.getMonth() + 1}.`;
}

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
  const customMeats = useCustomMeatsStore(s => s.meats);

  const today = todayISO();
  const entries = useMemo(() => logs[today] ?? [], [logs, today]);
  const sorted = useMemo(() => [...entries].sort((a, b) => a.time.localeCompare(b.time)), [entries]);
  const nutrients = useMemo(() => sumNutrients(entries), [entries]);

  const stage = energy.lifeStage === 'kitten' ? 'kitten' : 'adult';
  const targets = dailyTargets(energy.kcal, stage);
  const ceilings = dailyCeilings(energy.kcal);

  // Týdenní průměr na den — pro dlouhodobé živiny
  const last7 = useMemo(() => loggedDays(logs).slice(-7), [logs]);
  const weekAvg = useMemo(() => avgNutrientsPerDay(logs, last7), [logs, last7]);
  const haveWeek = last7.length >= 3;
  const weeklyAvgMap = haveWeek
    ? Object.fromEntries(NUTRIENT_META.map(m => [m.key, weekAvg[m.key] as number]))
    : undefined;

  // Rychlý zápis — nejčastější jídla jedním tapem
  const allFoods = useMemo(() => [...MEATS, ...SUPPLEMENTS, ...customMeats], [customMeats]);
  const quickTiles = useMemo(() => {
    const byName = new Map(allFoods.map(m => [m.name, m.id]));
    const ids = topLoggedFoodIds(logs, byName, 4);
    return ids
      .map(id => allFoods.find(f => f.id === id))
      .filter((f): f is MeatItem => Boolean(f))
      .map(f => ({ food: f, grams: f.defaultGrams ?? 80 }));
  }, [logs, allFoods]);

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

  const keyShort = NUTRIENT_META
    .filter(m => NUTRIENT_CLASSES[m.key] !== 'flex')
    .filter(m => (nutrients[m.key] as number) < targets[m.key])
    .map(m => m.key);
  const flexShort = NUTRIENT_META
    .filter(m => NUTRIENT_CLASSES[m.key] === 'flex')
    .filter(m => (haveWeek ? (weekAvg[m.key] as number) : (nutrients[m.key] as number)) < targets[m.key])
    .map(m => m.key);

  const r = nutrients.caP_ratio;
  const caPTone: 'good' | 'warn' | 'bad' | 'none' =
    r === 0 ? 'none'
    : r >= 1.2 && r <= 1.4 ? 'good'
    : (r >= 1.0 && r < 1.2) || (r > 1.4 && r <= 1.6) ? 'warn'
    : 'bad';
  const caPNote = caPTone === 'good' ? 'v ideálu' : caPTone === 'warn' ? 'mimo ideál' : caPTone === 'bad' ? 'mimo rozmezí' : 'zatím nic';

  return (
    <div className="view">
      {/* ── Datum + počet jídel ── */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '14px 20px 10px' }}>
        <div className="eyebrow">Dnes · {todayLabel()}</div>
        <div className="eyebrow eyebrow--muted" style={{ letterSpacing: '0.06em' }}>
          {sorted.length === 0 ? 'nic' : `${sorted.length} ${sorted.length === 1 ? 'jídlo' : sorted.length < 5 ? 'jídla' : 'jídel'}`}
        </div>
      </div>

      {/* ── Energie ── */}
      <div style={{ padding: '0 20px 18px', borderBottom: 'var(--rule)' }}>
        <EnergyBar value={nutrients.kcal} target={energy.kcal} />
      </div>

      {/* ── Trojice metrik ── */}
      <div className="metric-row">
        <div className="metric">
          <div className="metric-label">Ca : P</div>
          <div className="metric-value" style={{ color: caPTone === 'good' ? 'var(--green)' : caPTone === 'warn' ? 'var(--orange)' : caPTone === 'bad' ? 'var(--accent)' : 'var(--subtle)' }}>
            {r > 0 ? r.toFixed(2) : '—'}
          </div>
          <div className="metric-note">{caPNote}</div>
        </div>
        <div className="metric">
          <div className="metric-label">Taurin</div>
          <div className="metric-value">{Math.round(nutrients.taurin_mg)}</div>
          <div className="metric-note">z {Math.round(targets.taurin_mg)} mg</div>
        </div>
        <div className="metric">
          <div className="metric-label">Bílkoviny</div>
          <div className="metric-value">{Math.round(nutrients.protein_g)}</div>
          <div className="metric-note">z {Math.round(targets.protein_g)} g</div>
        </div>
      </div>

      {/* ── Rychlý zápis ── */}
      <div style={{ padding: '14px 0 16px', borderBottom: 'var(--rule)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '0 20px 9px' }}>
          <div className="eyebrow">Rychlý zápis</div>
          <div className="help-text" style={{ fontSize: 11 }}>jeden tap = zapsáno</div>
        </div>
        <div className="quick-strip">
          {quickTiles.map(({ food, grams }) => (
            <button key={food.id} type="button" className="quick-tile"
              aria-label={`Zapsat ${grams} g ${food.name}`}
              onClick={() => quickAdd(food, grams)}>
              <span style={{ fontSize: 19, lineHeight: 1 }}>{foodEmoji(food)}</span>
              <span className="quick-tile-name">{food.name.replace(/\s*\(.*?\)/, '')}</span>
              <span className="quick-tile-meta">{grams} g · {Math.round(food.kcal * grams / 100)} kcal</span>
            </button>
          ))}
          <button type="button" className="quick-tile quick-tile--add"
            onClick={() => setAddOpen(true)} aria-label="Otevřít katalog jídel">
            <span style={{ fontSize: 19, lineHeight: 1 }}>＋</span>
            <span className="quick-tile-name">Něco jiného</span>
            <span className="quick-tile-meta">celý katalog</span>
          </button>
        </div>
        <div style={{ padding: '14px 20px 0' }}>
          <button type="button" className="btn btn-primary" style={{ width: '100%' }}
            onClick={() => setAddOpen(true)}>
            ＋ Přidat jídlo
          </button>
        </div>
      </div>

      {/* ── Doporučení / stav ── */}
      {entries.length > 0 && (
        recos.length > 0 ? (
          <div className="reco-card">
            <div className="eyebrow" style={{ color: 'var(--accent)' }}>💡 Dodej na zbytek dne</div>
            <p className="help-text" style={{ margin: '5px 0 4px' }}>
              Ať Bob naplní tabulky — návrh podle dnešního deficitu
              {weeklyLow.size > 0 ? ' i dlouhodobě chybějících hodnot' : ''}:
            </p>
            {recos.map((s, i) => (
              <div key={i} className="reco-item">
                <div className="reco-emoji">{foodEmoji(s.meat)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 800, lineHeight: 1.25 }}>
                    {s.grams} g {s.meat.name.replace(/\s*\(.*?\)/, '')}
                  </div>
                  <div className="help-text" style={{ fontSize: 11 }}>
                    {s.kcal} kcal{s.fills.length > 0 ? ` · doplní ${s.fills.join(' + ')}` : ''}
                  </div>
                </div>
                <button type="button" className="reco-add-btn"
                  aria-label={`Přidat ${s.grams} g ${s.meat.name}`}
                  onClick={() => quickAdd(s.meat, s.grams)}>＋</button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 11, padding: '15px 20px', borderBottom: 'var(--rule)' }}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>
              {keyShort.length === 0 ? '✓' : remainingKcal < 8 ? '🍽️' : 'ℹ️'}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 800 }}>
                {keyShort.length === 0
                  ? (flexShort.length === 0 ? 'Tabulky jsou naplněné' : 'Klíčové živiny v pořádku')
                  : remainingKcal < 8
                  ? 'Denní kalorie vyčerpané'
                  : `Ještě chybí ${keyShort.map(labelOf).join(', ')}`}
              </div>
              <p className="help-text" style={{ margin: '3px 0 0' }}>
                {keyShort.length === 0
                  ? (flexShort.length === 0
                      ? 'Bob má dnes vše důležité v normě.'
                      : `${flexShort.map(labelOf).join(' a ')} klidně doženeš zítra — je to orientační živina.`)
                  : remainingKcal < 8
                  ? `Ještě chybí ${keyShort.map(labelOf).join(', ')} — doplň zítra ráno, ať Boba nepřekrmíš.`
                  : 'Běžným masem to teď nedoženeš — řeš přes Felini nebo doplněk (žloutek, skořápka, olej).'}
              </p>
            </div>
          </div>
        )
      )}

      {/* ── Živiny ── */}
      <div style={{ padding: '14px 20px 6px' }}>
        <div className="eyebrow">Živiny vs. NRC 2006</div>
      </div>
      <div style={{ padding: '0 20px 8px' }}>
        <NutrientBars nutrients={nutrients} targets={targets} ceilings={ceilings}
          weeklyAvg={weeklyAvgMap} entries={entries} />
      </div>

      {/* ── Dnešní jídla ── */}
      <div style={{ padding: '2px 20px 28px' }}>
        <div className="eyebrow" style={{ padding: '8px 0 4px', borderTop: 'var(--rule)' }}>Dnešní jídla</div>
        {sorted.length === 0 ? (
          <div style={{ padding: '22px 0 6px' }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>Dnes ještě nic nezapsáno</div>
            <p className="help-text" style={{ margin: '4px 0 0' }}>
              Přidej Bobovi první jídlo — rychlý zápis je nahoře.
            </p>
          </div>
        ) : (
          sorted.map(e => (
            <div key={e.id} className="log-entry">
              <span className="log-entry-time">{e.time}</span>
              <div className="log-entry-info">
                <div className="log-entry-name">{e.name}</div>
                <div className="log-entry-meta">
                  {e.grams} g{e.feliniDose_g ? ` · Felini ${e.feliniDose_g} g` : ''}
                </div>
              </div>
              <div className="log-entry-stats">
                <div>{e.kcal} kcal</div>
                <div>Ca:P {e.phosphorus_mg > 0 ? (e.calcium_mg / e.phosphorus_mg).toFixed(1) : '—'}</div>
              </div>
              <button type="button" className="btn-icon"
                aria-label={`Smazat ${e.name}`}
                onClick={(ev) => { ev.stopPropagation(); removeEntry(today, e.id); }}
              >✕</button>
            </div>
          ))
        )}
      </div>

      {addOpen && <AddFoodModal energy={energy} onClose={() => setAddOpen(false)} />}
    </div>
  );
}
