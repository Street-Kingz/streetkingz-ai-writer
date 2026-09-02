-- P3-A1 reconnect consistency. Existing migrations remain immutable.

create or replace function public.gsc_stage_oauth_secret(p_attempt_id uuid, p_secret_reference uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare a public.gsc_oauth_attempts; c public.connections;
begin
  if auth.role() <> 'service_role' then raise exception 'SERVICE_ROLE_REQUIRED'; end if;
  select * into a from public.gsc_oauth_attempts where id=p_attempt_id;
  if not found then raise exception 'GSC_CALLBACK_INVALID'; end if;
  select * into c from public.connections where id=a.connection_id and business_id=a.business_id for update;
  if not found then raise exception 'CONNECTION_NOT_FOUND'; end if;
  select * into a from public.gsc_oauth_attempts where id=p_attempt_id and status='processing' for update;
  if not found then raise exception 'GSC_CALLBACK_INVALID'; end if;
  update public.gsc_oauth_attempts set staged_secret_reference=p_secret_reference where id=a.id;
  if c.secret_reference is null then
    update public.gsc_connections set connection_state='awaiting_property', updated_at=clock_timestamp()
      where connection_id=c.id and business_id=c.business_id;
  end if;
end $$;

create or replace function public.gsc_activate_property(p_attempt_id uuid, p_site_url text, p_property_type text, p_permission_level text)
returns public.organic_evidence_sources
language plpgsql security definer set search_path = '' as $$
declare a public.gsc_oauth_attempts; c public.connections; old_ref uuid; old_site text; result public.organic_evidence_sources;
begin
  if auth.role() <> 'service_role' then raise exception 'SERVICE_ROLE_REQUIRED'; end if;
  select * into a from public.gsc_oauth_attempts where id=p_attempt_id;
  if not found then raise exception 'GSC_ACTIVATION_INVALID'; end if;
  select * into c from public.connections where id=a.connection_id and business_id=a.business_id for update;
  if not found then raise exception 'CONNECTION_NOT_FOUND'; end if;
  select selected_site_url into old_site from public.gsc_connections where connection_id=c.id and business_id=c.business_id for update;
  select * into a from public.gsc_oauth_attempts where id=p_attempt_id and status='processing' for update;
  if not found then raise exception 'GSC_ACTIVATION_INVALID'; end if;
  if a.expires_at <= clock_timestamp() then
    if a.staged_secret_reference is not null then delete from vault.secrets where id=a.staged_secret_reference; end if;
    update public.gsc_oauth_attempts set status='expired',staged_secret_reference=null,consumed_at=clock_timestamp() where id=a.id;
    return null;
  end if;
  if a.staged_secret_reference is null then raise exception 'GSC_ACTIVATION_INVALID'; end if;
  old_ref := c.secret_reference;
  update public.gsc_connections set connection_state='connected',selected_site_url=p_site_url,property_type=p_property_type,permission_level=p_permission_level,updated_at=clock_timestamp() where connection_id=c.id and business_id=c.business_id;
  update public.connections set secret_reference=a.staged_secret_reference,status='connected',consent_state='granted',connected_at=coalesce(connected_at,clock_timestamp()),disconnected_at=null,safe_error_code=null,safe_error_message=null where id=c.id and business_id=c.business_id;
  select * into result from public.organic_ensure_source(a.business_id,'customer_connected','search_console','google_search_console',a.connection_id);
  if old_site is not null and old_site is distinct from p_site_url then
    update public.organic_evidence_sources set current_complete_run=null,current_completeness_state=null,last_successful_at=null,evidence_as_of=null,evidence_state='never_collected',updated_at=clock_timestamp() where id=result.id;
    select * into result from public.organic_evidence_sources where id=result.id;
  end if;
  update public.gsc_oauth_attempts set status='consumed',consumed_at=clock_timestamp(),staged_secret_reference=null where id=a.id;
  if old_ref is not null and old_ref <> a.staged_secret_reference then delete from vault.secrets where id=old_ref; end if;
  return result;
end $$;

revoke all on function public.gsc_stage_oauth_secret(uuid,uuid), public.gsc_activate_property(uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.gsc_stage_oauth_secret(uuid,uuid), public.gsc_activate_property(uuid,text,text,text) to service_role;
