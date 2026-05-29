import { useState } from 'react';
import type { TabId } from './types';
import { BobHeader } from './components/BobHeader';
import { BottomNav } from './components/BottomNav';
import { DiaryView } from './views/DiaryView';
import { PouchesView } from './views/PouchesView';
import { AnalyticsView } from './views/AnalyticsView';
import { ProfileView } from './views/ProfileView';
import { AddWeightModal } from './modals/AddWeightModal';
import { useWeightsStore } from './store/weights';
import { getEnergy } from './utils/energy';

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
        {tab === 'analytics' && <AnalyticsView />}
        {tab === 'profile'   && <ProfileView onAddWeight={() => setWeightModalOpen(true)} />}
      </main>
      <BottomNav active={tab} onChange={setTab} />
      {weightModalOpen && <AddWeightModal onClose={() => setWeightModalOpen(false)} />}
    </div>
  );
}
