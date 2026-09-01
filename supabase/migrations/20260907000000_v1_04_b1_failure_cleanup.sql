create or replace function public.gsc_fail_oauth_attempt(p_attempt_id uuid, p_code text)
returns void language plpgsql security definer set search_path = '' as $$
declare a public.gsc_oauth_attempts;
begin
  if auth.role() <> 'service_role' then raise exception 'SERVICE_ROLE_REQUIRED'; end if;
  select * into a from public.gsc_oauth_attempts where id=p_attempt_id and status in ('pending','processing') for update;
  if not found then raise exception 'GSC_CALLBACK_INVALID'; end if;
  if a.staged_secret_reference is not null then delete from vault.secrets where id=a.staged_secret_reference; end if;
  update public.gsc_oauth_attempts set staged_secret_reference=null,status='failed',consumed_at=clock_timestamp() where id=a.id;
  update public.gsc_connections set connection_state='error',updated_at=clock_timestamp()
    where connection_id=a.connection_id
      and not exists (select 1 from public.connections where id=a.connection_id and secret_reference is not null and status='connected');
end $$;
revoke all on function public.gsc_fail_oauth_attempt(uuid,text) from public, anon, authenticated;
grant execute on function public.gsc_fail_oauth_attempt(uuid,text) to service_role;
