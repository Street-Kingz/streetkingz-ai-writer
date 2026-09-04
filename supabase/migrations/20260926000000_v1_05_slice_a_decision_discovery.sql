-- V1-05 Slice A: durable discovery runs and generic opportunity candidates.
-- Decision inputs and candidate evidence remain references to accepted evidence;
-- raw source records are deliberately not copied here.
create table public.organic_decision_runs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  snapshot_fingerprint text not null check (length(snapshot_fingerprint) = 64),
  input_hash text not null check (length(input_hash) = 64),
  source_references jsonb not null default '[]'::jsonb check (jsonb_typeof(source_references) = 'array'),
  discovery_version text not null check (length(discovery_version) between 1 and 100),
  state text not null default 'pending' check (state in ('pending','discovery_complete','failed')),
  outcome text check (outcome is null or outcome in ('recommendations','no_action','insufficient_evidence')),
  candidate_count integer not null default 0 check (candidate_count between 0 and 200),
  discovery_completeness text not null default 'empty' check (discovery_completeness in ('complete','partial','empty','failed')),
  limitation_codes jsonb not null default '[]'::jsonb check (jsonb_typeof(limitation_codes) = 'array'),
  correlation_id text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, business_id),
  check ((state = 'pending' and completed_at is null) or (state <> 'pending' and completed_at is not null)),
  check (state <> 'discovery_complete' or outcome is null)
);
create unique index organic_decision_runs_success_key on public.organic_decision_runs(business_id, snapshot_fingerprint, input_hash, discovery_version) where state = 'discovery_complete';
create unique index organic_decision_runs_pending_key on public.organic_decision_runs(business_id, snapshot_fingerprint, input_hash, discovery_version) where state = 'pending';
create index organic_decision_runs_business_created_idx on public.organic_decision_runs(business_id, created_at desc);

create table public.organic_opportunity_candidates (
  candidate_id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  decision_run_id uuid not null references public.organic_decision_runs(id) on delete cascade,
  candidate_identity text not null check (length(candidate_identity) between 1 and 200),
  candidate_type text not null check (candidate_type in ('existing_product_improvement','existing_category_improvement','existing_content_improvement','new_page_or_content_asset','internal_linking')),
  target_resources jsonb not null default '[]'::jsonb check (jsonb_typeof(target_resources) = 'array'),
  target_resource_type text not null check (length(target_resource_type) between 1 and 50),
  discovery_sources jsonb not null default '[]'::jsonb check (jsonb_typeof(discovery_sources) = 'array'),
  evidence_refs jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence_refs) = 'array'),
  direct_derived_relationships jsonb not null default '[]'::jsonb check (jsonb_typeof(direct_derived_relationships) = 'array'),
  market text not null check (length(market) between 1 and 20),
  language text not null check (length(language) between 1 and 20),
  freshness_state text not null check (length(freshness_state) between 1 and 40),
  completeness text not null check (length(completeness) between 1 and 40),
  limitations jsonb not null default '[]'::jsonb check (jsonb_typeof(limitations) = 'array'),
  overlap_group_id text,
  candidate_status text not null default 'discovered' check (candidate_status in ('discovered','eligible','rejected','interpreted')),
  rejection_reason_codes jsonb not null default '[]'::jsonb check (jsonb_typeof(rejection_reason_codes) = 'array'),
  snapshot_id text,
  candidate_version text not null,
  evaluated_at timestamptz,
  created_at timestamptz not null default now(),
  unique (decision_run_id, candidate_identity),
  unique (candidate_id, business_id),
  constraint organic_candidate_run_business_fk foreign key (decision_run_id, business_id) references public.organic_decision_runs(id, business_id) on delete cascade
);
create index organic_candidates_run_idx on public.organic_opportunity_candidates(decision_run_id, created_at, candidate_id);

alter table public.organic_decision_runs enable row level security;
alter table public.organic_opportunity_candidates enable row level security;
revoke all on public.organic_decision_runs, public.organic_opportunity_candidates from public, anon, authenticated;
grant select on public.organic_decision_runs, public.organic_opportunity_candidates to authenticated;
grant select, insert, update on public.organic_decision_runs, public.organic_opportunity_candidates to service_role;
create policy organic_decision_run_owner_select on public.organic_decision_runs for select to authenticated using (
  exists (select 1 from public.businesses b join public.accounts a on a.id=b.account_id where b.id=organic_decision_runs.business_id and a.auth_user_id=auth.uid())
);
create policy organic_candidate_owner_select on public.organic_opportunity_candidates for select to authenticated using (
  exists (select 1 from public.businesses b join public.accounts a on a.id=b.account_id where b.id=organic_opportunity_candidates.business_id and a.auth_user_id=auth.uid())
);
