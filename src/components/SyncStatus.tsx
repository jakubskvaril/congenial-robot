import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/auth';

export function SyncStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  const session = useAuthStore(s => s.session);

  useEffect(() => {
    const on  = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online',  on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  if (!supabase) return null; // Supabase není nakonfigurován — skryjeme

  if (!online) return (
    <span title="Offline — data se uloží lokálně" style={{ fontSize: '0.7rem', color: 'var(--muted)', padding: '2px 6px', borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)' }}>
      ⚠️ offline
    </span>
  );

  if (!session) return (
    <span title="Nepřihlášen" style={{ fontSize: '0.7rem', color: 'var(--muted)', padding: '2px 6px', borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)' }}>
      ☁️ nepřihlášen
    </span>
  );

  return (
    <span title="Synchronizace aktivní" style={{ fontSize: '0.7rem', color: '#4caf50', padding: '2px 6px', borderRadius: 10, background: 'var(--surface)', border: '1px solid #4caf5044' }}>
      ☁️ sync
    </span>
  );
}
