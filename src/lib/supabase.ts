import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Vrátí null pokud Supabase není nakonfigurován (app funguje i bez něj)
export const supabase = url && key ? createClient(url, key) : null;

export type Database = {
  public: {
    Tables: {
      bob_store: {
        Row: { key: string; data: unknown; updated_at: string };
        Insert: { key: string; data: unknown; updated_at?: string };
        Update: { data?: unknown; updated_at?: string };
      };
    };
  };
};
