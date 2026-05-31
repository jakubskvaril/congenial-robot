import { supabase } from './supabase';

let _pendingSync: Record<string, unknown> = {};
let _syncTimer: ReturnType<typeof setTimeout> | null = null;
let _online = navigator.onLine;

window.addEventListener('online',  () => { _online = true;  flushPending(); });
window.addEventListener('offline', () => { _online = false; });

async function getUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user.id ?? null;
}

/** Načte jeden store ze Supabase. Vrátí null pokud offline nebo SB nenastaveno. */
export async function pullStore<T>(key: string): Promise<T | null> {
  if (!supabase || !_online) return null;
  const userId = await getUserId();
  if (!userId) return null;
  try {
    const { data, error } = await supabase
      .from('bob_store')
      .select('data')
      .eq('key', key)
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data) return null;
    return data.data as T;
  } catch {
    return null;
  }
}

/** Zapíše store do Supabase (debounced 800ms, buffered pokud offline). */
export function pushStore(key: string, value: unknown): void {
  _pendingSync[key] = value;
  if (!_online) return;
  if (_syncTimer) clearTimeout(_syncTimer);
  _syncTimer = setTimeout(flushPending, 800);
}

async function flushPending() {
  if (!supabase || !_online) return;
  const userId = await getUserId();
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
