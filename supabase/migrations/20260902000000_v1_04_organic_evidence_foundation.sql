-- V1-04 Slice A: common organic-evidence source/run envelope only.
-- Source-specific observations belong to later, separately authorized slices.

create table public.organic_evidence_sources (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  source_class text not null check (source_class in ('customer_connected','no_separate_connection','product_connected')),
  source_kind text not null check (source_kind in ('search_console','site','external_search')),
  provider_id text,
  connection_id uuid,
  evidence_state text not null default 'never_collected' check (evidence_state in ('never_collected','collecting','complete','partial','failed','stale')),
  last_attempted_at timestamptz,
  last_successful_at timestamptz,
  evidence_as_of timestamptz,
  current_complete_run bigint,
  active_run bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, business_id),
  constraint organic_source_class_shape check (
    (source_class = 'customer_connected' and source_kind = 'search_console' and provider_id = 'google_search_console' and connection_id is not null)
    or (source_class = 'no_separate_connection' and source_kind = 'site' and provider_id is null and connection_id is null)
    or (source_class = 'product_connected' and source_kind = 'external_search' and provider_id is not null and connection_id is null)
  ),
  constraint organic_source_connection_business_fk foreign key (connection_id, business_id)
    references public.connections(id, business_id) on delete cascade
);
create unique index organic_source_logical_unique
  on public.organic_evidence_sources(business_id, source_kind, coalesce(provider_id, ''));

create table public.organic_evidence_runs (
  id bigint generated always as identity primary key,
  source_id uuid not null,
  business_id uuid not null,
  state text not null default 'pending' check (state in ('pending','complete','partial','failed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  evidence_period_start timestamptz,
  evidence_period_end timestamptz,
  retrieved_at timestamptz,
  completeness_state text not null default 'unknown' check (completeness_state in ('unknown','complete','partial','provider_limited','unavailable')),
  error_code text check (error_code is null or (length(error_code) between 1 and 100 and error_code ~ '^[A-Z0-9_:-]+$')),
  correlation_id text,
  provider_version text,
  source_version text,
  created_at timestamptz not null default now(),
  constraint organic_run_source_business_fk foreign key (source_id, business_id)
    references public.organic_evidence_sources(id, business_id) on delete cascade,
  constraint organic_run_period_order check (evidence_period_end is null or evidence_period_start is null or evidence_period_end >= evidence_period_start),
  constraint organic_run_completion_shape check ((state = 'pending' and completed_at is null) or (state <> 'pending' and completed_at is not null))
);
create index organic_evidence_runs_source_created_idx on public.organic_evidence_runs(source_id, created_at desc);

alter table public.organic_evidence_sources
  add constraint organic_source_current_run_fk foreign key (current_complete_run) references public.organic_evidence_runs(id) on delete set null;
alter table public.organic_evidence_sources
  add constraint organic_source_active_run_fk foreign key (active_run) references public.organic_evidence_runs(id) on delete set null;

alter table public.organic_evidence_sources enable row level security;
alter table public.organic_evidence_runs enable row level security;
revoke all on public.organic_evidence_sources, public.organic_evidence_runs from public, anon, authenticated;
grant select on public.organic_evidence_sources to authenticated;
grant all on public.organic_evidence_sources, public.organic_evidence_runs to service_role;

create policy organic_source_owner_select on public.organic_evidence_sources
  for select to authenticated
  using (business_id in (select b.id from public.businesses b join public.accounts a on a.id = b.account_id where a.auth_user_id = auth.uid()));

create or replace function public.organic_ensure_source(
  p_business_id uuid,
  p_source_class text,
  p_source_kind text,
  p_provider_id text default null,
  p_connection_id uuid default null
)
returns public.organic_evidence_sources
language plpgsql security definer set search_path = '' as $$
declare v_row public.organic_evidence_sources;
begin
  if auth.role() <> 'service_role' then raise exception 'SERVICE_ROLE_REQUIRED'; end if;
  if not exists (select 1 from public.businesses where id = p_business_id and status = 'active') then
    raise exception 'BUSINESS_NOT_FOUND';
  end if;
  insert into public.organic_evidence_sources(business_id, source_class, source_kind, provider_id, connection_id)
  values (p_business_id, p_source_class, p_source_kind, nullif(trim(p_provider_id), ''), p_connection_id)
  on conflict (business_id, source_kind, coalesce(provider_id, '')) do update
    set updated_at = clock_timestamp()
  returning * into v_row;
  return v_row;
end $$;

create or replace function public.organic_begin_run(
  p_source_id uuid,
  p_correlation_id text default null,
  p_evidence_period_start timestamptz default null,
  p_evidence_period_end timestamptz default null,
  p_retrieved_at timestamptz default null,
  p_provider_version text default null,
  p_source_version text default null
)
returns public.organic_evidence_runs
language plpgsql security definer set search_path = '' as $$
declare v_source public.organic_evidence_sources; v_run public.organic_evidence_runs;
begin
  if auth.role() <> 'service_role' then raise exception 'SERVICE_ROLE_REQUIRED'; end if;
  select * into v_source from public.organic_evidence_sources where id = p_source_id for update;
  if not found then raise exception 'ORGANIC_SOURCE_NOT_FOUND'; end if;
  if v_source.active_run is not null then raise exception 'ORGANIC_SOURCE_RUN_ACTIVE'; end if;
  insert into public.organic_evidence_runs(source_id, business_id, evidence_period_start, evidence_period_end, retrieved_at, correlation_id, provider_version, source_version)
  values (v_source.id, v_source.business_id, p_evidence_period_start, p_evidence_period_end, p_retrieved_at, p_correlation_id, p_provider_version, p_source_version)
  returning * into v_run;
  update public.organic_evidence_sources set active_run = v_run.id, evidence_state = 'collecting', last_attempted_at = clock_timestamp() where id = v_source.id;
  return v_run;
end $$;

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
  if p_completeness_state not in ('unknown','complete','partial','provider_limited','unavailable') then raise exception 'ORGANIC_COMPLETENESS_INVALID'; end if;
  select * into v_run from public.organic_evidence_runs where id = p_run_id for update;
  if not found then raise exception 'ORGANIC_RUN_NOT_FOUND'; end if;
  select * into v_source from public.organic_evidence_sources where id = v_run.source_id for update;
  if v_source.active_run is distinct from v_run.id or v_run.state <> 'pending' then raise exception 'ORGANIC_RUN_STALE'; end if;
  update public.organic_evidence_runs set state = p_state, completed_at = clock_timestamp(), completeness_state = p_completeness_state, error_code = p_error_code where id = v_run.id returning * into v_run;
  if p_state = 'complete' then
    update public.organic_evidence_sources set active_run = null, current_complete_run = v_run.id, evidence_state = 'complete', last_successful_at = v_run.completed_at, evidence_as_of = p_evidence_as_of, updated_at = clock_timestamp() where id = v_source.id;
  else
    update public.organic_evidence_sources set active_run = null, evidence_state = p_state, updated_at = clock_timestamp() where id = v_source.id;
  end if;
  return v_run;
end $$;

revoke all on function public.organic_ensure_source(uuid,text,text,text,uuid), public.organic_begin_run(uuid,text,timestamptz,timestamptz,timestamptz,text,text), public.organic_finish_run(bigint,text,text,timestamptz,text) from public, anon, authenticated;
grant execute on function public.organic_ensure_source(uuid,text,text,text,uuid), public.organic_begin_run(uuid,text,timestamptz,timestamptz,timestamptz,text,text), public.organic_finish_run(bigint,text,text,timestamptz,text) to service_role;
