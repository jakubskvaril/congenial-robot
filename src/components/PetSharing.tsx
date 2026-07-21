import { useState, useEffect } from 'react';
import { useAuthStore, invitePetMember, revokeInvite, getMyInvites, signOut, hasAutoLogin } from '../lib/auth';
import { supabase } from '../lib/supabase';

interface Invite {
  id: string;
  invited_email: string;
  delegate_id: string | null;
  accepted_at: string | null;
  created_at: string;
}

export function PetSharing() {
  const session = useAuthStore(s => s.session);
  const isDelegate = useAuthStore(s => s.isDelegate);
  const effectiveUserId = useAuthStore(s => s.effectiveUserId);

  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isDelegate) loadInvites();
  }, [isDelegate]);

  async function loadInvites() {
    const data = await getMyInvites();
    setInvites(data as Invite[]);
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInviteLink('');
    try {
      const inviteId = await invitePetMember(email);
      const link = `${window.location.origin}?invite=${inviteId}`;
      setInviteLink(link);
      setEmail('');
      loadInvites();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba');
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke(id: string) {
    await revokeInvite(id);
    loadInvites();
  }

  if (!supabase) return null;

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="section-title">☁️ Účet a sdílení</div>

      {/* Info o přihlášeném uživateli */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg)', borderRadius: 8 }}>
        <div>
          <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{session?.user.email}</div>
          {isDelegate && (
            <div style={{ fontSize: '0.72rem', color: 'var(--gold)' }}>
              Přistupuješ k cizímu profilu mazlíčka
            </div>
          )}
        </div>
        {!hasAutoLogin && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={signOut}>
            Odhlásit
          </button>
        )}
      </div>

      {/* Pokud jsem delegát — ukáži info, ne formulář */}
      {isDelegate ? (
        <div style={{ fontSize: '0.82rem', color: 'var(--muted)', textAlign: 'center', padding: '8px 0' }}>
          Sdílíš přístup k Bobovi s jiným uživatelem.<br />
          Všechna data zapisuješ do společného profilu.
        </div>
      ) : (
        <>
          {/* Pozvat partnera */}
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 8 }}>
              Pozvat partnera / spolupečovatele
            </div>
            <form onSubmit={handleInvite} style={{ display: 'flex', gap: 8 }}>
              <input
                type="email" value={email} required
                onChange={e => setEmail(e.target.value)}
                placeholder="email partnera…"
                style={{ flex: 1 }}
                disabled={loading}
              />
              <button type="submit" className="btn btn-gold btn-sm" disabled={loading || !email.trim()}>
                {loading ? '…' : 'Pozvat'}
              </button>
            </form>
            {error && <p className="error-text" style={{ marginTop: 6, fontSize: '0.78rem' }}>{error}</p>}
          </div>

          {/* Vygenerovaný odkaz */}
          {inviteLink && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: 6 }}>
                Pošli tento odkaz partnerovi:
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <code style={{ flex: 1, fontSize: '0.68rem', wordBreak: 'break-all', color: 'var(--gold)' }}>
                  {inviteLink}
                </code>
                <button
                  type="button" className="btn btn-ghost btn-sm"
                  onClick={() => navigator.clipboard.writeText(inviteLink)}
                  style={{ flexShrink: 0 }}
                >
                  Kopírovat
                </button>
              </div>
              <p className="help-text" style={{ marginTop: 6, fontSize: '0.72rem' }}>
                Partner otevře odkaz, přihlásí se svým emailem — automaticky získá přístup.
              </p>
            </div>
          )}

          {/* Seznam pozvánek */}
          {invites.length > 0 && (
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>Pozvánky</div>
              {invites.map(inv => (
                <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: '0.8rem' }}>
                  <span style={{ flex: 1 }}>{inv.invited_email}</span>
                  <span style={{ fontSize: '0.7rem', color: inv.accepted_at ? '#4caf50' : 'var(--muted)' }}>
                    {inv.accepted_at ? '✓ přijato' : '⏳ čeká'}
                  </span>
                  <button type="button" className="btn-icon" onClick={() => handleRevoke(inv.id)} title="Odvolat">✕</button>
                </div>
              ))}
            </div>
          )}

          {/* Jak to funguje */}
          <p className="help-text" style={{ fontSize: '0.72rem', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
            Partner se přihlásí svým emailem přes zaslaný odkaz a bude zapisovat data do stejného profilu jako ty.
            Synchronizace probíhá automaticky napříč všemi zařízeními.
          </p>
        </>
      )}

      {/* Sync status + efektivní user ID (debug info) */}
      {effectiveUserId && (
        <div style={{ fontSize: '0.65rem', color: 'var(--muted)', opacity: 0.5 }}>
          Data ID: {effectiveUserId.slice(0, 8)}…
        </div>
      )}
    </div>
  );
}
