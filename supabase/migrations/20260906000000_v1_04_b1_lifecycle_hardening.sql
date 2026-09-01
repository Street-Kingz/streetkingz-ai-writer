alter table public.gsc_oauth_attempts
  add column if not exists staged_secret_reference uuid;

alter table public.gsc_oauth_attempts drop constraint if exists gsc_oauth_attempts_status_check;
alter table public.gsc_oauth_attempts
  add constraint gsc_oauth_attempts_status_check
  check (status in ('pending','processing','consumed','failed','expired','superseded'));
alter table public.gsc_oauth_attempts drop column if exists state;
create unique index if not exists gsc_one_pending_attempt
  on public.gsc_oauth_attempts(connection_id) where status = 'pending';

alter table public.gsc_oauth_attempts drop constraint if exists gsc_attempt_connection_business_fk;
alter table public.gsc_oauth_attempts
  add constraint gsc_attempt_connection_business_fk
  foreign key (connection_id, business_id)
  references public.gsc_connections(connection_id, business_id) on delete cascade;

create or replace function public.gsc_begin_oauth_attempt(p_account_id uuid, p_business_id uuid, p_state_hash text, p_pkce_verifier text, p_expires_at timestamptz)
returns table(connection_id uuid, attempt_id uuid)
language plpgsql security definer set search_path = '' as $$
declare c public.connections; a public.gsc_oauth_attempts;
begin
  if auth.role() <> 'service_role' then raise exception 'SERVICE_ROLE_REQUIRED'; end if;
  select c.* into c from public.connections c join public.businesses b on b.id=c.business_id
    where c.business_id=p_business_id and b.account_id=p_account_id and b.status='active'
      and c.provider_type='google_search_console' for update;
  if not found then raise exception 'CONNECTION_NOT_FOUND'; end if;
  update public.gsc_oauth_attempts set status='superseded', consumed_at=clock_timestamp()
    where connection_id=c.id and status in ('pending','processing');
  delete from vault.secrets where id in (select staged_secret_reference from public.gsc_oauth_attempts where connection_id=c.id and status='superseded' and staged_secret_reference is not null);
  insert into public.gsc_oauth_attempts(account_id,business_id,connection_id,state_hash,pkce_verifier,expires_at)
    values(p_account_id,p_business_id,c.id,p_state_hash,p_pkce_verifier,p_expires_at)
    returning * into a;
  return query select c.id,a.id;
end $$;

create or replace function public.gsc_claim_oauth_attempt(p_state_hash text)
returns table(attempt_id uuid, account_id uuid, business_id uuid, connection_id uuid, pkce_verifier text, staged_secret_reference uuid)
language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() <> 'service_role' then raise exception 'SERVICE_ROLE_REQUIRED'; end if;
  return query update public.gsc_oauth_attempts a set status='processing'
    where a.state_hash=p_state_hash and a.status='pending' and a.expires_at>clock_timestamp()
    returning a.id,a.account_id,a.business_id,a.connection_id,a.pkce_verifier,a.staged_secret_reference;
  if not found then raise exception 'GSC_CALLBACK_INVALID'; end if;
end $$;

create or replace function public.gsc_stage_oauth_secret(p_attempt_id uuid, p_secret_reference uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() <> 'service_role' then raise exception 'SERVICE_ROLE_REQUIRED'; end if;
  update public.gsc_oauth_attempts set staged_secret_reference=p_secret_reference
    where id=p_attempt_id and status='processing';
  if not found then raise exception 'GSC_CALLBACK_INVALID'; end if;
end $$;

create or replace function public.gsc_fail_oauth_attempt(p_attempt_id uuid, p_code text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() <> 'service_role' then raise exception 'SERVICE_ROLE_REQUIRED'; end if;
  update public.gsc_oauth_attempts set status='failed',consumed_at=clock_timestamp() where id=p_attempt_id and status in ('pending','processing');
  update public.gsc_connections g set connection_state='error',updated_at=clock_timestamp()
    where g.connection_id=(select a.connection_id from public.gsc_oauth_attempts a where a.id=p_attempt_id);
end $$;

create or replace function public.gsc_activate_property(p_attempt_id uuid, p_site_url text, p_property_type text, p_permission_level text)
returns public.organic_evidence_sources
language plpgsql security definer set search_path = '' as $$
declare a public.gsc_oauth_attempts; old_ref uuid; result public.organic_evidence_sources;
begin
  if auth.role() <> 'service_role' then raise exception 'SERVICE_ROLE_REQUIRED'; end if;
  select * into a from public.gsc_oauth_attempts where id=p_attempt_id and status='processing' for update;
  if not found or a.staged_secret_reference is null then raise exception 'GSC_ACTIVATION_INVALID'; end if;
  select secret_reference into old_ref from public.connections where id=a.connection_id and business_id=a.business_id for update;
  if not found then raise exception 'CONNECTION_NOT_FOUND'; end if;
  update public.gsc_connections set connection_state='connected',selected_site_url=p_site_url,property_type=p_property_type,permission_level=p_permission_level,updated_at=clock_timestamp() where connection_id=a.connection_id and business_id=a.business_id;
  update public.connections set secret_reference=a.staged_secret_reference,status='connected',consent_state='granted',connected_at=coalesce(connected_at,clock_timestamp()) where id=a.connection_id and business_id=a.business_id;
  select * into result from public.organic_ensure_source(a.business_id,'customer_connected','search_console','google_search_console',a.connection_id);
  update public.gsc_oauth_attempts set status='consumed',consumed_at=clock_timestamp() where id=a.id;
  if old_ref is not null and old_ref <> a.staged_secret_reference then delete from vault.secrets where id=old_ref; end if;
  return result;
end $$;

create or replace function public.gsc_disconnect(p_business_id uuid, p_connection_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare c public.connections; ref uuid; staged uuid;
begin
  if auth.role() <> 'service_role' then raise exception 'SERVICE_ROLE_REQUIRED'; end if;
  select * into c from public.connections where id=p_connection_id and business_id=p_business_id and provider_type='google_search_console' for update;
  if not found then raise exception 'CONNECTION_NOT_FOUND'; end if;
  select secret_reference into ref from public.connections where id=c.id;
  select staged_secret_reference into staged from public.gsc_oauth_attempts where connection_id=c.id and staged_secret_reference is not null and status in ('pending','processing') order by created_at desc limit 1;
  if ref is not null then delete from vault.secrets where id=ref; end if;
  if staged is not null and staged <> ref then delete from vault.secrets where id=staged; end if;
  update public.gsc_oauth_attempts set status='superseded',consumed_at=clock_timestamp() where connection_id=c.id and status in ('pending','processing');
  update public.connections set secret_reference=null,status='disconnected',consent_state='revoked',disconnected_at=clock_timestamp() where id=c.id;
  update public.gsc_connections set connection_state='disconnected',updated_at=clock_timestamp() where connection_id=c.id;
  update public.organic_evidence_sources set evidence_state='stale',updated_at=clock_timestamp() where business_id=p_business_id and source_kind='search_console' and current_complete_run is not null;
end $$;

revoke all on public.gsc_oauth_attempts from public, anon, authenticated;
grant select on public.gsc_oauth_attempts to service_role;
revoke all on function public.gsc_begin_oauth_attempt(uuid,uuid,text,text,timestamptz), public.gsc_claim_oauth_attempt(text), public.gsc_stage_oauth_secret(uuid,uuid), public.gsc_fail_oauth_attempt(uuid,text), public.gsc_activate_property(uuid,text,text,text), public.gsc_disconnect(uuid,uuid) from public, anon, authenticated;
grant execute on function public.gsc_begin_oauth_attempt(uuid,uuid,text,text,timestamptz), public.gsc_claim_oauth_attempt(text), public.gsc_stage_oauth_secret(uuid,uuid), public.gsc_fail_oauth_attempt(uuid,text), public.gsc_activate_property(uuid,text,text,text), public.gsc_disconnect(uuid,uuid) to service_role;
