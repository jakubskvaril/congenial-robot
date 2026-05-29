import type { EnergyResult } from '../types';

interface BobHeaderProps {
  energy: EnergyResult;
  latestWeight: number | null;
  onAddWeight: () => void;
}

export function BobHeader({ energy, latestWeight, onAddWeight }: BobHeaderProps) {
  return (
    <header className="bob-header">
      <svg className="bob-avatar" viewBox="0 0 40 40" aria-label="Bob">
        {/* Seal point cat face */}
        <ellipse cx="20" cy="22" rx="14" ry="13" fill="#f5f0e8" />
        <ellipse cx="20" cy="12" rx="11" ry="10" fill="#f5f0e8" />
        {/* Dark mask */}
        <ellipse cx="20" cy="16" rx="8" ry="6" fill="#4a3020" opacity="0.6" />
        {/* Ears */}
        <polygon points="9,6 5,0 14,4" fill="#4a3020" />
        <polygon points="31,6 35,0 26,4" fill="#4a3020" />
        {/* Eyes */}
        <ellipse cx="16" cy="14" rx="2.5" ry="2" fill="#2a7ab8" />
        <ellipse cx="24" cy="14" rx="2.5" ry="2" fill="#2a7ab8" />
        <ellipse cx="16.5" cy="14" rx="1" ry="1.5" fill="#0a0a0a" />
        <ellipse cx="24.5" cy="14" rx="1" ry="1.5" fill="#0a0a0a" />
        {/* Nose */}
        <ellipse cx="20" cy="19" rx="1.5" ry="1" fill="#e8829a" />
        {/* Whiskers */}
        <line x1="6" y1="18" x2="17" y2="19" stroke="#d0c8b8" strokeWidth="0.5" />
        <line x1="6" y1="21" x2="17" y2="20" stroke="#d0c8b8" strokeWidth="0.5" />
        <line x1="34" y1="18" x2="23" y2="19" stroke="#d0c8b8" strokeWidth="0.5" />
        <line x1="34" y1="21" x2="23" y2="20" stroke="#d0c8b8" strokeWidth="0.5" />
      </svg>
      <div className="bob-title">
        <h1>Bobův deníček</h1>
        <div className="bob-subtitle">
          {energy.lifeStageLabel} · {energy.ageMonths.toFixed(0)} měs. · {energy.kcal} kcal/den
          {latestWeight ? ` · ${latestWeight} kg` : ''}
        </div>
      </div>
      <button className="bob-weight-btn" onClick={onAddWeight}>
        ⚖️ Váha
      </button>
    </header>
  );
}
