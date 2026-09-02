-- P3-A2 credential-health compare-and-set. Existing migrations remain immutable.

create or replace function public.gsc_mark_reauthentication_required(
  p_business_id uuid,
  p_connection_id uuid,
  p_expected_secret_reference uuid default null
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() <> 'service_role' then raise exception 'SERVICE_ROLE_REQUIRED'; end if;
  update public.gsc_connections g
    set connection_state='reauthentication_required',updated_at=clock_timestamp()
    from public.connections c
    where g.connection_id=p_connection_id and g.business_id=p_business_id
      and c.id=g.connection_id and c.business_id=g.business_id
      and c.secret_reference is not distinct from p_expected_secret_reference
      and c.status='connected';
  if not found then raise exception 'GSC_REAUTHENTICATION_STALE'; end if;
end $$;

create or replace function public.gsc_try_mark_reauthentication_required(
  p_business_id uuid,
  p_connection_id uuid,
  p_expected_secret_reference uuid
)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() <> 'service_role' then raise exception 'SERVICE_ROLE_REQUIRED'; end if;
  update public.gsc_connections g
    set connection_state='reauthentication_required',updated_at=clock_timestamp()
    from public.connections c
    where g.connection_id=p_connection_id and g.business_id=p_business_id
      and c.id=g.connection_id and c.business_id=g.business_id
      and c.secret_reference is not distinct from p_expected_secret_reference
      and c.status='connected';
  return found;
end $$;

create or replace function public.gsc_confirm_credential_health(
  p_business_id uuid,
  p_connection_id uuid,
  p_expected_secret_reference uuid
)
returns boolean language plpgsql security definer set search_path = '' as $$
declare c public.connections;
begin
  if auth.role() <> 'service_role' then raise exception 'SERVICE_ROLE_REQUIRED'; end if;
  select * into c from public.connections
    where id=p_connection_id and business_id=p_business_id for update;
  if not found then return false; end if;
  return c.status='connected'
    and c.secret_reference is not distinct from p_expected_secret_reference;
end $$;

revoke all on function public.gsc_mark_reauthentication_required(uuid,uuid) from public, anon, authenticated;
revoke all on function public.gsc_mark_reauthentication_required(uuid,uuid,uuid), public.gsc_try_mark_reauthentication_required(uuid,uuid,uuid), public.gsc_confirm_credential_health(uuid,uuid,uuid) from public, anon, authenticated;
grant execute on function public.gsc_mark_reauthentication_required(uuid,uuid,uuid), public.gsc_try_mark_reauthentication_required(uuid,uuid,uuid), public.gsc_confirm_credential_health(uuid,uuid,uuid) to service_role;
drop function if exists public.gsc_mark_reauthentication_required(uuid,uuid);
