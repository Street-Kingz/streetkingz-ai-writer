import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildDraftProofPackage, canonicalDraftPackageHash } from "../rendering/wordpress-draft-proof.js";

const directory = path.resolve("artifacts/cornerstone/best-car-drying-towel/wordpress-gutenberg-draft-proof-v1");
const pkg = buildDraftProofPackage();
await mkdir(directory, { recursive: true });
await writeFile(path.join(directory, "write-contract.json"), `${JSON.stringify({ ...pkg.contract, package_sha256: canonicalDraftPackageHash(pkg) }, null, 2)}\n`);
await writeFile(path.join(directory, "post-content.html"), `${pkg.content}\n`);
await writeFile(path.join(directory, "block-structure.json"), `${JSON.stringify({ block_names: pkg.validation.block_names, h1_count: pkg.validation.h1_count, allowed_blocks: true }, null, 2)}\n`);
await writeFile(path.join(directory, "validation-report.json"), `${JSON.stringify({ ...pkg.validation, content_sha256: pkg.content_hash, package_sha256: canonicalDraftPackageHash(pkg), live_execution: false, wordpress_writes: 0, ai_calls: 0 }, null, 2)}\n`);
await writeFile(path.join(directory, "human-preview.md"), `# ${pkg.preview.post_title}\n\n> ${pkg.preview.post_excerpt}\n\nThis is a non-production Gutenberg/Kadence render test. The WordPress post title should provide the only visible H1; the content below intentionally begins with an introductory paragraph.\n\n- Core blocks: ${pkg.validation.block_names.join(", ")}\n- Content hash: ${pkg.content_hash}\n- Live execution: NO\n- Publication: FORBIDDEN\n\nThe exact block markup is in [post-content.html](./post-content.html).\n`);
await writeFile(path.join(directory, "rollback-plan.json"), `${JSON.stringify({ schema_version: "1.0.0", trigger: "persisted read-back verification failure", action: "trash_or_delete_only_created_post", identity: "created_post_id_from_same_execution", safeguards: ["never accept caller-supplied existing post ID", "never modify Product 70", "never modify Template 2003", "verify cleanup by exact ID"], successful_verification: "leave draft intact for human visual inspection" }, null, 2)}\n`);
await writeFile(path.join(directory, "run-metadata.json"), `${JSON.stringify({ artifact_type: "offline_gutenberg_draft_proof", generated_at: new Date().toISOString(), execution_state: "PREPARED_NOT_EXECUTED", package_sha256: canonicalDraftPackageHash(pkg), content_sha256: pkg.content_hash, wordpress_writes: 0, writer_executions: 0, publication_attempts: 0, ai_calls: 0 }, null, 2)}\n`);
console.log(JSON.stringify({ directory, content_sha256: pkg.content_hash, package_sha256: canonicalDraftPackageHash(pkg), h1_count: pkg.validation.h1_count, wordpress_writes: 0 }, null, 2));
