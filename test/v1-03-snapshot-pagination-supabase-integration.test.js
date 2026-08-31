import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { loadCurrentCommerceSnapshot } from "../product-kernel/woocommerceRouteService.js";

const enabled = process.env.V1_03_INTEGRATION === "1";
const required = name => process.env[name] || (() => { throw new Error(`${name} required`); })();

test("current snapshot loader returns every large fact set and no duplicates", { skip: !enabled }, async t => {
  const admin = createClient(required("SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
  const email = `v103-page-${crypto.randomUUID()}@example.test`, password = `V1-03-${crypto.randomUUID()}!Aa`;
  const user = await admin.auth.admin.createUser({ email, password, email_confirm: true }); assert.ifError(user.error); const userId = user.data.user.id;
  t.after(() => admin.auth.admin.deleteUser(userId));
  const account = (await admin.from("accounts").insert({ auth_user_id: userId }).select("id").single()).data;
  const business = (await admin.from("businesses").insert({ account_id: account.id, name: "Snapshot Pagination", ecommerce_platform: "woocommerce" }).select("id").single()).data;
  const connection = (await admin.from("connections").insert({ business_id: business.id, provider_type: "woocommerce" }).select("id").single()).data;
  const attemptToken = `v103-page-${crypto.randomUUID()}`; const attempt = await admin.rpc("woo_create_auth_attempt", { p_user_id: attemptToken, p_account_id: account.id, p_business_id: business.id, p_connection_id: connection.id, p_canonical_base_url: "https://pagination.example/", p_expires_at: new Date(Date.now() + 60000).toISOString() }); assert.ifError(attempt.error); assert.ifError((await admin.rpc("woo_claim_auth_attempt", { p_user_id: attemptToken })).error); assert.ifError((await admin.rpc("woo_capture_callback", { p_attempt_id: attempt.data, p_consumer_key: "ck_page", p_consumer_secret: "cs_page", p_key_permissions: "read" })).error); const established = await admin.rpc("woo_complete_connection", { p_attempt_id: attempt.data, p_home_url: "https://pagination.example/", p_site_url: "https://pagination.example/", p_version: "11", p_timezone: "UTC", p_currency: "GBP", p_correlation_id: crypto.randomUUID() }); assert.ifError(established.error);
  const store = (await admin.from("commerce_stores").select("id").eq("id", established.data).single()).data;
  const count = 1001;
  const products = Array.from({ length: count }, (_, i) => ({ source_id: i + 1, name: `P${i + 1}`, product_type: "simple", source_status: "publish" }));
  const categories = [{ source_id: 1, name: "C1" }, { source_id: 2, name: "C2" }];
  const orders = Array.from({ length: count }, (_, i) => ({ source_id: i + 1, source_status: "completed", recognition_state: "recognised" }));
  const generationResult = await admin.rpc("commerce_begin_initial_sync", { p_store_id: store.id, p_correlation_id: crypto.randomUUID() }); assert.ifError(generationResult.error); const generation = generationResult.data;
  const links = products.flatMap(row => categories.map(category => ({ product_source_id: row.source_id, category_source_id: category.source_id })));
  const lines = orders.map(order => ({ order_source_id: order.source_id, source_line_id: order.source_id, product_source_id: order.source_id, total: "1.00", tax: "0.20" }));
  const staged = await admin.rpc("commerce_stage_initial_snapshot", { p_store_id: store.id, p_generation_id: generation, p_products: products, p_variations: [], p_categories: categories, p_links: links, p_orders: orders, p_lines: lines, p_adjustments: [] }); assert.ifError(staged.error);
  assert.ifError((await admin.rpc("commerce_complete_initial_sync", { p_store_id: store.id, p_generation_id: generation })).error);
  const snapshot = await loadCurrentCommerceSnapshot(admin, { storeId: store.id, generationId: generation });
  assert.equal(snapshot.products.length, count); assert.equal(snapshot.orders.length, count); assert.equal(snapshot.lines.length, count); assert.equal(snapshot.categories.length, 2); assert.equal(snapshot.links.length, count * 2);
  assert.equal(new Set(snapshot.products.map(row => row.source_id)).size, count); assert.equal(new Set(snapshot.orders.map(row => row.source_id)).size, count); assert.equal(new Set(snapshot.lines.map(row => `${row.order_source_id}:${row.source_line_id}`)).size, count); assert.equal(new Set(snapshot.links.map(row => `${row.product_source_id}:${row.category_source_id}`)).size, count * 2);
  assert.equal(Object.hasOwn(snapshot.products[0], "id"), false); assert.equal(Object.hasOwn(snapshot.categories[0], "id"), false);
});
