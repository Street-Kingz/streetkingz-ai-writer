-- V1-05 Slice B corrective pass. Historical migrations remain immutable.
alter table public.businesses
  add column if not exists primary_market text,
  add column if not exists primary_language text;
alter table public.businesses
  add constraint businesses_primary_market_bounded check (primary_market is null or primary_market ~ '^[A-Z]{2,3}$'),
  add constraint businesses_primary_language_bounded check (primary_language is null or primary_language ~ '^[a-z]{2,3}(-[A-Z]{2})?$');

create or replace function public.product_set_business_locale(p_market text, p_language text, p_correlation_id uuid)
returns public.businesses language plpgsql security definer set search_path = '' as $$
declare v_account public.accounts; v_row public.businesses;
begin
  select * into v_account from public.accounts where auth_user_id=auth.uid() and status='active';
  if not found then raise exception 'ACCOUNT_NOT_ACTIVE'; end if;
  if p_market is null or p_market !~ '^[A-Z]{2,3}$' or p_language is null or p_language !~ '^[a-z]{2,3}(-[A-Z]{2})?$' then raise exception 'INVALID_BUSINESS_LOCALE'; end if;
  update public.businesses set primary_market=p_market, primary_language=p_language where account_id=v_account.id and status='active' returning * into v_row;
  if not found then raise exception 'BUSINESS_NOT_PROVISIONED'; end if;
  insert into public.audit_events(account_id,business_id,event_type,correlation_id,safe_metadata) values(v_account.id,v_row.id,'business_locale_set',p_correlation_id::text,jsonb_build_object('market',p_market,'language',p_language));
  return v_row;
end $$;
revoke all on function public.product_set_business_locale(text,text,uuid) from public, anon;
grant execute on function public.product_set_business_locale(text,text,uuid) to authenticated;

alter table public.organic_candidate_evaluation_runs
  add column if not exists retry_used boolean not null default false,
  add column if not exists estimated_cost_usd numeric(12,8),
  add column if not exists cost_status text not null default 'unknown' check (cost_status in ('unknown','calculated_from_explicit_configuration'));
alter table public.organic_opportunity_candidates
  add column if not exists allowed_target_refs jsonb not null default '[]'::jsonb check (jsonb_typeof(allowed_target_refs) = 'array');
alter table public.organic_candidate_interpretation_batches
  add column if not exists claim_token uuid,
  add column if not exists claimed_at timestamptz,
  add column if not exists claim_expires_at timestamptz,
  add column if not exists estimated_cost_usd numeric(12,8),
  add column if not exists cost_status text not null default 'unknown' check (cost_status in ('unknown','calculated_from_explicit_configuration'));
create index if not exists organic_candidate_batches_claim_idx on public.organic_candidate_interpretation_batches(state, claim_expires_at);

create or replace function public.claim_candidate_interpretation_batch(p_batch_id uuid, p_claim_token uuid, p_timeout_seconds integer default 300)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.organic_candidate_interpretation_batches
    set claim_token=p_claim_token, claimed_at=clock_timestamp(), claim_expires_at=clock_timestamp() + make_interval(secs => greatest(1, least(p_timeout_seconds, 3600)))
  where id=p_batch_id and state='pending' and (claim_token is null or claim_expires_at < clock_timestamp());
  return found;
end $$;
revoke all on function public.claim_candidate_interpretation_batch(uuid,uuid,integer) from public, anon, authenticated;
grant execute on function public.claim_candidate_interpretation_batch(uuid,uuid,integer) to service_role;

-- Runtime-only mutation remains service-role controlled; customers retain read-only RLS.
revoke all on function public.product_set_business_locale(text,text,uuid) from public, anon;
