create or replace function public.gsc_begin_oauth_attempt(p_account_id uuid, p_business_id uuid, p_state_hash text, p_pkce_verifier text, p_expires_at timestamptz)
returns table(connection_id uuid, attempt_id uuid)
language plpgsql security definer set search_path = '' as $$
declare v_connection public.connections; v_attempt public.gsc_oauth_attempts;
begin
  if auth.role() <> 'service_role' then raise exception 'SERVICE_ROLE_REQUIRED'; end if;
  select cn.* into v_connection from public.connections cn join public.businesses b on b.id=cn.business_id
    where cn.business_id=p_business_id and b.account_id=p_account_id and b.status='active' and cn.provider_type='google_search_console' for update;
  if not found then raise exception 'CONNECTION_NOT_FOUND'; end if;
  delete from vault.secrets where id in (
    select oa.staged_secret_reference from public.gsc_oauth_attempts oa
    where oa.connection_id=v_connection.id and oa.status in ('pending','processing') and oa.staged_secret_reference is not null
  );
  update public.gsc_oauth_attempts oa
    set status='superseded', staged_secret_reference=null, consumed_at=clock_timestamp()
    where oa.connection_id=v_connection.id and oa.status in ('pending','processing');
  insert into public.gsc_oauth_attempts(account_id,business_id,connection_id,state_hash,pkce_verifier,expires_at)
    values(p_account_id,p_business_id,v_connection.id,p_state_hash,p_pkce_verifier,p_expires_at) returning * into v_attempt;
  return query select v_connection.id,v_attempt.id;
end $$;

revoke all on function public.gsc_begin_oauth_attempt(uuid,uuid,text,text,timestamptz) from public, anon, authenticated;
grant execute on function public.gsc_begin_oauth_attempt(uuid,uuid,text,text,timestamptz) to service_role;
