-- V1-04 Slice C: bounded site discovery and page-truth evidence.
-- HTML bodies, cookies, credentials and request headers are never persisted.

create table public.organic_site_discovered_urls (
  id bigint generated always as identity primary key,
  business_id uuid not null,
  source_id uuid not null,
  run_id bigint not null,
  normalized_url text not null,
  comparison_url text not null,
  discovery_source text not null check (discovery_source in ('verified_homepage','woo_product','woo_category','robots_sitemap','sitemap','link_frontier')),
  discovery_parent_url text,
  discovered_at timestamptz not null,
  last_discovered_at timestamptz not null,
  inspected_at timestamptz,
  inspection_status text not null default 'discovered' check (inspection_status in ('discovered','inspected','observed_absent','non_html','robots_disallowed','fetch_failed')),
  reason_not_inspected text,
  commerce_product_id uuid,
  commerce_category_id uuid,
  relation_source text check (relation_source is null or relation_source in ('woo_product','woo_category')),
  unique (run_id, comparison_url),
  unique (id, business_id),
  constraint organic_site_url_business_fk foreign key (business_id) references public.businesses(id) on delete cascade,
  constraint organic_site_url_source_fk foreign key (source_id, business_id) references public.organic_evidence_sources(id, business_id) on delete cascade,
  constraint organic_site_url_run_fk foreign key (run_id, source_id, business_id) references public.organic_evidence_runs(id, source_id, business_id) on delete cascade,
  constraint organic_site_url_product_fk foreign key (commerce_product_id) references public.commerce_products(id) on delete set null,
  constraint organic_site_url_category_fk foreign key (commerce_category_id) references public.commerce_categories(id) on delete set null,
  constraint organic_site_url_relation_shape check ((commerce_product_id is null and commerce_category_id is null) or (commerce_product_id is not null and commerce_category_id is null and relation_source = 'woo_product') or (commerce_product_id is null and commerce_category_id is not null and relation_source = 'woo_category'))
);

create table public.organic_site_inspected_pages (
  id bigint generated always as identity primary key,
  business_id uuid not null,
  source_id uuid not null,
  run_id bigint not null,
  discovered_url_id bigint not null,
  requested_url text not null,
  final_url text,
  http_status integer check (http_status is null or http_status between 100 and 599),
  content_type text,
  retrieved_at timestamptz not null,
  response_size_bytes integer check (response_size_bytes is null or response_size_bytes >= 0),
  status text not null check (status in ('inspected','observed_absent','non_html','robots_disallowed','fetch_failed')),
  declared_canonical_raw text,
  declared_canonical_resolved text,
  canonical_state text not null check (canonical_state in ('same_boundary','external','invalid','absent')),
  robots_allowed boolean,
  meta_noindex boolean,
  x_robots_noindex boolean,
  page_type text not null check (page_type in ('homepage','product','category','content','unknown')),
  title text,
  meta_description text,
  h1 jsonb not null default '[]'::jsonb check (jsonb_typeof(h1) = 'array'),
  headings jsonb not null default '[]'::jsonb check (jsonb_typeof(headings) = 'array'),
  internal_links jsonb not null default '[]'::jsonb check (jsonb_typeof(internal_links) = 'array'),
  limitation text,
  direct_or_derived text not null default 'direct' check (direct_or_derived in ('direct','derived')),
  provider_version text not null,
  source_version text not null,
  unique (run_id, requested_url),
  constraint organic_site_page_business_fk foreign key (business_id) references public.businesses(id) on delete cascade,
  constraint organic_site_page_source_fk foreign key (source_id, business_id) references public.organic_evidence_sources(id, business_id) on delete cascade,
  constraint organic_site_page_run_fk foreign key (run_id, source_id, business_id) references public.organic_evidence_runs(id, source_id, business_id) on delete cascade,
  constraint organic_site_page_url_fk foreign key (discovered_url_id, business_id) references public.organic_site_discovered_urls(id, business_id) on delete cascade
);

create index organic_site_urls_current_idx on public.organic_site_discovered_urls(business_id, run_id, comparison_url);
create index organic_site_pages_current_idx on public.organic_site_inspected_pages(business_id, run_id, requested_url);

alter table public.organic_site_discovered_urls enable row level security;
alter table public.organic_site_inspected_pages enable row level security;
revoke all on public.organic_site_discovered_urls, public.organic_site_inspected_pages from public, anon, authenticated;
grant select on public.organic_site_discovered_urls, public.organic_site_inspected_pages to authenticated;
grant select, insert on public.organic_site_discovered_urls, public.organic_site_inspected_pages to service_role;

create policy organic_site_url_owner_select on public.organic_site_discovered_urls
  for select to authenticated using (
    exists (select 1 from public.businesses b join public.accounts a on a.id = b.account_id
      join public.organic_evidence_sources s on s.id = organic_site_discovered_urls.source_id and s.business_id = organic_site_discovered_urls.business_id
      where b.id = organic_site_discovered_urls.business_id and a.auth_user_id = auth.uid() and s.current_complete_run = organic_site_discovered_urls.run_id)
  );

create policy organic_site_page_owner_select on public.organic_site_inspected_pages
  for select to authenticated using (
    exists (select 1 from public.businesses b join public.accounts a on a.id = b.account_id
      join public.organic_evidence_sources s on s.id = organic_site_inspected_pages.source_id and s.business_id = organic_site_inspected_pages.business_id
      where b.id = organic_site_inspected_pages.business_id and a.auth_user_id = auth.uid() and s.current_complete_run = organic_site_inspected_pages.run_id)
  );
