import { execFileSync } from "node:child_process";
import fs from "node:fs";

const DB = "supabase_db_streetkingz-v105-input-20260914-ad9sko";
const BUSINESS = "5a23564d-45ed-4409-bd67-20c83c7d6d9b";
const acquisition = JSON.parse(fs.readFileSync("/private/tmp/streetkingz-v105-input-20260914-ad9sko/catalogue-acquisition.json", "utf8"));
const sql = `select jsonb_build_object(
  'store',(select to_jsonb(s) from (select id,current_generation,sync_state from public.commerce_stores where business_id='${BUSINESS}' and provider='woocommerce') s),
  'products',(select coalesce(jsonb_agg(to_jsonb(p)-'created_at' order by source_id),'[]'::jsonb) from public.commerce_products p join public.commerce_stores s on s.id=p.store_id where s.business_id='${BUSINESS}' and p.generation_id=s.current_generation),
  'categories',(select coalesce(jsonb_agg(to_jsonb(c)-'created_at' order by source_id),'[]'::jsonb) from public.commerce_categories c join public.commerce_stores s on s.id=c.store_id where s.business_id='${BUSINESS}' and c.generation_id=s.current_generation),
  'variations',(select coalesce(jsonb_agg(to_jsonb(v)-'created_at' order by source_id),'[]'::jsonb) from public.commerce_variations v join public.commerce_stores s on s.id=v.store_id where s.business_id='${BUSINESS}' and v.generation_id=s.current_generation),
  'links',(select coalesce(jsonb_agg(jsonb_build_object('product_source_id',p.source_id,'category_source_id',c.source_id) order by p.source_id,c.source_id),'[]'::jsonb) from public.commerce_product_categories l join public.commerce_stores s on s.id=l.store_id join public.commerce_products p on p.id=l.product_id join public.commerce_categories c on c.id=l.category_id where s.business_id='${BUSINESS}' and l.generation_id=s.current_generation)
)`;
const actual = JSON.parse(execFileSync("docker", ["exec", DB, "psql", "-U", "postgres", "-d", "postgres", "-qAt", "-c", sql], { encoding: "utf8" }).trim());
const decimal = value => {
  if (value == null || value === "") return null;
  const raw = String(value);
  if (!/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/.test(raw)) return null;
  const negative = raw.startsWith("-");
  const [whole, fraction = ""] = raw.replace(/^-/, "").split(".");
  const cleanWhole = whole.replace(/^0+(?=\d)/, "");
  const cleanFraction = fraction.replace(/0+$/, "");
  if (cleanWhole === "0" && !cleanFraction) return "0";
  return `${negative ? "-" : ""}${cleanWhole}${cleanFraction ? `.${cleanFraction}` : ""}`;
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const compare = (kind, fields, normalize = x => x) => {
  const expected = new Map(acquisition.catalogue[kind].map(row => [row.source_id, row]));
  const found = new Map(actual[kind].map(row => [row.source_id, row]));
  const mismatches = [];
  for (const [id, source] of expected) {
    const stored = found.get(id);
    if (!stored) { mismatches.push({ source_id: id, fields: ["missing"] }); continue; }
    const different = fields.filter(field => !same(normalize(field, stored[field]), normalize(field, source[field])));
    if (different.length) mismatches.push({ source_id: id, fields: different });
  }
  for (const id of found.keys()) if (!expected.has(id)) mismatches.push({ source_id: id, fields: ["unexpected"] });
  return { expected: expected.size, persisted: found.size, mismatches };
};
const decimalFields = new Set(["regular_price", "current_price", "sale_price", "stock_quantity"]);
const normal = (field, value) => decimalFields.has(field) ? decimal(value) : value;
const result = {
  store: actual.store && { current_generation: actual.store.current_generation, sync_state: actual.store.sync_state },
  products: compare("products", ["name", "slug", "canonical_url", "regular_price", "current_price", "sale_price", "stock_quantity", "stock_status"], normal),
  categories: compare("categories", ["name", "slug", "parent_source_id"]),
  variations: compare("variations", ["parent_source_id", "attributes", "regular_price", "current_price", "sale_price", "stock_quantity", "stock_status"], normal),
  relationships: { expected: acquisition.catalogue.links.length, persisted: actual.links.length, exact_source_pairs_match: same([...acquisition.catalogue.links].sort((a,b)=>a.product_source_id-b.product_source_id||a.category_source_id-b.category_source_id), [...actual.links].sort((a,b)=>a.product_source_id-b.product_source_id||a.category_source_id-b.category_source_id)) }
};
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
