import { STATUS, PALETTE } from '../theme';

interface EnergyBarProps {
  value: number;
  target: number;
  /** Bezpečný strop příjmu (kcal) — značka na stupnici. */
  ceiling?: number;
}

/**
 * Energie jako velké číslo + segmentovaný pruh se značkou cíle.
 * Nahrazuje prstenec — čitelnější na dálku a sedí do Modernist mřížky.
 */
export function EnergyBar({ value, target, ceiling }: EnergyBarProps) {
  const max = ceiling ?? Math.round(target * 1.3);
  const ratio = target > 0 ? value / target : 0;
  const fillPct = Math.min((value / max) * 100, 100);
  const markerPct = Math.min((target / max) * 100, 100);

  const color =
    ratio > 1.3 ? STATUS.bad
    : ratio > 1.15 ? STATUS.warn
    : ratio >= 0.85 ? STATUS.good
    : PALETTE.accent;

  const remaining = Math.round(target - value);
  const remainLabel = remaining > 0 ? `Zbývá ${remaining} kcal` : `O ${Math.abs(remaining)} kcal víc`;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div className="eyebrow eyebrow--muted">Energie</div>
        <div className="eyebrow eyebrow--muted">{Math.round(ratio * 100)} %</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, margin: '2px 0 12px' }}>
        <span className="energy-value">{Math.round(value)}</span>
        <span className="energy-unit">/ {Math.round(target)} kcal</span>
      </div>
      <div className="energy-track">
        <div className="energy-fill" style={{ width: `${fillPct}%`, background: color }} />
        <div className="energy-marker" style={{ left: `${markerPct}%` }} />
      </div>
      <div className="energy-legend">
        <span>{remainLabel}</span>
        <span>Cíl {Math.round(target)} · strop {Math.round(max)}</span>
      </div>
    </div>
  );
}
