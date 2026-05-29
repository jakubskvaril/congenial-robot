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
  const color = pct > 1.1 ? '#c03030' : pct > 0.9 ? '#2d8a4e' : '#a07828';

  return (
    <div className="kcal-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#e5e0d8" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={r} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div className="kcal-ring-label">
        <span className="kcal-ring-value">{value}</span>
        <span className="kcal-ring-sub">/ {max} kcal</span>
      </div>
    </div>
  );
}
