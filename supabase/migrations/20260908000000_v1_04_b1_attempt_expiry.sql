create or replace function public.gsc_expire_oauth_attempt(p_attempt_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare a public.gsc_oauth_attempts;
begin
  if auth.role() <> 'service_role' then raise exception 'SERVICE_ROLE_REQUIRED'; end if;
  select * into a from public.gsc_oauth_attempts where id=p_attempt_id and status in ('pending','processing') for update;
  if not found then return; end if;
  if a.staged_secret_reference is not null then delete from vault.secrets where id=a.staged_secret_reference; end if;
  update public.gsc_oauth_attempts set status='expired',staged_secret_reference=null,consumed_at=clock_timestamp() where id=a.id;
end $$;
revoke all on function public.gsc_expire_oauth_attempt(uuid) from public, anon, authenticated;
grant execute on function public.gsc_expire_oauth_attempt(uuid) to service_role;
