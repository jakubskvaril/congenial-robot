import { useRef, useState } from 'react';
import { exportBackup, parseBackup, importBackup, type BackupFile } from '../lib/backup';

export function DataBackup() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [pending, setPending] = useState<BackupFile | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleExport() {
    setErr(''); setMsg(''); setBusy(true);
    try {
      const how = await exportBackup();
      setMsg(how === 'shared' ? 'Záloha odeslána.' : 'Záloha stažena.');
    } catch {
      setErr('Zálohu se nepodařilo vytvořit.');
    } finally {
      setBusy(false);
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setErr(''); setMsg('');
    const file = e.target.files?.[0];
    e.target.value = ''; // ať jde vybrat týž soubor znovu
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        setPending(parseBackup(String(reader.result)));
      } catch (x) {
        setErr(x instanceof Error ? x.message : 'Soubor nelze načíst.');
      }
    };
    reader.onerror = () => setErr('Soubor nelze načíst.');
    reader.readAsText(file);
  }

  function apply(mode: 'merge' | 'replace') {
    if (!pending) return;
    const r = importBackup(pending, mode);
    setPending(null);
    setMsg(mode === 'merge'
      ? `Přidáno ${r.addedEntries} záznamů (${r.addedDays} nových dní).`
      : 'Data nahrazena ze zálohy.');
  }

  const days = pending ? Object.keys(pending.logs ?? {}).length : 0;

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <div className="section-title">💾 Záloha dat</div>
        <p className="help-text" style={{ marginTop: 4 }}>
          Data máš v cloudu, ale vlastní kopie se hodí — hlavně před přeinstalací.
        </p>
      </div>

      {!pending ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn-ghost btn-sm" style={{ flex: 1 }}
            onClick={handleExport} disabled={busy}>
            ⬇ Uložit zálohu
          </button>
          <button type="button" className="btn btn-ghost btn-sm" style={{ flex: 1 }}
            onClick={() => fileRef.current?.click()}>
            ⬆ Obnovit ze zálohy
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json"
            onChange={handleFile} style={{ display: 'none' }} />
        </div>
      ) : (
        <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 14px' }}>
          <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>
            Záloha z {new Date(pending.exportedAt).toLocaleDateString('cs-CZ')}
          </p>
          <p className="help-text" style={{ marginBottom: 10 }}>
            {days} dní deníku · {pending.weights?.length ?? 0} vážení · {pending.health?.length ?? 0} zdravotních záznamů
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-gold btn-sm" style={{ flex: 1 }}
              onClick={() => apply('merge')}>
              Přidat chybějící
            </button>
            <button type="button" className="btn btn-danger btn-sm" style={{ flex: 1 }}
              onClick={() => apply('replace')}>
              Nahradit vše
            </button>
            <button type="button" className="btn btn-ghost btn-sm"
              onClick={() => setPending(null)}>
              Zrušit
            </button>
          </div>
          <p className="help-text" style={{ marginTop: 8 }}>
            „Přidat chybějící" nic nesmaže — jen doplní záznamy, které tu nejsou.
          </p>
        </div>
      )}

      {msg && <p className="help-text" style={{ color: 'var(--green)' }}>{msg}</p>}
      {err && <p className="error-text">{err}</p>}
    </div>
  );
}
