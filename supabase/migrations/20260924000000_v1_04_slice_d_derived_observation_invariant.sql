-- External provider observations are derived facts; direct facts are seeds.
alter table public.organic_external_observations
  alter column direct_or_derived set default 'derived';

alter table public.organic_external_observations
  drop constraint if exists organic_external_observations_direct_or_derived_check;

alter table public.organic_external_observations
  add constraint organic_external_observations_direct_or_derived_check
  check (direct_or_derived = 'derived');
