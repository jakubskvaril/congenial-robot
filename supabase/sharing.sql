-- =========================================================================
-- Sdílení mazlíčka — spusť v Supabase SQL Editor po schema.sql
-- =========================================================================

create table if not exists pet_delegates (
  id           uuid        primary key default gen_random_uuid(),
  owner_id     uuid        not null references auth.users(id) on delete cascade,
  invited_email text       not null,
  delegate_id  uuid        references auth.users(id) on delete cascade,
  accepted_at  timestamptz,
  created_at   timestamptz not null default now(),
  unique(owner_id, invited_email)
);

alter table pet_delegates enable row level security;

-- Vlastník může spravovat své pozvánky
create policy "owner_manage" on pet_delegates for all
  using  (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Přijatý delegát vidí svůj záznam
create policy "delegate_view" on pet_delegates for select
  using (auth.uid() = delegate_id);

-- ── Funkce: přijmout pozvánku (SECURITY DEFINER = obchází RLS) ────────────
create or replace function accept_pet_invite(p_invite_id uuid)
returns boolean
security definer
language plpgsql as $$
declare
  v_email text;
  v_rows  int;
begin
  select email into v_email from auth.users where id = auth.uid();

  update pet_delegates
  set    delegate_id = auth.uid(),
         accepted_at = now()
  where  id = p_invite_id
    and  invited_email = v_email
    and  accepted_at is null;

  get diagnostics v_rows = row_count;
  return v_rows > 0;
end;
$$;

-- ── Funkce: zjistit efektivní owner_id (vlastní nebo delegátův) ──────────
create or replace function get_effective_owner_id()
returns uuid
security definer
language plpgsql as $$
declare
  v_owner uuid;
begin
  select owner_id into v_owner
  from   pet_delegates
  where  delegate_id = auth.uid()
    and  accepted_at is not null
  limit  1;

  return coalesce(v_owner, auth.uid());
end;
$$;
