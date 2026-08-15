import { sha256, stableId } from "../research/core/canonical.js";

export const CREATE_SEO_ARTICLE_OBJECTIVE = "create_seo_article";
export const CREATE_SEO_ARTICLE_CONTRACT_VERSION = "1.0.0";
export const CREATE_SEO_ARTICLE_SCHEMA_VERSION = "1.0.0";

export const CREATE_SEO_ARTICLE_STAGES = Object.freeze([
  Object.freeze({ id: "product_understanding", output: "validated_product_intelligence" }),
  Object.freeze({ id: "business_understanding", output: "validated_business_intelligence" }),
  Object.freeze({ id: "research", output: "validated_research_state" }),
  Object.freeze({ id: "opportunity_decision", output: "validated_article_opportunity_decision" }),
  Object.freeze({ id: "article_brief", output: "validated_article_brief" }),
  Object.freeze({ id: "article_generation", output: "validated_semantic_article" }),
  Object.freeze({ id: "validation", output: "article_validation_report" }),
  Object.freeze({ id: "human_review", output: "human_article_review" })
]);

const TERMINAL_STAGE_STATES = new Set(["complete", "failed", "blocked"]);
const clone = (value) => structuredClone(value);

function canonicalProductUrl(value) {
  if (typeof value !== "string" || !value.trim()) throw new Error("product_url is required.");
  let url;
  try { url = new URL(value.trim()); }
  catch { throw new Error("product_url must be a valid absolute HTTP(S) URL."); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("product_url must be a valid absolute HTTP(S) URL.");
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  url.pathname = url.pathname.replace(/\/{2,}/g, "/").replace(/\/$/, "") || "/";
  return url.toString();
}

export function validateCreateSeoArticleInput(input) {
  const errors = [];
  if (!input || typeof input !== "object" || Array.isArray(input)) return [{ code: "INVALID_INPUT", path: "$", message: "Input must be an object." }];
  try { canonicalProductUrl(input.product_url); }
  catch (error) { errors.push({ code: "INVALID_PRODUCT_URL", path: "$.product_url", message: error.message }); }
  for (const field of ["topic", "keyword", "primary_keyword", "prompt"]) {
    if (Object.hasOwn(input, field)) errors.push({ code: "MERCHANT_CONTENT_DIRECTION_NOT_ACCEPTED", path: `$.${field}`, message: `${field} is not part of the create_seo_article input contract.` });
  }
  if (input.objective !== undefined && input.objective !== CREATE_SEO_ARTICLE_OBJECTIVE) errors.push({ code: "OBJECTIVE_CHANGE_REJECTED", path: "$.objective", message: `Objective must remain ${CREATE_SEO_ARTICLE_OBJECTIVE}.` });
  return errors;
}

export function createSeoArticleRunPlan(input) {
  const errors = validateCreateSeoArticleInput(input);
  if (errors.length) throw Object.assign(new Error("Invalid create_seo_article workflow input."), { code: "INVALID_WORKFLOW_INPUT", errors });
  const workflowInput = { product_url: canonicalProductUrl(input.product_url) };
  const identity = { objective: CREATE_SEO_ARTICLE_OBJECTIVE, contract_version: CREATE_SEO_ARTICLE_CONTRACT_VERSION, input: workflowInput };
  const workflowRunId = stableId("workflow_run", identity);
  const inputSha256 = sha256(workflowInput);
  const stages = CREATE_SEO_ARTICLE_STAGES.map((definition, index) => ({
    stage_id: definition.id,
    sequence: index + 1,
    objective: CREATE_SEO_ARTICLE_OBJECTIVE,
    expected_output: definition.output,
    state: index === 0 ? "ready" : "pending",
    lineage: { workflow_run_id: workflowRunId, workflow_input_sha256: inputSha256 },
    result: null,
    failure: null
  }));
  const plan = {
    schema_version: CREATE_SEO_ARTICLE_SCHEMA_VERSION,
    artifact_type: "workflow_run_plan",
    workflow: CREATE_SEO_ARTICLE_OBJECTIVE,
    objective: CREATE_SEO_ARTICLE_OBJECTIVE,
    contract_version: CREATE_SEO_ARTICLE_CONTRACT_VERSION,
    workflow_run_id: workflowRunId,
    workflow_input: workflowInput,
    workflow_input_sha256: inputSha256,
    state: "ready",
    current_stage: stages[0].stage_id,
    stages,
    external_calls_performed: 0,
    publication_allowed: false
  };
  const planErrors = validateCreateSeoArticleRun(plan);
  if (planErrors.length) throw Object.assign(new Error("Generated workflow plan failed validation."), { code: "INVALID_WORKFLOW_PLAN", errors: planErrors });
  return plan;
}

export function validateCreateSeoArticleRun(run) {
  const errors = [];
  if (!run || typeof run !== "object" || Array.isArray(run)) return [{ code: "INVALID_RUN", path: "$", message: "Run must be an object." }];
  if (run.workflow !== CREATE_SEO_ARTICLE_OBJECTIVE || run.objective !== CREATE_SEO_ARTICLE_OBJECTIVE) errors.push({ code: "OBJECTIVE_CHANGE_REJECTED", path: "$.objective", message: "Workflow objective changed." });
  if (run.contract_version !== CREATE_SEO_ARTICLE_CONTRACT_VERSION) errors.push({ code: "INVALID_CONTRACT_VERSION", path: "$.contract_version", message: "Unsupported workflow contract version." });
  let canonicalInput = null;
  try { canonicalInput = { product_url: canonicalProductUrl(run.workflow_input?.product_url) }; }
  catch (error) { errors.push({ code: "INVALID_PRODUCT_URL", path: "$.workflow_input.product_url", message: error.message }); }
  if (canonicalInput && run.workflow_input_sha256 !== sha256(canonicalInput)) errors.push({ code: "INPUT_LINEAGE_MISMATCH", path: "$.workflow_input_sha256", message: "Workflow input hash does not match the canonical input." });
  const expectedRunId = canonicalInput ? stableId("workflow_run", { objective: CREATE_SEO_ARTICLE_OBJECTIVE, contract_version: CREATE_SEO_ARTICLE_CONTRACT_VERSION, input: canonicalInput }) : null;
  if (expectedRunId && run.workflow_run_id !== expectedRunId) errors.push({ code: "RUN_LINEAGE_MISMATCH", path: "$.workflow_run_id", message: "Workflow run ID does not match its immutable identity." });
  if (!Array.isArray(run.stages) || run.stages.length !== CREATE_SEO_ARTICLE_STAGES.length) errors.push({ code: "INVALID_STAGE_SET", path: "$.stages", message: "Workflow stages are missing or duplicated." });
  else run.stages.forEach((stage, index) => {
    const expected = CREATE_SEO_ARTICLE_STAGES[index];
    if (stage.stage_id !== expected.id || stage.sequence !== index + 1 || stage.expected_output !== expected.output) errors.push({ code: "INVALID_STAGE_CONTRACT", path: `$.stages[${index}]`, message: "Stage order or contract changed." });
    if (stage.objective !== CREATE_SEO_ARTICLE_OBJECTIVE) errors.push({ code: "OBJECTIVE_CHANGE_REJECTED", path: `$.stages[${index}].objective`, message: "Stage objective changed." });
    if (stage.lineage?.workflow_run_id !== run.workflow_run_id || stage.lineage?.workflow_input_sha256 !== run.workflow_input_sha256) errors.push({ code: "STAGE_LINEAGE_MISMATCH", path: `$.stages[${index}].lineage`, message: "Stage is not bound to this workflow run." });
  });
  return errors;
}

function closeFailed(run, stageIndex, errors) {
  const next = clone(run);
  next.state = "failed";
  next.current_stage = null;
  next.stages[stageIndex].state = "failed";
  next.stages[stageIndex].failure = { code: "INVALID_STAGE_RESULT", errors: clone(errors) };
  for (let index = stageIndex + 1; index < next.stages.length; index += 1) {
    if (!TERMINAL_STAGE_STATES.has(next.stages[index].state)) {
      next.stages[index].state = "blocked";
      next.stages[index].failure = { code: "UPSTREAM_STAGE_FAILED", upstream_stage_id: next.stages[stageIndex].stage_id };
    }
  }
  return next;
}

export function bindCreateSeoArticleStageResult(run, result) {
  const runErrors = validateCreateSeoArticleRun(run);
  const stageIndex = run?.stages?.findIndex((stage) => stage.stage_id === run.current_stage) ?? -1;
  if (runErrors.length || stageIndex < 0 || run.state !== "ready") throw Object.assign(new Error("Workflow run is not eligible for a stage result."), { code: "INVALID_WORKFLOW_RUN", errors: runErrors });
  const stage = run.stages[stageIndex];
  const errors = [];
  if (!result || typeof result !== "object" || Array.isArray(result)) errors.push({ code: "INVALID_STAGE_RESULT", path: "$" });
  if (result?.workflow_run_id !== run.workflow_run_id) errors.push({ code: "RUN_LINEAGE_MISMATCH", path: "$.workflow_run_id" });
  if (result?.workflow_input_sha256 !== run.workflow_input_sha256) errors.push({ code: "INPUT_LINEAGE_MISMATCH", path: "$.workflow_input_sha256" });
  if (result?.objective !== CREATE_SEO_ARTICLE_OBJECTIVE) errors.push({ code: "OBJECTIVE_CHANGE_REJECTED", path: "$.objective" });
  if (result?.stage_id !== stage.stage_id) errors.push({ code: "STAGE_LINEAGE_MISMATCH", path: "$.stage_id" });
  if (result?.output_type !== stage.expected_output) errors.push({ code: "INVALID_STAGE_OUTPUT", path: "$.output_type" });
  if (!result?.artifact_id || typeof result.artifact_id !== "string") errors.push({ code: "MISSING_ARTIFACT_ID", path: "$.artifact_id" });
  if (!result?.artifact_sha256 || typeof result.artifact_sha256 !== "string") errors.push({ code: "MISSING_ARTIFACT_HASH", path: "$.artifact_sha256" });
  if (result?.validation_state !== "valid" || result?.status !== "complete") errors.push({ code: "STAGE_NOT_VALID", path: "$.validation_state" });
  if (errors.length) return closeFailed(run, stageIndex, errors);
  const next = clone(run);
  next.stages[stageIndex].state = "complete";
  next.stages[stageIndex].result = clone(result);
  if (stageIndex === next.stages.length - 1) {
    next.state = "awaiting_human_approval";
    next.current_stage = null;
  } else {
    next.stages[stageIndex + 1].state = "ready";
    next.current_stage = next.stages[stageIndex + 1].stage_id;
  }
  return next;
}

export function stageResultEnvelope(run, { artifactId, artifactSha256 }) {
  const stage = run.stages.find((item) => item.stage_id === run.current_stage);
  if (!stage) throw new Error("Workflow has no current stage.");
  return { workflow_run_id: run.workflow_run_id, workflow_input_sha256: run.workflow_input_sha256, objective: run.objective, stage_id: stage.stage_id, output_type: stage.expected_output, artifact_id: artifactId, artifact_sha256: artifactSha256, validation_state: "valid", status: "complete" };
}
