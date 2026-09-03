-- V1-04 B2 Search Analytics observations.  Raw provider responses and credentials
-- are deliberately not part of the customer evidence model.
alter table public.organic_evidence_runs
  add constraint organic_run_id_source_business_unique unique (id, source_id, business_id);

create table public.organic_search_console_observations (
  id bigint generated always as identity primary key,
  business_id uuid not null,
  connection_id uuid not null,
  source_id uuid not null,
  run_id bigint not null,
  provider text not null default 'google_search_console' check (provider = 'google_search_console'),
  property_identity text not null,
  grain text not null check (grain in ('trend','query','page','query_page')),
  observed_date date,
  query text,
  page_url text,
  clicks numeric not null check (clicks >= 0),
  impressions numeric not null check (impressions >= 0),
  ctr numeric not null check (ctr >= 0 and ctr <= 1),
  average_position numeric not null check (average_position >= 0),
  requested_start_date date not null,
  requested_end_date date not null,
  observed_start_date date,
  observed_end_date date,
  retrieved_at timestamptz not null,
  evidence_as_of date,
  completeness text not null check (completeness in ('complete','partial','provider_limited','empty')),
  provider_limitations jsonb not null default '[]'::jsonb check (jsonb_typeof(provider_limitations) = 'array'),
  direct_or_derived text not null default 'direct' check (direct_or_derived = 'direct'),
  provider_version text not null,
  source_version text not null,
  observation_identity text not null unique,
  created_at timestamptz not null default now(),
  constraint organic_gsc_observation_business_fk foreign key (business_id) references public.businesses(id) on delete cascade,
  constraint organic_gsc_observation_connection_fk foreign key (connection_id, business_id) references public.connections(id, business_id) on delete cascade,
  constraint organic_gsc_observation_source_fk foreign key (source_id, business_id) references public.organic_evidence_sources(id, business_id) on delete cascade,
  constraint organic_gsc_observation_run_fk foreign key (run_id, source_id, business_id) references public.organic_evidence_runs(id, source_id, business_id) on delete cascade,
  constraint organic_gsc_observation_period_order check (requested_end_date >= requested_start_date),
  constraint organic_gsc_observation_date_shape check (
    (grain = 'trend' and observed_date is not null and query is null and page_url is null)
    or (grain = 'query' and observed_date is null and query is not null and page_url is null)
    or (grain = 'page' and observed_date is null and query is null and page_url is not null)
    or (grain = 'query_page' and observed_date is null and query is not null and page_url is not null)
  )
);

create index organic_gsc_observations_run_idx on public.organic_search_console_observations(run_id, grain, id);
create index organic_gsc_observations_business_idx on public.organic_search_console_observations(business_id, grain, observed_date);

alter table public.organic_search_console_observations enable row level security;
revoke all on public.organic_search_console_observations from public, anon, authenticated;
grant select on public.organic_search_console_observations to authenticated;
grant select, insert on public.organic_search_console_observations to service_role;

create policy organic_gsc_observation_owner_select
  on public.organic_search_console_observations for select to authenticated
  using (
    exists (
      select 1
      from public.businesses b
      join public.accounts a on a.id = b.account_id
      join public.organic_evidence_sources s on s.id = organic_search_console_observations.source_id
        and s.business_id = organic_search_console_observations.business_id
      join public.organic_evidence_runs r on r.id = organic_search_console_observations.run_id
        and r.source_id = organic_search_console_observations.source_id
        and r.business_id = organic_search_console_observations.business_id
      where b.id = organic_search_console_observations.business_id
        and a.auth_user_id = auth.uid()
        and r.state = 'complete'
        and s.current_complete_run = r.id
    )
  );

alter table public.organic_evidence_runs
  drop constraint if exists organic_run_completeness_state_check;
alter table public.organic_evidence_runs
  add constraint organic_run_completeness_state_check
  check (completeness_state in ('unknown','complete','partial','provider_limited','unavailable','empty'));

alter table public.organic_evidence_sources
  drop constraint if exists organic_source_current_completeness_check;
alter table public.organic_evidence_sources
  add constraint organic_source_current_completeness_check
  check (current_completeness_state is null or current_completeness_state in ('complete','provider_limited','empty'));

create or replace function public.organic_finish_run(
  p_run_id bigint,
  p_state text,
  p_completeness_state text default 'unknown',
  p_evidence_as_of timestamptz default null,
  p_error_code text default null
)
returns public.organic_evidence_runs
language plpgsql security definer set search_path = '' as $$
declare v_run public.organic_evidence_runs; v_source public.organic_evidence_sources;
begin
  if auth.role() <> 'service_role' then raise exception 'SERVICE_ROLE_REQUIRED'; end if;
  if p_state not in ('complete','partial','failed') then raise exception 'ORGANIC_RUN_STATE_INVALID'; end if;
  if p_completeness_state not in ('unknown','complete','partial','provider_limited','unavailable','empty') then raise exception 'ORGANIC_COMPLETENESS_INVALID'; end if;
  if p_state = 'complete' and p_completeness_state not in ('complete','provider_limited','empty') then raise exception 'ORGANIC_COMPLETE_INCOMPLETE'; end if;
  if p_state = 'complete' and p_completeness_state <> 'empty' and p_evidence_as_of is null then raise exception 'ORGANIC_EVIDENCE_AS_OF_REQUIRED'; end if;
  if p_state = 'complete' and p_error_code is not null then raise exception 'ORGANIC_COMPLETE_ERROR_INVALID'; end if;
  if p_state = 'partial' and p_completeness_state <> 'partial' then raise exception 'ORGANIC_PARTIAL_COMPLETENESS_INVALID'; end if;
  if p_state = 'failed' and p_completeness_state <> 'unavailable' then raise exception 'ORGANIC_FAILED_COMPLETENESS_INVALID'; end if;
  if p_state <> 'complete' and p_error_code is null then raise exception 'ORGANIC_ERROR_REQUIRED'; end if;
  select * into v_run from public.organic_evidence_runs where id = p_run_id for update;
  if not found then raise exception 'ORGANIC_RUN_NOT_FOUND'; end if;
  select * into v_source from public.organic_evidence_sources where id = v_run.source_id for update;
  if v_source.active_run is distinct from v_run.id or v_run.state <> 'pending' then raise exception 'ORGANIC_RUN_STALE'; end if;
  update public.organic_evidence_runs set state = p_state, completed_at = clock_timestamp(), completeness_state = p_completeness_state, evidence_as_of = p_evidence_as_of, error_code = p_error_code where id = v_run.id returning * into v_run;
  if p_state = 'complete' then
    update public.organic_evidence_sources set active_run = null, current_complete_run = v_run.id, current_completeness_state = p_completeness_state, evidence_state = 'complete', last_successful_at = v_run.completed_at, evidence_as_of = v_run.evidence_as_of, updated_at = clock_timestamp() where id = v_source.id;
  else
    update public.organic_evidence_sources set active_run = null, evidence_state = p_state, updated_at = clock_timestamp() where id = v_source.id;
  end if;
  return v_run;
end $$;

revoke all on function public.organic_finish_run(bigint,text,text,timestamptz,text) from public, anon, authenticated;
grant execute on function public.organic_finish_run(bigint,text,text,timestamptz,text) to service_role;
