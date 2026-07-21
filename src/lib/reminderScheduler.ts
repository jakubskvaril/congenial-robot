import type { FeedingReminder } from '../types';

const REMINDERS_KEY = 'bob-reminders';
const FIRED_KEY = 'bob-reminders-fired';
const GRACE_MINUTES = 180; // dožeň zmeškanou připomínku max. 3 h po termínu

function loadReminders(): FeedingReminder[] {
  try {
    const raw = localStorage.getItem(REMINDERS_KEY);
    return raw ? (JSON.parse(raw) as FeedingReminder[]) : [];
  } catch {
    return [];
  }
}

function loadFired(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(FIRED_KEY) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function minutesOfDay(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function fallbackNotification(options: NotificationOptions) {
  try { new Notification('Bobův deníček', options); } catch { /* nepodporováno */ }
}

function showNotification(r: FeedingReminder) {
  const options: NotificationOptions = {
    body: r.label.replace(/^\S+\s/, ''), // odstraň emoji prefix
    icon: '/icon-192.png',
    tag: `bob-reminder-${r.id}`,
  };
  // Android Chrome a PWA: new Notification() vyhodí "Illegal constructor" —
  // notifikace musí jít přes service worker. Pozor: serviceWorker.ready nikdy
  // nerejectne — bez timeoutu by chain v dev módu (bez SW) visel navždy.
  if ('serviceWorker' in navigator) {
    const timeout = new Promise<null>(resolve => setTimeout(() => resolve(null), 3000));
    Promise.race([navigator.serviceWorker.ready, timeout])
      .then(reg => {
        if (reg) return reg.showNotification('Bobův deníček', options);
        fallbackNotification(options);
      })
      .catch(() => fallbackNotification(options));
  } else {
    fallbackNotification(options);
  }
}

function checkAndFire() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const today = localToday();
  const fired = loadFired();
  let changed = false;

  for (const r of loadReminders()) {
    if (!r.enabled) continue;
    if (!r.days.includes(now.getDay())) continue;
    if (fired[r.id] === today) continue; // už dnes odesláno

    // Interval throttling (zavřená appka, spořič) může přesný čas přeskočit —
    // odpal kdykoli v okně [čas, čas + grace]
    const due = minutesOfDay(r.time);
    if (nowMin < due || nowMin > due + GRACE_MINUTES) continue;

    showNotification(r);
    fired[r.id] = today;
    changed = true;
  }

  if (changed) {
    try { localStorage.setItem(FIRED_KEY, JSON.stringify(fired)); } catch { /* ignore */ }
  }
}

let _started = false;

/** Spustí minutovou kontrolu připomínek. Idempotentní. */
export function startReminderScheduler() {
  if (_started) return;
  _started = true;
  checkAndFire();
  setInterval(checkAndFire, 30_000);
}
