import { useState } from 'react';
import { signInWithEmail, verifyEmailOtp } from '../lib/auth';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmail(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba přihlášení');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setVerifying(true);
    setError('');
    try {
      await verifyEmailOtp(email.trim(), code);
      // Přihlášení proběhlo — onAuthStateChange přepne aplikaci automaticky
    } catch {
      setError('Neplatný nebo expirovaný kód. Zkuste to znovu.');
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="view" style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: 24, gap: 24,
    }}>
      <img src="/favicon.svg" alt="Bob" style={{ width: 80, height: 80, borderRadius: 20 }} />
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.4rem', letterSpacing: '-0.02em', marginBottom: 6 }}>
          Bobův gurmánský deníček
        </h1>
        <p className="help-text">Přihlaste se pro synchronizaci dat napříč zařízeními</p>
      </div>

      {sent ? (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '20px 24px', textAlign: 'center', maxWidth: 340, width: '100%',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: 12 }}>📧</div>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>Zkontrolujte email</p>
          <p className="help-text">
            Poslali jsme zprávu na <strong>{email}</strong>.<br />
            Klikněte na odkaz, nebo opište kód níže.
          </p>

          {/* Kód z emailu — jediná spolehlivá cesta v nainstalované iOS aplikaci */}
          <form onSubmit={handleVerifyCode} style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <input
              type="text" inputMode="numeric" autoComplete="one-time-code"
              value={code} onChange={e => setCode(e.target.value)}
              placeholder="6místný kód"
              maxLength={6}
              style={{
                flex: 1, border: '1px solid var(--border)', borderRadius: 8,
                padding: '10px 12px', fontFamily: 'inherit', fontSize: '1rem',
                textAlign: 'center', letterSpacing: '0.2em', fontWeight: 700,
              }}
              disabled={verifying}
            />
            <button type="submit" className="btn btn-gold"
              disabled={verifying || code.trim().length < 6}>
              {verifying ? '…' : 'Ověřit'}
            </button>
          </form>

          {error && <p className="error-text" style={{ marginTop: 10 }}>{error}</p>}

          <button
            type="button" className="btn btn-ghost btn-sm"
            style={{ marginTop: 16 }}
            onClick={() => { setSent(false); setCode(''); setError(''); }}
          >
            Zadat jiný email
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 340 }}>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label>Emailová adresa</label>
            <input
              type="email" value={email} required
              onChange={e => setEmail(e.target.value)}
              placeholder="vas@email.cz"
              disabled={loading}
            />
          </div>
          {error && <p className="error-text" style={{ marginBottom: 8 }}>{error}</p>}
          <button
            type="submit" className="btn btn-gold"
            style={{ width: '100%' }}
            disabled={loading || !email.trim()}
          >
            {loading ? 'Odesílám…' : 'Poslat přihlašovací odkaz'}
          </button>
          <p className="help-text" style={{ textAlign: 'center', marginTop: 12 }}>
            Bez hesla. Odkaz i kód přijdou emailem.
          </p>
        </form>
      )}
    </div>
  );
}
