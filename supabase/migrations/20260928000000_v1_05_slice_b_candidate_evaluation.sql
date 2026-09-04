-- V1-05 Slice B: durable filtering and interpretation history.
create table public.organic_candidate_evaluation_runs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  decision_run_id uuid not null references public.organic_decision_runs(id) on delete cascade,
  evaluation_version text not null,
  input_hash text not null,
  filter_version text not null,
  interpretation_version text not null,
  instruction_version text not null,
  state text not null check (state in ('pending','filter_complete','interpretation_complete','failed')),
  discovered_count integer not null default 0 check (discovered_count >= 0),
  deterministic_rejected_count integer not null default 0 check (deterministic_rejected_count >= 0),
  post_filter_count integer not null default 0 check (post_filter_count >= 0),
  bounded_out_count integer not null default 0 check (bounded_out_count >= 0),
  interpreted_count integer not null default 0 check (interpreted_count >= 0),
  interpretive_rejected_count integer not null default 0 check (interpretive_rejected_count >= 0),
  overlap_group_count integer not null default 0 check (overlap_group_count >= 0),
  model_provider text,
  model_name text,
  model_request_attempts integer not null default 0 check (model_request_attempts >= 0 and model_request_attempts <= 6),
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0 and output_tokens <= 20000),
  limitation_codes text[] not null default '{}',
  correlation_id text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (business_id, decision_run_id, evaluation_version, input_hash)
);

create table public.organic_candidate_evaluations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  evaluation_run_id uuid not null references public.organic_candidate_evaluation_runs(id) on delete cascade,
  decision_run_id uuid not null references public.organic_decision_runs(id) on delete cascade,
  candidate_id uuid not null references public.organic_opportunity_candidates(candidate_id) on delete cascade,
  evaluation_version text not null,
  deterministic_disposition text not null check (deterministic_disposition in ('pass','reject','bounded_out','not_applicable')),
  deterministic_reason_codes text[] not null default '{}',
  overlap_group_id text,
  target_attribution_state text not null check (target_attribution_state in ('established','ambiguous','unresolved','invalid','not_applicable')),
  attributed_target_resources jsonb not null default '[]',
  customer_job text,
  intent_class text,
  intent_confidence text check (intent_confidence is null or intent_confidence in ('high','medium','low','unknown')),
  page_type_fit text check (page_type_fit is null or page_type_fit in ('aligned','misaligned','ambiguous','unknown','not_applicable')),
  relevance_state text check (relevance_state is null or relevance_state in ('relevant','irrelevant','uncertain')),
  new_asset_fit text check (new_asset_fit is null or new_asset_fit in ('supported','redundant','uncertain','not_applicable')),
  interpretation_state text not null check (interpretation_state in ('not_applicable','pending','complete','failed')),
  interpretive_disposition text not null check (interpretive_disposition in ('retain','retain_uncertain','reject_mismatch','reject_wrong_page_type','not_applicable')),
  interpretive_reason_codes text[] not null default '{}',
  evidence_refs jsonb not null default '[]',
  limitations text[] not null default '{}',
  interpretation_input_hash text,
  model_provider text,
  model_name text,
  instruction_version text,
  provider_response_id text,
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (evaluation_run_id, candidate_id)
);

create table public.organic_candidate_interpretation_batches (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  evaluation_run_id uuid not null references public.organic_candidate_evaluation_runs(id) on delete cascade,
  batch_index integer not null check (batch_index >= 0 and batch_index < 5),
  candidate_ids uuid[] not null check (cardinality(candidate_ids) between 1 and 10),
  input_hash text not null,
  state text not null check (state in ('pending','complete','failed')),
  request_attempts integer not null default 0 check (request_attempts >= 0 and request_attempts <= 6),
  provider text,
  model text,
  response_id text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0 check (output_tokens >= 0 and output_tokens <= 20000),
  safe_error_code text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (evaluation_run_id, batch_index, input_hash)
);

alter table public.organic_candidate_evaluation_runs enable row level security;
alter table public.organic_candidate_evaluations enable row level security;
alter table public.organic_candidate_interpretation_batches enable row level security;

revoke all on public.organic_candidate_evaluation_runs, public.organic_candidate_evaluations, public.organic_candidate_interpretation_batches from public, anon, authenticated;
grant select on public.organic_candidate_evaluation_runs, public.organic_candidate_evaluations, public.organic_candidate_interpretation_batches to authenticated;
grant all on public.organic_candidate_evaluation_runs, public.organic_candidate_evaluations, public.organic_candidate_interpretation_batches to service_role;

create policy organic_candidate_evaluation_run_owner_select on public.organic_candidate_evaluation_runs
  for select to authenticated using (exists (select 1 from public.businesses b join public.accounts a on a.id=b.account_id where b.id=organic_candidate_evaluation_runs.business_id and a.auth_user_id=auth.uid()));
create policy organic_candidate_evaluation_owner_select on public.organic_candidate_evaluations
  for select to authenticated using (exists (select 1 from public.businesses b join public.accounts a on a.id=b.account_id where b.id=organic_candidate_evaluations.business_id and a.auth_user_id=auth.uid()));
create policy organic_candidate_batch_owner_select on public.organic_candidate_interpretation_batches
  for select to authenticated using (exists (select 1 from public.businesses b join public.accounts a on a.id=b.account_id where b.id=organic_candidate_interpretation_batches.business_id and a.auth_user_id=auth.uid()));
