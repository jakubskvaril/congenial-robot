import { useState } from 'react';
import { signInWithEmail } from '../lib/auth';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
          borderRadius: 12, padding: '20px 24px', textAlign: 'center', maxWidth: 340,
        }}>
          <div style={{ fontSize: '2rem', marginBottom: 12 }}>📧</div>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>Zkontrolujte email</p>
          <p className="help-text">
            Poslali jsme odkaz na <strong>{email}</strong>.<br />
            Klikněte na něj — přihlásí vás automaticky.
          </p>
          <button
            type="button" className="btn btn-ghost btn-sm"
            style={{ marginTop: 16 }}
            onClick={() => setSent(false)}
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
            Bez hesla. Odkaz přijde emailem a přihlásí vás.
          </p>
        </form>
      )}
    </div>
  );
}
