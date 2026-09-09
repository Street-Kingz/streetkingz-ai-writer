-- Safe diagnostics for interpretation failures. No prompts, evidence, or secrets.
alter table public.organic_candidate_interpretation_batches
  add column if not exists first_failure_code text,
  add column if not exists first_failure_response_id text,
  add column if not exists first_failure_input_tokens integer,
  add column if not exists first_failure_output_tokens integer,
  add column if not exists first_failure_cost_usd numeric,
  add column if not exists first_failure_cost_status text,
  add column if not exists first_failure_elapsed_ms integer,
  add column if not exists last_failure_elapsed_ms integer;

drop function if exists public.record_candidate_interpretation_failure(uuid,uuid,text,text,text,integer,integer,numeric,text);
create function public.record_candidate_interpretation_failure(
  p_batch_id uuid, p_claim_token uuid, p_error_code text, p_response_id text default null,
  p_model text default null, p_input_tokens integer default 0, p_output_tokens integer default 0,
  p_cost_usd numeric default null, p_cost_status text default 'unknown', p_elapsed_ms integer default null
) returns boolean language plpgsql security definer set search_path = '' as $$
declare v_attempt integer; v_status text;
begin
  select request_attempts into v_attempt from public.organic_candidate_interpretation_batches
    where id=p_batch_id and claim_token=p_claim_token for update;
  if not found then return false; end if;
  v_status:=case when p_cost_status='calculated_from_explicit_configuration' and p_cost_usd is not null
    and (v_attempt=1 or (select cost_status from public.organic_candidate_interpretation_batches where id=p_batch_id)='calculated_from_explicit_configuration')
    then 'calculated_from_explicit_configuration' else 'unknown' end;
  update public.organic_candidate_interpretation_batches set
    state=case when p_error_code='PROVIDER_OUTCOME_UNKNOWN' then 'failed' else 'pending' end,
    outcome_state=case when p_error_code='PROVIDER_OUTCOME_UNKNOWN' then 'unknown_provider_outcome' else 'known_failure' end,
    safe_error_code=left(p_error_code,80), provider='openai', model=coalesce(p_model,model),
    response_id=coalesce(p_response_id,response_id), last_attempt_response_id=p_response_id,
    last_attempt_input_tokens=greatest(0,coalesce(p_input_tokens,0)), last_attempt_output_tokens=greatest(0,coalesce(p_output_tokens,0)),
    last_attempt_cost_usd=p_cost_usd, last_attempt_cost_status=coalesce(p_cost_status,'unknown'),
    last_failure_elapsed_ms=p_elapsed_ms,
    first_failure_code=case when v_attempt=1 then left(p_error_code,80) else first_failure_code end,
    first_failure_response_id=case when v_attempt=1 then p_response_id else first_failure_response_id end,
    first_failure_input_tokens=case when v_attempt=1 then greatest(0,coalesce(p_input_tokens,0)) else first_failure_input_tokens end,
    first_failure_output_tokens=case when v_attempt=1 then greatest(0,coalesce(p_output_tokens,0)) else first_failure_output_tokens end,
    first_failure_cost_usd=case when v_attempt=1 then p_cost_usd else first_failure_cost_usd end,
    first_failure_cost_status=case when v_attempt=1 then coalesce(p_cost_status,'unknown') else first_failure_cost_status end,
    first_failure_elapsed_ms=case when v_attempt=1 then p_elapsed_ms else first_failure_elapsed_ms end,
    input_tokens=input_tokens+greatest(0,coalesce(p_input_tokens,0)), output_tokens=output_tokens+greatest(0,coalesce(p_output_tokens,0)),
    estimated_cost_usd=case when v_status='calculated_from_explicit_configuration' then case when v_attempt=1 then p_cost_usd else coalesce(estimated_cost_usd,0)+p_cost_usd end else null end,
    cost_status=v_status, claim_token=null, claimed_at=null, claim_expires_at=null
    where id=p_batch_id and claim_token=p_claim_token;
  return found;
end $$;
revoke all on function public.record_candidate_interpretation_failure(uuid,uuid,text,text,text,integer,integer,numeric,text,integer) from public, anon, authenticated;
grant execute on function public.record_candidate_interpretation_failure(uuid,uuid,text,text,text,integer,integer,numeric,text,integer) to service_role;
