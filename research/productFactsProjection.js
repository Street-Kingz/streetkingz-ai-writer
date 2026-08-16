import { SCHEMA_VERSION } from "./contracts/schemas.js";
import { sha256, stableId } from "./core/canonical.js";

function leaves(value, currentPath = "product", output = []) {
  if (!value || typeof value !== "object") return output;
  if (Object.hasOwn(value, "value") && Object.hasOwn(value, "provenance")) {
    output.push({ field_path: currentPath, value: value.value, provenance: value.provenance });
    return output;
  }
  for (const [key, child] of Object.entries(value)) leaves(child, `${currentPath}.${key}`, output);
  return output;
}

function unwrap(pio) {
  return pio?.product_intelligence_object || pio;
}

export function projectValidatedPioToProductFacts({ productIntelligence, sourceOwner = null }) {
  const pio = unwrap(productIntelligence);
  if (!pio || pio.validation_status !== "validated") throw new Error("Validated Product Intelligence is required for Product Facts projection.");
  const metadata = pio.metadata || {};
  const productUrl = metadata.product_url;
  const productName = pio.product_identity?.product_name;
  const category = pio.product_identity?.product_type;
  if (typeof productUrl !== "string" || typeof productName?.value !== "string" || typeof category?.value !== "string") {
    throw new Error("Validated Product Intelligence does not contain the required product identity facts.");
  }
  const product = {};
  for (const fact of leaves(pio.product_identity, "product")) {
    const target = fact.field_path.split(".").slice(1);
    let cursor = product;
    target.forEach((part, index) => {
      if (index === target.length - 1) cursor[part] = { value: fact.value, provenance: fact.provenance };
      else cursor = cursor[part] ||= {};
    });
  }
  product.name ||= { value: productName.value, provenance: productName.provenance };
  product.category_type ||= { value: category.value, provenance: category.provenance };
  const owner = sourceOwner || metadata.business_name || pio.product_identity?.brand?.value || "product_owner";
  return {
    schema_version: SCHEMA_VERSION,
    artifact_type: "product_facts",
    product_url: productUrl,
    product,
    extracted_at: metadata.updated_at || metadata.created_at || new Date(0).toISOString(),
    source_owner: owner,
    source_fingerprint: metadata.source_fingerprint || null,
    source_pio_object_id: metadata.object_id || null,
    projection: { adapter: "validated_pio_to_product_facts", version: "1.0.0", pio_sha256: sha256(pio) },
    artifact_id: stableId("product_facts", { product_url: productUrl, pio_object_id: metadata.object_id, pio_sha256: sha256(pio) })
  };
}

export function validateProjectedProductFacts(facts) {
  return facts?.artifact_type === "product_facts" && typeof facts.product_url === "string" && typeof facts.product?.name?.value === "string" && typeof facts.product?.category_type?.value === "string";
}
