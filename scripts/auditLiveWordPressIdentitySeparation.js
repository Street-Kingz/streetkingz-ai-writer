import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();
const runId = "guarded-writer-v0.1.7-live-identity-audit-001";
const runDir = path.join(root, "artifacts/implementation/heavy-duty-drying-towel-1200gsm/production-v1", runId);
if (fs.existsSync(runDir)) throw new Error("IMMUTABLE_RUN_DIRECTORY_EXISTS");
fs.mkdirSync(runDir, { recursive: false, mode: 0o700 });
const required = ["WORDPRESS_BASE_URL", "WORDPRESS_READ_USERNAME", "WORDPRESS_READ_APPLICATION_PASSWORD", "WORDPRESS_WRITE_USERNAME", "WORDPRESS_WRITE_APPLICATION_PASSWORD"];
for (const key of required) if (!process.env[key]?.trim()) throw new Error(`MISSING_${key}`);
const sha = (value) => crypto.createHash("sha256").update(value).digest("hex");
const auth = (user, pass) => `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`;
const base = new URL(process.env.WORDPRESS_BASE_URL);
const credentials = {
  reader: auth(process.env.WORDPRESS_READ_USERNAME, process.env.WORDPRESS_READ_APPLICATION_PASSWORD),
  writer: auth(process.env.WORDPRESS_WRITE_USERNAME, process.env.WORDPRESS_WRITE_APPLICATION_PASSWORD),
};
const persist = (name, value) => fs.writeFileSync(path.join(runDir, name), `${JSON.stringify(value, null, 2)}\n`, { flag: "wx", mode: 0o600 });
const requests = [];
async function get(label, pathname, identity = null) {
  const headers = { accept: "application/json" };
  if (identity) headers.authorization = credentials[identity];
  const response = await fetch(new URL(pathname, base), { method: "GET", headers, redirect: "manual" });
  const raw = await response.text();
  let body = null; try { body = JSON.parse(raw); } catch {}
  const record = { label, identity: identity ?? "anonymous", method: "GET", path: pathname, http_status: response.status, error_code: body?.code ?? null, response_sha256: sha(raw), response_size_bytes: Buffer.byteLength(raw), credentials_persisted: false, authorization_header_persisted: false };
  requests.push(record);
  return { record, body };
}
const identities = {};
for (const identity of ["reader", "writer"]) {
  let result = await get(`${identity}_users_me_edit`, "/wp-json/wp/v2/users/me?context=edit", identity);
  if (result.record.http_status >= 400) result = await get(`${identity}_users_me_view`, "/wp-json/wp/v2/users/me?context=view", identity);
  if (result.record.http_status !== 200 || !Number.isInteger(result.body?.id)) throw new Error(`${identity.toUpperCase()}_IDENTITY_UNRESOLVED`);
  identities[identity] = {
    user_id: result.body.id,
    username: result.body.slug ?? result.body.username ?? null,
    display_name: result.body.name ?? null,
    roles: Array.isArray(result.body.roles) ? result.body.roles : null,
    capabilities: result.body.capabilities && typeof result.body.capabilities === "object" ? result.body.capabilities : null,
    extra_capabilities: result.body.extra_capabilities && typeof result.body.extra_capabilities === "object" ? result.body.extra_capabilities : null,
    inspection_context: result.record.path.includes("context=edit") ? "edit" : "view",
    response_fields: Object.keys(result.body).sort(),
  };
}
const probes = {};
const probeDefs = [
  ["reader_endpoint", "/wp-json/streetkingz-ai/v1/products/70/authoritative"],
  ["writer_status", "/wp-json/streetkingz-ai/v1/approved-product-70-copy/approval/status"],
  ["manage_options", "/wp-json/wp/v2/settings"],
  ["plugin_management", "/wp-json/wp/v2/plugins"],
  ["edit_posts", "/wp-json/wp/v2/posts?context=edit&per_page=1"],
  ["edit_products", "/wp-json/wp/v2/product?context=edit&per_page=1"],
];
for (const identity of ["reader", "writer"]) {
  probes[identity] = {};
  for (const [name, pathname] of probeDefs) {
    const result = await get(`${identity}_${name}`, pathname, identity);
    probes[identity][name] = { http_status: result.record.http_status, error_code: result.record.error_code, allowed: result.record.http_status < 400 };
  }
}
const distinct = identities.reader.user_id !== identities.writer.user_id;
const result = { run_id: runId, identities, identities_distinct: distinct, environment_usernames_distinct: process.env.WORDPRESS_READ_USERNAME.trim() !== process.env.WORDPRESS_WRITE_USERNAME.trim(), probes, request_count: requests.length, requests, content_mutations: 0 };
persist("credential-user-mapping.json", { reader: identities.reader, writer: identities.writer, identities_distinct: distinct, environment_usernames_distinct: result.environment_usernames_distinct, credentials_persisted: false });
persist("live-role-capability-matrix.json", { identities, probes, limitations: identities.reader.roles === null || identities.writer.roles === null ? ["Core REST did not expose role/capability arrays for at least one identity; effective custom capabilities are proven by the protected endpoint results."] : [] });
persist("request-accounting.json", { requests, get_requests: requests.length, post_requests: 0, delete_requests: 0, content_mutations: 0 });
console.log(JSON.stringify({ run_directory: runDir, identities, distinct, probes }, null, 2));
