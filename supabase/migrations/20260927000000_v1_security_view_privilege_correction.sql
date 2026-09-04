-- V1 security correction: commerce net-sales views are service-only
-- aggregations. Keep their definitions unchanged and make relation access
-- explicit for the intended service role.
revoke all on public.commerce_product_net_sales,
  public.commerce_product_net_sales_by_generation
  from public, anon, authenticated;

grant select on public.commerce_product_net_sales,
  public.commerce_product_net_sales_by_generation
  to service_role;

-- Future public tables/views require explicit grants for customer reads.
alter default privileges for role postgres in schema public
  revoke all on tables from authenticated;
