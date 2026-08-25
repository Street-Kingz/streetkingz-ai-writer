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
  connection_status text not null default 'disconnected' check (connection_status in ('pending','connected','error','disconnected')),
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
revoke all on public.accounts, public.businesses, public.connections, public.audit_events from authenticated;
grant select on public.accounts, public.businesses, public.audit_events to authenticated;
grant select (id,business_id,provider_type,status,consent_state,connected_at,disconnected_at,last_success_at,safe_error_code,safe_error_message,created_at,updated_at) on public.connections to authenticated;
grant select, insert, update, delete on public.accounts, public.businesses, public.connections, public.audit_events to service_role;
create policy account_owner_select on public.accounts for select to authenticated using (auth_user_id = auth.uid());
create policy business_owner_select on public.businesses for select to authenticated using (account_id in (select id from public.accounts where auth_user_id = auth.uid()));
create policy connection_owner_select on public.connections for select to authenticated using (business_id in (select b.id from public.businesses b join public.accounts a on a.id=b.account_id where a.auth_user_id=auth.uid()));
create policy audit_owner_select on public.audit_events for select to authenticated using (account_id in (select id from public.accounts where auth_user_id=auth.uid()));

create or replace function public.set_product_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = clock_timestamp(); return new; end; $$;
create trigger accounts_updated_at before update on public.accounts for each row execute function public.set_product_updated_at();
create trigger businesses_updated_at before update on public.businesses for each row execute function public.set_product_updated_at();
create trigger connections_updated_at before update on public.connections for each row execute function public.set_product_updated_at();
revoke all on function public.set_product_updated_at() from public, anon, authenticated;

-- PostgREST-facing Vault operations are privileged, narrowly scoped wrappers.
-- Customer roles cannot execute them or access Vault schemas/views directly.
create or replace function public.vault_create_secret(secret_value text, secret_name text)
returns uuid
language sql
security definer
set search_path = ''
as $$ select vault.create_secret(secret_value, secret_name); $$;

create or replace function public.vault_delete_secret(secret_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$ delete from vault.secrets where id = secret_id returning true; $$;

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

create or replace function public.product_create_account(p_correlation_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_row public.accounts; v_created boolean := false;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text,0));
  insert into public.accounts(auth_user_id) values (v_uid) on conflict (auth_user_id) do nothing returning * into v_row;
  if found then
    v_created := true;
    insert into public.audit_events(account_id,event_type,correlation_id) values(v_row.id,'account_created',p_correlation_id::text);
  else
    select * into v_row from public.accounts where auth_user_id=v_uid;
  end if;
  if v_row.status <> 'active' then raise exception 'ACCOUNT_NOT_ACTIVE'; end if;
  return jsonb_build_object('account',to_jsonb(v_row),'created',v_created);
end $$;

create or replace function public.product_create_business(p_name text, p_platform text, p_correlation_id uuid)
returns public.businesses language plpgsql security definer set search_path = '' as $$
declare v_account public.accounts; v_row public.businesses;
begin
  select * into v_account from public.accounts where auth_user_id=auth.uid() and status='active';
  if not found then raise exception 'ACCOUNT_NOT_ACTIVE'; end if;
  if p_name is null or length(trim(p_name)) not between 1 and 200 then raise exception 'INVALID_BUSINESS_NAME'; end if;
  if p_platform is null or length(trim(p_platform)) not between 1 and 64 then raise exception 'INVALID_PLATFORM'; end if;
  begin
    insert into public.businesses(account_id,name,ecommerce_platform) values(v_account.id,trim(p_name),trim(p_platform)) returning * into v_row;
  exception when unique_violation then raise exception 'BUSINESS_LIMIT_REACHED'; end;
  insert into public.audit_events(account_id,business_id,event_type,correlation_id) values(v_account.id,v_row.id,'business_created',p_correlation_id::text);
  return v_row;
end $$;

create or replace function public.product_create_connection(p_provider_type text, p_correlation_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_account public.accounts; v_business public.businesses; v_row public.connections;
begin
  select * into v_account from public.accounts where auth_user_id=auth.uid() and status='active';
  if not found then raise exception 'ACCOUNT_NOT_ACTIVE'; end if;
  select * into v_business from public.businesses where account_id=v_account.id and status='active';
  if not found then raise exception 'BUSINESS_NOT_PROVISIONED'; end if;
  if p_provider_type is null or length(trim(p_provider_type)) not between 1 and 64 then raise exception 'INVALID_PROVIDER_TYPE'; end if;
  begin
    insert into public.connections(business_id,provider_type) values(v_business.id,trim(p_provider_type)) returning * into v_row;
  exception when unique_violation then raise exception 'CONNECTION_EXISTS'; end;
  update public.businesses set connection_status='pending' where id=v_business.id;
  insert into public.audit_events(account_id,business_id,event_type,correlation_id) values(v_account.id,v_business.id,'connection_created',p_correlation_id::text);
  return jsonb_build_object(
    'id',v_row.id,'business_id',v_row.business_id,'provider_type',v_row.provider_type,
    'status',v_row.status,'consent_state',v_row.consent_state,'connected_at',v_row.connected_at,
    'disconnected_at',v_row.disconnected_at,'last_success_at',v_row.last_success_at,
    'safe_error_code',v_row.safe_error_code,'safe_error_message',v_row.safe_error_message,
    'created_at',v_row.created_at,'updated_at',v_row.updated_at
  );
end $$;

create or replace function public.product_transition_connection(p_connection_id uuid, p_status text, p_consent_state text, p_correlation_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_account public.accounts; v_row public.connections; v_allowed boolean;
begin
  select * into v_account from public.accounts where auth_user_id=auth.uid() and status='active';
  if not found then raise exception 'ACCOUNT_NOT_ACTIVE'; end if;
  select c.* into v_row from public.connections c join public.businesses b on b.id=c.business_id where c.id=p_connection_id and b.account_id=v_account.id for update of c;
  if not found then raise exception 'CONNECTION_NOT_FOUND'; end if;
  if p_status not in ('pending','connected','error','disconnected') or p_consent_state not in ('pending','granted','revoked') then raise exception 'INVALID_CONNECTION_TRANSITION'; end if;
  if (p_status='connected' and p_consent_state<>'granted') or (p_status='disconnected' and p_consent_state<>'revoked') then raise exception 'INVALID_CONNECTION_TRANSITION'; end if;
  v_allowed := p_status=v_row.status or (v_row.status='pending' and p_status in ('connected','error','disconnected')) or (v_row.status='connected' and p_status in ('error','disconnected')) or (v_row.status='error' and p_status in ('pending','connected','disconnected')) or (v_row.status='disconnected' and p_status='pending');
  if not v_allowed then raise exception 'INVALID_CONNECTION_TRANSITION'; end if;
  if p_status='disconnected' and v_row.secret_reference is not null then
    begin delete from vault.secrets where id=v_row.secret_reference; exception when others then raise exception 'SECRET_OPERATION_FAILED'; end;
  end if;
  update public.connections set status=p_status, consent_state=p_consent_state,
    connected_at=case when p_status='connected' then coalesce(connected_at,clock_timestamp()) else connected_at end,
    disconnected_at=case when p_status='disconnected' then clock_timestamp() else disconnected_at end,
    secret_reference=case when p_status='disconnected' then null else secret_reference end
    where id=v_row.id returning * into v_row;
  update public.businesses set connection_status=p_status where id=v_row.business_id;
  insert into public.audit_events(account_id,business_id,event_type,correlation_id) values(v_account.id,v_row.business_id,case when p_status='disconnected' then 'connection_disconnected' else 'connection_status_changed' end,p_correlation_id::text);
  return jsonb_build_object(
    'id',v_row.id,'business_id',v_row.business_id,'provider_type',v_row.provider_type,
    'status',v_row.status,'consent_state',v_row.consent_state,'connected_at',v_row.connected_at,
    'disconnected_at',v_row.disconnected_at,'last_success_at',v_row.last_success_at,
    'safe_error_code',v_row.safe_error_code,'safe_error_message',v_row.safe_error_message,
    'created_at',v_row.created_at,'updated_at',v_row.updated_at
  );
end $$;

create or replace function public.product_request_account_deletion(p_correlation_id uuid)
returns public.accounts language plpgsql security definer set search_path = '' as $$
declare v_row public.accounts; v_business public.businesses;
begin
  select * into v_row from public.accounts where auth_user_id=auth.uid() for update;
  if not found then raise exception 'TENANT_NOT_FOUND'; end if;
  if v_row.status='active' then
    update public.accounts set status='deletion_requested' where id=v_row.id returning * into v_row;
    update public.businesses set status='deletion_requested' where account_id=v_row.id and status='active' returning * into v_business;
    if found then
      insert into public.audit_events(account_id,business_id,event_type,correlation_id) values(v_row.id,v_business.id,'business_deletion_requested',p_correlation_id::text);
    end if;
    insert into public.audit_events(account_id,event_type,correlation_id) values(v_row.id,'account_deletion_requested',p_correlation_id::text);
  end if;
  return v_row;
end $$;

create or replace function public.product_cleanup_account(p_auth_user_id uuid, p_correlation_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_account public.accounts; v_secret uuid;
begin
  select * into v_account from public.accounts where auth_user_id=p_auth_user_id and status in ('deletion_requested','deleted') for update;
  if not found then return true; end if;
  for v_secret in select c.secret_reference from public.connections c join public.businesses b on b.id=c.business_id where b.account_id=v_account.id and c.secret_reference is not null loop
    begin delete from vault.secrets where id=v_secret; exception when others then raise exception 'SECRET_OPERATION_FAILED'; end;
  end loop;
  delete from public.businesses where account_id=v_account.id;
  update public.accounts set status='deleted',deleted_at=coalesce(deleted_at,clock_timestamp()) where id=v_account.id;
  insert into public.audit_events(account_id,event_type,correlation_id) values(v_account.id,'account_deletion_cleanup_completed',p_correlation_id::text);
  return true;
end $$;

revoke all on function public.product_create_account(uuid), public.product_create_business(text,text,uuid), public.product_create_connection(text,uuid), public.product_transition_connection(uuid,text,text,uuid), public.product_request_account_deletion(uuid), public.product_cleanup_account(uuid,uuid) from public, anon, authenticated;
grant execute on function public.product_create_account(uuid), public.product_create_business(text,text,uuid), public.product_create_connection(text,uuid), public.product_transition_connection(uuid,text,text,uuid), public.product_request_account_deletion(uuid) to authenticated;
grant execute on function public.product_cleanup_account(uuid,uuid) to service_role;
