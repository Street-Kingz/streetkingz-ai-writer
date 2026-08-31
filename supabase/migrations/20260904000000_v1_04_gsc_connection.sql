create table public.gsc_connections (
  connection_id uuid primary key references public.connections(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  connection_state text not null default 'pending' check (connection_state in ('pending','awaiting_property','connected','reauthentication_required','error','disconnected')),
  selected_site_url text,
  property_type text check (property_type is null or property_type in ('url_prefix','domain')),
  permission_level text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (connection_id,business_id),
  foreign key (connection_id,business_id) references public.connections(id,business_id) on delete cascade
);
create table public.gsc_oauth_attempts (
  id uuid primary key default gen_random_uuid(), account_id uuid not null references public.accounts(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  connection_id uuid not null references public.gsc_connections(connection_id) on delete cascade,
  state_hash text not null unique, pkce_verifier text not null, state text not null,
  status text not null default 'pending' check (status in ('pending','consumed','failed','expired','superseded')),
  created_at timestamptz not null default now(), expires_at timestamptz not null, consumed_at timestamptz,
  constraint gsc_attempt_expiry check (expires_at > created_at)
);
alter table public.gsc_connections enable row level security;
alter table public.gsc_oauth_attempts enable row level security;
revoke all on public.gsc_connections, public.gsc_oauth_attempts from public, anon, authenticated;
grant select on public.gsc_connections to authenticated;
grant select on public.gsc_connections, public.gsc_oauth_attempts to service_role;
create policy gsc_connection_owner_select on public.gsc_connections for select to authenticated using (business_id in (select b.id from public.businesses b join public.accounts a on a.id=b.account_id where a.auth_user_id=auth.uid()));
