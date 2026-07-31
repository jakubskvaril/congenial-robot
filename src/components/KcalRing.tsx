import { STATUS, PALETTE } from '../theme';
interface KcalRingProps {
  value: number;
  max: number;
  size?: number;
}

export function KcalRing({ value, max, size = 120 }: KcalRingProps) {
  const ratio = max > 0 ? value / max : 0;
  const pct = Math.min(ratio, 1.2);
  const r = 46;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(pct, 1));
  // Mírné překročení není poplach: zelená 85–115 %, jemný jantar do 130 %,
  // červená až nad 130 %; pod 85 % jantar (ještě nedojedeno)
  const color =
    ratio > 1.3 ? STATUS.bad
    : ratio > 1.15 ? STATUS.warn
    : ratio >= 0.85 ? STATUS.good
    : PALETTE.accent;

  return (
    <div className="kcal-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke={PALETTE.n300} strokeWidth="7" />
        <circle
          cx="50" cy="50" r={r} fill="none"
          stroke={color} strokeWidth="7"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1), stroke 0.3s' }}
        />
      </svg>
      <div className="kcal-ring-label">
        <span className="kcal-ring-value">{value}</span>
        <span className="kcal-ring-sub">/ {max} kcal</span>
      </div>
    </div>
  );
}
