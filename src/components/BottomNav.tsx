import type { TabId } from '../types';

interface BottomNavProps {
  active: TabId;
  onChange: (tab: TabId) => void;
}

const TABS: { id: TabId; icon: string; label: string }[] = [
  { id: 'diary',     icon: '📋', label: 'Deník' },
  { id: 'pouches',   icon: '🥫', label: 'Kapsičky' },
  { id: 'analytics', icon: '📊', label: 'Analýza' },
  { id: 'profile',   icon: '🐱', label: 'Profil' },
];

export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="Hlavní navigace">
      {TABS.map(t => (
        <button
          key={t.id}
          className={`nav-btn${active === t.id ? ' nav-btn--active' : ''}`}
          onClick={() => onChange(t.id)}
          aria-current={active === t.id ? 'page' : undefined}
          aria-label={t.label}
        >
          <span className="nav-icon">{t.icon}</span>
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
