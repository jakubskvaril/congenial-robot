import { supabase } from './supabase';
import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';

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

async function resolveEffectiveUser(userId: string) {
  if (!supabase) return;
  try {
    // Zkus nejdřív přijmout čekající pozvánku (z URL parametru)
    const params = new URLSearchParams(window.location.search);
    const inviteId = params.get('invite');
    if (inviteId) {
      await supabase.rpc('accept_pet_invite', { p_invite_id: inviteId });
      // Odstraň parametr z URL bez reload
      const url = new URL(window.location.href);
      url.searchParams.delete('invite');
      window.history.replaceState({}, '', url.toString());
    }

    // Zjisti efektivní owner_id
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

  const { data: { session } } = await supabase.auth.getSession();
  useAuthStore.getState().setSession(session);
  useAuthStore.getState().setLoading(false);

  if (session?.user.id) {
    await resolveEffectiveUser(session.user.id);
  }

  supabase.auth.onAuthStateChange(async (_event, session) => {
    useAuthStore.getState().setSession(session);
    if (session?.user.id) {
      await resolveEffectiveUser(session.user.id);
    } else {
      useAuthStore.getState().setEffective(null, false);
    }
  });
}

export async function signInWithEmail(email: string) {
  if (!supabase) throw new Error('Supabase není nakonfigurován');
  // Vždy použij aktuální origin — funguje na produkci i při lokálním vývoji
  const redirectTo = window.location.origin + window.location.pathname;
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
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
