import { execFileSync } from "node:child_process";
import fs from "node:fs";

const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
const findings = [];
const secretNames = /(?:SUPABASE_(?:SERVICE_ROLE_KEY|SECRET_KEY)|DATAFORSEO_(?:LOGIN|PASSWORD)|GOOGLE_(?:CLIENT_SECRET|REFRESH_TOKEN)|(?:OPENAI|GEMINI)_API_KEY|WOO(?:COMMERCE)?_(?:CONSUMER_KEY|CONSUMER_SECRET))/;
for (const file of files) {
  if (file === "scripts/security/scan-secrets.mjs") continue;
  if (/^\.env(?:\.|$)/i.test(file) && file !== ".env.example") findings.push({ file, class: "tracked-secret-file" });
  const text = fs.readFileSync(file, "utf8");
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text)) findings.push({ file, class: "private-key-block" });
  for (const line of text.split("\n")) {
    const assignment = new RegExp(`(?:${secretNames.source})\\s*(?:=|:)\\s*[\\\"']([^\\\"']{8,})[\\\"']`).exec(line);
    if (assignment && !/(process\.env|env\.|placeholder|example|undefined|null|REDACTED|YOUR_|<[^>]+>|synthetic|fixture|secret[-_ ]pass|\$\{?)/i.test(line)) findings.push({ file, class: "secret-assignment" });
    if (/\bsk-[A-Za-z0-9]{20,}\b/.test(line)) findings.push({ file, class: "provider-token-format" });
  }
}
const unique = [...new Map(findings.map(item => [`${item.file}:${item.class}`, item])).values()];
if (unique.length) { for (const item of unique) console.error(`${item.file}: ${item.class}`); process.exit(1); }
console.log(JSON.stringify({ trackedFiles: files.length, findings: 0 }));
