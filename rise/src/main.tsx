import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const korenovy = document.getElementById('root');
if (!korenovy) throw new Error('Chybí #root');

createRoot(korenovy).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
