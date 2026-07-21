import { supabase } from './supabase';
import { useAuthStore } from './auth';

// Dirty-key fronta: drží KLÍČE, ne snapshoty — flush vždy serializuje
// AKTUÁLNÍ stav store (zastaralý snapshot by přepsal čerstvě stažená data).
const _dirtyKeys = new Set<string>();
const _getters: Record<string, () => unknown> = {};

// Push gate: dokud pro daný klíč neproběhl první úspěšný pull (pro aktuálního
// uživatele), zápisy do cloudu čekají — jinak by prázdné zařízení přepsalo historii.
const _pushAllowed = new Set<string>();

let _syncTimer: ReturnType<typeof setTimeout> | null = null;
let _online = navigator.onLine;
let _flushing = false;

// Registrováno z cloudSync (cyklický import) — po reconnectu nejdřív pull, pak flush
let _pullBeforeFlush: (() => Promise<void>) | null = null;
export function setPullBeforeFlush(fn: () => Promise<void>): void {
  _pullBeforeFlush = fn;
}

// Registrováno z cloudSync — po flushi si zapíše serverové timestampy do meta
let _onStamped: ((stamped: Record<string, string>) => void) | null = null;
export function setOnStamped(fn: (stamped: Record<string, string>) => void): void {
  _onStamped = fn;
}

window.addEventListener('online', () => {
  _online = true;
  void (async () => {
    try { await _pullBeforeFlush?.(); } catch { /* pull nesmí blokovat flush */ }
    await flushPending();
  })();
});
window.addEventListener('offline', () => { _online = false; });

function getEffectiveUserId(): string | null {
  return useAuthStore.getState().effectiveUserId;
}

export interface CloudRow<T> {
  data: T;
  updated_at: string;
}

/** Rozlišuje "řádek neexistuje" (ok, nový účet) od "pull selhal" (síť/RLS). */
export type PullResult<T> =
  | { ok: true; row: CloudRow<T> | null }
  | { ok: false };

export async function pullStore<T>(key: string): Promise<PullResult<T>> {
  if (!supabase || !_online) return { ok: false };
  const userId = getEffectiveUserId();
  if (!userId) return { ok: false };
  try {
    const { data, error } = await supabase
      .from('bob_store')
      .select('data, updated_at')
      .eq('key', key)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) return { ok: false };
    if (!data) return { ok: true, row: null };
    return { ok: true, row: { data: data.data as T, updated_at: data.updated_at as string } };
  } catch {
    return { ok: false };
  }
}

/** Povolí zápisy do cloudu pro klíč (volá cloudSync po úspěšném pullu). */
export function allowPush(key: string): void {
  _pushAllowed.add(key);
}

/** Zruší push gate + frontu při změně uživatele. */
export function resetPushGate(): void {
  _pushAllowed.clear();
  _dirtyKeys.clear();
  if (_syncTimer) { clearTimeout(_syncTimer); _syncTimer = null; }
}

/** Naplánuje zápis store do cloudu. getValue se čte až při flushi (aktuální stav). */
export function pushStore(key: string, getValue: () => unknown): void {
  _getters[key] = getValue;
  _dirtyKeys.add(key);
  if (!_online) return;
  if (_syncTimer) clearTimeout(_syncTimer);
  _syncTimer = setTimeout(() => { void flushPending(); }, 800);
}

/**
 * Odešle dirty stores do Supabase. updated_at NEPOSÍLÁME — razítko dává
 * Postgres trigger (jednotné hodiny, žádný clock skew mezi zařízeními).
 * Vrací mapu klíč → serverové updated_at úspěšně zapsaných stores.
 */
export async function flushPending(): Promise<Record<string, string>> {
  const stamped: Record<string, string> = {};
  if (!supabase || !_online || _flushing) return stamped;
  const userId = getEffectiveUserId();
  if (!userId) return stamped;

  _flushing = true;
  try {
    const keys = [..._dirtyKeys].filter(k => _pushAllowed.has(k));
    for (const key of keys) {
      const getValue = _getters[key];
      if (!getValue) { _dirtyKeys.delete(key); continue; }
      try {
        const { data: row, error } = await supabase
          .from('bob_store')
          .upsert(
            { key, user_id: userId, data: getValue() },
            { onConflict: 'key,user_id' }
          )
          .select('updated_at')
          .single();
        if (error) continue; // klíč zůstává dirty, zkusíme příště
        _dirtyKeys.delete(key);
        if (row?.updated_at) stamped[key] = row.updated_at as string;
      } catch { /* klíč zůstává dirty */ }
    }
  } finally {
    _flushing = false;
  }
  if (Object.keys(stamped).length > 0) _onStamped?.(stamped);
  return stamped;
}
