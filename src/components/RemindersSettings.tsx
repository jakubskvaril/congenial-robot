import { useState, useEffect } from 'react';
import type { FeedingReminder } from '../types';

const STORAGE_KEY = 'bob-reminders';

const DEFAULT_REMINDERS: FeedingReminder[] = [
  { id: 'morning', label: '🌅 Ranní krmení', time: '08:00', enabled: false, days: [1, 2, 3, 4, 5, 6, 0] },
  { id: 'evening', label: '🌙 Večerní krmení', time: '18:00', enabled: false, days: [1, 2, 3, 4, 5, 6, 0] },
  { id: 'felini',  label: '💊 Felini dávka',  time: '12:00', enabled: false, days: [1, 2, 3, 4, 5, 6, 0] },
];

const DAY_LABELS = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];

function loadReminders(): FeedingReminder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as FeedingReminder[];
  } catch {
    // ignore
  }
  return DEFAULT_REMINDERS;
}

function saveReminders(reminders: FeedingReminder[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
  } catch {
    // ignore
  }
}

async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function RemindersSettings() {
  const [reminders, setReminders] = useState<FeedingReminder[]>(loadReminders);
  const [notifStatus, setNotifStatus] = useState<NotificationPermission | 'unsupported'>(
    'Notification' in window ? Notification.permission : 'unsupported'
  );
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    saveReminders(reminders);
  }, [reminders]);

  function updateReminder(id: string, patch: Partial<FeedingReminder>) {
    setReminders(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
  }

  async function toggleReminder(id: string, currentEnabled: boolean) {
    if (!currentEnabled) {
      // Enabling — request permission first
      const granted = await requestNotificationPermission();
      setNotifStatus('Notification' in window ? Notification.permission : 'unsupported');
      if (!granted) return;
    }
    updateReminder(id, { enabled: !currentEnabled });
  }

  function toggleDay(id: string, day: number, days: number[]) {
    const next = days.includes(day) ? days.filter(d => d !== day) : [...days, day];
    updateReminder(id, { days: next });
  }

  function resetToDefaults() {
    setReminders(DEFAULT_REMINDERS);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Notification permission banner */}
      {notifStatus === 'unsupported' && (
        <div className="card" style={{ background: 'var(--surface)', borderLeft: '3px solid var(--muted)' }}>
          <p className="help-text">Váš prohlížeč nepodporuje push notifikace.</p>
        </div>
      )}
      {notifStatus === 'denied' && (
        <div className="card" style={{ background: 'var(--surface)', borderLeft: '3px solid #c0392b' }}>
          <p className="help-text" style={{ color: '#c0392b' }}>
            Notifikace jsou blokovány. Povolte je v nastavení prohlížeče a obnovte stránku.
          </p>
        </div>
      )}
      {notifStatus === 'default' && (
        <div className="card" style={{ background: 'var(--surface)', borderLeft: '3px solid var(--gold)' }}>
          <p className="help-text" style={{ marginBottom: 8 }}>
            Pro aktivaci připomínek je potřeba povolit notifikace v prohlížeči.
          </p>
          <button
            type="button"
            className="btn btn-gold btn-sm"
            onClick={async () => {
              await requestNotificationPermission();
              setNotifStatus('Notification' in window ? Notification.permission : 'unsupported');
            }}
          >
            Povolit notifikace
          </button>
        </div>
      )}

      {/* Reminder rows */}
      <div className="card">
        <div className="section-title" style={{ marginBottom: 12 }}>Připomínky krmení</div>
        {reminders.map(r => (
          <div key={r.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{r.label}</div>
                <div className="help-text">{r.time}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setEditingId(editingId === r.id ? null : r.id)}
                  aria-label="Upravit"
                >
                  ✏️
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${r.enabled ? 'btn-gold' : 'btn-ghost'}`}
                  data-testid={`reminder-${r.id}-toggle`}
                  onClick={() => toggleReminder(r.id, r.enabled)}
                >
                  {r.enabled ? 'Zapnuto' : 'Aktivovat'}
                </button>
              </div>
            </div>

            {editingId === r.id && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.78rem' }}>Čas</label>
                  <input
                    type="time"
                    value={r.time}
                    onChange={e => updateReminder(r.id, { time: e.target.value })}
                    style={{ maxWidth: 120 }}
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.78rem' }}>Dny</label>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {DAY_LABELS.map((label, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className={`btn btn-sm ${r.days.includes(idx) ? 'btn-gold' : 'btn-ghost'}`}
                        style={{ minWidth: 34, padding: '4px 6px', fontSize: '0.72rem' }}
                        onClick={() => toggleDay(r.id, idx, r.days)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        <button
          type="button"
          className="btn btn-ghost btn-sm"
          style={{ marginTop: 4 }}
          onClick={resetToDefaults}
        >
          Obnovit výchozí
        </button>
      </div>

      <p className="help-text" style={{ textAlign: 'center' }}>
        Připomínky fungují pouze pokud máte stránku otevřenou v prohlížeči.
      </p>
    </div>
  );
}
