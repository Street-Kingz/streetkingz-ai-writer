import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const benchmark = path.resolve("artifacts/live-validation/interpretation-model-benchmark-2026-08-08");
const context = JSON.parse(await readFile(path.resolve("artifacts/live-validation/interpretation-final-2026-08-08/heavy-duty-drying-towel-1200gsm/improve_existing_product_page/interpretation_run_2026-08-08T08-46-52-571Z_022e7eed/interpretation-context.json"), "utf8"));
const evidenceById = new Map(context.citation_registry.records.map((record) => [record.evidence_id, record]));
const inventoryByArea = new Map(context.current_page_inventory.decision_areas.map((area) => [area.decision_area, area]));
const gapByArea = new Map(context.gap_matrix.decision_areas.map((area) => [area.decision_area, area]));

const classifications = {
  "gpt-4.1": {
    "EVIDENCE_CATEGORY_MISMATCH|category_assessments[0].evidence_ids": ["TRUE_CITATION_ERROR", "A Search Console ID was included in the product_facts-only assessment."],
    "INVALID_SCHEMA|findings[1]": ["VALIDATOR_FALSE_POSITIVE", "The confidence reason is substantive but lacked one of the validator's magic support words."],
    "INVALID_SCHEMA|findings[3]": ["VALIDATOR_FALSE_POSITIVE", "The confidence reason is substantive but lacked one of the validator's magic support words."],
    "EVIDENCE_CATEGORY_MISMATCH|findings[3].evidence_categories": ["TRUE_CITATION_ERROR", "The model declared serp_advanced without citing a SERP record."],
    "VAGUE_ACTION|decision_areas[0]": ["VALIDATOR_FALSE_POSITIVE", "Exact terms, locations, evidence rationale and anti-stuffing constraint were present; 'alignment' was not recognized as purpose wording."],
    "EVIDENCE_CATEGORY_MISMATCH|decision_areas[1]": ["TRUE_CITATION_ERROR", "The confidence reason invokes SERP analysis without a SERP citation."],
    "VAGUE_ACTION|decision_areas[1]": ["TRUE_VAGUE_ACTION", "The action says to insert a phrase but does not establish a concrete user/commercial purpose beyond generic support."],
    "INVALID_SCHEMA|decision_areas[6]": ["VALIDATOR_FALSE_POSITIVE", "The confidence reason is substantive but lacked a magic support word."],
    "CURRENT_STATE_CONTRADICTION|decision_areas[6]": ["VALIDATOR_FALSE_POSITIVE", "'Facts already present' referred to FAQ facts, not to an already-present dedicated comparison section."],
    "EVIDENCE_CATEGORY_MISMATCH|decision_areas[9].evidence_categories": ["TRUE_CITATION_ERROR", "The model declared serp_advanced without citing a SERP record."
    ]
  },
  "gpt-5.6-sol": {
    "INVALID_SCHEMA|findings[1]": ["VALIDATOR_FALSE_POSITIVE", "The confidence reason is substantive but lacked a magic support word."],
    "INVALID_SCHEMA|findings[3]": ["VALIDATOR_FALSE_POSITIVE", "The confidence reason is substantive but lacked a magic support word."],
    "MISSING_EVIDENCE|findings[3].evidence_ids": ["VALIDATOR_AMBIGUITY", "The finding restates authoritative deterministic metadata=unknown, for which no synthetic evidence ID exists."],
    "VAGUE_ACTION|decision_areas[0]": ["VALIDATOR_FALSE_POSITIVE", "The exact Search Console query 'car drying towel' was cited, but phrase matching inspected Keyword Ideas only."],
    "VAGUE_ACTION|decision_areas[1]": ["VALIDATOR_FALSE_POSITIVE", "The exact Search Console query, heading location, stated strategic purpose and constraints were present."],
    "INVALID_SCHEMA|decision_areas[2]": ["VALIDATOR_FALSE_POSITIVE", "The confidence reason is substantive but lacked a magic support word."],
    "EVIDENCE_CATEGORY_MISMATCH|decision_areas[4]": ["VALIDATOR_FALSE_POSITIVE", "'No cited SERP observation establishes...' is a negated limitation, not an affirmative SERP claim."],
    "CLEAR_EVIDENCE_CONTRADICTION|decision_areas[4]": ["VALIDATOR_FALSE_POSITIVE", "'Does not justify adding further specifications' preserves existing specifications; it does not say specifications are missing."],
    "CLEAR_EVIDENCE_CONTRADICTION|decision_areas[5]": ["VALIDATOR_FALSE_POSITIVE", "One usage topic was not represented in the FAQ set; the model explicitly recognized the existing FAQ block."],
    "UNKNOWN_STATE_CERTAINTY|decision_areas[9]": ["VALIDATOR_FALSE_POSITIVE", "The model requests inspection before deciding and makes no assertion about current metadata quality or presence."],
    "INVALID_SCHEMA|decision_areas[10]": ["VALIDATOR_FALSE_POSITIVE", "The confidence reason is substantive but lacked a magic support word."]
  }
};

function extractText(envelope, model) {
  if (model === "gpt-4.1") return envelope.choices[0].message.content;
  return envelope.output_text || envelope.output.flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text;
}

const entries = [];
for (const model of ["gpt-4.1", "gpt-5.6-sol"]) {
  const rawArtifact = JSON.parse(await readFile(path.join(benchmark, model, "raw-response.json"), "utf8"));
  const output = JSON.parse(extractText(JSON.parse(rawArtifact.raw_body), model));
  const report = JSON.parse(await readFile(path.join(benchmark, model, "validation-report.json"), "utf8"));
  for (const error of report.errors) {
    const match = error.path.match(/^(category_assessments|findings|decision_areas)\[(\d+)\]/);
    const item = match ? output[match[1]][Number(match[2])] : null;
    const [classification, explanation] = classifications[model][`${error.code}|${error.path}`];
    if (!classification) throw new Error(`Missing forensic classification for ${model} ${error.code}|${error.path}`);
    const area = match?.[1] === "decision_areas" ? item.area : null;
    const citedIds = item?.evidence_ids || [];
    entries.push({
      model,
      decision_area: area,
      validation_rule: error.code,
      validation_path: error.path,
      model_statement: item?.recommendation || item?.finding || item?.assessment || null,
      cited_evidence_ids: citedIds,
      underlying_evidence: citedIds.map((id) => ({ evidence_id: id, category: evidenceById.get(id)?.evidence_category || null, observation: evidenceById.get(id)?.observation || null })),
      deterministic_page_state: area ? { inventory: inventoryByArea.get(area), gap: gapByArea.get(area) } : null,
      validator_result: error.message,
      forensic_classification: classification,
      explanation,
      validator_behaviour_should_change: ["VALIDATOR_FALSE_POSITIVE", "VALIDATOR_AMBIGUITY"].includes(classification)
    });
  }
}

const counts = Object.fromEntries(["gpt-4.1", "gpt-5.6-sol"].map((model) => [model, Object.fromEntries([...new Set(entries.filter((entry) => entry.model === model).map((entry) => entry.forensic_classification))].sort().map((classification) => [classification, entries.filter((entry) => entry.model === model && entry.forensic_classification === classification).length]))]));
const artifact = { schema_version: "1.0.0", artifact_type: "interpretation_benchmark_validation_forensics", source_benchmark: benchmark, counts, entries };
await mkdir(path.join(benchmark, "offline-diagnosis"), { recursive: true });
await writeFile(path.join(benchmark, "offline-diagnosis", "validation-forensics.json"), `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ entries: entries.length, counts }, null, 2));
