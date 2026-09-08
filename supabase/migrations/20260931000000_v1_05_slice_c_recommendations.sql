-- V1-05 Slice C: durable, merchant-safe recommendation records.
create table public.organic_recommendations (
  id uuid primary key default gen_random_uuid(),
  recommendation_id text not null unique,
  business_id uuid not null references public.businesses(id) on delete cascade,
  source_run_id uuid not null references public.organic_decision_runs(id) on delete cascade,
  source_candidate_identity text not null,
  status text not null check (status in ('current','deferred','needs_reassessment','superseded','withdrawn','completed','ignored')),
  intervention text not null check (intervention in ('improve_existing_product','improve_existing_category','improve_existing_content','create_new_page_or_content_asset','improve_internal_linking','no_action','insufficient_evidence')),
  priority_band text not null check (priority_band in ('high','medium','low','reassess')),
  priority_reasons jsonb not null default '[]'::jsonb,
  target_resources jsonb not null default '[]'::jsonb,
  customer_job text,
  merchant_safety_state text not null check (merchant_safety_state in ('safe','uncertain','unsafe')),
  merchant_safety_reasons jsonb not null default '[]'::jsonb,
  commercial_signal jsonb not null default '{}'::jsonb,
  confidence text not null check (confidence in ('high','medium','low','unknown')),
  limitations jsonb not null default '[]'::jsonb,
  evidence_refs jsonb not null default '[]'::jsonb,
  why_this_matters text not null,
  what_to_do_next jsonb not null default '[]'::jsonb,
  recommendation_version text not null,
  candidate_version text,
  interpretation_version text,
  instruction_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(priority_reasons) = 'array' and jsonb_typeof(target_resources) = 'array' and jsonb_typeof(merchant_safety_reasons) = 'array' and jsonb_typeof(limitations) = 'array' and jsonb_typeof(evidence_refs) = 'array' and jsonb_typeof(what_to_do_next) = 'array')
);
create index organic_recommendations_business_feed_idx on public.organic_recommendations(business_id, status, priority_band, updated_at desc);
create index organic_recommendations_run_idx on public.organic_recommendations(business_id, source_run_id);
alter table public.organic_recommendations enable row level security;
revoke all on public.organic_recommendations from public, anon, authenticated;
grant select on public.organic_recommendations to authenticated;
grant all on public.organic_recommendations to service_role;
create policy organic_recommendation_owner_select on public.organic_recommendations
  for select to authenticated using (exists (select 1 from public.businesses b join public.accounts a on a.id=b.account_id where b.id=organic_recommendations.business_id and a.auth_user_id=auth.uid()));
