-- V1-04 Slice D: bounded DataForSEO external evidence.
-- Credentials and raw provider responses are deliberately excluded.

create table public.organic_external_seeds (
  id bigint generated always as identity primary key,
  business_id uuid not null,
  source_id uuid not null,
  run_id bigint not null,
  seed_id text not null,
  source_class text not null check (source_class in ('woo_product','woo_category','site_title','site_h1','gsc_query')),
  source_record_identity text not null,
  source_text text not null,
  normalized_text text not null,
  locale text not null default 'GB',
  language_code text not null default 'en',
  direct_or_derived text not null default 'direct' check (direct_or_derived = 'direct'),
  provenance jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  created_at timestamptz not null default now(),
  unique (run_id, seed_id),
  unique (id, business_id),
  constraint external_seed_business_fk foreign key (business_id) references public.businesses(id) on delete cascade,
  constraint external_seed_source_fk foreign key (source_id, business_id) references public.organic_evidence_sources(id, business_id) on delete cascade,
  constraint external_seed_run_fk foreign key (run_id, source_id, business_id) references public.organic_evidence_runs(id, source_id, business_id) on delete cascade
);

create table public.organic_external_provider_requests (
  id bigint generated always as identity primary key,
  business_id uuid not null,
  source_id uuid not null,
  run_id bigint not null,
  seed_id bigint,
  provider text not null default 'dataforseo' check (provider = 'dataforseo'),
  endpoint text not null check (endpoint in ('/v3/dataforseo_labs/google/keyword_ideas/live','/v3/serp/google/organic/live/advanced')),
  request_class text not null check (request_class in ('keyword_ideas','serp_organic')),
  request_fingerprint text not null unique,
  scope jsonb not null default '{}'::jsonb check (jsonb_typeof(scope) = 'object'),
  status text not null default 'reserved' check (status in ('reserved','running','complete','reused','failed','cancelled')),
  estimated_reserved_cost numeric not null check (estimated_reserved_cost >= 0),
  actual_cost numeric check (actual_cost is null or actual_cost >= 0),
  provider_task_id text,
  cache_state text not null default 'miss' check (cache_state in ('miss','hit')),
  started_at timestamptz,
  completed_at timestamptz,
  error_code text,
  created_at timestamptz not null default now(),
  unique (id, business_id),
  constraint external_request_business_fk foreign key (business_id) references public.businesses(id) on delete cascade,
  constraint external_request_source_fk foreign key (source_id, business_id) references public.organic_evidence_sources(id, business_id) on delete cascade,
  constraint external_request_run_fk foreign key (run_id, source_id, business_id) references public.organic_evidence_runs(id, source_id, business_id) on delete cascade,
  constraint external_request_seed_fk foreign key (seed_id, business_id) references public.organic_external_seeds(id, business_id) on delete set null
);

create table public.organic_external_observations (
  id bigint generated always as identity primary key,
  business_id uuid not null,
  source_id uuid not null,
  run_id bigint not null,
  seed_id bigint not null,
  provider text not null default 'dataforseo' check (provider = 'dataforseo'),
  observation_type text not null check (observation_type in ('keyword_idea','serp_organic_result')),
  query_text text not null,
  search_volume numeric check (search_volume is null or search_volume >= 0),
  monthly_searches jsonb check (monthly_searches is null or jsonb_typeof(monthly_searches) = 'array'),
  rank_group integer check (rank_group is null or rank_group > 0),
  rank_absolute integer check (rank_absolute is null or rank_absolute > 0),
  result_url text,
  result_domain text,
  result_title text,
  result_description text,
  location_code integer not null default 2826 check (location_code = 2826),
  language_code text not null default 'en' check (language_code = 'en'),
  device text check (device is null or device = 'desktop'),
  observed_at timestamptz,
  retrieved_at timestamptz not null,
  completeness text not null check (completeness in ('complete','partial','empty','failed','provider_limited')),
  limitations jsonb not null default '[]'::jsonb check (jsonb_typeof(limitations) = 'array'),
  provenance jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  direct_or_derived text not null default 'direct' check (direct_or_derived = 'direct'),
  provider_version text not null,
  normalizer_version text not null,
  observation_identity text not null unique,
  created_at timestamptz not null default now(),
  constraint external_observation_business_fk foreign key (business_id) references public.businesses(id) on delete cascade,
  constraint external_observation_source_fk foreign key (source_id, business_id) references public.organic_evidence_sources(id, business_id) on delete cascade,
  constraint external_observation_run_fk foreign key (run_id, source_id, business_id) references public.organic_evidence_runs(id, source_id, business_id) on delete cascade,
  constraint external_observation_seed_fk foreign key (seed_id, business_id) references public.organic_external_seeds(id, business_id) on delete cascade,
  constraint external_observation_shape check ((observation_type = 'keyword_idea' and rank_group is null and rank_absolute is null and result_url is null and result_domain is null) or (observation_type = 'serp_organic_result' and rank_group is not null and result_url is not null and result_domain is not null))
);

create index organic_external_seeds_run_idx on public.organic_external_seeds(run_id, source_class, normalized_text);
create index organic_external_requests_run_idx on public.organic_external_provider_requests(run_id, request_class);
create index organic_external_observations_run_idx on public.organic_external_observations(run_id, observation_type, id);

alter table public.organic_external_seeds enable row level security;
alter table public.organic_external_provider_requests enable row level security;
alter table public.organic_external_observations enable row level security;
revoke all on public.organic_external_seeds, public.organic_external_provider_requests, public.organic_external_observations from public, anon, authenticated;
grant select on public.organic_external_seeds, public.organic_external_provider_requests, public.organic_external_observations to authenticated;
grant select, insert, update on public.organic_external_seeds, public.organic_external_provider_requests, public.organic_external_observations to service_role;

create policy organic_external_seed_owner_select on public.organic_external_seeds for select to authenticated using (
  exists (select 1 from public.businesses b join public.accounts a on a.id = b.account_id join public.organic_evidence_sources s on s.id = organic_external_seeds.source_id and s.business_id = organic_external_seeds.business_id where b.id = organic_external_seeds.business_id and a.auth_user_id = auth.uid() and s.current_complete_run = organic_external_seeds.run_id)
);
create policy organic_external_request_owner_select on public.organic_external_provider_requests for select to authenticated using (
  exists (select 1 from public.businesses b join public.accounts a on a.id = b.account_id join public.organic_evidence_sources s on s.id = organic_external_provider_requests.source_id and s.business_id = organic_external_provider_requests.business_id where b.id = organic_external_provider_requests.business_id and a.auth_user_id = auth.uid() and s.current_complete_run = organic_external_provider_requests.run_id)
);
create policy organic_external_observation_owner_select on public.organic_external_observations for select to authenticated using (
  exists (select 1 from public.businesses b join public.accounts a on a.id = b.account_id join public.organic_evidence_sources s on s.id = organic_external_observations.source_id and s.business_id = organic_external_observations.business_id where b.id = organic_external_observations.business_id and a.auth_user_id = auth.uid() and s.current_complete_run = organic_external_observations.run_id)
);
