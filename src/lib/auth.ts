import { supabase } from './supabase';
import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';

const PENDING_INVITE_KEY = 'bob_pending_invite';

// Automatické přihlášení — účet uložený ve Vercel env vars.
// Aplikace se sama přihlásí, uživatel nikdy nevidí login screen.
const AUTO_EMAIL    = import.meta.env.VITE_APP_EMAIL as string | undefined;
const AUTO_PASSWORD = import.meta.env.VITE_APP_PASSWORD as string | undefined;
// Volitelná pojistka: UUID účtu, který vlastní data. Když se auto-login
// přihlásí pod jiným user_id, odhlásíme se místo tichého forku historie.
const AUTO_EXPECTED_USER_ID = import.meta.env.VITE_APP_EXPECTED_USER_ID as string | undefined;
export const hasAutoLogin = Boolean(AUTO_EMAIL && AUTO_PASSWORD);

interface AuthStore {
  session: Session | null;
  loading: boolean;
  autoLoginFailed: boolean;       // auto-login selhal → fallback na email login
  effectiveUserId: string | null; // vlastní nebo owner při sdílení
  isDelegate: boolean;            // true = vidím cizího mazlíčka
  setSession: (s: Session | null) => void;
  setLoading: (v: boolean) => void;
  setAutoLoginFailed: (v: boolean) => void;
  setEffective: (id: string | null, isDelegate: boolean) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  session: null,
  loading: true,
  autoLoginFailed: false,
  effectiveUserId: null,
  isDelegate: false,
  setSession: (session) => set({ session }),
  setLoading: (loading) => set({ loading }),
  setAutoLoginFailed: (autoLoginFailed) => set({ autoLoginFailed }),
  setEffective: (effectiveUserId, isDelegate) => set({ effectiveUserId, isDelegate }),
}));

/**
 * Ulož ?invite=ID do localStorage hned při načtení aplikace.
 * Magic-link redirect parametr zahodí — bez tohoto by se pozvánka
 * u nepřihlášeného partnera nikdy nepřijala.
 */
function capturePendingInvite() {
  const inviteId = new URLSearchParams(window.location.search).get('invite');
  if (inviteId) {
    localStorage.setItem(PENDING_INVITE_KEY, inviteId);
    const url = new URL(window.location.href);
    url.searchParams.delete('invite');
    window.history.replaceState({}, '', url.toString());
  }
}

async function resolveEffectiveUser(userId: string) {
  if (!supabase) return;
  try {
    // Přijmi čekající pozvánku (přežije magic-link redirect díky localStorage)
    const inviteId = localStorage.getItem(PENDING_INVITE_KEY);
    if (inviteId) {
      try {
        await supabase.rpc('accept_pet_invite', { p_invite_id: inviteId });
      } finally {
        localStorage.removeItem(PENDING_INVITE_KEY);
      }
    }

    const { data } = await supabase.rpc('get_effective_owner_id');
    const effectiveId = (data as string | null) ?? userId;
    useAuthStore.getState().setEffective(effectiveId, effectiveId !== userId);
  } catch {
    useAuthStore.getState().setEffective(userId, false);
  }
}

let _autoLoginInFlight = false;

/**
 * Přihlásí se kanonickým účtem z env vars. Zkouší 3× při síťové chybě;
 * chybné heslo neretryuje. Ověří pin na user_id (ochrana proti forku historie).
 * Vrací session nebo null.
 */
async function tryAutoLogin(): Promise<Session | null> {
  if (!supabase || !hasAutoLogin || _autoLoginInFlight) return null;
  _autoLoginInFlight = true;
  try {
    for (let attempt = 1; attempt <= 3; attempt++) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: AUTO_EMAIL!,
        password: AUTO_PASSWORD!,
      });
      if (!error) {
        // Pojistka: session musí patřit účtu, který vlastní data
        if (AUTO_EXPECTED_USER_ID && data.session?.user.id !== AUTO_EXPECTED_USER_ID) {
          console.error(
            `[auth] Auto-login user ${data.session?.user.id} ≠ očekávaný ${AUTO_EXPECTED_USER_ID} — odhlašuji, jinak by se historie forkla pod cizí účet.`
          );
          await supabase.auth.signOut();
          useAuthStore.getState().setAutoLoginFailed(true);
          return null;
        }
        useAuthStore.getState().setAutoLoginFailed(false);
        return data.session;
      }
      // Síťová/transientní chyba → retry; špatné heslo → vzdej to hned
      const retryable = error.name === 'AuthRetryableFetchError' || error.status === 0;
      if (!retryable) break;
      await new Promise(r => setTimeout(r, attempt * 1500));
    }
  } catch { /* spadne níž na failed */ }
  finally { _autoLoginInFlight = false; }
  useAuthStore.getState().setAutoLoginFailed(true);
  return null;
}

function isCanonicalSession(session: Session | null): boolean {
  if (!hasAutoLogin || !session?.user.email) return true;
  return session.user.email.toLowerCase() === AUTO_EMAIL!.toLowerCase();
}

export async function initAuth() {
  if (!supabase) {
    useAuthStore.getState().setLoading(false);
    return;
  }

  capturePendingInvite();

  let { data: { session } } = await supabase.auth.getSession();

  // Auto-login když session chybí, NEBO patří jinému účtu než kanonickému —
  // jinak by dvě zařízení mohla tiše psát do dvou různých účtů
  if (hasAutoLogin && (!session || !isCanonicalSession(session))) {
    const fresh = await tryAutoLogin();
    // Při neúspěchu ponech starou session (offline start, rotace hesla) —
    // lepší psát do starého účtu než uživatele odstřihnout úplně
    if (fresh) session = fresh;
  }

  useAuthStore.getState().setSession(session);
  useAuthStore.getState().setLoading(false);

  if (session?.user.id) {
    await resolveEffectiveUser(session.user.id);
  }

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'INITIAL_SESSION') return; // start už vyřešen výše
    useAuthStore.getState().setSession(session);
    // Supabase volání přímo v callbacku můžou deadlocknout (klient drží zámek) —
    // odlož na další tick
    const userId = session?.user.id;
    setTimeout(() => {
      if (userId) {
        void resolveEffectiveUser(userId);
      } else {
        useAuthStore.getState().setEffective(null, false);
        // „Vždy přihlášen": po odhlášení / expiraci refresh tokenu se rovnou
        // přihlas znovu (guard _autoLoginInFlight brání smyčce)
        void tryAutoLogin().then(s => {
          if (s) {
            useAuthStore.getState().setSession(s);
            void resolveEffectiveUser(s.user.id);
          }
        });
      }
    }, 0);
  });
}

export async function signInWithEmail(email: string) {
  if (!supabase) throw new Error('Supabase není nakonfigurován');
  const redirectTo = window.location.origin + window.location.pathname;
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  });
  if (error) throw error;
}

/**
 * Přihlášení 6místným kódem z emailu — funguje i v iOS PWA,
 * kde magic link otevře Safari místo nainstalované aplikace.
 */
export async function verifyEmailOtp(email: string, token: string) {
  if (!supabase) throw new Error('Supabase není nakonfigurován');
  const { error } = await supabase.auth.verifyOtp({
    email,
    token: token.trim(),
    type: 'email',
  });
  if (error) throw error;
}

export async function invitePetMember(email: string): Promise<string> {
  if (!supabase) throw new Error('Supabase není nakonfigurován');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Nejste přihlášeni');

  const { data, error } = await supabase
    .from('pet_delegates')
    .insert({ owner_id: session.user.id, invited_email: email.trim().toLowerCase() })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function revokeInvite(inviteId: string) {
  if (!supabase) return;
  await supabase.from('pet_delegates').delete().eq('id', inviteId);
}

export async function getMyInvites() {
  if (!supabase) return [];
  const { data } = await supabase
    .from('pet_delegates')
    .select('id, invited_email, delegate_id, accepted_at, created_at')
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}
