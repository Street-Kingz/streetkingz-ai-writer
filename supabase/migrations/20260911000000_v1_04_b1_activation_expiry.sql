create or replace function public.gsc_activate_property(p_attempt_id uuid, p_site_url text, p_property_type text, p_permission_level text)
returns public.organic_evidence_sources
language plpgsql security definer set search_path = '' as $$
declare a public.gsc_oauth_attempts; old_ref uuid; result public.organic_evidence_sources;
begin
  if auth.role() <> 'service_role' then raise exception 'SERVICE_ROLE_REQUIRED'; end if;
  select * into a from public.gsc_oauth_attempts where id=p_attempt_id and status='processing' for update;
  if not found then raise exception 'GSC_ACTIVATION_INVALID'; end if;
  if a.expires_at <= clock_timestamp() then
    if a.staged_secret_reference is not null then delete from vault.secrets where id=a.staged_secret_reference; end if;
    update public.gsc_oauth_attempts set status='expired',staged_secret_reference=null,consumed_at=clock_timestamp() where id=a.id;
    result := null;
    return result;
  end if;
  if a.staged_secret_reference is null then raise exception 'GSC_ACTIVATION_INVALID'; end if;
  select secret_reference into old_ref from public.connections where id=a.connection_id and business_id=a.business_id for update;
  if not found then raise exception 'CONNECTION_NOT_FOUND'; end if;
  update public.gsc_connections set connection_state='connected',selected_site_url=p_site_url,property_type=p_property_type,permission_level=p_permission_level,updated_at=clock_timestamp() where connection_id=a.connection_id and business_id=a.business_id;
  update public.connections set secret_reference=a.staged_secret_reference,status='connected',consent_state='granted',connected_at=coalesce(connected_at,clock_timestamp()) where id=a.connection_id and business_id=a.business_id;
  select * into result from public.organic_ensure_source(a.business_id,'customer_connected','search_console','google_search_console',a.connection_id);
  update public.gsc_oauth_attempts set status='consumed',consumed_at=clock_timestamp() where id=a.id;
  if old_ref is not null and old_ref <> a.staged_secret_reference then delete from vault.secrets where id=old_ref; end if;
  return result;
end $$;
revoke all on function public.gsc_activate_property(uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.gsc_activate_property(uuid,text,text,text) to service_role;
