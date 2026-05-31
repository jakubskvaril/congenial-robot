import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { initAuth } from './lib/auth';
import { initStoreSubscriptions, pullAllFromCloud } from './lib/cloudSync';

// Inicializuj sync před prvním renderem
initAuth().then(() => pullAllFromCloud());
initStoreSubscriptions();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
