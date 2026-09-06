-- Live-authorization integrity only. Earlier migrations are immutable.
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
  if (select coalesce(sum(output_tokens),0) from public.organic_candidate_interpretation_batches where evaluation_run_id=v_batch.evaluation_run_id) + 4000 > 20000 then return 'output_budget_exceeded'; end if;
  if v_retry and v_run.retry_used then return 'retry_exhausted'; end if;
  update public.organic_candidate_interpretation_batches set claim_token=p_claim_token,claimed_at=v_now,claim_expires_at=v_now+make_interval(secs=>greatest(1,least(p_timeout_seconds,3600))),request_attempts=request_attempts+1,attempt_started_at=v_now,outcome_state='in_flight' where id=v_batch.id and state='pending';
  if not found then return 'pending'; end if;
  if v_retry then update public.organic_candidate_evaluation_runs set retry_used=true where id=v_run.id; end if;
  return 'started';
end $$;
revoke all on function public.start_candidate_interpretation_attempt(uuid,uuid,integer) from public, anon, authenticated;
grant execute on function public.start_candidate_interpretation_attempt(uuid,uuid,integer) to service_role;

create or replace function public.record_candidate_interpretation_failure(p_batch_id uuid, p_claim_token uuid, p_error_code text, p_response_id text default null, p_model text default null, p_input_tokens integer default 0, p_output_tokens integer default 0, p_cost_usd numeric default null, p_cost_status text default 'unknown')
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_attempt integer; v_status text; v_cost numeric;
begin
  select request_attempts into v_attempt from public.organic_candidate_interpretation_batches where id=p_batch_id and claim_token=p_claim_token for update;
  if not found then return false; end if;
  v_status:=case when v_attempt=1 and p_cost_status='calculated_from_explicit_configuration' and p_cost_usd is not null then 'calculated_from_explicit_configuration' when p_cost_status='calculated_from_explicit_configuration' and p_cost_usd is not null and (select cost_status from public.organic_candidate_interpretation_batches where id=p_batch_id)='calculated_from_explicit_configuration' then 'calculated_from_explicit_configuration' else 'unknown' end;
  update public.organic_candidate_interpretation_batches set state=case when p_error_code='PROVIDER_OUTCOME_UNKNOWN' then 'failed' else 'pending' end,outcome_state=case when p_error_code='PROVIDER_OUTCOME_UNKNOWN' then 'unknown_provider_outcome' else 'known_failure' end,safe_error_code=left(p_error_code,80),provider='openai',model=coalesce(p_model,model),response_id=coalesce(p_response_id,response_id),last_attempt_response_id=p_response_id,last_attempt_input_tokens=greatest(0,p_input_tokens),last_attempt_output_tokens=greatest(0,p_output_tokens),last_attempt_cost_usd=p_cost_usd,last_attempt_cost_status=coalesce(p_cost_status,'unknown'),input_tokens=input_tokens+greatest(0,p_input_tokens),output_tokens=output_tokens+greatest(0,p_output_tokens),estimated_cost_usd=case when v_status='calculated_from_explicit_configuration' then case when v_attempt=1 then p_cost_usd else coalesce(estimated_cost_usd,0)+p_cost_usd end else null end,cost_status=v_status,claim_token=null,claimed_at=null,claim_expires_at=null where id=p_batch_id and claim_token=p_claim_token;
  return found;
end $$;
revoke all on function public.record_candidate_interpretation_failure(uuid,uuid,text,text,text,integer,integer,numeric,text) from public, anon, authenticated;
grant execute on function public.record_candidate_interpretation_failure(uuid,uuid,text,text,text,integer,integer,numeric,text) to service_role;

create or replace function public.complete_candidate_interpretation_batch(p_batch_id uuid, p_claim_token uuid, p_provider text, p_model text, p_response_id text, p_input_tokens integer, p_output_tokens integer, p_cost_usd numeric, p_cost_status text, p_rows jsonb)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_batch public.organic_candidate_interpretation_batches; v_row jsonb; v_status text;
begin
  select * into v_batch from public.organic_candidate_interpretation_batches where id=p_batch_id and claim_token=p_claim_token and state='pending' for update;
  if not found then return false; end if;
  v_status:=case when v_batch.cost_status='unknown' and v_batch.request_attempts>1 then 'unknown' when p_cost_status='calculated_from_explicit_configuration' and p_cost_usd is not null and (v_batch.request_attempts=1 or v_batch.cost_status='calculated_from_explicit_configuration') then 'calculated_from_explicit_configuration' else 'unknown' end;
  for v_row in select value from jsonb_array_elements(p_rows) loop
    insert into public.organic_candidate_evaluations(business_id,evaluation_run_id,decision_run_id,candidate_id,evaluation_version,deterministic_disposition,deterministic_reason_codes,overlap_group_id,target_attribution_state,attributed_target_resources,customer_job,intent_class,intent_confidence,page_type_fit,relevance_state,new_asset_fit,interpretation_state,interpretive_disposition,interpretive_reason_codes,evidence_refs,limitations,interpretation_input_hash,model_provider,model_name,instruction_version,provider_response_id,input_tokens,output_tokens,completed_at)
    values(v_batch.business_id,v_batch.evaluation_run_id,(select decision_run_id from public.organic_candidate_evaluation_runs where id=v_batch.evaluation_run_id),(v_row->>'candidate_id')::uuid,(v_row->>'evaluation_version'),(v_row->>'deterministic_disposition'),coalesce((select array_agg(x) from jsonb_array_elements_text(v_row->'deterministic_reason_codes') x), '{}'),nullif(v_row->>'overlap_group_id',''),(v_row->>'target_attribution_state'),coalesce(v_row->'attributed_target_resources','[]'),v_row->>'customer_job',v_row->>'intent_class',v_row->>'intent_confidence',v_row->>'page_type_fit',v_row->>'relevance_state',v_row->>'new_asset_fit','complete',(v_row->>'interpretive_disposition'),coalesce((select array_agg(x) from jsonb_array_elements_text(v_row->'interpretive_reason_codes') x), '{}'),coalesce(v_row->'evidence_refs','[]'),coalesce((select array_agg(x) from jsonb_array_elements_text(v_row->'limitations') x), '{}'),v_row->>'interpretation_input_hash',p_provider,p_model,v_row->>'instruction_version',p_response_id,p_input_tokens,p_output_tokens,clock_timestamp())
    on conflict (evaluation_run_id,candidate_id) do update set customer_job=excluded.customer_job,intent_class=excluded.intent_class,intent_confidence=excluded.intent_confidence,page_type_fit=excluded.page_type_fit,relevance_state=excluded.relevance_state,new_asset_fit=excluded.new_asset_fit,interpretation_state='complete',interpretive_disposition=excluded.interpretive_disposition,interpretive_reason_codes=excluded.interpretive_reason_codes,provider_response_id=excluded.provider_response_id,input_tokens=excluded.input_tokens,output_tokens=excluded.output_tokens,completed_at=excluded.completed_at;
  end loop;
  update public.organic_candidate_interpretation_batches set state='complete',outcome_state='complete',provider=p_provider,model=p_model,response_id=p_response_id,input_tokens=input_tokens+greatest(0,p_input_tokens),output_tokens=output_tokens+greatest(0,p_output_tokens),estimated_cost_usd=case when v_status='calculated_from_explicit_configuration' then case when v_batch.request_attempts=1 then p_cost_usd else coalesce(estimated_cost_usd,0)+p_cost_usd end else null end,cost_status=v_status,last_attempt_response_id=p_response_id,last_attempt_input_tokens=greatest(0,p_input_tokens),last_attempt_output_tokens=greatest(0,p_output_tokens),last_attempt_cost_usd=p_cost_usd,last_attempt_cost_status=coalesce(p_cost_status,'unknown'),completed_at=clock_timestamp(),claim_token=null,claimed_at=null,claim_expires_at=null where id=p_batch_id and claim_token=p_claim_token;
  return found;
end $$;
revoke all on function public.complete_candidate_interpretation_batch(uuid,uuid,text,text,text,integer,integer,numeric,text,jsonb) from public, anon, authenticated;
grant execute on function public.complete_candidate_interpretation_batch(uuid,uuid,text,text,text,integer,integer,numeric,text,jsonb) to service_role;
