/* Planning-only validator. Never import this module from Product runtime. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname);
const fixturePath = path.join(root, 'fixtures', 'evaluation-inputs.jsonl');
const labelPath = path.join(root, 'evaluation-corpus.json');
const rows = fs.readFileSync(fixturePath, 'utf8').trim().split('\n').map(JSON.parse);
const labels = JSON.parse(fs.readFileSync(labelPath, 'utf8')).cases;
const expectedIds = Array.from({ length: 48 }, (_, i) => `V105-EVAL-${String(i + 1).padStart(3, '0')}`);
const interventions = new Set(['improve_existing_product', 'improve_existing_category', 'improve_existing_content', 'create_new_asset', 'improve_internal_linking', 'monitor_or_defer']);
const outcomes = new Set(['recommendations', 'no_action', 'insufficient_evidence']);
const effects = new Set(['raise_priority', 'lower_priority', 'change_sequencing', 'change_intervention', 'reduce_confidence', 'increase_confidence', 'resolve_tie', 'no_material_change']);
const primaryClasses = new Set(['existing_product_improvement', 'existing_category_improvement', 'existing_content_improvement', 'appropriate_new_asset', 'internal_linking', 'monitor_defer_outcome', 'insufficient_evidence', 'duplicate_overlap', 'wrong_market', 'navigational_brand', 'product_mismatch', 'wrong_page_type', 'invalid_target', 'missing_data_control', 'low_volume_commercial', 'high_volume_irrelevant', 'consolidation_sequencing', 'commercial_calibration']);
const forbiddenKeys = new Set(['signals', 'expected', 'expected_intervention', 'expected_outcome', 'candidate_type', 'intervention', 'priority', 'worthiness', 'low_customer_fit', 'commercial_irrelevance', 'product_mismatch', 'wrong_market', 'invalid_target', 'low_demand', 'high_demand', 'target_fit', 'sequence_dependency', 'appropriate_new_asset', 'no_action', 'insufficient_evidence']);

function walk(value, visit) {
  if (Array.isArray(value)) return value.forEach(item => walk(item, visit));
  if (value && typeof value === 'object') for (const [key, child] of Object.entries(value)) { visit(key, child); walk(child, visit); }
}
function packetHash(packet) { return crypto.createHash('sha256').update(JSON.stringify(packet), 'utf8').digest('hex'); }
function commercialFields(packet) {
  const found = [];
  walk(packet.commerce, (key) => { if (['price', 'stock_quantity', 'sales_90d', 'revenue_90d', 'cogs_90d', 'margin_90d', 'constraints'].includes(key)) found.push(key); });
  return found;
}
function stripCommercial(value) {
  if (Array.isArray(value)) return value.map(stripCommercial);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => !['price', 'stock_quantity', 'sales_90d', 'revenue_90d', 'cogs_90d', 'margin_90d', 'constraints'].includes(key)).map(([key, child]) => [key, stripCommercial(child)]));
}

const errors = [];
if (rows.length !== 48 || labels.length !== 48) errors.push('expected 48 fixtures and labels');
const rowIds = rows.map(row => row.case_id);
if (new Set(rowIds).size !== 48 || rowIds.some((id, i) => id !== expectedIds[i])) errors.push('case IDs are not the exact required range');
if (new Set(labels.map(label => label.case_id)).size !== 48) errors.push('label IDs are not unique');
const byId = new Map(rows.map(row => [row.case_id, row]));
for (const id of expectedIds) {
  const row = byId.get(id); const label = labels.find(item => item.case_id === id);
  if (!row || !row.input_packet) { errors.push(`${id}: missing input packet`); continue; }
  if (!label) { errors.push(`${id}: missing label`); continue; }
  if (packetHash(row.input_packet) !== label.input_sha256) errors.push(`${id}: hash mismatch`);
  const leaked = []; walk(row.input_packet, key => { if (forbiddenKeys.has(key)) leaked.push(key); });
  if (leaked.length) errors.push(`${id}: prohibited input keys ${leaked.join(',')}`);
  if (!label.input_fixture_reference.includes(`#${id}`)) errors.push(`${id}: fixture reference mismatch`);
  if (!outcomes.has(label.expected_run_outcome)) errors.push(`${id}: invalid run outcome`);
  if (label.expected_intervention !== null && !interventions.has(label.expected_intervention)) errors.push(`${id}: invalid intervention`);
  if (!primaryClasses.has(label.primary_class)) errors.push(`${id}: invalid primary class`);
  if (label.commercial_context_sensitive && (!effects.has(label.expected_commercial_effect) || !commercialFields(row.input_packet).length)) errors.push(`${id}: missing commercial evidence/effect`);
  if (!label.commercial_context_sensitive && label.expected_commercial_effect !== 'no_material_change') errors.push(`${id}: invalid neutral commercial effect`);
}
const reliability = labels.filter(label => label.reliability_subset);
const commercial = labels.filter(label => label.commercial_context_sensitive);
const modelReaching = new Set(['V105-EVAL-001', 'V105-EVAL-010', 'V105-EVAL-014', 'V105-EVAL-018', 'V105-EVAL-026', 'V105-EVAL-032', 'V105-EVAL-039', 'V105-EVAL-042', 'V105-EVAL-048']);
if (reliability.length !== 12) errors.push('reliability subset is not exactly 12');
if (reliability.filter(label => modelReaching.has(label.case_id)).length < 8) errors.push('fewer than 8 reliability cases reach interpretation');
if (commercial.length !== 12) errors.push('commercial-sensitive subset is not exactly 12');
for (const label of commercial) {
  const packet = byId.get(label.case_id).input_packet;
  const control = stripCommercial(packet);
  for (const key of ['business', 'site', 'search_console', 'external']) if (JSON.stringify(control[key]) !== JSON.stringify(packet[key])) errors.push(`${label.case_id}: commercial control changed ${key}`);
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(JSON.stringify({ cases: rows.length, hashes: rows.length, missingFixtures: 0, prohibitedInputKeys: 0, reliability: reliability.length, reliabilityModelReaching: reliability.filter(label => modelReaching.has(label.case_id)).length, commercialSensitive: commercial.length, controlChallengerNonCommercialEquivalence: 'PASS', structuralLeakage: 'PASS / manual review required' }, null, 2));
