-- V1-03 WooCommerce commerce foundation. All mutations are service-only.
alter table public.businesses add constraint businesses_id_account_unique unique (id,account_id);
alter table public.connections add constraint connections_id_business_unique unique (id,business_id);
alter table public.connections add constraint connections_id_business_provider_unique unique (id,business_id,provider_type);

create table public.commerce_stores (
 id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
 connection_id uuid not null, provider text not null default 'woocommerce' check(provider='woocommerce'), canonical_base_url text not null,
 source_home_url text, source_site_url text, source_version text, currency text, timezone text,
 sync_state text not null default 'never' check(sync_state in ('never','pending','complete','partial','failed','stale')),
 last_attempted_at timestamptz,last_successful_at timestamptz,current_generation bigint,
 unique(business_id,provider),unique(id,business_id),foreign key(connection_id,business_id,provider) references public.connections(id,business_id,provider_type));
create table public.commerce_sync_generations (
 id bigint generated always as identity primary key,store_id uuid not null references public.commerce_stores(id) on delete cascade,
 state text not null default 'pending' check(state in ('pending','complete','partial','failed','stale')),
 snapshot_kind text not null default 'complete' check(snapshot_kind='complete'),started_at timestamptz not null default now(),completed_at timestamptz,error_code text,
 unique(id,store_id));
alter table public.commerce_stores add constraint commerce_store_current_generation_fk foreign key(current_generation,id) references public.commerce_sync_generations(id,store_id);

create table public.commerce_products (
 id uuid primary key default gen_random_uuid(),business_id uuid not null,store_id uuid not null,generation_id bigint not null,source_id bigint not null,
 name text,slug text,canonical_url text,sku text,product_type text,source_status text,regular_price numeric,current_price numeric,sale_price numeric,
 manage_stock boolean,stock_quantity numeric,stock_status text,source_created_at timestamptz,source_modified_at timestamptz,
 unique(store_id,generation_id,source_id),unique(id,store_id,generation_id),
 foreign key(store_id,business_id) references public.commerce_stores(id,business_id) on delete cascade,
 foreign key(generation_id,store_id) references public.commerce_sync_generations(id,store_id) on delete cascade);
create table public.commerce_variations (
 id uuid primary key default gen_random_uuid(),business_id uuid not null,store_id uuid not null,generation_id bigint not null,source_id bigint not null,parent_source_id bigint not null,
 sku text,attributes jsonb not null default '{}',regular_price numeric,current_price numeric,sale_price numeric,manage_stock boolean,stock_quantity numeric,stock_status text,source_status text,
 unique(store_id,generation_id,source_id),foreign key(store_id,business_id) references public.commerce_stores(id,business_id) on delete cascade,
 foreign key(generation_id,store_id) references public.commerce_sync_generations(id,store_id) on delete cascade);
create table public.commerce_categories (
 id uuid primary key default gen_random_uuid(),business_id uuid not null,store_id uuid not null,generation_id bigint not null,source_id bigint not null,name text,slug text,parent_source_id bigint,
 unique(store_id,generation_id,source_id),unique(id,store_id,generation_id),
 foreign key(store_id,business_id) references public.commerce_stores(id,business_id) on delete cascade,
 foreign key(generation_id,store_id) references public.commerce_sync_generations(id,store_id) on delete cascade);
create table public.commerce_product_categories (
 product_id uuid not null,category_id uuid not null,store_id uuid not null,generation_id bigint not null,primary key(product_id,category_id),
 foreign key(product_id,store_id,generation_id) references public.commerce_products(id,store_id,generation_id) on delete cascade,
 foreign key(category_id,store_id,generation_id) references public.commerce_categories(id,store_id,generation_id) on delete cascade);
create table public.commerce_orders (
 id uuid primary key default gen_random_uuid(),business_id uuid not null,store_id uuid not null,generation_id bigint not null,source_id bigint not null,source_status text not null,
 recognition_state text not null default 'unknown' check(recognition_state in ('recognised','excluded','unknown','unclassified')),currency text,source_created_at timestamptz,
 source_modified_at timestamptz,order_total numeric,tax_total numeric,shipping_total numeric,discount_total numeric,refund_total numeric,prices_include_tax boolean,
 unique(store_id,generation_id,source_id),unique(id,store_id,generation_id),
 foreign key(store_id,business_id) references public.commerce_stores(id,business_id) on delete cascade,
 foreign key(generation_id,store_id) references public.commerce_sync_generations(id,store_id) on delete cascade);
create table public.commerce_order_lines (
 id uuid primary key default gen_random_uuid(),order_id uuid not null references public.commerce_orders(id) on delete cascade,source_line_id bigint not null,
 product_source_id bigint,variation_source_id bigint,quantity numeric,subtotal numeric,total numeric,tax numeric,refund_total numeric,unique(order_id,source_line_id));
create table public.commerce_order_adjustments (
 id uuid primary key default gen_random_uuid(),order_id uuid not null references public.commerce_orders(id) on delete cascade,
 adjustment_type text not null check(adjustment_type in ('refund','discount','tax','shipping')),provider_adjustment_id text not null,amount numeric not null,
 product_source_id bigint,variation_source_id bigint,unique(order_id,adjustment_type,provider_adjustment_id),check(adjustment_type<>'refund' or amount<=0));

create table public.woocommerce_auth_attempts (
 id uuid primary key default gen_random_uuid(),user_id text not null unique,account_id uuid not null,business_id uuid not null,connection_id uuid not null,provider text not null default 'woocommerce' check(provider='woocommerce'),
 canonical_base_url text not null,status text not null default 'pending' check(status in ('pending','claimed','callback_received','consumed','denied','expired','failed','superseded')),
 expires_at timestamptz not null,claimed_at timestamptz,callback_received_at timestamptz,credential_reference uuid,key_permissions text,consumed_at timestamptz,safe_error_code text,
 foreign key(business_id,account_id) references public.businesses(id,account_id) on delete cascade,
 foreign key(connection_id,business_id,provider) references public.connections(id,business_id,provider_type) on delete cascade);
create unique index woo_one_live_attempt_per_connection on public.woocommerce_auth_attempts(connection_id) where status in ('pending','claimed','callback_received');

create function public.woo_create_auth_attempt(p_user_id text,p_account_id uuid,p_business_id uuid,p_connection_id uuid,p_canonical_base_url text,p_expires_at timestamptz)
returns uuid language plpgsql security definer set search_path='' as $$ declare v uuid;r record;begin
 perform pg_advisory_xact_lock(hashtextextended(p_connection_id::text,0));
 if p_expires_at<=clock_timestamp() or p_expires_at>clock_timestamp()+interval '15 minutes' then raise exception 'AUTH_ATTEMPT_EXPIRY_INVALID';end if;
 for r in select id,credential_reference from public.woocommerce_auth_attempts where connection_id=p_connection_id and status in('pending','claimed','callback_received') for update loop
  if r.credential_reference is not null then delete from vault.secrets where id=r.credential_reference;end if;
  update public.woocommerce_auth_attempts set status=case when expires_at<=clock_timestamp() then 'expired' else 'superseded' end,credential_reference=null,safe_error_code='AUTH_ATTEMPT_REPLACED' where id=r.id;
  insert into public.audit_events(account_id,business_id,event_type,correlation_id,safe_metadata) select account_id,business_id,'woocommerce_auth_attempt_replaced',id::text,'{}' from public.woocommerce_auth_attempts where id=r.id;
 end loop;
 insert into public.woocommerce_auth_attempts(user_id,account_id,business_id,connection_id,canonical_base_url,expires_at)
 values(p_user_id,p_account_id,p_business_id,p_connection_id,p_canonical_base_url,p_expires_at) returning id into v;
 insert into public.audit_events(account_id,business_id,event_type,correlation_id,safe_metadata) values(p_account_id,p_business_id,'woocommerce_auth_attempt_created',v::text,'{}');return v;end $$;
create function public.woo_claim_auth_attempt(p_user_id text) returns public.woocommerce_auth_attempts language plpgsql security definer set search_path='' as $$
declare v public.woocommerce_auth_attempts; begin
 update public.woocommerce_auth_attempts set status='claimed',claimed_at=clock_timestamp() where user_id=p_user_id and status='pending' and expires_at>clock_timestamp() returning * into v;
 if not found then raise exception 'AUTH_ATTEMPT_NOT_CLAIMABLE'; end if; return v; end $$;
create function public.woo_capture_callback(p_attempt_id uuid,p_consumer_key text,p_consumer_secret text,p_key_permissions text) returns boolean language plpgsql security definer set search_path='' as $$
declare ref uuid;begin
 if p_key_permissions<>'read' or nullif(p_consumer_key,'') is null or nullif(p_consumer_secret,'') is null then
  update public.woocommerce_auth_attempts set status='denied',safe_error_code='WOO_PERMISSION_INVALID' where id=p_attempt_id and status='claimed';
  if found then insert into public.audit_events(account_id,business_id,event_type,correlation_id,safe_metadata) select account_id,business_id,'woocommerce_callback_denied',id::text,jsonb_build_object('error_code','WOO_PERMISSION_INVALID') from public.woocommerce_auth_attempts where id=p_attempt_id;end if;return false;
 end if;
 select vault.create_secret(jsonb_build_object('consumerKey',p_consumer_key,'consumerSecret',p_consumer_secret)::text,'woo-'||p_attempt_id::text) into ref;
 update public.woocommerce_auth_attempts set status='callback_received',callback_received_at=clock_timestamp(),credential_reference=ref,key_permissions=p_key_permissions where id=p_attempt_id and status='claimed';
 if not found then raise exception 'AUTH_ATTEMPT_NOT_CLAIMED';end if;
 insert into public.audit_events(account_id,business_id,event_type,correlation_id,safe_metadata) select account_id,business_id,'woocommerce_callback_received',id::text,'{}' from public.woocommerce_auth_attempts where id=p_attempt_id;return true;end $$;
create function public.woo_abort_auth_attempt(p_attempt_id uuid,p_safe_error_code text) returns void language plpgsql security definer set search_path='' as $$ declare a public.woocommerce_auth_attempts;begin
 if p_safe_error_code not in('WOO_CAPTURE_FAILED','WOO_PERMISSION_INVALID') then raise exception 'INVALID_SAFE_ERROR_CODE';end if;
 select * into a from public.woocommerce_auth_attempts where id=p_attempt_id for update;if not found or a.status in('consumed','failed','expired','superseded') then return;end if;
 if a.credential_reference is not null then delete from vault.secrets where id=a.credential_reference;end if;
 update public.woocommerce_auth_attempts set status='failed',credential_reference=null,safe_error_code=p_safe_error_code where id=a.id;
 insert into public.audit_events(account_id,business_id,event_type,correlation_id,safe_metadata) values(a.account_id,a.business_id,'woocommerce_auth_attempt_failed',a.id::text,jsonb_build_object('error_code',p_safe_error_code));end $$;
create function public.woo_record_verification_retryable(p_attempt_id uuid,p_safe_error_code text) returns void language plpgsql security definer set search_path='' as $$ begin
 if p_safe_error_code not in('PROVIDER_TIMEOUT','PROVIDER_RATE_LIMITED','PROVIDER_UNAVAILABLE') then raise exception 'INVALID_SAFE_ERROR_CODE';end if;
 update public.woocommerce_auth_attempts set safe_error_code=p_safe_error_code where id=p_attempt_id and status='callback_received' and credential_reference is not null;
 if found then insert into public.audit_events(account_id,business_id,event_type,correlation_id,safe_metadata) select account_id,business_id,'woocommerce_verification_retryable',id::text,jsonb_build_object('error_code',p_safe_error_code) from public.woocommerce_auth_attempts where id=p_attempt_id;end if;end $$;
create function public.woo_cleanup_expired_attempts() returns bigint language plpgsql security definer set search_path='' as $$ declare r record;n bigint:=0;begin
 for r in select id,credential_reference from public.woocommerce_auth_attempts where status in('pending','claimed','callback_received') and expires_at<=clock_timestamp() for update skip locked loop
  if r.credential_reference is not null then delete from vault.secrets where id=r.credential_reference;end if;
  update public.woocommerce_auth_attempts set status='expired',credential_reference=null,safe_error_code='AUTH_ATTEMPT_EXPIRED' where id=r.id;n:=n+1;
 end loop;return n;end $$;
create function public.woo_complete_connection(p_attempt_id uuid,p_home_url text,p_site_url text,p_version text,p_timezone text,p_currency text,p_correlation_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$ declare a public.woocommerce_auth_attempts;s public.commerce_stores;old_ref uuid; begin
 select * into a from public.woocommerce_auth_attempts where id=p_attempt_id and status='callback_received' for update;
 if not found or a.credential_reference is null or a.expires_at<=clock_timestamp() then raise exception 'AUTH_ATTEMPT_NOT_READY'; end if;
 select * into s from public.commerce_stores where business_id=a.business_id and provider='woocommerce' for update;
 if found then
  if s.canonical_base_url<>a.canonical_base_url then raise exception 'WOO_STORE_REBIND_DENIED';end if;
  update public.commerce_stores set source_home_url=p_home_url,source_site_url=p_site_url,source_version=p_version,timezone=p_timezone,currency=p_currency where id=s.id returning * into s;
 else
  insert into public.commerce_stores(business_id,connection_id,canonical_base_url,source_home_url,source_site_url,source_version,timezone,currency) values(a.business_id,a.connection_id,a.canonical_base_url,p_home_url,p_site_url,p_version,p_timezone,p_currency) returning * into s;
 end if;
 select secret_reference into old_ref from public.connections where id=a.connection_id for update;
 if old_ref is not null and old_ref<>a.credential_reference then delete from vault.secrets where id=old_ref;end if;
 update public.connections set secret_reference=a.credential_reference,status='connected',consent_state='granted',connected_at=coalesce(connected_at,clock_timestamp()),safe_error_code=null,safe_error_message=null where id=a.connection_id;
 update public.businesses set connection_status='connected' where id=a.business_id;
 update public.woocommerce_auth_attempts set status='consumed',consumed_at=clock_timestamp(),credential_reference=null,safe_error_code=null where id=a.id;
 insert into public.audit_events(account_id,business_id,event_type,correlation_id,safe_metadata) values(a.account_id,a.business_id,'woocommerce_connection_established',p_correlation_id::text,jsonb_build_object('store_id',s.id));return s.id;end $$;
create function public.woo_fail_connection(p_attempt_id uuid,p_safe_error_code text) returns void language plpgsql security definer set search_path='' as $$
declare a public.woocommerce_auth_attempts;begin select * into a from public.woocommerce_auth_attempts where id=p_attempt_id for update;if not found or a.status='consumed' then return;end if;
 if p_safe_error_code not in('PROVIDER_AUTH_INVALID','PROVIDER_IDENTITY_INVALID','WOO_STORE_IDENTITY_MISMATCH','WOO_STORE_REBIND_DENIED','WOO_IDENTITY_FAILED') then raise exception 'INVALID_SAFE_ERROR_CODE';end if;
 if a.credential_reference is not null then delete from vault.secrets where id=a.credential_reference;end if;
 update public.woocommerce_auth_attempts set status='failed',credential_reference=null,safe_error_code=p_safe_error_code where id=a.id;
 update public.connections set status='error',consent_state='pending',secret_reference=null,safe_error_code=p_safe_error_code,safe_error_message='WooCommerce connection could not be verified.' where id=a.connection_id and status<>'connected';
 update public.businesses set connection_status='error' where id=a.business_id and connection_status<>'connected';end $$;
create function public.commerce_promote_generation(p_store_id uuid,p_generation_id bigint) returns bigint language plpgsql security definer set search_path='' as $$
declare g public.commerce_sync_generations;begin if auth.role()<>'service_role' then raise exception 'SERVICE_ROLE_REQUIRED';end if;
 select * into g from public.commerce_sync_generations where id=p_generation_id and store_id=p_store_id for update;
 if not found then raise exception 'GENERATION_NOT_FOUND';end if;if g.state<>'complete' or g.snapshot_kind<>'complete' or g.completed_at is null then raise exception 'GENERATION_NOT_PROMOTABLE';end if;
 update public.commerce_stores set current_generation=g.id,sync_state='complete',last_successful_at=clock_timestamp() where id=p_store_id;return g.id;end $$;

-- Extend the V1-02 deletion transaction to include phase-one Vault material.
create or replace function public.product_cleanup_account(p_auth_user_id uuid,p_correlation_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare a public.accounts;r record;secret_id uuid;
begin
 select * into a from public.accounts where auth_user_id=p_auth_user_id and status in('deletion_requested','deleted') for update;
 if not found then return true;end if;
 for r in select id,credential_reference from public.woocommerce_auth_attempts where account_id=a.id and credential_reference is not null for update loop
  begin delete from vault.secrets where id=r.credential_reference;exception when others then raise exception 'SECRET_OPERATION_FAILED';end;
  update public.woocommerce_auth_attempts set credential_reference=null,status=case when status='consumed' then status else 'failed' end,safe_error_code='ACCOUNT_DELETION' where id=r.id;
 end loop;
 for secret_id in select c.secret_reference from public.connections c join public.businesses b on b.id=c.business_id where b.account_id=a.id and c.secret_reference is not null loop
  begin delete from vault.secrets where id=secret_id;exception when others then raise exception 'SECRET_OPERATION_FAILED';end;
 end loop;
 delete from public.businesses where account_id=a.id;
 update public.accounts set status='deleted',deleted_at=coalesce(deleted_at,clock_timestamp()) where id=a.id;
 insert into public.audit_events(account_id,event_type,correlation_id) values(a.id,'account_deletion_cleanup_completed',p_correlation_id::text);return true;
end $$;

alter table public.commerce_stores enable row level security;alter table public.commerce_sync_generations enable row level security;
alter table public.commerce_products enable row level security;alter table public.commerce_variations enable row level security;alter table public.commerce_categories enable row level security;
alter table public.commerce_product_categories enable row level security;alter table public.commerce_orders enable row level security;alter table public.commerce_order_lines enable row level security;
alter table public.commerce_order_adjustments enable row level security;alter table public.woocommerce_auth_attempts enable row level security;
revoke all on public.commerce_stores,public.commerce_sync_generations,public.commerce_products,public.commerce_variations,public.commerce_categories,public.commerce_product_categories,public.commerce_orders,public.commerce_order_lines,public.commerce_order_adjustments,public.woocommerce_auth_attempts from public,anon,authenticated;
grant select on public.commerce_stores,public.commerce_sync_generations,public.commerce_products,public.commerce_variations,public.commerce_categories,public.commerce_product_categories,public.commerce_orders,public.commerce_order_lines,public.commerce_order_adjustments to authenticated;
grant all on public.commerce_sync_generations,public.commerce_products,public.commerce_variations,public.commerce_categories,public.commerce_product_categories,public.commerce_orders,public.commerce_order_lines,public.commerce_order_adjustments to service_role;
grant select on public.commerce_stores,public.woocommerce_auth_attempts to service_role;
revoke all on function public.woo_create_auth_attempt(text,uuid,uuid,uuid,text,timestamptz),public.woo_claim_auth_attempt(text),public.woo_capture_callback(uuid,text,text,text),public.woo_abort_auth_attempt(uuid,text),public.woo_record_verification_retryable(uuid,text),public.woo_cleanup_expired_attempts(),public.woo_complete_connection(uuid,text,text,text,text,text,uuid),public.woo_fail_connection(uuid,text),public.commerce_promote_generation(uuid,bigint) from public,anon,authenticated;
grant execute on function public.woo_create_auth_attempt(text,uuid,uuid,uuid,text,timestamptz),public.woo_claim_auth_attempt(text),public.woo_capture_callback(uuid,text,text,text),public.woo_abort_auth_attempt(uuid,text),public.woo_record_verification_retryable(uuid,text),public.woo_cleanup_expired_attempts(),public.woo_complete_connection(uuid,text,text,text,text,text,uuid),public.woo_fail_connection(uuid,text),public.commerce_promote_generation(uuid,bigint) to service_role;

create policy commerce_store_owner_select on public.commerce_stores for select to authenticated using(business_id in(select b.id from public.businesses b join public.accounts a on a.id=b.account_id where a.auth_user_id=auth.uid()));
create policy commerce_generation_current_select on public.commerce_sync_generations for select to authenticated using(state='complete' and exists(select 1 from public.commerce_stores s join public.businesses b on b.id=s.business_id join public.accounts a on a.id=b.account_id where s.id=commerce_sync_generations.store_id and s.current_generation=commerce_sync_generations.id and a.auth_user_id=auth.uid()));
create policy commerce_product_current_select on public.commerce_products for select to authenticated using(exists(select 1 from public.commerce_stores s join public.businesses b on b.id=s.business_id join public.accounts a on a.id=b.account_id where s.id=commerce_products.store_id and s.current_generation=commerce_products.generation_id and a.auth_user_id=auth.uid()));
create policy commerce_variation_current_select on public.commerce_variations for select to authenticated using(exists(select 1 from public.commerce_stores s join public.businesses b on b.id=s.business_id join public.accounts a on a.id=b.account_id where s.id=commerce_variations.store_id and s.current_generation=commerce_variations.generation_id and a.auth_user_id=auth.uid()));
create policy commerce_category_current_select on public.commerce_categories for select to authenticated using(exists(select 1 from public.commerce_stores s join public.businesses b on b.id=s.business_id join public.accounts a on a.id=b.account_id where s.id=commerce_categories.store_id and s.current_generation=commerce_categories.generation_id and a.auth_user_id=auth.uid()));
create policy commerce_order_current_select on public.commerce_orders for select to authenticated using(exists(select 1 from public.commerce_stores s join public.businesses b on b.id=s.business_id join public.accounts a on a.id=b.account_id where s.id=commerce_orders.store_id and s.current_generation=commerce_orders.generation_id and a.auth_user_id=auth.uid()));
create policy commerce_product_category_current_select on public.commerce_product_categories for select to authenticated using(exists(select 1 from public.commerce_products p where p.id=product_id));
create policy commerce_line_current_select on public.commerce_order_lines for select to authenticated using(exists(select 1 from public.commerce_orders o where o.id=order_id));
create policy commerce_adjustment_current_select on public.commerce_order_adjustments for select to authenticated using(exists(select 1 from public.commerce_orders o where o.id=order_id));
