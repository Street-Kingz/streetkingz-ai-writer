-- V1-02 portable logical disaster-recovery credential sanitisation.
-- Run only after restoring the supported logical backup into the recovery target.
-- This operation deliberately requires no Vault access or credential plaintext.

begin;

-- Fresh hosted projects can apply provider default privileges while restored
-- tables are created. Reconcile the reviewed V1-02 surface explicitly.
revoke all on public.accounts, public.businesses, public.connections, public.audit_events from anon, authenticated;
grant select on public.accounts, public.businesses, public.audit_events to authenticated;
grant select (
  id,
  business_id,
  provider_type,
  status,
  consent_state,
  connected_at,
  disconnected_at,
  last_success_at,
  safe_error_code,
  safe_error_message,
  created_at,
  updated_at
) on public.connections to authenticated;

revoke all on function public.set_product_updated_at() from public, anon, authenticated;
revoke all on function public.vault_create_secret(text, text) from public, anon, authenticated;
revoke all on function public.vault_delete_secret(uuid) from public, anon, authenticated;
revoke all on function public.vault_read_secret(uuid) from public, anon, authenticated;
revoke all on function public.product_cleanup_account(uuid, uuid) from public, anon, authenticated;
revoke all on function public.product_create_account(uuid) from public, anon, authenticated;
revoke all on function public.product_create_business(text, text, uuid) from public, anon, authenticated;
revoke all on function public.product_create_connection(text, uuid) from public, anon, authenticated;
revoke all on function public.product_transition_connection(uuid, text, text, uuid) from public, anon, authenticated;
revoke all on function public.product_request_account_deletion(uuid) from public, anon, authenticated;

grant execute on function public.vault_create_secret(text, text) to service_role;
grant execute on function public.vault_delete_secret(uuid) to service_role;
grant execute on function public.vault_read_secret(uuid) to service_role;
grant execute on function public.product_cleanup_account(uuid, uuid) to service_role;
grant execute on function public.product_create_account(uuid) to authenticated;
grant execute on function public.product_create_business(text, text, uuid) to authenticated;
grant execute on function public.product_create_connection(text, uuid) to authenticated;
grant execute on function public.product_transition_connection(uuid, text, text, uuid) to authenticated;
grant execute on function public.product_request_account_deletion(uuid) to authenticated;

create temporary table v1_02_recovery_connections on commit drop as
select
  c.id as connection_id,
  c.business_id,
  b.account_id
from public.connections c
join public.businesses b on b.id = c.business_id
where c.secret_reference is not null
for update of c, b;

update public.connections c
set
  status = 'disconnected',
  consent_state = 'revoked',
  secret_reference = null,
  disconnected_at = coalesce(c.disconnected_at, clock_timestamp()),
  safe_error_code = 'REAUTHORISATION_REQUIRED_AFTER_RECOVERY',
  safe_error_message = 'Connection must be re-authorised following system recovery.'
from v1_02_recovery_connections r
where c.id = r.connection_id;

update public.businesses b
set connection_status = 'disconnected'
from (
  select distinct business_id
  from v1_02_recovery_connections
) r
where b.id = r.business_id;

insert into public.audit_events (
  account_id,
  business_id,
  event_type,
  correlation_id,
  safe_metadata
)
select
  r.account_id,
  r.business_id,
  'connection_invalidated_after_recovery',
  gen_random_uuid()::text,
  jsonb_build_object(
    'connection_id', r.connection_id,
    'reason', 'portable_logical_recovery',
    'customer_action', 're_authorisation_required'
  )
from v1_02_recovery_connections r;

commit;
