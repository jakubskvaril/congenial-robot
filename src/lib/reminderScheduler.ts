import type { FeedingReminder } from '../types';

const REMINDERS_KEY = 'bob-reminders';
const FIRED_KEY = 'bob-reminders-fired';

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

function checkAndFire() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const today = localToday();
  const fired = loadFired();

  for (const r of loadReminders()) {
    if (!r.enabled) continue;
    if (!r.days.includes(now.getDay())) continue;
    if (r.time !== hhmm) continue;
    if (fired[r.id] === today) continue; // už dnes odesláno

    new Notification('Bobův deníček', {
      body: r.label.replace(/^\S+\s/, ''), // odstraň emoji prefix
      icon: '/icon-192.png',
      tag: `bob-reminder-${r.id}`,
    });
    fired[r.id] = today;
  }

  try {
    localStorage.setItem(FIRED_KEY, JSON.stringify(fired));
  } catch { /* ignore */ }
}

/** Spustí minutovou kontrolu připomínek. Zavolej jednou při startu aplikace. */
export function startReminderScheduler() {
  checkAndFire();
  setInterval(checkAndFire, 30_000);
}
