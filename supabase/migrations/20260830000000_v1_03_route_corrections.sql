-- V1-03 route corrections: Woo lifecycle owns provider state and completion is idempotent.

alter table public.connections add constraint connections_woocommerce_connected_invariant
  check (provider_type <> 'woocommerce' or status <> 'connected' or (consent_state = 'granted' and secret_reference is not null));

create or replace function public.product_transition_connection(p_connection_id uuid, p_status text, p_consent_state text, p_correlation_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_account public.accounts; v_row public.connections; v_allowed boolean;
begin
  select * into v_account from public.accounts where auth_user_id=auth.uid() and status='active';
  if not found then raise exception 'ACCOUNT_NOT_ACTIVE'; end if;
  select c.* into v_row from public.connections c join public.businesses b on b.id=c.business_id where c.id=p_connection_id and b.account_id=v_account.id for update of c;
  if not found then raise exception 'CONNECTION_NOT_FOUND'; end if;
  if p_status not in ('pending','connected','error','disconnected') or p_consent_state not in ('pending','granted','revoked') then raise exception 'INVALID_CONNECTION_TRANSITION'; end if;
  if v_row.provider_type='woocommerce' and not (p_status='disconnected' and p_consent_state='revoked') then raise exception 'WOO_CONNECTION_STATE_MANAGED'; end if;
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
  if p_status='disconnected' and v_row.provider_type='woocommerce' then update public.commerce_stores set sync_state='stale' where connection_id=v_row.id and business_id=v_row.business_id; end if;
  update public.businesses set connection_status=p_status where id=v_row.business_id;
  insert into public.audit_events(account_id,business_id,event_type,correlation_id) values(v_account.id,v_row.business_id,case when p_status='disconnected' then 'connection_disconnected' else 'connection_status_changed' end,p_correlation_id::text);
  return jsonb_build_object('id',v_row.id,'business_id',v_row.business_id,'provider_type',v_row.provider_type,'status',v_row.status,'consent_state',v_row.consent_state,'connected_at',v_row.connected_at,'disconnected_at',v_row.disconnected_at,'last_success_at',v_row.last_success_at,'safe_error_code',v_row.safe_error_code,'safe_error_message',v_row.safe_error_message,'created_at',v_row.created_at,'updated_at',v_row.updated_at);
end $$;

create or replace function public.woo_complete_connection(p_attempt_id uuid,p_home_url text,p_site_url text,p_version text,p_timezone text,p_currency text,p_correlation_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare a public.woocommerce_auth_attempts;s public.commerce_stores;old_ref uuid;v_connection public.connections;
begin
  select * into a from public.woocommerce_auth_attempts where id=p_attempt_id for update;
  if not found then raise exception 'AUTH_ATTEMPT_NOT_READY'; end if;
  if a.status='consumed' then
    select * into v_connection from public.connections where id=a.connection_id and business_id=a.business_id and provider_type='woocommerce' for update;
    select * into s from public.commerce_stores where business_id=a.business_id and connection_id=a.connection_id and provider='woocommerce' for update;
    if v_connection.status='connected' and v_connection.consent_state='granted' and v_connection.secret_reference is not null and found then return s.id; end if;
    raise exception 'AUTH_ATTEMPT_NOT_READY';
  end if;
  if a.status<>'callback_received' or a.credential_reference is null or a.expires_at<=clock_timestamp() then raise exception 'AUTH_ATTEMPT_NOT_READY'; end if;
  select * into s from public.commerce_stores where business_id=a.business_id and provider='woocommerce' for update;
  if found then
    if s.canonical_base_url<>a.canonical_base_url then raise exception 'WOO_STORE_REBIND_DENIED';end if;
    update public.commerce_stores set source_home_url=p_home_url,source_site_url=p_site_url,source_version=p_version,timezone=p_timezone,currency=p_currency where id=s.id returning * into s;
  else
    insert into public.commerce_stores(business_id,connection_id,canonical_base_url,source_home_url,source_site_url,source_version,timezone,currency) values(a.business_id,a.connection_id,a.canonical_base_url,p_home_url,p_site_url,p_version,p_timezone,p_currency) returning * into s;
  end if;
  select secret_reference into old_ref from public.connections where id=a.connection_id for update;
  if old_ref is not null and old_ref<>a.credential_reference then delete from vault.secrets where id=old_ref;end if;
  update public.connections set secret_reference=a.credential_reference,status='connected',consent_state='granted',connected_at=coalesce(connected_at,clock_timestamp()),safe_error_code=null,safe_error_message=null where id=a.connection_id;
  update public.businesses set connection_status='connected' where id=a.business_id;
  update public.woocommerce_auth_attempts set status='consumed',consumed_at=clock_timestamp(),credential_reference=null,safe_error_code=null where id=a.id;
  insert into public.audit_events(account_id,business_id,event_type,correlation_id,safe_metadata) values(a.account_id,a.business_id,'woocommerce_connection_established',p_correlation_id::text,jsonb_build_object('store_id',s.id));return s.id;
end $$;
