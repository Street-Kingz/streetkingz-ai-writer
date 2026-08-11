import { readFile } from "node:fs/promises";
import path from "node:path";
import { sha256 } from "../research/core/canonical.js";
import { createOpenAICornerstoneStrategyProvider } from "../cornerstone/strategy-provider.js";
import { runControlledCornerstoneStrategy } from "../cornerstone/strategy-run.js";

const packetPath = path.resolve(process.env.CORNERSTONE_PACKET_PATH || "artifacts/cornerstone/best-car-drying-towel/fixture-v1/research-packet.json");
const factsPath = path.resolve(process.env.CORNERSTONE_PRODUCT_FACTS_PATH || "artifacts/product-extraction/heavy-duty-drying-towel-1200gsm/2026-08-06T16-37-16-159Z/facts.json");
const outputDirectory = path.resolve(process.env.CORNERSTONE_STRATEGY_OUTPUT || "artifacts/cornerstone/best-car-drying-towel/strategy-v1");
const [packetBytes, factsBytes] = await Promise.all([readFile(packetPath), readFile(factsPath)]);
const packet = JSON.parse(packetBytes);
const facts = JSON.parse(factsBytes);
const value = (item) => item?.value ?? item;
const productFacts = [{
  source_artifact: path.relative(process.cwd(), factsPath), source_sha256: sha256(factsBytes), product_url: facts.product_url,
  name: value(facts.product.name), category_type: value(facts.product.category_type),
  specifications: facts.product.specifications.map((item) => ({ name: value(item.name), value: value(item.value) })),
  features: facts.product.features.map(value), benefits: facts.product.benefits.map(value), intended_use: facts.product.intended_use.map(value),
  how_to_use: facts.product.how_to_use.map(value), care_instructions: facts.product.care_instructions.map(value),
  claims: facts.product.claims.map(value), limitations: facts.product.limitations.map(value)
}];
const brandRules = {
  source: "Street Kingz established project rules",
  tone: ["plain English", "helpful", "practical", "candid", "premium materials without gimmicks"],
  constraints: ["answer the reader's problem before presenting products", "avoid overhyped language", "never manufacture evidence", "do not force product placement", "do not draft or publish in this stage"]
};
const provider = createOpenAICornerstoneStrategyProvider();
const result = await runControlledCornerstoneStrategy({ packet, brandRules, productFacts, provider, outputDirectory, maxCalls: 2 });
console.log(JSON.stringify({ accepted: result.accepted, validation_status: result.validation.status, model: result.metadata.model, calls: result.metadata.calls, retries: result.metadata.retries, output_directory: result.callDirectory }, null, 2));
if (!result.accepted) process.exitCode = 1;
