import type { DailyNutrients, NRCTargets } from '../types';
import { NUTRIENT_CLASSES, CLASS_INFO, type NutrientClass } from '../data/nrc';

interface NutrientBarsProps {
  nutrients: DailyNutrients;
  targets: NRCTargets;
  /** Bezpečné horní limity (SUL) škálované na denní kcal — jen kde existují. */
  ceilings: Partial<Record<string, number>>;
}

// Decentní paleta — červená jen u skutečného rizika
const GREEN = '#3F9E5A';
const AMBER = '#C99A2E';
const RED   = '#C2410C';

interface Row {
  key: string;
  label: string;
  value: number;
  target: number;
  sul?: number;
  unit: string;
  cls: NutrientClass;
}

interface Status {
  color: string;
  primary: string;   // hlavní barevný text vpravo
  fillFrac: number;  // 0..1 výplň baru
  raTickFrac?: number; // pozice značky doporučené dávky (u stropových)
}

const pct = (x: number) => Math.round(x * 100);

function computeStatus(r: Row): Status {
  const rt = r.target > 0 ? r.value / r.target : 0;   // poměr k doporučené dávce
  const excessMatters = r.cls === 'ceiling' || r.cls === 'critical';
  // Stupnici řídí strop jen tam, kde přebytek reálně škodí (A, D, Ca, P se SUL)
  const byCeiling = !!r.sul && excessMatters;
  const rs = r.sul ? r.value / r.sul : 0;
  const raTick = byCeiling ? r.target / r.sul! : undefined;

  // ── Deficit (pod doporučenou dávkou) ──
  if (r.value < r.target) {
    const missing = pct(1 - rt);
    if (r.cls === 'flex') {
      const soft = rt >= 0.6;
      return { color: AMBER, primary: soft ? `zbývá ${missing} %` : `chybí ${missing} %`, fillFrac: rt };
    }
    // floor / critical / ceiling: deficit může škodit
    const color = rt < 0.7 ? RED : AMBER;
    return { color, primary: `chybí ${missing} %`, fillFrac: byCeiling ? rs : rt, raTickFrac: raTick };
  }

  // ── Dostatečné až nadbytek ──
  if (byCeiling) {
    // Posuzuj podle bezpečného stropu, ne podle doporučené dávky
    if (rs <= 0.7) return { color: GREEN, primary: `${pct(rs)} % stropu`, fillFrac: rs, raTickFrac: raTick };
    if (rs < 1)    return { color: AMBER, primary: `${pct(rs)} % stropu`, fillFrac: rs, raTickFrac: raTick };
    return { color: RED, primary: 'nad strop!', fillFrac: 1, raTickFrac: raTick };
  }
  if (r.cls === 'critical') {
    // Ca / P bez stropu: mírný přebytek OK, velký jantarově
    if (rt <= 1.3) return { color: GREEN, primary: 'v normě', fillFrac: Math.min(rt, 1) };
    return { color: AMBER, primary: `+${pct(rt - 1)} % nad`, fillFrac: 1 };
  }
  // floor / flex: přebytek se vyloučí — jen pojistka na extrém
  if (r.sul && rs > 1) return { color: RED, primary: 'nad strop!', fillFrac: 1 };
  return { color: GREEN, primary: '✓ splněno', fillFrac: 1 };
}

export function NutrientBars({ nutrients, targets, ceilings }: NutrientBarsProps) {
  const rows: Row[] = [
    { key: 'protein_g',     label: 'Bílkoviny', value: Math.round(nutrients.protein_g),         target: Math.round(targets.protein_g),     unit: 'g' },
    { key: 'taurin_mg',     label: 'Taurin',    value: Math.round(nutrients.taurin_mg),         target: Math.round(targets.taurin_mg),     unit: 'mg' },
    { key: 'calcium_mg',    label: 'Vápník',    value: Math.round(nutrients.calcium_mg),        target: Math.round(targets.calcium_mg),    unit: 'mg' },
    { key: 'phosphorus_mg', label: 'Fosfor',    value: Math.round(nutrients.phosphorus_mg),     target: Math.round(targets.phosphorus_mg), unit: 'mg' },
    { key: 'omega3_mg',     label: 'Omega-3',   value: Math.round(nutrients.omega3_mg),         target: Math.round(targets.omega3_mg),     unit: 'mg' },
    { key: 'vitA_IU',       label: 'Vit. A',    value: Math.round(nutrients.vitA_IU),           target: Math.round(targets.vitA_IU),       unit: 'IU' },
    { key: 'vitD3_IU',      label: 'Vit. D3',   value: Math.round(nutrients.vitD3_IU),          target: Math.round(targets.vitD3_IU),      unit: 'IU' },
    { key: 'iron_mg',       label: 'Železo',    value: Math.round(nutrients.iron_mg * 10) / 10, target: Math.round(targets.iron_mg),       unit: 'mg' },
    { key: 'zinc_mg',       label: 'Zinek',     value: Math.round(nutrients.zinc_mg * 10) / 10, target: Math.round(targets.zinc_mg),       unit: 'mg' },
  ].map(r => ({ ...r, cls: NUTRIENT_CLASSES[r.key] ?? 'flex', sul: ceilings[r.key] }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {rows.map(r => {
        const st = computeStatus(r);
        const info = CLASS_INFO[r.cls];
        return (
          <div key={r.key} className="nutrient-bar-row">
            <div className="nutrient-bar-label">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {r.label}
                <span className={`nut-badge nut-badge--${r.cls}`} title={info.hint}>{info.badge}</span>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
                  {r.value} {r.unit}
                </span>
                <span style={{ color: st.color, fontWeight: 600 }}>{st.primary}</span>
              </span>
            </div>
            <div className="nutrient-bar-track">
              <div className="nutrient-bar-fill" style={{ width: `${Math.min(st.fillFrac, 1) * 100}%`, backgroundColor: st.color }} />
              {st.raTickFrac !== undefined && st.raTickFrac < 1 && (
                <div className="nutrient-bar-tick" style={{ left: `${st.raTickFrac * 100}%` }}
                  title="doporučená denní dávka" />
              )}
            </div>
          </div>
        );
      })}
      <p className="help-text" style={{ marginTop: 2, lineHeight: 1.6 }}>
        U vitamínů A a D3 bar ukazuje cestu k <strong>bezpečnému stropu</strong> (riziko předávkování);
        značka ┃ je doporučená dávka. Vápník a fosfor mají být v rozmezí; ostatní hlavně ať nechybí.
      </p>
    </div>
  );
}
