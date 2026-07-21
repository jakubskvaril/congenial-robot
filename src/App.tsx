import { useState, lazy, Suspense } from 'react';
import type { TabId } from './types';
import { BobHeader } from './components/BobHeader';
import { BottomNav } from './components/BottomNav';
import { DiaryView } from './views/DiaryView';
import { PouchesView } from './views/PouchesView';
import { AddWeightModal } from './modals/AddWeightModal';
import { LoginScreen } from './components/LoginScreen';
import { SyncStatus } from './components/SyncStatus';
import { LazyBoundary } from './components/LazyBoundary';
import { useWeightsStore } from './store/weights';
import { useAuthStore } from './lib/auth';
import { supabase } from './lib/supabase';
import { getEnergy } from './utils/energy';

const AnalyticsView = lazy(() => import('./views/AnalyticsView').then(m => ({ default: m.AnalyticsView })));
const ProfileView   = lazy(() => import('./views/ProfileView').then(m => ({ default: m.ProfileView })));

export function App() {
  const [tab, setTab] = useState<TabId>('diary');
  const [weightModalOpen, setWeightModalOpen] = useState(false);
  const weights = useWeightsStore(s => s.weights);
  const latestWeight = weights.length > 0 ? weights[weights.length - 1].kg : null;
  const energy = getEnergy(latestWeight ?? 1.5);

  const session = useAuthStore(s => s.session);
  const authLoading = useAuthStore(s => s.loading);

  // Než víme, jestli je uživatel přihlášen, ukaž spinner — žádné bliknutí aplikace
  if (supabase && authLoading) {
    return (
      <div className="loading-state" style={{ minHeight: '100dvh' }}>
        <div className="spinner" />
      </div>
    );
  }

  // Login screen jen jako nouzový fallback — normálně proběhne auto-login
  // (VITE_APP_EMAIL + VITE_APP_PASSWORD ve Vercelu) a uživatel ho nikdy nevidí
  if (supabase && !session) {
    return <LoginScreen />;
  }

  return (
    <div className="app">
      <BobHeader
        energy={energy}
        latestWeight={latestWeight}
        onAddWeight={() => setWeightModalOpen(true)}
        syncStatus={<SyncStatus />}
      />
      <main className="main-content">
        {tab === 'diary'     && <DiaryView energy={energy} />}
        {tab === 'pouches'   && <PouchesView />}
        {(tab === 'analytics' || tab === 'profile') && (
          <LazyBoundary>
            <Suspense fallback={<div className="loading-state"><div className="spinner" /><p>Načítám…</p></div>}>
              {tab === 'analytics' && <AnalyticsView />}
              {tab === 'profile'   && <ProfileView onAddWeight={() => setWeightModalOpen(true)} />}
            </Suspense>
          </LazyBoundary>
        )}
      </main>
      <BottomNav active={tab} onChange={setTab} />
      {weightModalOpen && <AddWeightModal onClose={() => setWeightModalOpen(false)} />}
    </div>
  );
}
