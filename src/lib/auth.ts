import { supabase } from './supabase';
import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';

const PENDING_INVITE_KEY = 'bob_pending_invite';

interface AuthStore {
  session: Session | null;
  loading: boolean;
  effectiveUserId: string | null; // vlastní nebo owner při sdílení
  isDelegate: boolean;            // true = vidím cizího mazlíčka
  setSession: (s: Session | null) => void;
  setLoading: (v: boolean) => void;
  setEffective: (id: string | null, isDelegate: boolean) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  session: null,
  loading: true,
  effectiveUserId: null,
  isDelegate: false,
  setSession: (session) => set({ session }),
  setLoading: (loading) => set({ loading }),
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

export async function initAuth() {
  if (!supabase) {
    useAuthStore.getState().setLoading(false);
    return;
  }

  capturePendingInvite();

  const { data: { session } } = await supabase.auth.getSession();
  useAuthStore.getState().setSession(session);
  useAuthStore.getState().setLoading(false);

  if (session?.user.id) {
    await resolveEffectiveUser(session.user.id);
  }

  supabase.auth.onAuthStateChange((_event, session) => {
    useAuthStore.getState().setSession(session);
    // Supabase volání přímo v callbacku můžou deadlocknout (klient drží zámek) —
    // odlož na další tick
    const userId = session?.user.id;
    setTimeout(() => {
      if (userId) {
        void resolveEffectiveUser(userId);
      } else {
        useAuthStore.getState().setEffective(null, false);
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
