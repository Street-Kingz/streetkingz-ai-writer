-- V1-05 post-commit runtime integrity. Never rewrite applied migrations.
alter table public.organic_candidate_interpretation_batches
  add column if not exists attempt_started_at timestamptz,
  add column if not exists last_attempt_response_id text,
  add column if not exists last_attempt_input_tokens integer,
  add column if not exists last_attempt_output_tokens integer,
  add column if not exists last_attempt_cost_usd numeric(12,8),
  add column if not exists last_attempt_cost_status text not null default 'unknown' check (last_attempt_cost_status in ('unknown','calculated_from_explicit_configuration')),
  add column if not exists outcome_state text not null default 'not_started' check (outcome_state in ('not_started','in_flight','known_failure','unknown_provider_outcome','complete'));

create or replace function public.record_candidate_interpretation_attempt(p_batch_id uuid, p_claim_token uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.organic_candidate_interpretation_batches
    set request_attempts=request_attempts+1, attempt_started_at=clock_timestamp(), outcome_state='in_flight'
  where id=p_batch_id and state='pending' and claim_token=p_claim_token and request_attempts < 6;
  return found;
end $$;
revoke all on function public.record_candidate_interpretation_attempt(uuid,uuid) from public, anon, authenticated;
grant execute on function public.record_candidate_interpretation_attempt(uuid,uuid) to service_role;

create or replace function public.record_candidate_interpretation_failure(p_batch_id uuid, p_claim_token uuid, p_error_code text, p_response_id text default null, p_input_tokens integer default 0, p_output_tokens integer default 0, p_cost_usd numeric default null, p_cost_status text default 'unknown')
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.organic_candidate_interpretation_batches
    set state=case when p_error_code='PROVIDER_OUTCOME_UNKNOWN' then 'failed' else 'pending' end, outcome_state=case when p_error_code='PROVIDER_OUTCOME_UNKNOWN' then 'unknown_provider_outcome' else 'known_failure' end,
        safe_error_code=left(p_error_code,80), last_attempt_response_id=p_response_id,
        last_attempt_input_tokens=greatest(0,p_input_tokens), last_attempt_output_tokens=greatest(0,p_output_tokens),
        last_attempt_cost_usd=p_cost_usd, last_attempt_cost_status=p_cost_status, provider=coalesce(provider, 'openai'),
        input_tokens=input_tokens+greatest(0,p_input_tokens), output_tokens=output_tokens+greatest(0,p_output_tokens)
  where id=p_batch_id and claim_token=p_claim_token;
  return found;
end $$;
revoke all on function public.record_candidate_interpretation_failure(uuid,uuid,text,text,integer,integer,numeric,text) from public, anon, authenticated;
grant execute on function public.record_candidate_interpretation_failure(uuid,uuid,text,text,integer,integer,numeric,text) to service_role;

create or replace function public.complete_candidate_interpretation_batch(p_batch_id uuid, p_claim_token uuid, p_provider text, p_model text, p_response_id text, p_input_tokens integer, p_output_tokens integer, p_cost_usd numeric, p_cost_status text, p_rows jsonb)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_batch public.organic_candidate_interpretation_batches; v_row jsonb;
begin
  select * into v_batch from public.organic_candidate_interpretation_batches where id=p_batch_id and claim_token=p_claim_token and state='pending' for update;
  if not found then return false; end if;
  for v_row in select value from jsonb_array_elements(p_rows) loop
    insert into public.organic_candidate_evaluations(business_id,evaluation_run_id,decision_run_id,candidate_id,evaluation_version,deterministic_disposition,deterministic_reason_codes,overlap_group_id,target_attribution_state,attributed_target_resources,customer_job,intent_class,intent_confidence,page_type_fit,relevance_state,new_asset_fit,interpretation_state,interpretive_disposition,interpretive_reason_codes,evidence_refs,limitations,interpretation_input_hash,model_provider,model_name,instruction_version,provider_response_id,input_tokens,output_tokens,completed_at)
    values(v_batch.business_id,v_batch.evaluation_run_id,(select decision_run_id from public.organic_candidate_evaluation_runs where id=v_batch.evaluation_run_id),(v_row->>'candidate_id')::uuid,(v_row->>'evaluation_version'),(v_row->>'deterministic_disposition'),coalesce((select array_agg(x) from jsonb_array_elements_text(v_row->'deterministic_reason_codes') x), '{}'),nullif(v_row->>'overlap_group_id',''),(v_row->>'target_attribution_state'),coalesce(v_row->'attributed_target_resources','[]'),v_row->>'customer_job',v_row->>'intent_class',v_row->>'intent_confidence',v_row->>'page_type_fit',v_row->>'relevance_state',v_row->>'new_asset_fit','complete',(v_row->>'interpretive_disposition'),coalesce((select array_agg(x) from jsonb_array_elements_text(v_row->'interpretive_reason_codes') x), '{}'),coalesce(v_row->'evidence_refs','[]'),coalesce((select array_agg(x) from jsonb_array_elements_text(v_row->'limitations') x), '{}'),v_row->>'interpretation_input_hash',p_provider,p_model,v_row->>'instruction_version',p_response_id,p_input_tokens,p_output_tokens,clock_timestamp())
    on conflict (evaluation_run_id,candidate_id) do update set customer_job=excluded.customer_job,intent_class=excluded.intent_class,intent_confidence=excluded.intent_confidence,page_type_fit=excluded.page_type_fit,relevance_state=excluded.relevance_state,new_asset_fit=excluded.new_asset_fit,interpretation_state='complete',interpretive_disposition=excluded.interpretive_disposition,interpretive_reason_codes=excluded.interpretive_reason_codes,provider_response_id=excluded.provider_response_id,input_tokens=excluded.input_tokens,output_tokens=excluded.output_tokens,completed_at=excluded.completed_at;
  end loop;
  update public.organic_candidate_interpretation_batches set state='complete',outcome_state='complete',provider=p_provider,model=p_model,response_id=p_response_id,input_tokens=p_input_tokens,output_tokens=p_output_tokens,estimated_cost_usd=p_cost_usd,cost_status=p_cost_status,last_attempt_response_id=p_response_id,last_attempt_input_tokens=p_input_tokens,last_attempt_output_tokens=p_output_tokens,last_attempt_cost_usd=p_cost_usd,last_attempt_cost_status=p_cost_status,completed_at=clock_timestamp(),claim_token=null,claimed_at=null,claim_expires_at=null where id=p_batch_id and claim_token=p_claim_token;
  return found;
end $$;
revoke all on function public.complete_candidate_interpretation_batch(uuid,uuid,text,text,text,integer,integer,numeric,text,jsonb) from public, anon, authenticated;
grant execute on function public.complete_candidate_interpretation_batch(uuid,uuid,text,text,text,integer,integer,numeric,text,jsonb) to service_role;
