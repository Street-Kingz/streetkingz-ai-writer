import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();
const runDir = path.join(root, "artifacts/implementation/heavy-duty-drying-towel-1200gsm/production-v1/guarded-write-execution-v0.1.9-001");
const preRaw = fs.readFileSync(path.join(runDir, "pre-write-authoritative-response.json"), "utf8");
const pre = JSON.parse(preRaw);
const sha = (value) => crypto.createHash("sha256").update(value).digest("hex");
const auth = `Basic ${Buffer.from(`${process.env.WORDPRESS_READ_USERNAME}:${process.env.WORDPRESS_READ_APPLICATION_PASSWORD}`).toString("base64")}`;
const url = new URL("/wp-json/streetkingz-ai/v1/products/70/authoritative", process.env.WORDPRESS_BASE_URL);
const response = await fetch(url, { headers: { accept: "application/json", authorization: auth }, redirect: "manual" });
const raw = await response.text();
if (response.status !== 200) throw new Error(`AUTHORITATIVE_READ_FAILED_${response.status}`);
fs.writeFileSync(path.join(runDir, "post-failure-authoritative-response.json"), raw, { flag: "wx", mode: 0o600 });
const post = JSON.parse(raw);
const beforeDocument = JSON.parse(pre.elementor_template.raw_elementor_data);
const afterDocument = JSON.parse(post.elementor_template.raw_elementor_data);
function diff(before, after, parts = []) {
  if (Object.is(before, after)) return [];
  if (Array.isArray(before) && Array.isArray(after)) {
    if (before.length !== after.length) return [{ path: parts.join("."), kind: "array_length", before: before.length, after: after.length }];
    return before.flatMap((item, i) => diff(item, after[i], [...parts, i]));
  }
  if (before && after && typeof before === "object" && typeof after === "object") return [...new Set([...Object.keys(before), ...Object.keys(after)])].sort().flatMap((key) => diff(before[key], after[key], [...parts, key]));
  return [{ path: parts.join("."), kind: "value", before_type: typeof before, after_type: typeof after, before_sha256: sha(String(before ?? "")), after_sha256: sha(String(after ?? "")) }];
}
const differences = diff(beforeDocument, afterDocument);
const report = {
  status: differences.length === 0 && pre.product.post_title === post.product.post_title && pre.product.post_excerpt === post.product.post_excerpt && pre.product.post_content === post.product.post_content && pre.product.post_name === post.product.post_name && pre.product.post_status === post.product.post_status ? "EXACTLY_RESTORED" : "DRIFT_PRESENT",
  http_status: response.status,
  pre_response_sha256: sha(preRaw),
  post_response_sha256: sha(raw),
  product: {
    title_identical: pre.product.post_title === post.product.post_title,
    excerpt_identical: pre.product.post_excerpt === post.product.post_excerpt,
    content_identical: pre.product.post_content === post.product.post_content,
    slug_identical: pre.product.post_name === post.product.post_name,
    status_identical: pre.product.post_status === post.product.post_status,
  },
  template: {
    raw_identical: pre.elementor_template.raw_elementor_data === post.elementor_template.raw_elementor_data,
    semantic_identical: differences.length === 0,
    difference_count: differences.length,
    differences,
  },
  credentials_persisted: false,
  authorization_header_persisted: false,
};
fs.writeFileSync(path.join(runDir, "post-failure-authoritative-comparison.json"), `${JSON.stringify(report, null, 2)}\n`, { flag: "wx", mode: 0o600 });
console.log(JSON.stringify({ status: report.status, pre: report.pre_response_sha256, post: report.post_response_sha256, product: report.product, template: { raw_identical: report.template.raw_identical, semantic_identical: report.template.semantic_identical, difference_count: report.template.difference_count, paths: differences.map((item) => item.path) } }, null, 2));
