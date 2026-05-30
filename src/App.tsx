import { useState, lazy, Suspense } from 'react';
import type { TabId } from './types';
import { BobHeader } from './components/BobHeader';
import { BottomNav } from './components/BottomNav';
import { DiaryView } from './views/DiaryView';
import { PouchesView } from './views/PouchesView';
import { AddWeightModal } from './modals/AddWeightModal';
import { useWeightsStore } from './store/weights';
import { getEnergy } from './utils/energy';

// Grafové záložky (recharts) se načtou až při otevření — rychlejší úvodní načtení
const AnalyticsView = lazy(() => import('./views/AnalyticsView').then(m => ({ default: m.AnalyticsView })));
const ProfileView = lazy(() => import('./views/ProfileView').then(m => ({ default: m.ProfileView })));

export function App() {
  const [tab, setTab] = useState<TabId>('diary');
  const [weightModalOpen, setWeightModalOpen] = useState(false);
  const weights = useWeightsStore(s => s.weights);
  const latestWeight = weights.length > 0 ? weights[weights.length - 1].kg : null;
  const energy = getEnergy(latestWeight ?? 1.5);

  return (
    <div className="app">
      <BobHeader
        energy={energy}
        latestWeight={latestWeight}
        onAddWeight={() => setWeightModalOpen(true)}
      />
      <main className="main-content">
        {tab === 'diary'     && <DiaryView energy={energy} />}
        {tab === 'pouches'   && <PouchesView />}
        {(tab === 'analytics' || tab === 'profile') && (
          <Suspense fallback={<div className="loading-state"><div className="spinner" /><p>Načítám…</p></div>}>
            {tab === 'analytics' && <AnalyticsView />}
            {tab === 'profile'   && <ProfileView onAddWeight={() => setWeightModalOpen(true)} />}
          </Suspense>
        )}
      </main>
      <BottomNav active={tab} onChange={setTab} />
      {weightModalOpen && <AddWeightModal onClose={() => setWeightModalOpen(false)} />}
    </div>
  );
}
