-- V1 security boundary: remove default Data API exposure and make routine
-- execution explicit. This migration is monotonic; it does not alter data.
revoke all on all tables in schema public from anon, public;
revoke all on all sequences in schema public from anon, public;
revoke all on all functions in schema public from public, anon, authenticated;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

grant execute on function public.product_create_account(uuid) to authenticated;
grant execute on function public.product_create_business(text, text, uuid) to authenticated;
grant execute on function public.product_create_connection(text, uuid) to authenticated;
grant execute on function public.product_request_account_deletion(uuid) to authenticated;
grant execute on function public.product_transition_connection(uuid, text, text, uuid) to authenticated;

alter default privileges for role postgres in schema public revoke all on tables from public, anon;
alter default privileges for role postgres in schema public revoke all on sequences from public, anon;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated;
