import { CONFIDENCE_LEVELS, DECISION_AREAS, DECISION_OUTCOMES, EVIDENCE_CATEGORIES, INTERPRETATION_OBJECTIVE, INTERPRETATION_SCHEMA_VERSION } from "./contracts.js";

const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const nonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
const sortedUnique = (values) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "en"));
const numericTokens = (text) => [...String(text || "").matchAll(/\b\d+(?:[.,]\d+)?%?\b/g)].map((match) => match[0].replaceAll(",", "").replace(/%$/, ""));
const confidenceReasonValid = nonEmptyString;

function citationEvidence(context) {
  return context.citation_registry?.records || context.evidence || [];
}

function normalized(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function hasCitedPhrase(text, records) {
  const haystack = normalized(text);
  return records.filter((record) => ["keyword_ideas", "search_console"].includes(record.evidence_category)).some((record) => {
    const words = normalized(record.observation?.keyword || record.observation?.query).split(" ").filter(Boolean);
    if (words.length < 2) return false;
    const phrases = words.length <= 3 ? [words.join(" ")] : Array.from({ length: words.length - 2 }, (_, index) => words.slice(index, index + 3).join(" "));
    return phrases.some((phrase) => haystack.includes(phrase));
  });
}

function decisionQualityErrors(item, records, path) {
  if (!["improve", "add", "reposition", "clarify", "reduce"].includes(item?.outcome)) return [];
  const text = `${item.recommendation || ""} ${item.confidence_reason || ""}`;
  const searchArea = ["search_positioning", "title_headings", "metadata"].includes(item?.area);
  const searchLanguage = /(?:keyword|search (?:term|demand|query|visibility)|high.volume|phrase family|terminology|optimis|optimiz)/i.test(text);
  if (!searchArea && !searchLanguage) return [];
  const requirements = {
    "an exact cited keyword/topic or phrase family": hasCitedPhrase(text, records),
    "the exact page area being considered": /(?:visible (?:product )?heading|product (?:title|heading|description)|title tag|meta(?: title| description|data)?|heading|positioning|introductory|benefit|FAQ)/i.test(text),
    "a strategic purpose": /(?:strategic purpose|because|alignment|so (?:that|users)|in order to|to (?:address|align|clarify|differentiate|improve|match|reflect|support)|for (?:clarity|relevance|visibility|intent|differentiation))/i.test(text),
    "a constraint against stuffing or unsupported rewriting": /(?:preserve|retain|avoid|without|do not|must not|while (?:keeping|maintaining)|factual|no keyword stuffing)/i.test(text),
    "keyword evidence": records.some((record) => record.evidence_category === "keyword_ideas")
  };
  const missing = Object.entries(requirements).filter(([, met]) => !met).map(([name]) => name);
  return missing.length ? [{ code: "VAGUE_ACTION", path, message: `Search-oriented action is underspecified; missing ${missing.join(", ")}.` }] : [];
}

function semanticSupportErrors({ text, actionType, records, path }) {
  const errors = [];
  const categories = new Set(records.map((record) => record.evidence_category));
  const supportedNumbers = new Set(records.flatMap((record) => numericTokens(JSON.stringify(record.observation))));
  for (const number of numericTokens(text)) if (!supportedNumbers.has(number)) errors.push({ code: "UNSUPPORTED_NUMERIC_CLAIM", path, message: `Numeric value ${number} does not appear in cited evidence.` });
  if (["specification", "benefit"].includes(actionType) && !categories.has("product_facts")) errors.push({ code: "EVIDENCE_CATEGORY_MISMATCH", path, message: `${actionType} actions require product_facts evidence.` });
  if (/(search volume|keyword difficulty|\bcpc\b)/i.test(text) && !categories.has("keyword_ideas")) errors.push({ code: "EVIDENCE_CATEGORY_MISMATCH", path, message: "Market metric claims require keyword_ideas evidence." });
  if (/(clicks?|impressions?|\bctr\b|average position|search console)/i.test(text) && !categories.has("search_console")) errors.push({ code: "EVIDENCE_CATEGORY_MISMATCH", path, message: "First-party performance claims require search_console evidence." });
  const serpLanguage = /(competitor|ranking page|organic result|\bserp\b|people also ask|related search)/i.test(text);
  const negatedSerpClaim = /(?:no cited SERP|SERP[^.]{0,80}(?:does not|do not|cannot|fails? to)|(?:does not|do not|cannot)\s+[^.]{0,50}SERP)/i.test(text);
  if (serpLanguage && !negatedSerpClaim && !categories.has("serp_advanced")) errors.push({ code: "EVIDENCE_CATEGORY_MISMATCH", path, message: "SERP claims require serp_advanced evidence." });
  if (/specifications?[^.]{0,120}(?:match|align(?:s|ed)?)\s+(?:with\s+)?SERP expectations/i.test(text)) {
    const serpText = records.filter((record) => record.evidence_category === "serp_advanced").map((record) => JSON.stringify(record.observation)).join(" ");
    const mentioned = ["gsm", "dimension", "size", "material", "edging", "edge", "microfibre", "microfiber"].filter((term) => new RegExp(`\\b${term}`, "i").test(text));
    if (!serpText || !mentioned.length || mentioned.some((term) => !new RegExp(`\\b${term}`, "i").test(serpText))) errors.push({ code: "UNSUPPORTED_SERP_GENERALISATION", path, message: "Cited SERP observations do not establish that the stated specifications match SERP expectations." });
  }

  const productRecords = records.filter((record) => record.evidence_category === "product_facts");
  const citedText = productRecords.map((record) => `${record.observation?.field_path || ""} ${record.observation?.value || ""}`).join(" ");
  const checks = [
    { topic: "(?:care|wash(?:ing)?|clean(?:ing)?)\\s+(?:instruction|guidance|information|detail)s?", exists: /(?:care_instructions|wash|detergent|fabric softener|bleach|air dry|gentle cycle|store it dry)/i, message: "care guidance" },
    { topic: "(?:product\\s+)?specification(?:s| detail)?", exists: /product\.specifications|1200gsm|90 × 60|microfibre edging|dual-sided microfibre/i, message: "product specifications" },
    { topic: "(?:faq|frequently asked question)s?", exists: /product\.faqs|\?\s|how should|what.s the difference|will this/i, message: "FAQs" }
  ];
  const missingWords = "(?:lack(?:s|ing)?|miss(?:es|ing)?|absent|does not (?:include|contain|provide)|no)";
  for (const check of checks) {
    const missingTopic = new RegExp(`(?:${missingWords}\\b\\s+(?:any\\s+)?${check.topic}|${check.topic}\\s+(?:is|are|remain|were)?\\s*(?:missing|absent|not present|not included))`, "i");
    if (missingTopic.test(text) && check.exists.test(citedText)) errors.push({ code: "CLEAR_EVIDENCE_CONTRADICTION", path, message: `The statement claims ${check.message} are missing, but cited Product Facts show they exist.` });
  }
  if (/(poorly surfaced|underemphasi[sz]ed|hard to find|buried)/i.test(text) && (!categories.has("product_facts") || records.every((record) => record.evidence_category === "product_facts"))) {
    errors.push({ code: "INSUFFICIENT_SURFACING_SUPPORT", path, message: "A poorly surfaced claim requires Product Facts proving presence plus external evidence supporting the need or opportunity." });
  }
  return errors;
}

export function deriveEvidenceUse(output, context) {
  const evidenceById = new Map(citationEvidence(context).map((record) => [record.evidence_id, record]));
  const assessed = sortedUnique((output.category_assessments || []).map((item) => item.category));
  const materialItems = [...(output.findings || []), ...(output.decision_areas || [])];
  const materiallyCited = sortedUnique(materialItems.flatMap((item) => item.evidence_ids || []).map((id) => evidenceById.get(id)?.evidence_category));
  const available = sortedUnique(context.evidence_categories_available || []);
  return { categories_available: available, categories_assessed: assessed, categories_materially_cited: materiallyCited, categories_unused: available.filter((category) => !materiallyCited.includes(category)) };
}

export function validateInterpretationOutput(output, context) {
  const errors = [];
  const citableEvidence = citationEvidence(context);
  const evidenceById = new Map(citableEvidence.map((record) => [record.evidence_id, record]));
  for (const [index, record] of citableEvidence.entries()) if (!EVIDENCE_CATEGORIES.includes(record.evidence_category)) errors.push({ code: "INVALID_CITATION_REGISTRY", path: `citation_registry.records[${index}].evidence_category`, message: "Citation registry record uses a non-canonical evidence category." });
  if (!isObject(output)) return [{ code: "INVALID_SCHEMA", path: "$", message: "Interpretation must be an object." }];
  if (output.schema_version !== INTERPRETATION_SCHEMA_VERSION) errors.push({ code: "INVALID_SCHEMA", path: "schema_version", message: `schema_version must be ${INTERPRETATION_SCHEMA_VERSION}.` });
  if (output.objective !== INTERPRETATION_OBJECTIVE) errors.push({ code: "INVALID_OBJECTIVE", path: "objective", message: `objective must be ${INTERPRETATION_OBJECTIVE}.` });
  if (!isObject(output.source_product) || output.source_product.subject_id !== context.source_product.subject_id || output.source_product.product_name !== context.source_product.product_name || output.source_product.product_url !== context.source_product.product_url) errors.push({ code: "INVALID_SOURCE_PRODUCT", path: "source_product", message: "source_product must exactly identify the context product." });
  for (const field of ["category_assessments", "findings", "decision_areas", "limitations"]) if (!Array.isArray(output[field])) errors.push({ code: "INVALID_SCHEMA", path: field, message: `${field} must be an array.` });
  if (!nonEmptyString(output.overall_assessment)) errors.push({ code: "INVALID_SCHEMA", path: "overall_assessment", message: "overall_assessment must be non-empty." });
  const findings = Array.isArray(output.findings) ? output.findings : [];
  const findingIds = new Set();

  function citations(item, path, required = true) {
    if (!Array.isArray(item.evidence_ids) || (required && !item.evidence_ids.length)) { errors.push({ code: "MISSING_EVIDENCE", path: `${path}.evidence_ids`, message: "Evidence citations are required." }); return []; }
    const records = [];
    for (const id of item.evidence_ids) if (!evidenceById.has(id)) errors.push({ code: "UNKNOWN_EVIDENCE_ID", path: `${path}.evidence_ids`, message: `Evidence ID ${id} was not supplied.` }); else records.push(evidenceById.get(id));
    if (!Array.isArray(item.evidence_categories) || JSON.stringify(sortedUnique(item.evidence_categories || [])) !== JSON.stringify(sortedUnique(records.map((record) => record.evidence_category)))) errors.push({ code: "EVIDENCE_CATEGORY_MISMATCH", path: `${path}.evidence_categories`, message: `evidence_categories must exactly match cited evidence using: ${EVIDENCE_CATEGORIES.join(", ")}.` });
    return records;
  }

  const assessed = new Set();
  for (const [index, item] of (output.category_assessments || []).entries()) {
    const path = `category_assessments[${index}]`;
    if (!EVIDENCE_CATEGORIES.includes(item?.category) || assessed.has(item.category)) errors.push({ code: "EVIDENCE_CATEGORY_COVERAGE", path: `${path}.category`, message: "Category assessments must be canonical and unique." }); else assessed.add(item.category);
    if (!nonEmptyString(item?.assessment) || !Array.isArray(item?.evidence_ids) || !item.evidence_ids.length) errors.push({ code: "INVALID_CATEGORY_ASSESSMENT", path, message: "Each category assessment requires text and evidence IDs." });
    for (const id of item?.evidence_ids || []) { const record = evidenceById.get(id); if (!record) errors.push({ code: "UNKNOWN_EVIDENCE_ID", path: `${path}.evidence_ids`, message: `Evidence ID ${id} was not supplied.` }); else if (record.evidence_category !== item.category) errors.push({ code: "EVIDENCE_CATEGORY_MISMATCH", path: `${path}.evidence_ids`, message: "Assessment citations must match its canonical category." }); }
  }
  for (const category of context.evidence_categories_available || []) if (!assessed.has(category)) errors.push({ code: "EVIDENCE_CATEGORY_COVERAGE", path: "category_assessments", message: `Available category ${category} was not assessed.` });

  findings.forEach((item, index) => {
    const path = `findings[${index}]`;
    if (!nonEmptyString(item?.id) || findingIds.has(item.id)) errors.push({ code: "INVALID_SCHEMA", path: `${path}.id`, message: "Finding IDs must be unique." }); else findingIds.add(item.id);
    if (!nonEmptyString(item?.finding) || !CONFIDENCE_LEVELS.includes(item?.confidence) || !confidenceReasonValid(item?.confidence_reason) || !Array.isArray(item?.limitations)) errors.push({ code: "INVALID_SCHEMA", path, message: "Finding fields are invalid." });
    const deterministicUnknown = context.gap_matrix?.decision_areas.some((area) => area.current_state === "unknown" && new RegExp(area.decision_area === "metadata" ? "metadata|title.?tag|meta.?description" : area.decision_area, "i").test(item.finding) && /(?:unknown|cannot be determined|unavailable)/i.test(item.finding));
    const records = citations(item, path, !deterministicUnknown); errors.push(...semanticSupportErrors({ text: `${item.finding} ${item.confidence_reason}`, records, path }));
  });

  const gapByArea = new Map((context.gap_matrix?.decision_areas || []).map((item) => [item.decision_area, item]));
  const seenAreas = new Set();
  for (const [index, item] of (output.decision_areas || []).entries()) {
    const path = `decision_areas[${index}]`;
    if (!DECISION_AREAS.includes(item?.area)) errors.push({ code: "INVALID_DECISION_AREA", path: `${path}.area`, message: "Invalid decision area." });
    else if (seenAreas.has(item.area)) errors.push({ code: "DUPLICATE_DECISION_AREA", path: `${path}.area`, message: `Decision area ${item.area} appears more than once.` }); else seenAreas.add(item.area);
    const gap = gapByArea.get(item?.area);
    if (!DECISION_OUTCOMES.includes(item?.outcome) || !["present", "absent", "unknown"].includes(item?.current_state) || !nonEmptyString(item?.recommendation) || !CONFIDENCE_LEVELS.includes(item?.confidence) || !confidenceReasonValid(item?.confidence_reason) || !Array.isArray(item?.limitations)) errors.push({ code: "INVALID_SCHEMA", path, message: "Decision fields are invalid." });
    if (gap && item.current_state !== gap.current_state) errors.push({ code: "CURRENT_STATE_MISMATCH", path: `${path}.current_state`, message: `current_state must be ${gap.current_state}.` });
    const allowEmpty = item?.outcome === "insufficient_evidence" && item?.current_state === "unknown";
    const records = citations(item, path, !allowEmpty); errors.push(...semanticSupportErrors({ text: `${item?.recommendation} ${item?.confidence_reason}`, records, path }));
    errors.push(...decisionQualityErrors(item, records, path));
    if (!Array.isArray(item?.external_evidence_ids)) errors.push({ code: "INVALID_SCHEMA", path: `${path}.external_evidence_ids`, message: "external_evidence_ids must be an array." });
    else for (const id of item.external_evidence_ids) {
      if (!item.evidence_ids?.includes(id)) errors.push({ code: "INVALID_EXTERNAL_EVIDENCE", path: `${path}.external_evidence_ids`, message: "External evidence IDs must also appear in evidence_ids." });
      if (evidenceById.get(id)?.evidence_category === "product_facts") errors.push({ code: "INVALID_EXTERNAL_EVIDENCE", path: `${path}.external_evidence_ids`, message: "Product Facts are not external evidence." });
    }
    const statement = item?.recommendation || "";
    if (gap?.current_state === "present" && /(?:missing|absent|does not (?:have|include|contain)|lacks?)/i.test(statement)) errors.push({ code: "CURRENT_STATE_CONTRADICTION", path, message: "A present page element cannot be described as missing." });
    if (gap?.current_state === "absent" && /(?:(?:section|element|area)\s+(?:is\s+)?(?:already|currently)\s+(?:present|existing|included)|existing\s+(?:dedicated\s+)?(?:section|element|area))/i.test(statement)) errors.push({ code: "CURRENT_STATE_CONTRADICTION", path, message: "An absent page element cannot be described as already present." });
    const requestsMissingEvidence = /(?:audit|inspect|check|obtain|review)\s+(?:the\s+)?(?:live|actual|current)?[^.]{0,50}(?:metadata|title tag|meta description)[^.]{0,80}(?:before|prior to)\s+(?:deciding|determining|recommending|changing)/i.test(statement);
    const speculativeUnknownChange = /(?:is|are)\s+(?:missing|poor|optimised|optimized|unoptimised|unoptimized)|(?:must|should)\s+(?:be\s+)?(?:changed|improved|optimised|optimized)/i.test(statement);
    if (gap?.current_state === "unknown" && !/(?:unknown|uncertain|unavailable|cannot determine|could not determine)/i.test(statement) && !(item?.outcome === "insufficient_evidence" && requestsMissingEvidence && !speculativeUnknownChange)) errors.push({ code: "UNKNOWN_STATE_CERTAINTY", path, message: "Unknown current state must be stated as uncertainty or as a bounded request to inspect the missing evidence before deciding." });
    if (item?.outcome === "add" && gap?.current_state === "present" && !/(?:distinct|new subsection|additional element|separate new)/i.test(statement)) errors.push({ code: "DUPLICATE_PRESENT_ELEMENT", path, message: "Adding to a present area must clearly identify a distinct new element rather than duplicate existing content." });
    if (item?.outcome === "add" && !(item.external_evidence_ids || []).length) errors.push({ code: "ADD_WITHOUT_EXTERNAL_SUPPORT", path, message: "An add outcome requires external evidence." });
    if (item?.area === "comparisons" && context.current_page_inventory?.decision_areas.find((area) => area.decision_area === "comparisons")?.component_states?.comparison_content_elsewhere === "present") {
      if (/(?:no|missing|absent|lacks?)\s+(?:any\s+)?comparison content/i.test(statement)) errors.push({ code: "COMPARISON_CONTENT_CONTRADICTION", path, message: "A dedicated comparison section is absent, but XL 800GSM comparison content exists in the FAQ." });
      if (item.outcome === "add" && !/(?:FAQ|existing comparison)/i.test(statement)) errors.push({ code: "COMPARISON_CONTEXT_OMITTED", path, message: "An added comparison section must account for existing XL 800GSM FAQ comparison content." });
    }
  }
  for (const area of DECISION_AREAS) if (!seenAreas.has(area)) errors.push({ code: "MISSING_DECISION_AREA", path: "decision_areas", message: `Decision area ${area} was not assessed.` });
  for (const number of numericTokens(output.overall_assessment)) errors.push({ code: "UNSUPPORTED_NUMERIC_CLAIM", path: "overall_assessment", message: `Overall numeric claim ${number} has no local citation.` });
  return errors;
}
