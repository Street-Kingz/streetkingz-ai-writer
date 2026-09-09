-- V1-05 confirmed PROVIDER_LENGTH correction. Historical usage and failure rows remain intact.
alter table public.organic_candidate_evaluation_runs drop constraint if exists organic_candidate_evaluation_runs_output_tokens_check;
alter table public.organic_candidate_interpretation_batches drop constraint if exists organic_candidate_interpretation_batches_output_tokens_check;
alter table public.organic_candidate_evaluation_runs add constraint organic_candidate_evaluation_runs_output_tokens_check check (output_tokens >= 0 and output_tokens <= 40000);
alter table public.organic_candidate_interpretation_batches add constraint organic_candidate_interpretation_batches_output_tokens_check check (output_tokens >= 0 and output_tokens <= 40000);

create or replace function public.start_candidate_interpretation_attempt(p_batch_id uuid, p_claim_token uuid, p_timeout_seconds integer default 300)
returns text language plpgsql security definer set search_path = '' as $$
declare v_batch public.organic_candidate_interpretation_batches; v_run public.organic_candidate_evaluation_runs; v_now timestamptz := clock_timestamp(); v_retry boolean := false;
begin
  select * into v_batch from public.organic_candidate_interpretation_batches where id=p_batch_id for update;
  if not found then return 'not_found'; end if;
  if v_batch.state='complete' then return 'complete'; end if;
  if v_batch.outcome_state='unknown_provider_outcome' or v_batch.state='failed' then return 'provider_outcome_unknown'; end if;
  if v_batch.claim_token is not null and v_batch.claim_token<>p_claim_token and v_batch.claim_expires_at>=v_now then return 'pending'; end if;
  if v_batch.outcome_state='in_flight' and v_batch.claim_expires_at<v_now then
    update public.organic_candidate_interpretation_batches set state='failed',outcome_state='unknown_provider_outcome',safe_error_code='PROVIDER_OUTCOME_UNKNOWN',completed_at=v_now,claim_token=null,claimed_at=null,claim_expires_at=null where id=v_batch.id;
    return 'provider_outcome_unknown';
  end if;
  select * into v_run from public.organic_candidate_evaluation_runs where id=v_batch.evaluation_run_id for update;
  if not found or v_run.state not in ('filter_complete','pending') then return 'pending'; end if;
  if v_batch.request_attempts>0 then v_retry:=true; end if;
  if (select coalesce(sum(request_attempts),0) from public.organic_candidate_interpretation_batches where evaluation_run_id=v_batch.evaluation_run_id)>=6 then return 'attempt_bound_exceeded'; end if;
  if (select coalesce(sum(output_tokens),0) from public.organic_candidate_interpretation_batches where evaluation_run_id=v_batch.evaluation_run_id) + 8000 > 40000 then return 'output_budget_exceeded'; end if;
  if v_retry and v_run.retry_used then return 'retry_exhausted'; end if;
  update public.organic_candidate_interpretation_batches set claim_token=p_claim_token,claimed_at=v_now,claim_expires_at=v_now+make_interval(secs=>greatest(1,least(p_timeout_seconds,3600))),request_attempts=request_attempts+1,attempt_started_at=v_now,outcome_state='in_flight' where id=v_batch.id and state='pending';
  if not found then return 'pending'; end if;
  if v_retry then update public.organic_candidate_evaluation_runs set retry_used=true where id=v_run.id; end if;
  return 'started';
end $$;

-- The original failed request is a known, length-limited outcome (not unknown usage).
-- The recovery manifest remains the authority for the revised two-request allowance.
