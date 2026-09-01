create or replace function public.gsc_mark_reauthentication_required(p_business_id uuid, p_connection_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() <> 'service_role' then raise exception 'SERVICE_ROLE_REQUIRED'; end if;
  update public.gsc_connections set connection_state='reauthentication_required',updated_at=clock_timestamp()
    where connection_id=p_connection_id and business_id=p_business_id;
  if not found then raise exception 'CONNECTION_NOT_FOUND'; end if;
end $$;
revoke all on function public.gsc_mark_reauthentication_required(uuid,uuid) from public, anon, authenticated;
grant execute on function public.gsc_mark_reauthentication_required(uuid,uuid) to service_role;
