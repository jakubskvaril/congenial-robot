import { supabase } from './supabase';
import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';

interface AuthStore {
  session: Session | null;
  loading: boolean;
  setSession: (s: Session | null) => void;
  setLoading: (v: boolean) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  session: null,
  loading: true,
  setSession: (session) => set({ session }),
  setLoading: (loading) => set({ loading }),
}));

/** Inicializuje Supabase auth listener. Zavolej jednou při startu aplikace. */
export async function initAuth() {
  if (!supabase) {
    useAuthStore.getState().setLoading(false);
    return;
  }

  const { data: { session } } = await supabase.auth.getSession();
  useAuthStore.getState().setSession(session);
  useAuthStore.getState().setLoading(false);

  supabase.auth.onAuthStateChange((_event, session) => {
    useAuthStore.getState().setSession(session);
  });
}

export async function signInWithEmail(email: string) {
  if (!supabase) throw new Error('Supabase není nakonfigurován');
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  });
  if (error) throw error;
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}
