import assert from "node:assert/strict";
import test from "node:test";
import { FIELD_SPECIFIC_AUTHORITY, businessAuthorityRankFor } from "../business-intelligence/authority.js";
import { BUSINESS_INTELLIGENCE_OBJECT_SCHEMA } from "../business-intelligence/contracts.js";
import { createBusinessSourceEvidence } from "../business-intelligence/evidence.js";
import { createHumanValidationDecision, resolveHumanValidationDecision } from "../business-intelligence/humanValidation.js";
import { resolveBusinessKnowledgeCandidates } from "../business-intelligence/resolution.js";
import { assertValidBusinessIntelligenceObject, validateBusinessIntelligenceObject } from "../business-intelligence/validation.js";

const NOW = "2026-08-14T10:00:00.000Z";
const source = (sourceType, sourceRole, sourceField, rawValue, claimClassification = "observed_fact") => createBusinessSourceEvidence({ sourceType, sourceUriOrLocation: `https://example.test/${sourceType}`, sourceRole, sourceField, rawValue, retrievedAt: NOW, claimClassification });
const identity = source("structured_site_identity", "structured_record", "site.name", "Northstar Outfitters");
const catalogue = source("structured_catalogue", "structured_record", "catalogue.categories", ["Travel", "Camping"]);
const navigation = source("navigation", "observed_structure", "primary_navigation", ["Travel", "Camping"]);
const positioningClaim = source("homepage", "business_statement", "hero.message", "Built for dependable journeys", "positioning_claim");
const audienceClaim = source("about_page", "business_statement", "about.audience", "For people planning independent trips", "customer_claim");
const allEvidence = [identity, catalogue, navigation, positioningClaim, audienceClaim];

const knowledge = (value, refs, overrides = {}) => ({ value, knowledge_type: "fact", assertion_scope: "objective", evidence_refs: refs, confidence: 0.95, status: "extracted", ...overrides });
const derived = (value, refs, overrides = {}) => knowledge(value, refs, { knowledge_type: "derived", assertion_scope: "interpretation", confidence: 0.8, status: "inferred", ...overrides });
const unknown = () => ({ value: null, knowledge_type: "unknown", assertion_scope: "unknown", evidence_refs: [], confidence: 0, status: "inferred" });

function focusedBusiness() {
  return {
    metadata: { object_id: "bio_northstar", schema_version: "1.0.0", business_id: "northstar", primary_domain: "https://example.test", created_at: NOW, updated_at: NOW, source_fingerprint: "source-fingerprint", ingestion_status: "interpreted" },
    business_identity: { business_name: knowledge("Northstar Outfitters", [identity.id]), business_type: derived("retailer", [identity.id]) },
    catalogue_understanding: { product_focus: derived("Travel and camping equipment", [catalogue.id, navigation.id]), primary_categories: [knowledge("Travel", [catalogue.id]), knowledge("Camping", [catalogue.id])], catalogue_coherence: derived("related_categories", [catalogue.id, navigation.id]) },
    audience_architecture: { type: derived("focused_business", [audienceClaim.id]), business_wide_profile_status: derived("meaningful", [audienceClaim.id]) },
    customer_understanding: { target_customer_groups: [derived("People preparing for independent trips", [audienceClaim.id])], customer_behaviours: [], customer_motivations: [], customer_priorities: [], customer_problems: [], purchase_drivers: [], exclusions: [] },
    positioning: { value_proposition: [knowledge("Built for dependable journeys", [positioningClaim.id], { assertion_scope: "business_claim" })], positioning_themes: [], differentiators: [], positioning_claims: [knowledge("Built for dependable journeys", [positioningClaim.id], { assertion_scope: "business_claim" })], price_value_orientation: unknown() },
    category_audiences: [], knowledge_gaps: [], source_evidence: structuredClone(allEvidence), conflicts: [], human_validation_decisions: [], human_corrections: [], validation_status: "awaiting_validation", execution_metadata: { deterministic_steps: [], ai_calls: [], external_api_call_count: 0 }
  };
}

test("valid focused business passes", () => assert.deepEqual(validateBusinessIntelligenceObject(focusedBusiness()), []));

test("valid multi-audience business preserves category-specific audiences", () => {
  const bio = focusedBusiness();
  bio.audience_architecture.type = derived("multi_audience_business", [catalogue.id]);
  bio.audience_architecture.business_wide_profile_status = derived("not_meaningful", [catalogue.id]);
  delete bio.customer_understanding;
  bio.category_audiences = [
    { category_ref: "cat-travel", category_name: knowledge("Travel", [catalogue.id]), audience_profile_status: derived("meaningful", [audienceClaim.id]), target_customer_groups: [derived("Independent travellers", [audienceClaim.id])] },
    { category_ref: "cat-camp", category_name: knowledge("Camping", [catalogue.id]), audience_profile_status: derived("insufficient_evidence", [catalogue.id]), target_customer_groups: [] }
  ];
  assert.deepEqual(validateBusinessIntelligenceObject(bio), []);
});

test("general store with no global audience is a successful valid state", () => {
  const bio = focusedBusiness();
  bio.catalogue_understanding.catalogue_coherence = derived("unrelated_general_store", [catalogue.id]);
  bio.audience_architecture.type = derived("general_store", [catalogue.id]);
  bio.audience_architecture.business_wide_profile_status = derived("not_meaningful", [catalogue.id]);
  delete bio.customer_understanding;
  assert.deepEqual(validateBusinessIntelligenceObject(bio), []);
});

test("insufficient-evidence business allows unknown required knowledge", () => {
  const bio = focusedBusiness();
  bio.business_identity.business_type = unknown();
  bio.catalogue_understanding.product_focus = unknown();
  bio.catalogue_understanding.primary_categories = [];
  bio.catalogue_understanding.catalogue_coherence = unknown();
  bio.audience_architecture.type = unknown();
  bio.audience_architecture.business_wide_profile_status = derived("insufficient_evidence", [identity.id]);
  delete bio.customer_understanding;
  bio.knowledge_gaps = [{ field: "audience_architecture", importance: "high", reason: "Available evidence does not establish a useful audience." }];
  assert.deepEqual(validateBusinessIntelligenceObject(bio), []);
});

test("schema exposes required and optional sections without coupling", () => {
  assert.deepEqual(BUSINESS_INTELLIGENCE_OBJECT_SCHEMA.required, ["metadata", "business_identity", "catalogue_understanding", "audience_architecture", "source_evidence", "knowledge_gaps", "validation_status"]);
  const bio = focusedBusiness(); delete bio.positioning; delete bio.customer_understanding; delete bio.category_audiences; delete bio.conflicts; delete bio.human_validation_decisions; delete bio.human_corrections; delete bio.execution_metadata;
  assert.deepEqual(validateBusinessIntelligenceObject(bio), []);
});

test("missing required fields and malformed objects fail clearly", () => { const bio = focusedBusiness(); delete bio.audience_architecture; delete bio.business_identity.business_name; const errors = validateBusinessIntelligenceObject(bio).join("\n"); assert.match(errors, /audience_architecture is required/); assert.match(errors, /business_identity.business_name is required/); assert.throws(() => assertValidBusinessIntelligenceObject(bio), /failed validation/); });
test("knowledge types and assertion scopes are bounded", () => { const bio = focusedBusiness(); bio.business_identity.business_type.knowledge_type = "guess"; bio.catalogue_understanding.product_focus.assertion_scope = "opinion"; const errors = validateBusinessIntelligenceObject(bio).join("\n"); assert.match(errors, /knowledge_type is unsupported/); assert.match(errors, /assertion_scope is unsupported/); });
test("confidence is deterministically bounded", () => { const bio = focusedBusiness(); bio.business_identity.business_name.confidence = 1.1; assert.match(validateBusinessIntelligenceObject(bio).join("\n"), /confidence must be between 0 and 1/); });
test("knowledge evidence references must resolve", () => { const bio = focusedBusiness(); bio.business_identity.business_name.evidence_refs = ["missing"]; assert.match(validateBusinessIntelligenceObject(bio).join("\n"), /unknown evidence ID missing/); });

test("business claims remain distinct from objective facts", () => {
  const valid = focusedBusiness();
  assert.deepEqual(validateBusinessIntelligenceObject(valid), []);
  valid.positioning.positioning_claims[0].assertion_scope = "objective";
  assert.match(validateBusinessIntelligenceObject(valid).join("\n"), /objective fact cannot be supported only by business marketing claims/);
});

test("derived understanding cannot masquerade as objective fact", () => { const bio = focusedBusiness(); bio.catalogue_understanding.product_focus.assertion_scope = "objective"; assert.match(validateBusinessIntelligenceObject(bio).join("\n"), /derived\/inference knowledge must use interpretation/); });

test("field-specific authority changes precedence by business question", () => {
  assert.ok(businessAuthorityRankFor("catalogue_structure", "structured_catalogue") < businessAuthorityRankFor("catalogue_structure", "homepage"));
  assert.ok(businessAuthorityRankFor("declared_positioning", "homepage") < businessAuthorityRankFor("declared_positioning", "structured_catalogue"));
  assert.notDeepEqual(FIELD_SPECIFIC_AUTHORITY.catalogue_structure, FIELD_SPECIFIC_AUTHORITY.declared_positioning);
});

test("field-specific resolution preserves disagreements as conflicts", () => {
  const result = resolveBusinessKnowledgeCandidates({ fieldPath: "catalogue_understanding.product_focus", authorityDomain: "catalogue_structure", candidates: [
    { value: "Travel equipment", evidence_id: catalogue.id, source_type: "structured_catalogue", knowledge_type: "derived", assertion_scope: "interpretation", confidence: 0.9, status: "inferred" },
    { value: "Lifestyle goods", evidence_id: positioningClaim.id, source_type: "homepage", knowledge_type: "derived", assertion_scope: "interpretation", confidence: 0.7, status: "inferred" }
  ] });
  assert.equal(result.selected.value, "Travel equipment"); assert.equal(result.selected.status, "conflicted"); assert.equal(result.conflict.human_review_required, true); assert.deepEqual(result.conflict.evidence_refs, [catalogue.id, positioningClaim.id]);
});

test("human approval verifies knowledge while preserving evidence", () => { const original = derived("focused_business", [audienceClaim.id]); const { decision } = createHumanValidationDecision({ action: "approve", targetPath: "audience_architecture.type", originalValue: original, reason: "Owner confirmed.", reviewer: "owner", createdAt: NOW }); const result = resolveHumanValidationDecision(original, decision); assert.equal(result.effective.status, "human_verified"); assert.deepEqual(result.effective.evidence_refs, original.evidence_refs); assert.deepEqual(decision.original_value, original); });
test("human rejection remains auditable and removes knowledge from effective output", () => { const original = derived("A proposed group", [audienceClaim.id]); const { decision } = createHumanValidationDecision({ action: "reject", targetPath: "customer_understanding.target_customer_groups[0]", originalValue: original, reason: "Not supported by owner knowledge.", reviewer: "owner", createdAt: NOW }); const result = resolveHumanValidationDecision(original, decision); assert.equal(result.effective, null); assert.deepEqual(result.audit.original_value, original); assert.equal(result.audit.action, "reject"); });
test("human correction overrides AI knowledge without source attribution", () => { const original = derived("A proposed group", [audienceClaim.id]); const snapshot = structuredClone(original); const { decision, correction } = createHumanValidationDecision({ action: "correct", targetPath: "customer_understanding.target_customer_groups[0]", originalValue: original, correctedValue: "Owner-approved customer group", reason: "Owner correction.", reviewer: "owner", createdAt: NOW }); const result = resolveHumanValidationDecision(original, decision, correction); assert.equal(result.effective.value, "Owner-approved customer group"); assert.equal(result.effective.status, "human_corrected"); assert.deepEqual(result.effective.evidence_refs, []); assert.deepEqual(correction.previous_value, snapshot); assert.deepEqual(original, snapshot); assert.equal(correction.provenance.source_type, "human_validation"); });

test("decisions and corrections validate inside a BIO", () => { const bio = focusedBusiness(); const original = bio.audience_architecture.type; const { decision, correction } = createHumanValidationDecision({ action: "correct", targetPath: "audience_architecture.type", originalValue: original, correctedValue: "focused_business", reason: "Owner correction.", reviewer: "owner", createdAt: NOW }); bio.human_validation_decisions = [decision]; bio.human_corrections = [correction]; assert.deepEqual(validateBusinessIntelligenceObject(bio), []); });
test("no global customer section is forced for multi-audience or general stores", () => { for (const type of ["multi_audience_business", "general_store"]) { const bio = focusedBusiness(); bio.audience_architecture.type = derived(type, [catalogue.id]); bio.audience_architecture.business_wide_profile_status = derived("not_meaningful", [catalogue.id]); delete bio.customer_understanding; assert.deepEqual(validateBusinessIntelligenceObject(bio), []); } });
test("demographic profiling is not required by the contract", () => { const bio = focusedBusiness(); assert.equal(Object.hasOwn(bio.customer_understanding, "age"), false); assert.equal(Object.hasOwn(BUSINESS_INTELLIGENCE_OBJECT_SCHEMA.properties.customer_understanding, "age"), false); assert.deepEqual(validateBusinessIntelligenceObject(bio), []); });
test("unknown values are successful when represented honestly", () => { const bio = focusedBusiness(); bio.positioning.price_value_orientation = unknown(); assert.deepEqual(validateBusinessIntelligenceObject(bio), []); });
test("invalid unknown representation is rejected", () => { const bio = focusedBusiness(); bio.business_identity.business_type = { ...unknown(), value: "unknown" }; assert.match(validateBusinessIntelligenceObject(bio).join("\n"), /unknown knowledge must have null value/); });
test("source evidence validates fingerprints and bounded roles", () => { const bio = focusedBusiness(); bio.source_evidence[0].content_fingerprint = ""; bio.source_evidence[1].source_role = "marketing_magic"; const errors = validateBusinessIntelligenceObject(bio).join("\n"); assert.match(errors, /content_fingerprint/); assert.match(errors, /source_role is unsupported/); });
test("execution metadata is optional and bounded", () => { const bio = focusedBusiness(); delete bio.execution_metadata; assert.deepEqual(validateBusinessIntelligenceObject(bio), []); bio.execution_metadata = { deterministic_steps: [], ai_calls: [], external_api_call_count: -1 }; assert.match(validateBusinessIntelligenceObject(bio).join("\n"), /external_api_call_count must be a non-negative integer/); });
test("domain contract and tests make no network or AI calls", () => { let calls = 0; const previous = globalThis.fetch; globalThis.fetch = () => { calls += 1; throw new Error("network forbidden"); }; try { assert.deepEqual(validateBusinessIntelligenceObject(focusedBusiness()), []); assert.equal(calls, 0); assert.deepEqual(focusedBusiness().execution_metadata.ai_calls, []); } finally { globalThis.fetch = previous; } });
