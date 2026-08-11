const PATTERNS = [
  { id: "detached_evidentiary", expression: /\b(?:the product details|the available material|the evidence) (?:support|show|establish)\b/i, reason: "Detached evidentiary framing puts the internal proof process in the foreground instead of speaking plainly to the customer." },
  { id: "legalistic_absence", expression: /\b(?:there is|there's) no (?:reliable|sufficient) (?:basis|evidence)\b/i, reason: "Legalistic absence language sounds defensive; preserve uncertainty in ordinary words." },
  { id: "definition_then_instruction", expression: /\b(?:is a separate part of|deserves its own check)\b/i, reason: "Clinical definition-plus-instruction phrasing is accurate but more formal than the direct, practical target voice." },
  { id: "nominalised_formality", expression: /\b(?:fit assessment|commercial involvement|selection criteria|available option)\b/i, reason: "Abstract nouns create distance where direct advice would be clearer." }
  ,{ id: "formal_proof_language", expression: /\b(?:does not establish|cannot be concluded|according to (?:the )?(?:product|available)|actual product description|universal winner)\b/i, reason: "Proof-oriented wording is useful internally but sounds rigid in customer-facing advice." }
  ,{ id: "technical_without_practical_payoff", expression: /\b(?:grams per square metre|surface area|fibres are arranged)\b/i, reason: "The technical point needs an immediate practical consequence in plain language." }
];

const collect = (value, path = "$", output = []) => {
  if (typeof value === "string") output.push({ path, text: value });
  else if (Array.isArray(value)) value.forEach((item, index) => collect(item, `${path}[${index}]`, output));
  else if (value && typeof value === "object") for (const [key, item] of Object.entries(value)) if (!["evidence_ids", "product_ids", "internal_link_ids", "validation_metadata", "claim_annotations"].includes(key)) collect(item, `${path}.${key}`, output);
  return output;
};

export function diagnoseVoiceMismatch(page, profile) {
  const findings = [];
  for (const item of collect(page)) for (const pattern of PATTERNS) if (pattern.expression.test(item.text)) findings.push({ pattern_id: pattern.id, path: item.path, excerpt: item.text, reason: pattern.reason, factual_meaning_status: "preserve", recommendation: "Rewrite the delivery only; do not add, remove or strengthen the claim." });
  return { schema_version: "1.0.0", artifact_type: "voice_diagnostic", profile_id: profile.profile_id, source_semantic_hash: profile.diagnostic_source_hash || null, status: findings.length ? "VOICE_MISMATCH_FOUND" : "NO_RULE_MATCH", customer_copy_modified: false, findings };
}
