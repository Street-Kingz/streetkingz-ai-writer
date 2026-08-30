-- V1-03 initial commerce snapshot extensions. Service-only staging.
alter table public.commerce_variations add column if not exists source_created_at timestamptz;
alter table public.commerce_variations add column if not exists source_modified_at timestamptz;
alter table public.commerce_order_lines add column if not exists refunded_quantity numeric;
alter table public.commerce_order_lines add column if not exists refund_total numeric;
alter table public.commerce_order_lines add column if not exists refund_tax numeric;
alter table public.commerce_order_lines add constraint commerce_order_lines_refunds_nonnegative check(coalesce(refunded_quantity,0)>=0 and coalesce(refund_total,0)>=0 and coalesce(refund_tax,0)>=0);

create or replace function public.commerce_begin_initial_sync(p_store_id uuid,p_correlation_id uuid)
returns bigint language plpgsql security definer set search_path='' as $$
declare s public.commerce_stores;g public.commerce_sync_generations;
begin
 if auth.role()<>'service_role' then raise exception 'SERVICE_ROLE_REQUIRED';end if;
 select * into s from public.commerce_stores where id=p_store_id and provider='woocommerce' for update;
 if not found then raise exception 'STORE_NOT_FOUND';end if;
 update public.commerce_sync_generations set state='failed',error_code='SYNC_STALE_RECOVERED',completed_at=clock_timestamp() where store_id=s.id and state='pending' and started_at < clock_timestamp()-interval '30 minutes';
 if exists(select 1 from public.commerce_sync_generations where store_id=s.id and state='pending') then raise exception 'SYNC_ALREADY_RUNNING';end if;
 insert into public.commerce_sync_generations(store_id,state,snapshot_kind) values(s.id,'pending','complete') returning * into g;
 update public.commerce_stores set sync_state='pending',last_attempted_at=clock_timestamp() where id=s.id;
 return g.id;
end $$;

create or replace function public.commerce_mark_sync_failed(p_store_id uuid,p_generation_id bigint,p_error_code text,p_partial boolean default false)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.role()<>'service_role' then raise exception 'SERVICE_ROLE_REQUIRED';end if;
 update public.commerce_sync_generations set state=case when p_partial then 'partial' else 'failed' end,error_code=left(p_error_code,64),completed_at=clock_timestamp() where id=p_generation_id and store_id=p_store_id and state='pending';
 update public.commerce_stores set sync_state=case when p_partial then 'partial' else 'failed' end where id=p_store_id;
end $$;

create or replace function public.commerce_stage_initial_snapshot(p_store_id uuid,p_generation_id bigint,p_products jsonb,p_variations jsonb,p_categories jsonb,p_links jsonb,p_orders jsonb,p_lines jsonb,p_adjustments jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare g public.commerce_sync_generations;r jsonb;
begin
 if auth.role()<>'service_role' then raise exception 'SERVICE_ROLE_REQUIRED';end if;
 select * into g from public.commerce_sync_generations where id=p_generation_id and store_id=p_store_id and state='pending' for update;
 if not found then raise exception 'GENERATION_NOT_FOUND';end if;
 insert into public.commerce_products(business_id,store_id,generation_id,source_id,name,slug,canonical_url,sku,product_type,source_status,regular_price,current_price,sale_price,manage_stock,stock_quantity,stock_status,source_created_at,source_modified_at)
 select s.business_id,p_store_id,p_generation_id,x.source_id,x.name,x.slug,x.canonical_url,x.sku,x.product_type,x.source_status,x.regular_price,x.current_price,x.sale_price,x.manage_stock,x.stock_quantity,x.stock_status,x.source_created_at,x.source_modified_at from public.commerce_stores s cross join jsonb_to_recordset(p_products) x(source_id bigint,name text,slug text,canonical_url text,sku text,product_type text,source_status text,regular_price numeric,current_price numeric,sale_price numeric,manage_stock boolean,stock_quantity numeric,stock_status text,source_created_at timestamptz,source_modified_at timestamptz) where s.id=p_store_id;
 insert into public.commerce_variations(business_id,store_id,generation_id,source_id,parent_source_id,sku,attributes,regular_price,current_price,sale_price,manage_stock,stock_quantity,stock_status,source_status,source_created_at,source_modified_at)
 select s.business_id,p_store_id,p_generation_id,x.source_id,x.parent_source_id,x.sku,x.attributes,x.regular_price,x.current_price,x.sale_price,x.manage_stock,x.stock_quantity,x.stock_status,x.source_status,x.source_created_at,x.source_modified_at from public.commerce_stores s cross join jsonb_to_recordset(p_variations) x(source_id bigint,parent_source_id bigint,sku text,attributes jsonb,regular_price numeric,current_price numeric,sale_price numeric,manage_stock boolean,stock_quantity numeric,stock_status text,source_status text,source_created_at timestamptz,source_modified_at timestamptz) where s.id=p_store_id;
 insert into public.commerce_categories(business_id,store_id,generation_id,source_id,name,slug,parent_source_id)
 select s.business_id,p_store_id,p_generation_id,x.source_id,x.name,x.slug,x.parent_source_id from public.commerce_stores s cross join jsonb_to_recordset(p_categories) x(source_id bigint,name text,slug text,parent_source_id bigint) where s.id=p_store_id;
 insert into public.commerce_orders(business_id,store_id,generation_id,source_id,source_status,recognition_state,currency,source_created_at,source_modified_at,order_total,tax_total,shipping_total,discount_total,refund_total,prices_include_tax)
 select s.business_id,p_store_id,p_generation_id,x.source_id,x.source_status,x.recognition_state,x.currency,x.source_created_at,x.source_modified_at,x.order_total,x.tax_total,x.shipping_total,x.discount_total,x.refund_total,x.prices_include_tax from public.commerce_stores s cross join jsonb_to_recordset(p_orders) x(source_id bigint,source_status text,recognition_state text,currency text,source_created_at timestamptz,source_modified_at timestamptz,order_total numeric,tax_total numeric,shipping_total numeric,discount_total numeric,refund_total numeric,prices_include_tax boolean) where s.id=p_store_id;
 insert into public.commerce_order_lines(order_id,source_line_id,product_source_id,variation_source_id,quantity,subtotal,total,tax,refunded_quantity,refund_total,refund_tax)
 select o.id,x.source_line_id,x.product_source_id,x.variation_source_id,x.quantity,x.subtotal,x.total,x.tax,x.refunded_quantity,x.refund_total,x.refund_tax from public.commerce_orders o cross join jsonb_to_recordset(p_lines) x(order_source_id bigint,source_line_id bigint,product_source_id bigint,variation_source_id bigint,quantity numeric,subtotal numeric,total numeric,tax numeric,refunded_quantity numeric,refund_total numeric,refund_tax numeric) where o.store_id=p_store_id and o.generation_id=p_generation_id and o.source_id=x.order_source_id;
 insert into public.commerce_order_adjustments(order_id,adjustment_type,provider_adjustment_id,amount,product_source_id,variation_source_id)
 select o.id,x.adjustment_type,x.provider_adjustment_id,x.amount,x.product_source_id,x.variation_source_id from public.commerce_orders o cross join jsonb_to_recordset(p_adjustments) x(order_source_id bigint,adjustment_type text,provider_adjustment_id text,amount numeric,product_source_id bigint,variation_source_id bigint) where o.store_id=p_store_id and o.generation_id=p_generation_id and o.source_id=x.order_source_id;
 insert into public.commerce_product_categories(product_id,category_id,store_id,generation_id)
 select p.id,c.id,p_store_id,p_generation_id from public.commerce_products p join jsonb_to_recordset(p_links) x(product_source_id bigint,category_source_id bigint) on x.product_source_id=p.source_id and p.store_id=p_store_id and p.generation_id=p_generation_id join public.commerce_categories c on c.source_id=x.category_source_id and c.store_id=p_store_id and c.generation_id=p_generation_id;
end $$;

create or replace function public.commerce_complete_initial_sync(p_store_id uuid,p_generation_id bigint)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.role()<>'service_role' then raise exception 'SERVICE_ROLE_REQUIRED';end if;
 update public.commerce_sync_generations set state='complete',completed_at=clock_timestamp() where id=p_generation_id and store_id=p_store_id and state='pending';
 if not found then raise exception 'GENERATION_NOT_COMPLETE';end if;
 perform public.commerce_promote_generation(p_store_id,p_generation_id);
end $$;

create or replace view public.commerce_product_net_sales as
select l.order_id,o.store_id,o.generation_id,l.product_source_id,l.variation_source_id,
 sum(case when o.recognition_state='recognised' then coalesce(l.total,0)-coalesce(l.refund_total,0) else 0 end) as product_net_sales_ex_tax,
 sum(case when o.recognition_state='recognised' then coalesce(l.tax,0)-coalesce(l.refund_tax,0) else 0 end) as product_tax
from public.commerce_order_lines l join public.commerce_orders o on o.id=l.order_id group by l.order_id,o.store_id,o.generation_id,l.product_source_id,l.variation_source_id;

create or replace view public.commerce_product_net_sales_by_generation as
select store_id,generation_id,product_source_id,variation_source_id,
 sum(product_net_sales_ex_tax) as product_net_sales_ex_tax,
 sum(product_tax) as product_tax
from public.commerce_product_net_sales
group by store_id,generation_id,product_source_id,variation_source_id;

revoke all on function public.commerce_begin_initial_sync(uuid,uuid),public.commerce_mark_sync_failed(uuid,bigint,text,boolean),public.commerce_stage_initial_snapshot(uuid,bigint,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb),public.commerce_complete_initial_sync(uuid,bigint) from public,anon,authenticated;
grant execute on function public.commerce_begin_initial_sync(uuid,uuid),public.commerce_mark_sync_failed(uuid,bigint,text,boolean),public.commerce_stage_initial_snapshot(uuid,bigint,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb),public.commerce_complete_initial_sync(uuid,bigint) to service_role;
grant select on public.commerce_product_net_sales to service_role;
grant select on public.commerce_product_net_sales_by_generation to service_role;
