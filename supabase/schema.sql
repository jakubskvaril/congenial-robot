-- =========================================================================
-- Bobův gurmánský deníček — Supabase schema
-- Spusť v: Supabase Dashboard → SQL Editor → New query → Run
-- =========================================================================

-- Hlavní tabulka: jeden řádek per store per uživatel
create table if not exists bob_store (
  key         text        not null,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  data        jsonb       not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  primary key (key, user_id)
);

-- Index pro rychlé dotazy per uživatel
create index if not exists bob_store_user_idx on bob_store(user_id);

-- Row Level Security — každý uživatel vidí jen svá data
alter table bob_store enable row level security;

create policy "owner_all" on bob_store
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Automaticky aktualizuj updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger bob_store_updated_at
  before update on bob_store
  for each row execute function update_updated_at();

-- =========================================================================
-- Po spuštění tohoto SQL:
-- 1. Jdi do Supabase → Settings → API
-- 2. Zkopíruj "Project URL" a "anon public" klíč
-- 3. Přidej do Vercel Environment Variables:
--    VITE_SUPABASE_URL=https://xxxx.supabase.co
--    VITE_SUPABASE_ANON_KEY=eyJhbGciO...
-- 4. Nasaď (git push) → Vercel automaticky přebuildduje
-- 5. Otevři aplikaci → zadej email → klikni odkaz v emailu → hotovo
-- =========================================================================
