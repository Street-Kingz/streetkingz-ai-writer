create or replace function public.gsc_ensure_connection(p_business_id uuid)
returns public.connections
language plpgsql security definer set search_path = '' as $$
declare v_business public.businesses; v_row public.connections;
begin
  if auth.role() <> 'service_role' then raise exception 'SERVICE_ROLE_REQUIRED'; end if;
  select * into v_business from public.businesses where id=p_business_id and status='active';
  if not found then raise exception 'BUSINESS_NOT_FOUND'; end if;
  insert into public.connections(business_id,provider_type) values(p_business_id,'google_search_console')
  on conflict (business_id,provider_type) do update set updated_at=clock_timestamp()
  returning * into v_row;
  insert into public.gsc_connections(connection_id,business_id)
  values(v_row.id,v_row.business_id)
  on conflict (connection_id) do update set updated_at=clock_timestamp();
  return v_row;
end $$;
revoke all on function public.gsc_ensure_connection(uuid) from public, anon, authenticated;
grant execute on function public.gsc_ensure_connection(uuid) to service_role;
