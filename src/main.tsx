import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { initAuth, useAuthStore } from './lib/auth';
import { initStoreSubscriptions, pullAllFromCloud } from './lib/cloudSync';
import { startReminderScheduler } from './lib/reminderScheduler';

// Stáhni cloud data vždy, když se vyřeší (nebo změní) efektivní uživatel —
// pokrývá start aplikace i čerstvé přihlášení přes magic link
let _lastPulledUserId: string | null = null;
useAuthStore.subscribe((state) => {
  if (state.effectiveUserId && state.effectiveUserId !== _lastPulledUserId) {
    _lastPulledUserId = state.effectiveUserId;
    pullAllFromCloud();
  }
});

initAuth();
initStoreSubscriptions();
startReminderScheduler();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
