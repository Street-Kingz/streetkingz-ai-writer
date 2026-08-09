import fs from "node:fs";
import path from "node:path";
import { diffElementorDocuments, incidentNumericStringEquivalent, sha256 } from "../lib/elementorNormalizationIncident.js";

const root = process.cwd();
const executionDir = path.join(root, "artifacts/implementation/heavy-duty-drying-towel-1200gsm/production-v1/guarded-write-execution-v0.1.9-001");
const incidentDir = path.join(root, "artifacts/incidents/template-2003-elementor-normalization-2026-08-09");
const preResponse = JSON.parse(fs.readFileSync(path.join(executionDir, "pre-write-authoritative-response.json"), "utf8"));
const currentResponse = JSON.parse(fs.readFileSync(path.join(executionDir, "post-failure-authoritative-response.json"), "utf8"));
const preRaw = preResponse.elementor_template.raw_elementor_data;
const currentRaw = currentResponse.elementor_template.raw_elementor_data;
const changes = diffElementorDocuments(JSON.parse(preRaw), JSON.parse(currentRaw));
const groups = (key) => Object.entries(changes.reduce((result, change) => { const value = String(change[key] ?? "none"); result[value] = (result[value] ?? 0) + 1; return result; }, {})).sort((a, b) => b[1] - a[1]).map(([value, count]) => ({ value, count }));
const summary = {
  schema_version: 1,
  incident: "template_2003_elementor_3_33_6_numeric_string_normalization",
  source: { pre_write: path.relative(root, path.join(executionDir, "pre-write-authoritative-response.json")), current: path.relative(root, path.join(executionDir, "post-failure-authoritative-response.json")) },
  template_id: 2003,
  hashes: { pre_raw_elementor_data_sha256: sha256(preRaw), current_raw_elementor_data_sha256: sha256(currentRaw) },
  counts: {
    total_differing_paths: changes.length,
    numeric_to_equal_numeric_string: changes.filter(incidentNumericStringEquivalent).length,
    string_to_number: changes.filter((x) => x.original_type === "string" && x.current_type === "number").length,
    other_value_changes: changes.filter((x) => x.change_kind === "value" && !incidentNumericStringEquivalent(x)).length,
    missing_properties: changes.filter((x) => x.change_kind === "missing_property").length,
    added_properties: changes.filter((x) => x.change_kind === "added_property").length,
    array_or_structural_changes: changes.filter((x) => x.change_kind === "array_length").length,
    widget_content_changes: changes.filter((x) => x.property_family === "widget content").length,
    safety_widget_changes: changes.filter((x) => x.element_id === "43d7d6f0").length,
  },
  all_changes_match_incident_allowlist: changes.every(incidentNumericStringEquivalent),
  groups: { by_element: groups("element_id"), by_widget_type: groups("widget_type"), by_setting: groups("property_name"), by_family: groups("property_family"), by_original_value: groups("original_value"), by_nesting_level: groups("nesting_level") },
};
fs.writeFileSync(path.join(incidentDir, "structural-diff.json"), `${JSON.stringify({ ...summary, differences: changes }, null, 2)}\n`, { flag: "wx", mode: 0o600 });
fs.writeFileSync(path.join(incidentDir, "normalization-map.json"), `${JSON.stringify({ template_id: 2003, groups: summary.groups, counts: summary.counts }, null, 2)}\n`, { flag: "wx", mode: 0o600 });
console.log(JSON.stringify(summary, null, 2));
