-- Failed provider attempts remain auditable and must not block later retries.
alter table public.organic_external_provider_requests
  drop constraint if exists organic_external_provider_requests_request_fingerprint_key;

create index organic_external_provider_requests_fingerprint_idx
  on public.organic_external_provider_requests(business_id, request_fingerprint, completed_at desc);

create unique index organic_external_provider_requests_active_fingerprint_key
  on public.organic_external_provider_requests(business_id, request_fingerprint)
  where status in ('reserved','running');
