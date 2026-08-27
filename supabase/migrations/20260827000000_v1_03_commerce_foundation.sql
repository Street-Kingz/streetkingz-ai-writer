create table if not exists public.commerce_stores (
 id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
 provider text not null default 'woocommerce', canonical_origin text not null, source_home_url text, source_site_url text,
 source_version text, currency text, timezone text, sync_state text not null default 'never',
 last_attempted_at timestamptz, last_successful_at timestamptz, current_generation bigint,
 unique (business_id, provider)
);
create table if not exists public.commerce_sync_generations (
 id bigint generated always as identity primary key, store_id uuid not null references public.commerce_stores(id) on delete cascade,
 state text not null default 'pending' check (state in ('pending','complete','partial','failed','stale')),
 started_at timestamptz not null default now(), completed_at timestamptz, error_code text
);
create table if not exists public.commerce_products (
 id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
 store_id uuid not null references public.commerce_stores(id) on delete cascade, generation_id bigint references public.commerce_sync_generations(id), source_id bigint not null,
 name text, slug text, canonical_url text, sku text, product_type text, source_status text, regular_price numeric, current_price numeric, sale_price numeric,
 manage_stock boolean, stock_quantity numeric, stock_status text, source_created_at timestamptz, source_modified_at timestamptz,
 unique(store_id, source_id, generation_id)
);
create table if not exists public.commerce_variations (
 id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
 store_id uuid not null references public.commerce_stores(id) on delete cascade, generation_id bigint references public.commerce_sync_generations(id), source_id bigint not null, parent_source_id bigint not null,
 sku text, attributes jsonb not null default '{}'::jsonb, regular_price numeric, current_price numeric, sale_price numeric, manage_stock boolean, stock_quantity numeric, stock_status text, source_status text,
 unique(store_id, source_id, generation_id)
);
create table if not exists public.commerce_categories (
 id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
 store_id uuid not null references public.commerce_stores(id) on delete cascade, generation_id bigint references public.commerce_sync_generations(id), source_id bigint not null, name text, slug text, parent_source_id bigint,
 unique(store_id, source_id, generation_id)
);
create table if not exists public.commerce_product_categories (
 product_id uuid not null references public.commerce_products(id) on delete cascade, category_id uuid not null references public.commerce_categories(id) on delete cascade, primary key(product_id, category_id)
);
create table if not exists public.commerce_orders (
 id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade, store_id uuid not null references public.commerce_stores(id) on delete cascade,
 generation_id bigint references public.commerce_sync_generations(id), source_id bigint not null, source_status text not null, recognition_state text not null default 'unknown', currency text, source_created_at timestamptz, source_modified_at timestamptz,
 order_total numeric, tax_total numeric, shipping_total numeric, discount_total numeric, refund_total numeric, prices_include_tax boolean,
 unique(store_id, source_id, generation_id)
);
create table if not exists public.commerce_order_lines (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.commerce_orders(id) on delete cascade, source_line_id bigint, product_source_id bigint, variation_source_id bigint, quantity numeric, subtotal numeric, total numeric, tax numeric, refund_total numeric
);
create table if not exists public.commerce_order_adjustments (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.commerce_orders(id) on delete cascade, adjustment_type text not null, amount numeric not null, product_source_id bigint, variation_source_id bigint
);
create table if not exists public.woocommerce_auth_attempts (
 id uuid primary key default gen_random_uuid(), user_id text not null unique, account_id uuid not null references public.accounts(id) on delete cascade, business_id uuid not null references public.businesses(id) on delete cascade, connection_id uuid not null references public.connections(id) on delete cascade, canonical_origin text not null, status text not null default 'pending' check(status in ('pending','completed','denied','expired','consumed')), expires_at timestamptz not null, consumed_at timestamptz
);
alter table public.commerce_stores enable row level security; alter table public.commerce_sync_generations enable row level security; alter table public.commerce_products enable row level security; alter table public.commerce_variations enable row level security; alter table public.commerce_categories enable row level security; alter table public.commerce_product_categories enable row level security; alter table public.commerce_orders enable row level security; alter table public.commerce_order_lines enable row level security; alter table public.commerce_order_adjustments enable row level security; alter table public.woocommerce_auth_attempts enable row level security;
revoke all on public.commerce_stores, public.commerce_sync_generations, public.commerce_products, public.commerce_variations, public.commerce_categories, public.commerce_product_categories, public.commerce_orders, public.commerce_order_lines, public.commerce_order_adjustments, public.woocommerce_auth_attempts from anon, authenticated;
grant select on public.commerce_stores, public.commerce_sync_generations, public.commerce_products, public.commerce_variations, public.commerce_categories, public.commerce_product_categories, public.commerce_orders, public.commerce_order_lines, public.commerce_order_adjustments to authenticated;
grant all on public.commerce_stores, public.commerce_sync_generations, public.commerce_products, public.commerce_variations, public.commerce_categories, public.commerce_product_categories, public.commerce_orders, public.commerce_order_lines, public.commerce_order_adjustments, public.woocommerce_auth_attempts to service_role;
create policy commerce_store_owner_select on public.commerce_stores for select to authenticated using (business_id in (select b.id from public.businesses b join public.accounts a on a.id=b.account_id where a.auth_user_id=auth.uid()));
create policy commerce_generation_owner_select on public.commerce_sync_generations for select to authenticated using (store_id in (select s.id from public.commerce_stores s where s.business_id in (select b.id from public.businesses b join public.accounts a on a.id=b.account_id where a.auth_user_id=auth.uid())));
create policy commerce_product_owner_select on public.commerce_products for select to authenticated using (business_id in (select b.id from public.businesses b join public.accounts a on a.id=b.account_id where a.auth_user_id=auth.uid()));
create policy commerce_variation_owner_select on public.commerce_variations for select to authenticated using (business_id in (select b.id from public.businesses b join public.accounts a on a.id=b.account_id where a.auth_user_id=auth.uid()));
create policy commerce_category_owner_select on public.commerce_categories for select to authenticated using (business_id in (select b.id from public.businesses b join public.accounts a on a.id=b.account_id where a.auth_user_id=auth.uid()));
create policy commerce_order_owner_select on public.commerce_orders for select to authenticated using (business_id in (select b.id from public.businesses b join public.accounts a on a.id=b.account_id where a.auth_user_id=auth.uid()));
create policy commerce_line_owner_select on public.commerce_order_lines for select to authenticated using (order_id in (select o.id from public.commerce_orders o where o.business_id in (select b.id from public.businesses b join public.accounts a on a.id=b.account_id where a.auth_user_id=auth.uid())));
create policy commerce_adjustment_owner_select on public.commerce_order_adjustments for select to authenticated using (order_id in (select o.id from public.commerce_orders o where o.business_id in (select b.id from public.businesses b join public.accounts a on a.id=b.account_id where a.auth_user_id=auth.uid())));
