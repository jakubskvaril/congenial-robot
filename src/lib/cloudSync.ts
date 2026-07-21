/**
 * High-level cloud sync pro všechny Zustand stores.
 *
 * Zásady (v tomto pořadí priorit):
 *  1. Nikdy neztratit historii v cloudu — zápisy do cloudu jsou blokované,
 *     dokud pro daný store neproběhne první úspěšný pull (push gate).
 *  2. Mazání se propaguje — last-writer-wins (LWW) přes serverové timestampy.
 *  3. Při jakékoli nejistotě (první sync zařízení, změna účtu, zápis před
 *     pullem) se použije bezpečný merge-by-id — nikdy se nic nezahodí.
 *
 * Meta (bob_sync_meta:<userId>) je per-user: změna účtu → žádné lokální
 * timestampy → merge → historie obou stran se spojí, nic se nepřepíše.
 */
import { useLogsStore } from '../store/logs';
import { usePouchesStore } from '../store/pouches';
import { useWeightsStore } from '../store/weights';
import { useHealthStore } from '../store/health';
import { useCustomMeatsStore } from '../store/customMeats';
import { useAuthStore } from './auth';
import {
  pushStore, pullStore, flushPending, allowPush, resetPushGate,
  setPullBeforeFlush, setOnStamped,
} from './sync';
import type { LogEntry, Pouch, WeightEntry, HealthRecord, MeatItem } from '../types';

let _pulling = false;              // zabrání smyčce pull → subscribe → push
let _ready = false;                // true po prvním úspěšném pullu (pro aktuálního uživatele)
const _dirtyBeforeReady = new Set<string>(); // klíče zapsané před prvním pullem
let _retryTimer: ReturnType<typeof setTimeout> | null = null;
let _retryDelay = 2000;

// ── Per-user metadata (poslední známý serverový timestamp per store) ─────────

function metaKey(): string | null {
  const uid = useAuthStore.getState().effectiveUserId;
  return uid ? `bob_sync_meta:${uid}` : null;
}

function getMeta(): Record<string, string> {
  const k = metaKey();
  if (!k) return {};
  try {
    return JSON.parse(localStorage.getItem(k) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

function setMeta(key: string, iso: string) {
  const k = metaKey();
  if (!k) return;
  const meta = getMeta();
  meta[key] = iso;
  try { localStorage.setItem(k, JSON.stringify(meta)); } catch { /* ignore */ }
}

// ── Registr stores ───────────────────────────────────────────────────────────

interface StoreSpec {
  key: string;
  snapshot: () => unknown;
  /** Cloud přepíše lokální stav (LWW: cloud vyhrál). */
  applyCloud: (data: unknown) => void;
  /** Bezpečný union cloud+local (první sync / zápis před pullem). */
  mergeCloud: (data: unknown) => void;
}

function byId<T extends { id: string }>(local: T[], cloud: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of cloud)  map.set(item.id, item);
  for (const item of local)  map.set(item.id, item); // local wins on conflict
  return Array.from(map.values());
}

const POUCH_SEED_IDS = new Set(['leonardo-kitten']);

const STORES: StoreSpec[] = [
  {
    key: 'bob_logs',
    snapshot: () => ({ logs: useLogsStore.getState().logs }),
    applyCloud: (d) => useLogsStore.setState({ logs: (d as { logs: Record<string, LogEntry[]> }).logs }),
    mergeCloud: (d) => {
      const cloud = (d as { logs: Record<string, LogEntry[]> }).logs;
      const local = useLogsStore.getState().logs;
      const merged: Record<string, LogEntry[]> = { ...cloud };
      for (const [date, entries] of Object.entries(local)) {
        merged[date] = byId(entries, cloud[date] ?? []);
      }
      useLogsStore.setState({ logs: merged });
    },
  },
  {
    key: 'bob_pouches',
    snapshot: () => ({ pouches: usePouchesStore.getState().pouches }),
    applyCloud: (d) => usePouchesStore.setState({ pouches: (d as { pouches: Pouch[] }).pouches }),
    mergeCloud: (d) => {
      const cloud = (d as { pouches: Pouch[] }).pouches;
      // Seed kapsička se nesmí „vzkřísit" na novém zařízení: pokud cloud řádek
      // existuje a seed neobsahuje, uživatel ji smazal → vyhoď ji i z lokálu
      const cloudIds = new Set(cloud.map(p => p.id));
      const local = usePouchesStore.getState().pouches
        .filter(p => !POUCH_SEED_IDS.has(p.id) || cloudIds.has(p.id));
      usePouchesStore.setState({ pouches: byId(local, cloud) });
    },
  },
  {
    key: 'bob_weights',
    snapshot: () => ({ weights: useWeightsStore.getState().weights }),
    applyCloud: (d) => useWeightsStore.setState({
      weights: [...(d as { weights: WeightEntry[] }).weights].sort((a, b) => a.date.localeCompare(b.date)),
    }),
    mergeCloud: (d) => {
      const cloud = (d as { weights: WeightEntry[] }).weights;
      const local = useWeightsStore.getState().weights;
      useWeightsStore.setState({
        weights: byId(local, cloud).sort((a, b) => a.date.localeCompare(b.date)),
      });
    },
  },
  {
    key: 'bob_health',
    snapshot: () => ({ records: useHealthStore.getState().records }),
    applyCloud: (d) => useHealthStore.setState({
      records: [...(d as { records: HealthRecord[] }).records].sort((a, b) => b.date.localeCompare(a.date)),
    }),
    mergeCloud: (d) => {
      const cloud = (d as { records: HealthRecord[] }).records;
      const local = useHealthStore.getState().records;
      useHealthStore.setState({
        records: byId(local, cloud).sort((a, b) => b.date.localeCompare(a.date)),
      });
    },
  },
  {
    key: 'bob_custom_meats',
    snapshot: () => ({ meats: useCustomMeatsStore.getState().meats }),
    applyCloud: (d) => useCustomMeatsStore.setState({ meats: (d as { meats: MeatItem[] }).meats }),
    mergeCloud: (d) => {
      const cloud = (d as { meats: MeatItem[] }).meats;
      const local = useCustomMeatsStore.getState().meats;
      useCustomMeatsStore.setState({ meats: byId(local, cloud) });
    },
  },
];

// ── Subscriptions ────────────────────────────────────────────────────────────

function onLocalChange(spec: StoreSpec) {
  if (_pulling) return;
  if (!_ready) {
    // Zápis před prvním pullem: neoznačuj meta (vynutí merge při pullu)
    // a nepushuj — push gate stejně blokuje, klíč si zapamatuj
    _dirtyBeforeReady.add(spec.key);
    return;
  }
  setMeta(spec.key, new Date().toISOString());
  pushStore(spec.key, spec.snapshot);
}

export function initStoreSubscriptions() {
  useLogsStore.subscribe(() => onLocalChange(STORES[0]));
  usePouchesStore.subscribe(() => onLocalChange(STORES[1]));
  useWeightsStore.subscribe(() => onLocalChange(STORES[2]));
  useHealthStore.subscribe(() => onLocalChange(STORES[3]));
  useCustomMeatsStore.subscribe(() => onLocalChange(STORES[4]));

  // Po flushi si zapiš serverové timestampy (jednotné hodiny pro LWW)
  setOnStamped((stamped) => {
    for (const [key, ts] of Object.entries(stamped)) setMeta(key, ts);
  });
  // Po reconnectu nejdřív pull, pak flush (starý offline snapshot nesmí přepsat novější cloud)
  setPullBeforeFlush(() => pullAllFromCloud());
}

/** Volej při změně effectiveUserId PŘED pullem — zavře push gate pro nový účet. */
export function resetSyncForUserChange() {
  _ready = false;
  _dirtyBeforeReady.clear();
  _retryDelay = 2000;
  if (_retryTimer) { clearTimeout(_retryTimer); _retryTimer = null; }
  resetPushGate();
}

// ── Pull ─────────────────────────────────────────────────────────────────────

/**
 * - 'cloud'       → cloud je novější → přepiš lokální stav
 * - 'merge'       → chybí lokální timestamp / zápis před pullem → bezpečný union
 * - 'local-newer' → lokální data novější → doruč do cloudu
 * - 'in-sync'     → shodné → nic
 */
function decideStrategy(key: string, cloudUpdatedAt: string): 'cloud' | 'merge' | 'local-newer' | 'in-sync' {
  if (_dirtyBeforeReady.has(key)) return 'merge';
  const localTs = getMeta()[key];
  if (!localTs) return 'merge';
  const cloudMs = new Date(cloudUpdatedAt).getTime();
  const localMs = new Date(localTs).getTime();
  if (cloudMs > localMs) return 'cloud';
  if (localMs > cloudMs) return 'local-newer';
  return 'in-sync';
}

export async function pullAllFromCloud(): Promise<void> {
  if (useAuthStore.getState().effectiveUserId === null) return;
  _pulling = true;
  let allOk = true;
  const toPush: StoreSpec[] = [];

  try {
    const results = await Promise.all(STORES.map(s => pullStore(s.key)));

    for (let i = 0; i < STORES.length; i++) {
      const spec = STORES[i];
      const res = results[i];

      if (!res.ok) {
        // Síťová/RLS chyba — NEotvírej push gate pro tento klíč (ochrana historie)
        allOk = false;
        continue;
      }

      if (res.row === null) {
        // Řádek v cloudu neexistuje (nový účet) — zápisy jsou bezpečné
        allowPush(spec.key);
        if (_dirtyBeforeReady.has(spec.key)) {
          _dirtyBeforeReady.delete(spec.key);
          toPush.push(spec); // zápis z doby před pullem doruč hned
        }
        continue;
      }

      const strategy = decideStrategy(spec.key, res.row.updated_at);
      if (strategy === 'cloud') {
        spec.applyCloud(res.row.data);
        setMeta(spec.key, res.row.updated_at);
      } else if (strategy === 'merge') {
        spec.mergeCloud(res.row.data);
        setMeta(spec.key, res.row.updated_at);
        toPush.push(spec); // merged výsledek doruč zpět do cloudu
      } else if (strategy === 'local-newer') {
        toPush.push(spec); // cloud je pozadu — doruč lokální stav
      }
      // 'in-sync' → nic

      allowPush(spec.key);
      _dirtyBeforeReady.delete(spec.key);
    }
  } finally {
    _pulling = false;
  }

  if (allOk) {
    _ready = true;
    _retryDelay = 2000;
  } else {
    // Částečný neúspěch → zkus znovu s backoffem (gate u neúspěšných klíčů drží)
    if (_retryTimer) clearTimeout(_retryTimer);
    _retryTimer = setTimeout(() => { void pullAllFromCloud(); }, _retryDelay);
    _retryDelay = Math.min(_retryDelay * 2, 60_000);
  }

  // Merged/local-newer stavy doruč do cloudu (mimo _pulling, gate už je otevřený)
  for (const spec of toPush) {
    pushStore(spec.key, spec.snapshot);
  }
  if (toPush.length > 0) await flushPending();
}
