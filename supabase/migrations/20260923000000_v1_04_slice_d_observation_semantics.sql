-- Provider-returned facts are derived evidence; only their direct seed is direct.
alter table public.organic_external_observations
  drop constraint if exists organic_external_observations_direct_or_derived_check;

alter table public.organic_external_observations
  add constraint organic_external_observations_direct_or_derived_check
  check (direct_or_derived in ('direct','derived'));
