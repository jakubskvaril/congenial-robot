import { supabase } from './supabase';
import { useAuthStore } from './auth';

let _pendingSync: Record<string, unknown> = {};
let _syncTimer: ReturnType<typeof setTimeout> | null = null;
let _online = navigator.onLine;

window.addEventListener('online',  () => { _online = true;  flushPending(); });
window.addEventListener('offline', () => { _online = false; });

function getEffectiveUserId(): string | null {
  return useAuthStore.getState().effectiveUserId;
}

export interface CloudRow<T> {
  data: T;
  updated_at: string;
}

/** Načte jeden store ze Supabase včetně updated_at (pro last-writer-wins). */
export async function pullStore<T>(key: string): Promise<CloudRow<T> | null> {
  if (!supabase || !_online) return null;
  const userId = getEffectiveUserId();
  if (!userId) return null;
  try {
    const { data, error } = await supabase
      .from('bob_store')
      .select('data, updated_at')
      .eq('key', key)
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data) return null;
    return { data: data.data as T, updated_at: data.updated_at as string };
  } catch {
    return null;
  }
}

export function pushStore(key: string, value: unknown): void {
  _pendingSync[key] = value;
  if (!_online) return;
  if (_syncTimer) clearTimeout(_syncTimer);
  _syncTimer = setTimeout(flushPending, 800);
}

async function flushPending() {
  if (!supabase || !_online) return;
  const userId = getEffectiveUserId();
  if (!userId) return;

  const entries = Object.entries(_pendingSync);
  if (entries.length === 0) return;
  _pendingSync = {};

  for (const [key, data] of entries) {
    try {
      await supabase.from('bob_store').upsert({
        key,
        user_id: userId,
        data,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key,user_id' });
    } catch { /* data jsou v localStorage, zkusíme příště */ }
  }
}
