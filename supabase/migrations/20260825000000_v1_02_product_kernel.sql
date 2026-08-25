create extension if not exists pgcrypto;
create extension if not exists supabase_vault with schema vault;

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active','deletion_requested','deleted')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(), account_id uuid not null unique references public.accounts(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 200), ecommerce_platform text not null default 'unknown',
  status text not null default 'active' check (status in ('active','deletion_requested','deleted')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.connections (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
  provider_type text not null, status text not null default 'pending' check (status in ('pending','connected','error','disconnected')),
  consent_state text not null default 'pending' check (consent_state in ('pending','granted','revoked')),
  secret_reference uuid, connected_at timestamptz, disconnected_at timestamptz, last_success_at timestamptz,
  safe_error_code text, safe_error_message text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (business_id, provider_type)
);
create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(), account_id uuid not null references public.accounts(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete cascade, event_type text not null, correlation_id text not null,
  safe_metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

alter table public.accounts enable row level security;
alter table public.businesses enable row level security;
alter table public.connections enable row level security;
alter table public.audit_events enable row level security;
revoke all on public.accounts, public.businesses, public.connections, public.audit_events from anon;
grant select, insert, update, delete on public.accounts, public.businesses, public.connections to authenticated;
grant select on public.audit_events to authenticated;
grant select, insert, update, delete on public.accounts, public.businesses, public.connections, public.audit_events to service_role;
create policy account_owner_select on public.accounts for select to authenticated using (auth_user_id = auth.uid());
create policy account_owner_insert on public.accounts for insert to authenticated with check (auth_user_id = auth.uid());
create policy account_owner_update on public.accounts for update to authenticated using (auth_user_id = auth.uid()) with check (auth_user_id = auth.uid());
create policy business_owner_all on public.businesses for all to authenticated using (account_id in (select id from public.accounts where auth_user_id = auth.uid())) with check (account_id in (select id from public.accounts where auth_user_id = auth.uid()));
create policy connection_owner_all on public.connections for all to authenticated using (business_id in (select b.id from public.businesses b join public.accounts a on a.id=b.account_id where a.auth_user_id=auth.uid())) with check (business_id in (select b.id from public.businesses b join public.accounts a on a.id=b.account_id where a.auth_user_id=auth.uid()));
create policy audit_owner_select on public.audit_events for select to authenticated using (account_id in (select id from public.accounts where auth_user_id=auth.uid()));
revoke insert, update, delete on public.audit_events from authenticated;

-- PostgREST-facing Vault operations are privileged, narrowly scoped wrappers.
-- Customer roles cannot execute them or access Vault schemas/views directly.
create or replace function public.vault_create_secret(secret_value text, secret_name text)
returns uuid
language sql
security definer
set search_path = ''
as $$ select vault.create_secret(secret_value, secret_name); $$;

create or replace function public.vault_delete_secret(secret_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$ delete from vault.secrets where id = secret_id; $$;

create or replace function public.vault_read_secret(secret_id uuid)
returns text
language sql
security definer
set search_path = ''
as $$ select decrypted_secret from vault.decrypted_secrets where id = secret_id; $$;

revoke all on function public.vault_create_secret(text, text) from public, anon, authenticated;
revoke all on function public.vault_delete_secret(uuid) from public, anon, authenticated;
revoke all on function public.vault_read_secret(uuid) from public, anon, authenticated;
grant execute on function public.vault_create_secret(text, text) to service_role;
grant execute on function public.vault_delete_secret(uuid) to service_role;
grant execute on function public.vault_read_secret(uuid) to service_role;
