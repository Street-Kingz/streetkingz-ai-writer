-- V1-04 Slice A integrity corrections. The original Slice A migration is immutable.

alter table public.organic_evidence_runs
  add column if not exists evidence_as_of timestamptz;

alter table public.organic_evidence_sources
  add column if not exists current_completeness_state text;

alter table public.organic_evidence_sources
  add constraint organic_source_current_completeness_check
  check (current_completeness_state is null or current_completeness_state in ('complete','provider_limited'));

update public.organic_evidence_sources s
set current_completeness_state = r.completeness_state
from public.organic_evidence_runs r
where r.id = s.current_complete_run
  and r.state = 'complete'
  and r.completeness_state in ('complete','provider_limited')
  and s.current_completeness_state is null;

create or replace function public.organic_source_pointer_owner_guard()
returns trigger
language plpgsql
security definer
set search_path = '' as $$
begin
  if new.current_complete_run is not null and not exists (
    select 1 from public.organic_evidence_runs r
    where r.id = new.current_complete_run
      and r.source_id = new.id
      and r.business_id = new.business_id
  ) then
    raise exception 'ORGANIC_CURRENT_RUN_OWNERSHIP_INVALID';
  end if;
  if new.active_run is not null and not exists (
    select 1 from public.organic_evidence_runs r
    where r.id = new.active_run
      and r.source_id = new.id
      and r.business_id = new.business_id
  ) then
    raise exception 'ORGANIC_ACTIVE_RUN_OWNERSHIP_INVALID';
  end if;
  return new;
end $$;

drop trigger if exists organic_source_pointer_owner on public.organic_evidence_sources;
create constraint trigger organic_source_pointer_owner
after insert or update of business_id, current_complete_run, active_run on public.organic_evidence_sources
deferrable initially immediate
for each row execute function public.organic_source_pointer_owner_guard();

create or replace function public.organic_ensure_source(
  p_business_id uuid,
  p_source_class text,
  p_source_kind text,
  p_provider_id text default null,
  p_connection_id uuid default null
)
returns public.organic_evidence_sources
language plpgsql security definer set search_path = '' as $$
declare v_row public.organic_evidence_sources; v_provider text := nullif(trim(p_provider_id), '');
begin
  if auth.role() <> 'service_role' then raise exception 'SERVICE_ROLE_REQUIRED'; end if;
  if not exists (select 1 from public.businesses where id = p_business_id and status = 'active') then
    raise exception 'BUSINESS_NOT_FOUND';
  end if;
  select * into v_row from public.organic_evidence_sources
  where business_id = p_business_id and source_kind = p_source_kind
    and coalesce(provider_id, '') = coalesce(v_provider, '')
  for update;
  if found then
    if v_row.source_class is distinct from p_source_class
       or v_row.provider_id is distinct from v_provider
       or v_row.connection_id is distinct from p_connection_id then
      raise exception 'ORGANIC_SOURCE_CONFLICT';
    end if;
    update public.organic_evidence_sources set updated_at = clock_timestamp() where id = v_row.id returning * into v_row;
    return v_row;
  end if;
  insert into public.organic_evidence_sources(business_id, source_class, source_kind, provider_id, connection_id)
  values (p_business_id, p_source_class, p_source_kind, v_provider, p_connection_id)
  returning * into v_row;
  return v_row;
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
  if p_state = 'complete' and p_completeness_state not in ('complete','provider_limited') then raise exception 'ORGANIC_COMPLETE_INCOMPLETE'; end if;
  if p_state = 'complete' and p_evidence_as_of is null then raise exception 'ORGANIC_EVIDENCE_AS_OF_REQUIRED'; end if;
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

revoke insert, update, delete on public.organic_evidence_sources, public.organic_evidence_runs from service_role;
grant select on public.organic_evidence_sources, public.organic_evidence_runs to service_role;

revoke all on function public.organic_ensure_source(uuid,text,text,text,uuid), public.organic_begin_run(uuid,text,timestamptz,timestamptz,timestamptz,text,text), public.organic_finish_run(bigint,text,text,timestamptz,text) from public, anon, authenticated;
grant execute on function public.organic_ensure_source(uuid,text,text,text,uuid), public.organic_begin_run(uuid,text,timestamptz,timestamptz,timestamptz,text,text), public.organic_finish_run(bigint,text,text,timestamptz,text) to service_role;
