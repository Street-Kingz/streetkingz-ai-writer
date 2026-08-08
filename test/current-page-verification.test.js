import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { access, mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  buildCurrentPageVerification, extractCurrentPage, parseFinalReviewMarkdown, resolveTargetUrl,
  prepareImmutableRunDirectory, retrieveCurrentPage, validateCurrentPageVerification, validateWriteEligibility
} from "../verification/currentPage.js";
import { renderImplementationDiff } from "../verification/render.js";

const URL = "https://streetkingz.co.uk/product/heavy-duty-drying-towel-1200gsm/";
const FIXTURE = "test/fixtures/current-page-verification.html";
const FINAL_REVIEW = "artifacts/human-review/heavy-duty-drying-towel-1200gsm/generation-final-review.md";
const GENERATION = "artifacts/live-validation/generation-sol-production-validation-2026-08-08/gpt-5.6-sol/call_001/generation.json";
const BRIEF = "artifacts/generation/heavy-duty-drying-towel-1200gsm/production-v1/generation-brief.json";

async function inputs(htmlOverride) {
  const [html, markdown, generation, brief] = await Promise.all([
    htmlOverride ?? readFile(FIXTURE, "utf8"), readFile(FINAL_REVIEW, "utf8"),
    readFile(GENERATION, "utf8").then(JSON.parse), readFile(BRIEF, "utf8").then(JSON.parse)
  ]);
  const finalReview = parseFinalReviewMarkdown(markdown);
  const retrieval = { requested_url: URL, final_url: URL, http_status: 200, retrieved_at: "2026-08-08T12:00:00.000Z", content_type: "text/html; charset=UTF-8", content_hash: (await import("../research/core/canonical.js")).sha256(html), response_size_bytes: Buffer.byteLength(html), retrieval_count: 1, redirect_handling: "fetch_follow" };
  const verification = buildCurrentPageVerification({ targetUrl: URL, retrieval, html, finalReview, frozenGeneration: generation, generationBrief: brief });
  return { html, finalReview, generation, brief, verification };
}

test("canonical target URL resolves from the frozen generation brief", async () => {
  const { brief } = await inputs();
  assert.equal(resolveTargetUrl({ generationBrief: brief }), URL);
  assert.throws(() => resolveTargetUrl({ generationBrief: { product: {} } }), (error) => error.code === "MISSING_TARGET_URL");
});

test("exact H1 maps uniquely while changed H1 records baseline drift", async () => {
  const exact = await inputs();
  assert.equal(exact.verification.extracted_current_state.identity.visible_title.state, "structural");
  assert.equal(exact.verification.frozen_baseline_comparison.title_headings, "UNCHANGED");
  assert.equal(exact.verification.implementation_mappings.find((item) => item.decision_area === "title_headings").operation, "replace");
  const changedHtml = exact.html.replace("Heavy Duty Drying Towel – 1200gsm</h1>", "Current Heavy Duty Towel</h1>");
  const changed = await inputs(changedHtml);
  assert.equal(changed.verification.frozen_baseline_comparison.title_headings, "CHANGED");
  assert.equal(changed.verification.implementation_mappings.find((item) => item.decision_area === "title_headings").current_live_content[0], "Current Heavy Duty Towel");
});

test("duplicate product H1 is ambiguous and blocks title implementation", async () => {
  const base = await inputs();
  const duplicate = await inputs(base.html.replace("</h1>", "</h1><h1 class=\"product_title\">Duplicate title</h1>"));
  assert.equal(duplicate.verification.extracted_current_state.identity.visible_title.state, "ambiguous");
  assert.equal(duplicate.verification.frozen_baseline_comparison.title_headings, "AMBIGUOUS");
  assert.equal(duplicate.verification.implementation_mappings.find((item) => item.decision_area === "title_headings").operation, "blocked");
});

test("exact comparison FAQ maps once and duplicate or missing comparison blocks", async () => {
  const base = await inputs();
  const mapping = base.verification.implementation_mappings.find((item) => item.decision_area === "comparisons");
  assert.equal(base.verification.extracted_current_state.comparison.matches.length, 1);
  assert.equal(mapping.operation, "replace");
  const faq = base.html.match(/<details>[\s\S]*?XL 800GSM[\s\S]*?<\/details>/i)[0];
  const duplicate = await inputs(base.html.replace("</main>", `${faq}</main>`));
  assert.equal(duplicate.verification.extracted_current_state.comparison.state, "ambiguous");
  assert.equal(duplicate.verification.implementation_mappings.find((item) => item.decision_area === "comparisons").operation, "blocked");
  const missing = await inputs(base.html.replace(faq, ""));
  assert.equal(missing.verification.extracted_current_state.comparison.state, "unmatched");
  assert.equal(missing.verification.implementation_mappings.find((item) => item.decision_area === "comparisons").operation, "blocked");
});

test("safety claims and structurally associated qualifications are separately preserved", async () => {
  const { verification } = await inputs();
  assert.equal(verification.extracted_current_state.clarity_trust.exact_safety_claims.length, 1);
  assert.equal(verification.extracted_current_state.clarity_trust.exact_absorbency_claims.length, 1);
  assert.equal(verification.extracted_current_state.clarity_trust.associated_qualification.state, "structural");
  const mapping = verification.implementation_mappings.find((item) => item.decision_area === "clarity_trust");
  assert.match(mapping.preserve_current_content[0], /used correctly/i);
});

test("qualification outside a relevant FAQ is not deterministically associated", async () => {
  const base = await inputs();
  const html = base.html.replace("Will this towel scratch my paint?", "How should I store it?");
  const changed = await inputs(html);
  assert.equal(changed.verification.extracted_current_state.clarity_trust.associated_qualification.state, "unmatched");
});

test("description distributed across rendered blocks requires CMS field mapping", async () => {
  const { verification } = await inputs();
  assert.equal(verification.extracted_current_state.description.distribution, "distributed_across_observable_blocks");
  const mapping = verification.implementation_mappings.find((item) => item.decision_area === "product_description_benefits");
  assert.equal(mapping.operation, "requires_cms_field_mapping");
  assert.equal(mapping.cms_field_ownership, "unknown");
  assert.ok(mapping.current_live_content.length > 1);
});

test("frozen baseline comparison reports partial description matching without guessing", async () => {
  const { verification } = await inputs();
  assert.equal(verification.frozen_baseline_comparison.product_description_benefits, "PARTIALLY_MATCHED");
});

test("rejected differentiation and blocked areas never become implementation mappings", async () => {
  const { verification } = await inputs();
  const areas = verification.implementation_mappings.map((item) => item.decision_area);
  assert.deepEqual(areas, ["title_headings", "product_description_benefits", "comparisons", "clarity_trust"]);
  assert.equal(areas.includes("differentiation"), false);
  for (const area of ["metadata", "specifications", "care_usage_guidance", "internal_linking", "faqs_questions"]) assert.equal(areas.includes(area), false);
});

test("metadata observation cannot authorise metadata changes", async () => {
  const { verification } = await inputs();
  assert.equal(verification.extracted_current_state.observed_blocked_areas.metadata.title, "Heavy Duty Drying Towel – 1200gsm");
  assert.equal(verification.extracted_current_state.observed_blocked_areas.metadata.authorised_for_change, false);
  assert.equal(verification.implementation_mappings.some((item) => item.decision_area === "metadata"), false);
});

test("verification content hashing and future write drift guard are deterministic", async () => {
  const { verification } = await inputs();
  assert.equal(validateWriteEligibility(verification, verification.verified_content_hash).eligible, true);
  const drift = validateWriteEligibility(verification, "different_hash");
  assert.equal(drift.eligible, false);
  assert.equal(drift.errors[0].code, "PAGE_CHANGED_SINCE_VERIFICATION");
});

test("retrieval follows redirects in one fetch invocation and records final response metadata", async () => {
  let calls = 0;
  const html = await readFile(FIXTURE, "utf8");
  const result = await retrieveCurrentPage(URL, { now: () => new Date("2026-08-08T12:00:00.000Z"), fetchImpl: async (url, options) => {
    calls += 1;
    assert.equal(url, URL); assert.equal(options.redirect, "follow");
    return { status: 200, ok: true, url: `${URL}?resolved=1`, headers: new Headers({ "content-type": "text/html" }), async text() { return html; } };
  } });
  assert.equal(calls, 1);
  assert.equal(result.metadata.retrieval_count, 1);
  assert.equal(result.metadata.final_url, `${URL}?resolved=1`);
  assert.equal(result.metadata.response_size_bytes, Buffer.byteLength(html));
});

test("immutable run-directory preparation creates the run before its raw child and rejects reuse", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "current-page-verification-"));
  const run = path.join(root, "nested", "verification_fixture");
  const prepared = await prepareImmutableRunDirectory(run);
  await access(prepared.runDirectory);
  await access(prepared.rawDirectory);
  await assert.rejects(prepareImmutableRunDirectory(run), (error) => error.code === "EEXIST");
});

test("validation protects exact candidates, current quotes, safety, comparison and publication", async () => {
  const input = await inputs();
  assert.deepEqual(validateCurrentPageVerification(input.verification, { html: input.html, finalReview: input.finalReview, frozenGeneration: input.generation, generationBrief: input.brief }), []);
  const altered = structuredClone(input.verification);
  altered.implementation_mappings[0].approved_candidate = "Altered copy";
  altered.publication_allowed = true;
  const codes = validateCurrentPageVerification(altered, { html: input.html, finalReview: input.finalReview, frozenGeneration: input.generation, generationBrief: input.brief }).map((error) => error.code);
  assert.ok(codes.includes("APPROVED_COPY_CHANGED"));
  assert.ok(codes.includes("PUBLICATION_AUTHORISED"));
});

test("implementation diff quotes current content and remains non-publishing", async () => {
  const { verification } = await inputs();
  const markdown = renderImplementationDiff(verification);
  assert.match(markdown, /> Heavy Duty Drying Towel – 1200gsm/);
  assert.match(markdown, /requires_cms_field_mapping/);
  assert.match(markdown, /No standalone differentiation implementation/);
  assert.match(markdown, /does not.*authorise publication/i);
});
