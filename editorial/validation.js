import { COMPONENT_DATA_SCHEMAS, COMPONENT_TYPES, EDITORIAL_PAGE_SCHEMA_VERSION, editorialPageJsonSchema } from "./contracts.js";

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const error = (code, path, message) => ({ code, path, message });

function schemaErrors(value, schema, path = "$", root = schema) {
  if (schema.$ref) {
    const resolved = schema.$ref.replace(/^#\//, "").split("/").reduce((item, key) => item?.[key], root);
    return resolved ? schemaErrors(value, resolved, path, root) : [error("SCHEMA_INVALID", path, `Unresolved ${schema.$ref}.`)];
  }
  if (schema.anyOf) return schema.anyOf.some((item) => schemaErrors(value, item, path, root).length === 0) ? [] : [error("SCHEMA_INVALID", path, "Value does not match an allowed schema.")];
  const errors = [];
  if (schema.type === "object") {
    if (!isObject(value)) return [error("SCHEMA_INVALID", path, "Expected object.")];
    for (const key of schema.required || []) if (!(key in value)) errors.push(error("REQUIRED_FIELD_MISSING", `${path}.${key}`, "Required field is absent."));
    if (schema.additionalProperties === false) for (const key of Object.keys(value)) if (!schema.properties[key]) errors.push(error("SCHEMA_INVALID", `${path}.${key}`, "Unknown field is not allowed."));
    for (const [key, child] of Object.entries(schema.properties || {})) if (key in value) errors.push(...schemaErrors(value[key], child, `${path}.${key}`, root));
  } else if (schema.type === "array") {
    if (!Array.isArray(value)) return [error("SCHEMA_INVALID", path, "Expected array.")];
    if (Number.isInteger(schema.minItems) && value.length < schema.minItems) errors.push(error("SCHEMA_INVALID", path, `Expected at least ${schema.minItems} items.`));
    if (Number.isInteger(schema.maxItems) && value.length > schema.maxItems) errors.push(error("SCHEMA_INVALID", path, `Expected at most ${schema.maxItems} items.`));
    value.forEach((item, index) => errors.push(...schemaErrors(item, schema.items, `${path}[${index}]`, root)));
  } else if (schema.type === "string" && typeof value !== "string") errors.push(error("SCHEMA_INVALID", path, "Expected string."));
  else if (schema.type === "boolean" && typeof value !== "boolean") errors.push(error("SCHEMA_INVALID", path, "Expected boolean."));
  else if (schema.type === "null" && value !== null) errors.push(error("SCHEMA_INVALID", path, "Expected null."));
  if (schema.enum && !schema.enum.includes(value)) errors.push(error("ENUM_INVALID", path, `Value must be one of ${schema.enum.join(", ")}.`));
  return errors;
}

export function validateAgainstSchema(value, schema) { return schemaErrors(value, schema); }

function walk(value, visit, path = "$") {
  visit(value, path);
  if (Array.isArray(value)) value.forEach((item, index) => walk(item, visit, `${path}[${index}]`));
  else if (isObject(value)) for (const [key, item] of Object.entries(value)) walk(item, visit, `${path}.${key}`);
}

function references(value, key) {
  const values = [];
  walk(value, (item, path) => { if (path.endsWith(`.${key}`) && Array.isArray(item)) values.push(...item); });
  return values;
}

export function validateEditorialPagePlan(plan, allowlists) {
  const errors = [];
  if (!isObject(plan)) return [error("PLAN_INVALID", "$", "Plan must be an object.")];
  for (const key of ["plan_id", "deterministic_content_sha256", "packet_id", "strategy_id", "topic", "primary_query", "title_direction", "h1_direction", "introduction_objective"]) if (typeof plan[key] !== "string" || !plan[key].trim()) errors.push(error("PLAN_INVALID", `$.${key}`, "Required non-empty string."));
  if (!Array.isArray(plan.components) || !plan.components.length) errors.push(error("PLAN_INVALID", "$.components", "Plan needs at least one component."));
  const components = plan.components || [];
  const ids = components.map((item) => item.component_id);
  if (new Set(ids).size !== ids.length) errors.push(error("DUPLICATE_COMPONENT_ID", "$.components", "Component IDs must be unique."));
  if (JSON.stringify(plan.component_sequence) !== JSON.stringify(ids)) errors.push(error("INVALID_COMPONENT_ORDER", "$.component_sequence", "Sequence must exactly match component order."));
  const requirements = plan.component_requirements;
  if (!isObject(requirements) || !Array.isArray(requirements.required_component_types) || !Array.isArray(requirements.ordering_rules)) errors.push(error("PLAN_INVALID", "$.component_requirements", "Every plan must declare its own component requirement policy."));
  const types = components.map((item) => item.component_type);
  for (const type of requirements?.required_component_types || []) if (!types.includes(type)) errors.push(error("REQUIRED_COMPONENT_MISSING", "$.components", `${type} is required by this page plan.`));
  for (const [index, rule] of (requirements?.ordering_rules || []).entries()) {
    if (rule.rule === "component_at_position" && types[rule.position] !== rule.component_type) errors.push(error("INVALID_COMPONENT_ORDER", `$.component_requirements.ordering_rules[${index}]`, `${rule.component_type} must be at position ${rule.position}.`));
    else if (rule.rule === "component_last" && types.at(-1) !== rule.component_type) errors.push(error("INVALID_COMPONENT_ORDER", `$.component_requirements.ordering_rules[${index}]`, `${rule.component_type} must be last.`));
    else if (rule.rule === "component_after") {
      const item = types.indexOf(rule.component_type), after = types.indexOf(rule.after_component_type);
      if (item >= 0 && (after < 0 || item <= after)) errors.push(error("INVALID_COMPONENT_ORDER", `$.component_requirements.ordering_rules[${index}]`, `${rule.component_type} must follow ${rule.after_component_type}.`));
    }
  }
  const evidence = new Set(allowlists.evidence_ids), products = new Set(allowlists.product_ids), links = new Set(allowlists.internal_link_ids);
  components.forEach((item, index) => {
    if (!COMPONENT_TYPES.includes(item.component_type)) errors.push(error("UNKNOWN_COMPONENT_TYPE", `$.components[${index}].component_type`, "Unknown component type."));
    if (typeof item.purpose !== "string" || !item.purpose.trim()) errors.push(error("UNJUSTIFIED_COMPONENT", `$.components[${index}].purpose`, "Every component needs a plan justification."));
    for (const id of item.evidence_ids || []) if (!evidence.has(id)) errors.push(error("UNKNOWN_EVIDENCE_ID", `$.components[${index}].evidence_ids`, id));
    for (const id of item.product_ids || []) if (!products.has(id)) errors.push(error("UNKNOWN_PRODUCT_ID", `$.components[${index}].product_ids`, id));
    for (const id of item.internal_link_ids || []) if (!links.has(id)) errors.push(error("UNKNOWN_INTERNAL_LINK_ID", `$.components[${index}].internal_link_ids`, id));
    for (const media of item.media_requirements || []) if ("url" in media || "src" in media) errors.push(error("INVENTED_MEDIA_URL", `$.components[${index}].media_requirements`, "Media requirements cannot contain URLs."));
  });
  if (plan.drafting_authorised !== false || plan.publication_authorised !== false) errors.push(error("AUTHORITY_LEAK", "$", "Plan cannot authorise drafting or publication."));
  return errors;
}

export function validateStructuredEditorialPage(page, { plan, allowlists }) {
  const errors = schemaErrors(page, editorialPageJsonSchema(allowlists, plan));
  if (!isObject(page)) return errors;
  const planned = new Map(plan.components.map((item) => [item.component_id, item]));
  if (page.schema_version !== EDITORIAL_PAGE_SCHEMA_VERSION) errors.push(error("SCHEMA_INVALID", "$.schema_version", "Wrong page schema version."));
  if (page.validation_metadata?.packet_id !== plan.packet_id || page.validation_metadata?.strategy_id !== plan.strategy_id || page.validation_metadata?.page_plan_id !== plan.plan_id || page.validation_metadata?.page_plan_hash !== plan.deterministic_content_sha256) errors.push(error("STRATEGY_OR_PLAN_DEVIATION", "$.validation_metadata", "Draft must bind to the approved strategy and page plan."));
  const pageIds = (page.components || []).map((item) => item.component_id);
  if (JSON.stringify(pageIds) !== JSON.stringify(plan.component_sequence)) errors.push(error("COMPONENT_PLAN_DEVIATION", "$.components", "Component sequence differs from approved plan."));
  for (const [index, item] of (page.components || []).entries()) {
    const slot = planned.get(item.component_id);
    if (!slot || slot.component_type !== item.component_type) errors.push(error("COMPONENT_PLAN_DEVIATION", `$.components[${index}]`, "Component was not justified by the approved plan."));
    if (slot) {
      for (const id of item.evidence_ids || []) if (!slot.evidence_ids.includes(id)) errors.push(error("UNKNOWN_EVIDENCE_ID", `$.components[${index}].evidence_ids`, "Evidence is outside approved component scope."));
      for (const id of item.product_ids || []) if (!slot.product_ids.includes(id)) errors.push(error("UNKNOWN_PRODUCT_ID", `$.components[${index}].product_ids`, "Product is outside approved component scope."));
      for (const id of item.internal_link_ids || []) if (!slot.internal_link_ids.includes(id)) errors.push(error("UNKNOWN_INTERNAL_LINK_ID", `$.components[${index}].internal_link_ids`, "Link is outside approved component scope."));
      if (JSON.stringify(item.media_requirements) !== JSON.stringify(slot.media_requirements)) errors.push(error("COMPONENT_PLAN_DEVIATION", `$.components[${index}].media_requirements`, "Media requirements differ from the approved plan."));
    }
    if (!["hero", "conclusion", "call_to_action", "founder_note"].includes(item.component_type) && !(item.evidence_ids || []).length) errors.push(error("UNSUPPORTED_FACTUAL_CLAIM", `$.components[${index}].evidence_ids`, "Factual component requires evidence."));
  }
  const evidence = new Set(allowlists.evidence_ids), products = new Set(allowlists.product_ids), links = new Set(allowlists.internal_link_ids);
  for (const id of references(page, "evidence_ids")) if (!evidence.has(id)) errors.push(error("UNKNOWN_EVIDENCE_ID", "$", id));
  for (const id of references(page, "product_ids")) if (!products.has(id)) errors.push(error("UNKNOWN_PRODUCT_ID", "$", id));
  for (const id of references(page, "internal_link_ids")) if (!links.has(id)) errors.push(error("UNKNOWN_INTERNAL_LINK_ID", "$", id));
  walk(page, (value, path) => {
    if (typeof value === "string" && /https?:\/\//i.test(value)) errors.push(error("INVENTED_URL", path, "Canonical URLs must be resolved from IDs outside model output."));
    if (typeof value === "string" && /<\/?[a-z][^>]*>|(^|\n)#{1,6}\s/i.test(value)) errors.push(error("ARBITRARY_HTML_OR_DOCUMENT", path, "HTML and document-level Markdown are not allowed."));
    if (typeof value === "string" && /we (?:tested|put .* to the test)|our (?:tests|testing)|hands-on test/i.test(value)) errors.push(error("INVENTED_EXPERIENCE", path, "Unprovided first-hand testing is not allowed."));
  });
  if (page.h1 !== plan.h1_direction) errors.push(error("STRATEGY_OR_PLAN_DEVIATION", "$.h1", "H1 must preserve the approved direction."));
  const productIndex = (page.components || []).findIndex((item) => item.component_type === "product_recommendation");
  const criteriaIndex = (page.components || []).findIndex((item) => item.component_type === "criteria_cards");
  if (productIndex >= 0 && (criteriaIndex < 0 || productIndex <= criteriaIndex)) errors.push(error("COMPONENT_PLAN_DEVIATION", "$.components", "Product recommendation must follow the approved selection criteria."));
  return errors;
}

export function componentSchema(type) { return COMPONENT_DATA_SCHEMAS[type] || null; }
