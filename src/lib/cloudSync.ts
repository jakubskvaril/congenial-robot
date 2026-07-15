/**
 * High-level cloud sync pro všechny Zustand stores.
 *
 * Strategie: last-writer-wins (LWW) per store.
 *   - Každý lokální zápis si poznamená timestamp do bob_sync_meta.
 *   - Na pull: cloud data přepíšou lokální POUZE pokud jsou novější.
 *     Tím se správně propagují i mazání (merge-by-id mazané záznamy křísil).
 *   - Fallback: pokud store ještě nemá lokální timestamp (první sync na
 *     zařízení s existujícími daty), použije se bezpečný merge-by-id,
 *     aby se nikdy neztratila nesynchronizovaná lokální data.
 */
import { useLogsStore } from '../store/logs';
import { usePouchesStore } from '../store/pouches';
import { useWeightsStore } from '../store/weights';
import { useHealthStore } from '../store/health';
import { useCustomMeatsStore } from '../store/customMeats';
import { pushStore, pullStore } from './sync';
import type { LogEntry, Pouch, WeightEntry, HealthRecord, MeatItem } from '../types';

const META_KEY = 'bob_sync_meta';

let _pulling = false; // zabrání zpětné smyčce pull → subscribe → push

// ── Lokální metadata (kdy byl který store naposledy změněn) ─────────────────

function getMeta(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(META_KEY) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

function setMeta(key: string, iso: string) {
  const meta = getMeta();
  meta[key] = iso;
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch { /* ignore */ }
}

function markModified(key: string) {
  setMeta(key, new Date().toISOString());
}

// ── Subscriptions ────────────────────────────────────────────────────────────

export function initStoreSubscriptions() {
  useLogsStore.subscribe(state => {
    if (!_pulling) { markModified('bob_logs'); pushStore('bob_logs', { logs: state.logs }); }
  });
  usePouchesStore.subscribe(state => {
    if (!_pulling) { markModified('bob_pouches'); pushStore('bob_pouches', { pouches: state.pouches }); }
  });
  useWeightsStore.subscribe(state => {
    if (!_pulling) { markModified('bob_weights'); pushStore('bob_weights', { weights: state.weights }); }
  });
  useHealthStore.subscribe(state => {
    if (!_pulling) { markModified('bob_health'); pushStore('bob_health', { records: state.records }); }
  });
  useCustomMeatsStore.subscribe(state => {
    if (!_pulling) { markModified('bob_custom_meats'); pushStore('bob_custom_meats', { meats: state.meats }); }
  });
}

// ── Pull ─────────────────────────────────────────────────────────────────────

function byId<T extends { id: string }>(local: T[], cloud: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of cloud)  map.set(item.id, item);
  for (const item of local)  map.set(item.id, item); // local wins on conflict
  return Array.from(map.values());
}

/**
 * Rozhodne, jak naložit s cloud daty pro daný store:
 * - 'cloud'  → cloud je novější než poslední lokální zápis → přepiš lokální
 * - 'merge'  → lokální timestamp neexistuje (první sync) → bezpečný union
 * - 'local'  → lokální data jsou novější → nech být (push je doručí do cloudu)
 */
function decideStrategy(key: string, cloudUpdatedAt: string): 'cloud' | 'merge' | 'local' {
  const localTs = getMeta()[key];
  if (!localTs) return 'merge';
  return new Date(cloudUpdatedAt).getTime() > new Date(localTs).getTime() ? 'cloud' : 'local';
}

export async function pullAllFromCloud(): Promise<void> {
  _pulling = true;
  try {
    const [cloudLogs, cloudPouches, cloudWeights, cloudHealth, cloudMeats] =
      await Promise.all([
        pullStore<{ logs: Record<string, LogEntry[]> }>('bob_logs'),
        pullStore<{ pouches: Pouch[] }>('bob_pouches'),
        pullStore<{ weights: WeightEntry[] }>('bob_weights'),
        pullStore<{ records: HealthRecord[] }>('bob_health'),
        pullStore<{ meats: MeatItem[] }>('bob_custom_meats'),
      ]);

    // Logy
    if (cloudLogs?.data.logs) {
      const strategy = decideStrategy('bob_logs', cloudLogs.updated_at);
      if (strategy === 'cloud') {
        useLogsStore.setState({ logs: cloudLogs.data.logs });
        setMeta('bob_logs', cloudLogs.updated_at);
      } else if (strategy === 'merge') {
        const local = useLogsStore.getState().logs;
        const merged: Record<string, LogEntry[]> = { ...cloudLogs.data.logs };
        for (const [date, entries] of Object.entries(local)) {
          merged[date] = byId(entries, cloudLogs.data.logs[date] ?? []);
        }
        useLogsStore.setState({ logs: merged });
        setMeta('bob_logs', cloudLogs.updated_at);
      }
    }

    // Kapsičky
    if (cloudPouches?.data.pouches) {
      const strategy = decideStrategy('bob_pouches', cloudPouches.updated_at);
      if (strategy === 'cloud') {
        usePouchesStore.setState({ pouches: cloudPouches.data.pouches });
        setMeta('bob_pouches', cloudPouches.updated_at);
      } else if (strategy === 'merge') {
        const local = usePouchesStore.getState().pouches;
        usePouchesStore.setState({ pouches: byId(local, cloudPouches.data.pouches) });
        setMeta('bob_pouches', cloudPouches.updated_at);
      }
    }

    // Váhy
    if (cloudWeights?.data.weights) {
      const strategy = decideStrategy('bob_weights', cloudWeights.updated_at);
      if (strategy === 'cloud') {
        useWeightsStore.setState({
          weights: [...cloudWeights.data.weights].sort((a, b) => a.date.localeCompare(b.date)),
        });
        setMeta('bob_weights', cloudWeights.updated_at);
      } else if (strategy === 'merge') {
        const local = useWeightsStore.getState().weights;
        useWeightsStore.setState({
          weights: byId(local, cloudWeights.data.weights)
            .sort((a, b) => a.date.localeCompare(b.date)),
        });
        setMeta('bob_weights', cloudWeights.updated_at);
      }
    }

    // Zdravotní záznamy
    if (cloudHealth?.data.records) {
      const strategy = decideStrategy('bob_health', cloudHealth.updated_at);
      if (strategy === 'cloud') {
        useHealthStore.setState({
          records: [...cloudHealth.data.records].sort((a, b) => b.date.localeCompare(a.date)),
        });
        setMeta('bob_health', cloudHealth.updated_at);
      } else if (strategy === 'merge') {
        const local = useHealthStore.getState().records;
        useHealthStore.setState({
          records: byId(local, cloudHealth.data.records)
            .sort((a, b) => b.date.localeCompare(a.date)),
        });
        setMeta('bob_health', cloudHealth.updated_at);
      }
    }

    // Vlastní masa
    if (cloudMeats?.data.meats) {
      const strategy = decideStrategy('bob_custom_meats', cloudMeats.updated_at);
      if (strategy === 'cloud') {
        useCustomMeatsStore.setState({ meats: cloudMeats.data.meats });
        setMeta('bob_custom_meats', cloudMeats.updated_at);
      } else if (strategy === 'merge') {
        const local = useCustomMeatsStore.getState().meats;
        useCustomMeatsStore.setState({ meats: byId(local, cloudMeats.data.meats) });
        setMeta('bob_custom_meats', cloudMeats.updated_at);
      }
    }
  } finally {
    _pulling = false;
  }
}
