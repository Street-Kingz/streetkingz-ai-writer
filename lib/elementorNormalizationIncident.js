import crypto from "node:crypto";

export const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

function family(setting, path) {
  if (/typography|font/i.test(setting)) return "typography";
  if (/_mobile|_tablet/i.test(path)) return "responsive layout";
  if (/margin|padding|gap|spacing|space|distance/i.test(setting)) return "spacing";
  if (/border/i.test(setting)) return "border";
  if (/width|height|size|image/i.test(setting)) return "sizing";
  if (/flex|grid|column|row|align|justify/i.test(setting)) return "layout";
  if (/position|z_index|offset/i.test(setting)) return "positioning";
  if (/animation|duration|delay/i.test(setting)) return "animation";
  if (/editor|text|title|description|content/i.test(setting)) return "widget content";
  return "unknown/other";
}

export function incidentNumericStringEquivalent(change) {
  return change.original_type === "number" && change.current_type === "string" && String(change.original_value) === change.current_value && /\.settings\./.test(change.path) && ["size", "id"].includes(change.property_name);
}

export function diffElementorDocuments(before, after) {
  const changes = [];
  function walk(left, right, parts = [], context = {}) {
    if (Object.is(left, right)) return;
    if (Array.isArray(left) && Array.isArray(right)) {
      if (left.length !== right.length) changes.push({ path: parts.join("."), change_kind: "array_length", original_type: "array", current_type: "array", original_value: left.length, current_value: right.length, ...context });
      const length = Math.max(left.length, right.length);
      for (let index = 0; index < length; index++) walk(left[index], right[index], [...parts, index], context);
      return;
    }
    if (left && right && typeof left === "object" && typeof right === "object" && !Array.isArray(left) && !Array.isArray(right)) {
      const nextContext = {
        element_id: left.id ?? right.id ?? context.element_id ?? null,
        element_type: left.elType ?? right.elType ?? context.element_type ?? null,
        widget_type: left.widgetType ?? right.widgetType ?? context.widget_type ?? null,
        nesting_level: parts.filter((part) => part === "elements").length,
      };
      for (const key of [...new Set([...Object.keys(left), ...Object.keys(right)])].sort()) {
        if (!(key in left)) { changes.push({ path: [...parts, key].join("."), change_kind: "added_property", original_type: "missing", current_type: typeof right[key], original_value: null, current_value: right[key], property_name: key, property_family: family(key, [...parts, key].join(".")), ...nextContext }); continue; }
        if (!(key in right)) { changes.push({ path: [...parts, key].join("."), change_kind: "missing_property", original_type: typeof left[key], current_type: "missing", original_value: left[key], current_value: null, property_name: key, property_family: family(key, [...parts, key].join(".")), ...nextContext }); continue; }
        walk(left[key], right[key], [...parts, key], nextContext);
      }
      return;
    }
    const propertyName = String(parts.at(-1) ?? "");
    const change = { path: parts.join("."), change_kind: "value", original_type: left === null ? "null" : typeof left, current_type: right === null ? "null" : typeof right, original_value: left, current_value: right, property_name: propertyName, property_family: family(propertyName, parts.join(".")), ...context };
    change.value_equal_after_numeric_coercion = change.original_type === "number" && change.current_type === "string" && String(change.original_value) === change.current_value;
    change.incident_allowlist_match = incidentNumericStringEquivalent(change);
    changes.push(change);
  }
  walk(before, after);
  return changes;
}

export function validateExactRecoverySpecification(specification, expected) {
  if (!specification || typeof specification !== "object") return false;
  const keys = Object.keys(specification).sort();
  if (JSON.stringify(keys) !== JSON.stringify(["allowed_meta_key", "current_raw_sha256", "product_mutation_allowed", "recovery_raw_sha256", "template_id"].sort())) return false;
  return specification.template_id === 2003 && specification.allowed_meta_key === "_elementor_data" && specification.product_mutation_allowed === false && specification.current_raw_sha256 === expected.current_raw_sha256 && specification.recovery_raw_sha256 === expected.recovery_raw_sha256;
}
