import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { applyTheme } from './theme';
import { App } from './App';
import { initAuth, useAuthStore } from './lib/auth';
import { initStoreSubscriptions, pullAllFromCloud, resetSyncForUserChange } from './lib/cloudSync';
import { startReminderScheduler } from './lib/reminderScheduler';

// Stáhni cloud data vždy, když se vyřeší (nebo změní) efektivní uživatel —
// pokrývá start aplikace i auto-login. Před pullem se zavře push gate,
// aby lokální stav nemohl přepsat historii nového účtu.
let _lastPulledUserId: string | null = null;
useAuthStore.subscribe((state) => {
  if (state.effectiveUserId && state.effectiveUserId !== _lastPulledUserId) {
    _lastPulledUserId = state.effectiveUserId;
    resetSyncForUserChange();
    void pullAllFromCloud();
  }
});

applyTheme();
initAuth();
initStoreSubscriptions();
startReminderScheduler();

// Když nový service worker převezme kontrolu (vyšla nová verze), obnov stránku —
// starý index.html by odkazoval na už smazané chunky (bílá obrazovka v Profilu).
// hadController rozliší první instalaci (clientsClaim) od skutečného updatu.
if ('serviceWorker' in navigator) {
  let hadController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) { hadController = true; return; }
    window.location.reload();
  });
}

// Vite vyhazuje tenhle event přesně při selhání dynamického importu —
// nezávisle na znění chybové hlášky prohlížeče (Safari hlásí jinak než Chrome)
window.addEventListener('vite:preloadError', () => {
  if (!sessionStorage.getItem('bob_chunk_reload')) {
    sessionStorage.setItem('bob_chunk_reload', '1');
    window.location.reload();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
