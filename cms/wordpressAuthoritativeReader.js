import { sha256 } from "../research/core/canonical.js";

const ALLOWED_META = Object.freeze(["_elementor_data", "_elementor_edit_mode", "_elementor_template_type", "_elementor_version"]);

export function wordpressReadConfig(env = process.env) {
  const baseUrl = String(env.WORDPRESS_BASE_URL || "").trim();
  const username = String(env.WORDPRESS_READ_USERNAME || "").trim();
  const applicationPassword = String(env.WORDPRESS_READ_APPLICATION_PASSWORD || "").trim();
  if (!baseUrl || !username || !applicationPassword) {
    throw Object.assign(new Error("Read-only WordPress credentials are not configured."), {
      code: "WORDPRESS_READ_AUTH_MISSING",
      missing: [!baseUrl && "WORDPRESS_BASE_URL", !username && "WORDPRESS_READ_USERNAME", !applicationPassword && "WORDPRESS_READ_APPLICATION_PASSWORD"].filter(Boolean)
    });
  }
  const url = new URL(baseUrl);
  if (url.protocol !== "https:") throw Object.assign(new Error("WordPress authenticated reads require HTTPS."), { code: "WORDPRESS_READ_HTTPS_REQUIRED" });
  return { baseUrl: url.origin, username, applicationPassword };
}

function rawField(record, name) {
  const value = record?.[name];
  if (typeof value?.raw !== "string") throw Object.assign(new Error(`WordPress did not expose raw ${name}.`), { code: "WORDPRESS_RAW_FIELD_UNAVAILABLE", field: name });
  return value.raw;
}

function unwrapMeta(meta, key) {
  const value = meta?.[key];
  if (Array.isArray(value)) return value.length ? value[0] : null;
  return value ?? null;
}

export function canonicalAuthoritativePost(record, provenance) {
  if (record?.schema_version === 2 && record?.product && record?.elementor_template) {
    const template = record.elementor_template;
    const elementorData = template.raw_elementor_data;
    if (typeof elementorData !== "string" || !elementorData.length) throw Object.assign(new Error("Authoritative endpoint did not expose template raw _elementor_data."), { code: "ELEMENTOR_TEMPLATE_DATA_NOT_EXPOSED" });
    if (record.product.post_type !== "product" || template.post_type !== "elementor_library" || template.applicability?.verified !== true) throw Object.assign(new Error("Authoritative endpoint returned an unverified product template relationship."), { code: "ELEMENTOR_TEMPLATE_OWNERSHIP_UNVERIFIED" });
    const fields = { post_title: String(record.product.post_title ?? ""), post_excerpt: String(record.product.post_excerpt ?? ""), post_content: String(record.product.post_content ?? ""), slug: String(record.product.post_name ?? ""), permalink: String(record.product.permalink ?? "") };
    return { schema_version: "2.0.0", artifact_type: "wordpress_authoritative_post_and_template_read", post_id: Number(record.product.id), post_type: record.product.post_type, status: String(record.product.post_status ?? ""), fields,
      template: { id: Number(template.id), post_type: template.post_type, post_status: template.post_status, post_title: template.post_title, template_type: template.template_type, applicability: template.applicability, raw_elementor_data: elementorData, edit_mode: template.edit_mode, elementor_version: template.elementor_version },
      meta: { _elementor_data: elementorData, _elementor_edit_mode: template.edit_mode, _elementor_template_type: template.template_type, _elementor_version: template.elementor_version },
      hashes: { post_title: sha256(fields.post_title), post_excerpt: sha256(fields.post_excerpt), post_content: sha256(fields.post_content), _elementor_data: sha256(elementorData) },
      rollback_values: { post_title: fields.post_title, post_excerpt: fields.post_excerpt, post_content: fields.post_content, _elementor_data: elementorData },
      provenance: { ...provenance, endpoint_schema_version: 2, authentication: "wordpress_application_password", credentials_persisted: false, request_headers_persisted: false, write_capability: false } };
  }
  if (record?.schema_version === 1 && record?.product && record?.elementor) {
    const elementorData = record.elementor.raw_data;
    if (typeof elementorData !== "string" || !elementorData.length) throw Object.assign(new Error("Authoritative endpoint did not expose raw _elementor_data."), { code: "ELEMENTOR_META_NOT_EXPOSED" });
    if (record.product.post_type !== "product") throw Object.assign(new Error("Authoritative endpoint returned a non-product."), { code: "WORDPRESS_NOT_PRODUCT" });
    const fields = { post_title: String(record.product.post_title ?? ""), post_excerpt: String(record.product.post_excerpt ?? ""), post_content: String(record.product.post_content ?? ""), slug: String(record.product.post_name ?? ""), permalink: String(record.product.permalink ?? "") };
    return { schema_version: "1.0.0", artifact_type: "wordpress_authoritative_post_read", post_id: Number(record.product.id), post_type: record.product.post_type, status: String(record.product.post_status ?? ""), fields,
      meta: { _elementor_data: elementorData, ...Object.fromEntries([["_elementor_edit_mode", record.elementor.edit_mode], ["_elementor_template_type", record.elementor.template_type], ["_elementor_version", record.elementor.version]].filter(([, value]) => value !== null && value !== undefined)) },
      hashes: { post_title: sha256(fields.post_title), post_excerpt: sha256(fields.post_excerpt), post_content: sha256(fields.post_content), _elementor_data: sha256(elementorData) },
      rollback_values: { post_title: fields.post_title, post_excerpt: fields.post_excerpt, post_content: fields.post_content, _elementor_data: elementorData },
      provenance: { ...provenance, authentication: "wordpress_application_password", credentials_persisted: false, request_headers_persisted: false, write_capability: false } };
  }
  const elementorData = unwrapMeta(record?.meta, "_elementor_data");
  if (typeof elementorData !== "string" || !elementorData.length) {
    throw Object.assign(new Error("Authenticated REST did not expose raw _elementor_data; a narrowly scoped read-only helper or WP-CLI read is required."), { code: "ELEMENTOR_META_NOT_EXPOSED" });
  }
  const fields = {
    post_title: rawField(record, "title"), post_excerpt: rawField(record, "excerpt"), post_content: rawField(record, "content"),
    slug: String(record.slug || ""), permalink: String(record.link || "")
  };
  const meta = Object.fromEntries(ALLOWED_META.map((key) => [key, unwrapMeta(record.meta, key)]).filter(([, value]) => value !== null));
  return {
    schema_version: "1.0.0", artifact_type: "wordpress_authoritative_post_read", post_id: Number(record.id),
    post_type: String(record.type || ""), status: String(record.status || ""), fields, meta,
    hashes: {
      post_title: sha256(fields.post_title), post_excerpt: sha256(fields.post_excerpt), post_content: sha256(fields.post_content),
      _elementor_data: sha256(elementorData)
    },
    rollback_values: { post_title: fields.post_title, post_excerpt: fields.post_excerpt, post_content: fields.post_content, _elementor_data: elementorData },
    provenance: { ...provenance, authentication: "wordpress_application_password", credentials_persisted: false, request_headers_persisted: false, write_capability: false }
  };
}

export function createWordPressAuthoritativeReader({ config, fetchImpl = fetch, clock = () => new Date(), persistRawResponse = async () => {} }) {
  const credentials = Buffer.from(`${config.username}:${config.applicationPassword}`, "utf8").toString("base64");
  return Object.freeze({
    async readPost(postId) {
      if (!Number.isInteger(postId) || postId <= 0) throw Object.assign(new Error("A positive integer post ID is required."), { code: "WORDPRESS_POST_ID_INVALID" });
      const url = new URL(`/wp-json/streetkingz-ai/v1/products/${postId}/authoritative`, config.baseUrl);
      const started = clock().toISOString();
      const response = await fetchImpl(url, { method: "GET", redirect: "follow", headers: { accept: "application/json", authorization: `Basic ${credentials}` } });
      const body = await response.text();
      const provenance = { requested_url: url.href, final_url: response.url || url.href, http_status: response.status, retrieved_at: started, response_size_bytes: Buffer.byteLength(body), response_sha256: sha256(body), request_count: 1 };
      await persistRawResponse({ body, provenance });
      if (!response.ok) throw Object.assign(new Error(`Authenticated WordPress read failed with HTTP ${response.status}.`), { code: "WORDPRESS_READ_FAILED", httpStatus: response.status, provenance });
      const record = JSON.parse(body);
      const returnedId = Number(record?.schema_version) >= 1 ? record?.product?.id : record?.id;
      if (Number(returnedId) !== postId) throw Object.assign(new Error("WordPress returned a different post ID."), { code: "WORDPRESS_POST_ID_MISMATCH" });
      return canonicalAuthoritativePost(record, provenance);
    }
  });
}

export function parseElementorDocument(rawValue) {
  const document = JSON.parse(rawValue);
  if (!Array.isArray(document)) throw Object.assign(new Error("_elementor_data must be a JSON array."), { code: "ELEMENTOR_DOCUMENT_INVALID" });
  return document;
}

export function findElementorElementById(document, id) {
  const matches = [];
  const visit = (items) => {
    for (const item of items || []) {
      if (item?.id === id) matches.push(item);
      visit(item?.elements);
    }
  };
  visit(document);
  if (matches.length !== 1) throw Object.assign(new Error(`Expected exactly one Elementor element ${id}, found ${matches.length}.`), { code: matches.length ? "ELEMENTOR_WIDGET_DUPLICATE" : "ELEMENTOR_WIDGET_MISSING", elementId: id, matches: matches.length });
  return matches[0];
}

export function findElementorElementWithPath(document, id) {
  const matches = [];
  const visit = (items, path = []) => {
    for (let index = 0; index < (items || []).length; index += 1) {
      const item = items[index];
      const currentPath = [...path, `${item.id || index}`];
      if (item?.id === id) matches.push({ element: item, path: currentPath });
      visit(item?.elements, currentPath);
    }
  };
  visit(document);
  if (matches.length !== 1) throw Object.assign(new Error(`Expected exactly one Elementor element ${id}, found ${matches.length}.`), { code: matches.length ? "ELEMENTOR_WIDGET_DUPLICATE" : "ELEMENTOR_WIDGET_MISSING", elementId: id, matches: matches.length });
  return matches[0];
}

export function mapRequiredElementorWidgets(authoritativePost) {
  const document = parseElementorDocument(authoritativePost.meta._elementor_data);
  const definitions = {
    description: { id: "c80e718", expectedWidgetType: "text-editor", setting: "editor" },
    comparison_accordion: { id: "4691e088", expectedWidgetType: "nested-accordion", setting: null },
    comparison_answer: { id: "40869c27", expectedWidgetType: "text-editor", setting: "editor" },
    detailed_safety_answer: { id: "43d7d6f0", expectedWidgetType: "text-editor", setting: "editor" }
  };
  return Object.fromEntries(Object.entries(definitions).map(([name, definition]) => {
    const located = findElementorElementWithPath(document, definition.id);
    const element = located.element;
    if (element.widgetType !== definition.expectedWidgetType) throw Object.assign(new Error(`Elementor element ${definition.id} has unexpected widget type.`), { code: "ELEMENTOR_WIDGET_TYPE_MISMATCH", elementId: definition.id, expected: definition.expectedWidgetType, actual: element.widgetType });
    const value = definition.setting ? element.settings?.[definition.setting] : null;
    if (definition.setting && typeof value !== "string") throw Object.assign(new Error(`Elementor element ${definition.id} lacks string setting ${definition.setting}.`), { code: "ELEMENTOR_WIDGET_SETTING_MISSING", elementId: definition.id, setting: definition.setting });
    return [name, { element_id: definition.id, element_type: element.elType, widget_type: element.widgetType, deterministic_path: located.path, setting_property: definition.setting, exact_stored_value: value, authoritative_value_sha256: definition.setting ? sha256(value) : null }];
  }));
}
