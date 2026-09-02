-- P3-A3 disconnect consistency. Existing migrations remain immutable.

create or replace function public.gsc_disconnect(p_business_id uuid, p_connection_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare c public.connections; ref uuid;
begin
  if auth.role() <> 'service_role' then raise exception 'SERVICE_ROLE_REQUIRED'; end if;
  select * into c from public.connections where id=p_connection_id and business_id=p_business_id and provider_type='google_search_console' for update;
  if not found then raise exception 'CONNECTION_NOT_FOUND'; end if;
  ref := c.secret_reference;
  delete from vault.secrets where id=ref;
  delete from vault.secrets where id in (select staged_secret_reference from public.gsc_oauth_attempts where connection_id=c.id and status in ('pending','processing') and staged_secret_reference is not null);
  update public.gsc_oauth_attempts set status='superseded',consumed_at=clock_timestamp(),staged_secret_reference=null where connection_id=c.id and status in ('pending','processing');
  update public.connections set secret_reference=null,status='disconnected',consent_state='revoked',disconnected_at=coalesce(disconnected_at,clock_timestamp()) where id=c.id;
  update public.gsc_connections set connection_state='disconnected',updated_at=clock_timestamp() where connection_id=c.id;
  update public.organic_evidence_sources set evidence_state='stale',updated_at=clock_timestamp() where business_id=p_business_id and source_kind='search_console' and current_complete_run is not null;
end $$;

revoke all on function public.gsc_disconnect(uuid,uuid) from public, anon, authenticated;
grant execute on function public.gsc_disconnect(uuid,uuid) to service_role;
