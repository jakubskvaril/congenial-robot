interface KcalRingProps {
  value: number;
  max: number;
  size?: number;
}

export function KcalRing({ value, max, size = 120 }: KcalRingProps) {
  const pct = max > 0 ? Math.min(value / max, 1.2) : 0;
  const r = 46;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(pct, 1));
  const color = pct > 1.1 ? '#B91C1C' : pct > 0.9 ? '#15803D' : '#B8922A';

  return (
    <div className="kcal-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#E8E8E5" strokeWidth="7" />
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
