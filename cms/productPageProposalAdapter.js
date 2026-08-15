import fs from "node:fs/promises";
import path from "node:path";
import { sha256 } from "../research/core/canonical.js";
import { GUARDED_WRITER_SCOPE, prepareGuardedDryRun, validateBoundedWriterApproval } from "./guardedWriter.js";
import { mapRequiredElementorWidgets, parseElementorDocument } from "./wordpressAuthoritativeReader.js";

export const PRESERVED_ELEMENTOR_WIDGETS = Object.freeze({ faq_heading: "36512385", faq_accordion: "4691e088", comparison: "40869c27", safety: "43d7d6f0" });

const esc = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

/** Reuses the existing short-description list representation used by the writer. */
export function renderCanonicalShortDescription(bullets) {
  if (!Array.isArray(bullets) || bullets.length < 3 || bullets.length > 5) throw new Error("SHORT_DESCRIPTION_BULLET_COUNT_INVALID");
  return `<ul class="a-unordered-list a-vertical a-spacing-mini">\n${bullets.map((bullet) => ` \t<li>${esc(bullet)}</li>`).join("\n")}\n</ul>`;
}

export function readAuthoritativeImplementationRepresentation(authoritative) {
  const widgets = mapRequiredElementorWidgets(authoritative);
  return {
    product: {
      product_id: authoritative.post_id,
      title: authoritative.fields.post_title,
      short_description: authoritative.fields.post_excerpt,
      discovery_content: authoritative.fields.post_content,
      status: authoritative.status,
      slug: authoritative.fields.slug
    },
    elementor: {
      template_id: authoritative.template.id,
      description: widgets.description.exact_stored_value,
      comparison: widgets.comparison_answer.exact_stored_value,
      safety: widgets.detailed_safety_answer.exact_stored_value,
      widgets
    },
    preserved_cms_state: { metadata: authoritative.meta, price: authoritative.woocommerce?.price ?? null, stock: authoritative.woocommerce?.stock_status ?? null, status: authoritative.status },
    source: { representation: "authoritative_elementor", post_content_role: "editorial_discovery_only" }
  };
}

function section(proposal, name) { return proposal?.sections?.find((item) => item.section === name) || null; }

function proposalHash(proposal) { return sha256(JSON.stringify(proposal)); }

export function resolveProposalLineage({ proposal, proposalArtifact = null, proposalArtifactSha256 = null }) {
  return { artifact: proposalArtifact, sha256: proposalArtifactSha256 || proposalHash(proposal), schema_version: proposal?.schema_version || null, artifact_type: proposal?.artifact_type || null, product_identity: proposal?.sections?.find((item) => item.section === "title")?.current || null, proposal_created_at: proposal?.provenance?.created_at || null };
}

export async function assertProposalArtifactLineage({ proposal, proposalArtifact, proposalArtifactSha256 = null }) {
  if (!proposalArtifact) return resolveProposalLineage({ proposal });
  const bytes = await fs.readFile(proposalArtifact);
  const actualHash = sha256(bytes.toString("utf8"));
  if (proposalArtifactSha256 && proposalArtifactSha256 !== actualHash) throw Object.assign(new Error("Proposal artifact hash does not match supplied lineage."), { code: "PROPOSAL_LINEAGE_HASH_MISMATCH" });
  let parsed;
  try { parsed = JSON.parse(bytes.toString("utf8")); } catch { throw Object.assign(new Error("Proposal artifact is not valid JSON."), { code: "PROPOSAL_ARTIFACT_INVALID" }); }
  if (JSON.stringify(parsed) !== JSON.stringify(proposal)) throw Object.assign(new Error("Supplied proposal does not match the referenced artifact."), { code: "PROPOSAL_LINEAGE_CONTENT_MISMATCH" });
  return resolveProposalLineage({ proposal, proposalArtifact, proposalArtifactSha256: actualHash });
}

export function validateEditableDescriptionStructure(html) {
  const value = String(html || "");
  const errors = [];
  if (/<\s*(details|summary|script|iframe|form|table|accordion)\b|data-elementor|elementor-/i.test(value)) errors.push("PROTECTED_OR_UNSUPPORTED_DESCRIPTION_SUBSTRUCTURE");
  const withoutParagraphs = value.replace(/<p\b[^>]*>[\s\S]*?<\/p>/gi, "").replace(/\s+/g, "").trim();
  if (withoutParagraphs) errors.push("UNEXPECTED_DESCRIPTION_MARKUP");
  return errors;
}

function assertEditableDescriptionStructure(html) {
  const errors = validateEditableDescriptionStructure(html);
  if (errors.length) throw Object.assign(new Error("Editable Elementor description contains protected or unsupported substructure."), { code: errors[0], errors });
}

export function buildCandidateImplementationApproval({ proposal, authoritative, proposalArtifact = null, proposalArtifactSha256 = null, createdAt = new Date().toISOString() }) {
  const current = readAuthoritativeImplementationRepresentation(authoritative);
  assertEditableDescriptionStructure(current.elementor.description);
  const lineage = resolveProposalLineage({ proposal, proposalArtifact, proposalArtifactSha256 });
  const title = section(proposal, "title");
  const short = section(proposal, "short_description");
  const main = section(proposal, "main_description");
  const values = {
    post_title: title?.decision === "KEEP" || !title ? current.product.title : String(title.proposed),
    post_excerpt: short?.proposed ? renderCanonicalShortDescription(short.proposed) : current.product.short_description,
    description: main?.proposed ? String(main.proposed) : current.elementor.description,
    comparison: current.elementor.comparison
  };
  const currentGuards = {
    post_title: sha256(current.product.title), post_excerpt: sha256(current.product.short_description),
    template_elementor_data: sha256(authoritative.template.raw_elementor_data || authoritative.meta._elementor_data),
    description_widget: sha256(current.elementor.description), comparison_widget: sha256(current.elementor.comparison),
    safety_widget: sha256(current.elementor.safety), rendered_page: authoritative.verified_live_content_hash || authoritative.hashes?.rendered_page || null
  };
  const targets = {
    post_title: { post_id: 70, field: "post_title" }, post_excerpt: { post_id: 70, field: "post_excerpt" },
    description: { template_id: 2003, meta_key: "_elementor_data", element_id: "c80e718", property: "settings.editor" },
    comparison: { template_id: 2003, meta_key: "_elementor_data", element_id: "40869c27", property: "settings.editor", parent_element_id: "4691e088" }
  };
  const fields = Object.entries(values).map(([fieldId, value]) => ({ field_id: fieldId, status: "candidate", cms_target: targets[fieldId], exact_cms_value: value, normalized_approved_representation: value, current_state_guard_sha256: currentGuards[fieldId === "description" ? "description_widget" : fieldId === "comparison" ? "comparison_widget" : fieldId], approved_target_sha256: sha256(value), change: fieldId === "post_title" ? value !== current.product.title : fieldId === "post_excerpt" ? value !== current.product.short_description : fieldId === "description" ? value !== current.elementor.description : false }));
  return {
    schema_version: 1, product_id: 70, template_id: 2003, status: "candidate", approval_timestamp: createdAt,
    approval_source: "product_page_proposal", source_review: proposalArtifact ? { artifact: proposalArtifact, sha256: lineage.sha256 } : null,
    proposal_lineage: lineage,
    approved_fields: fields, current_state_guards: currentGuards,
    approved_target_hashes: Object.fromEntries(fields.map((field) => [field.field_id, field.approved_target_sha256])),
    authorisation: { slug_change_authorised: false, metadata_change_authorised: false, unrelated_elementor_changes_authorised: false, detailed_safety_widget_change_authorised: false, publication_authorised: false },
    detailed_safety_widget: { template_id: 2003, element_id: GUARDED_WRITER_SCOPE.protected_safety_widget, status: "blocked_unchanged" },
    future_write_requires_fresh_pre_write_snapshot: true, human_approval_required: true, runtime_installable: false
  };
}

export function mapProductPageProposal({ proposal, authoritative, proposalArtifact = null, proposalArtifactSha256 = null, createdAt }) {
  const current = readAuthoritativeImplementationRepresentation(authoritative);
  const candidateApproval = buildCandidateImplementationApproval({ proposal, authoritative, proposalArtifact, proposalArtifactSha256, createdAt });
  const supported = new Set(["title", "short_description", "main_description", "comparison"]);
  const unsupported = (proposal.sections || []).filter((item) => !supported.has(item.section)).map((item) => ({ section: item.section, status: "NOT_IMPLEMENTABLE_BY_CURRENT_BOUNDED_WRITER" }));
  const preserved = [{ target: `elementor:${PRESERVED_ELEMENTOR_WIDGETS.faq_heading}`, reason: "FAQ heading remains unchanged." }, { target: `elementor:${PRESERVED_ELEMENTOR_WIDGETS.faq_accordion}`, reason: "FAQ accordion remains unchanged." }, { target: "comparison", reason: "No explicit comparison proposal; exact authoritative value preserved." }, { target: "safety", reason: "Protected safety widget is blocked and unchanged." }, { target: "post_content", reason: "Discovery representation; not the implementation target." }, { target: "metadata_price_stock_status", reason: "Outside bounded writer scope." }];
  return { schema_version: "0.1.0", artifact_type: "product_page_implementation_candidate", current_authoritative: current, mapped_targets: candidateApproval.approved_fields, preserved_targets: preserved, blocked_targets: [{ target: "43d7d6f0.settings.editor", reason: "protected_safety_widget" }], unsupported_targets: unsupported, candidate_approval: candidateApproval, proposal_lineage: candidateApproval.proposal_lineage, proposal_provenance: proposalArtifact ? { artifact: proposalArtifact, sha256: candidateApproval.proposal_lineage.sha256 } : null };
}

export async function prepareProductPageImplementationDryRun({ proposal, authoritative, proposalArtifact = null, proposalArtifactSha256 = null, createdAt = new Date().toISOString() }) {
  const verifiedLineage = await assertProposalArtifactLineage({ proposal, proposalArtifact, proposalArtifactSha256 });
  const mapping = mapProductPageProposal({ proposal, authoritative, proposalArtifact: verifiedLineage.artifact || proposalArtifact, proposalArtifactSha256: verifiedLineage.sha256, createdAt });
  let snapshot;
  const dryRun = await prepareGuardedDryRun({ approval: mapping.candidate_approval, authoritative, approvalValidator: validateBoundedWriterApproval, persistRollbackSnapshot: async (value) => { snapshot = value; } });
  return { ...mapping, dry_run: { ...dryRun, proposal_lineage: mapping.proposal_lineage }, rollback_snapshot_persisted_in_memory: Boolean(snapshot), validation: { status: "PASS", errors: [] } };
}

export function renderImplementationReview(result) {
  const fields = Object.fromEntries(result.mapped_targets.map((field) => [field.field_id, field]));
  const display = (field) => field?.change ? field.exact_cms_value : "(unchanged)";
  const source = result.proposal_lineage?.artifact ? path.basename(path.dirname(result.proposal_lineage.artifact)) : "supplied proposal";
  return `# Product Page Implementation Review\n\nSource proposal: ${source}\n\n## Proposed changes\n\n### Short description\n\nCurrent: ${result.current_authoritative.product.short_description}\n\nProposed: ${display(fields.post_excerpt)}\n\n### Main description\n\nCurrent: ${result.current_authoritative.elementor.description}\n\nProposed: ${display(fields.description)}\n\n## Preserved content\n\n- Product title: ${fields.post_title.change ? "proposed change" : "unchanged"}\n- FAQ heading widget: unchanged\n- FAQ accordion widget: unchanged\n- Comparison content: unchanged\n- Safety content: protected and unchanged\n- Product metadata, pricing, stock and status: untouched\n\n## Unsupported editorial recommendations\n\n${result.unsupported_targets.length ? result.unsupported_targets.map((item) => `- ${item.section}: not implementable by the current bounded writer`).join("\n") : "None identified."}\n\n## Implementation status\n\n- Proposal mapped successfully: yes\n- Guarded Writer dry-run: ${result.dry_run.status}\n- Human implementation approval: still required\n- WordPress changes written: none\n`;
}

export async function writeImplementationArtifacts({ result, rootDir, proposal, proposalArtifact }) {
  const dir = path.join(rootDir, "artifacts/editorial-product-page-implementation/heavy-duty-drying-towel-1200gsm", new Date().toISOString().replaceAll(":", "-").replace(".", "-") );
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "product-page-implementation.json"), JSON.stringify({ ...result, source_proposal: proposalArtifact, proposal }, null, 2));
  await fs.writeFile(path.join(dir, "implementation-review.md"), renderImplementationReview(result));
  return { directory: dir, technical: path.join(dir, "product-page-implementation.json"), review: path.join(dir, "implementation-review.md") };
}
