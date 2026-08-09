import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Worker } from "node:worker_threads";
import { DatabaseSync } from "node:sqlite";

const plugin = fs.readFileSync("wordpress-plugin/streetkingz-ai-guarded-writer/streetkingz-ai-guarded-writer.php", "utf8");

function temporaryDatabase() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "streetkingz-execution-claim-"));
  const databasePath = path.join(directory, "options.sqlite");
  const database = new DatabaseSync(databasePath);
  database.exec("PRAGMA journal_mode=WAL; CREATE TABLE options (option_name TEXT PRIMARY KEY, option_value TEXT NOT NULL);");
  database.close();
  return { directory, databasePath };
}

function claimWorker(databasePath, optionName, value) {
  const source = `
    const { parentPort, workerData } = require('node:worker_threads');
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(workerData.databasePath);
    db.exec('PRAGMA busy_timeout=5000');
    let won = false;
    try {
      const result = db.prepare('INSERT OR IGNORE INTO options(option_name, option_value) VALUES (?, ?)').run(workerData.optionName, workerData.value);
      won = result.changes === 1;
    } finally { db.close(); }
    parentPort.postMessage(won);
  `;
  return new Promise((resolve, reject) => {
    const worker = new Worker(source, { eval: true, workerData: { databasePath, optionName, value } });
    worker.once("message", resolve);
    worker.once("error", reject);
    worker.once("exit", (code) => { if (code !== 0) reject(new Error(`claim worker exited ${code}`)); });
  });
}

test("database uniqueness gives exactly one concurrent claim winner", async () => {
  const { directory, databasePath } = temporaryDatabase();
  try {
    const results = await Promise.all(Array.from({ length: 12 }, (_, index) => claimWorker(databasePath, "streetkingz_ai_exec_same", JSON.stringify({ index }))));
    assert.equal(results.filter(Boolean).length, 1);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test("claimed IDs survive a new connection and different IDs remain independent", () => {
  const { directory, databasePath } = temporaryDatabase();
  try {
    let database = new DatabaseSync(databasePath);
    assert.equal(database.prepare("INSERT OR IGNORE INTO options VALUES (?, ?)").run("claimed-a", "claimed_executing").changes, 1);
    database.close();
    database = new DatabaseSync(databasePath);
    assert.equal(database.prepare("INSERT OR IGNORE INTO options VALUES (?, ?)").run("claimed-a", "other-contract").changes, 0);
    assert.equal(database.prepare("INSERT OR IGNORE INTO options VALUES (?, ?)").run("claimed-b", "claimed_executing").changes, 1);
    database.close();
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test("production claim stores bounded audit data and has no reuse cleanup", () => {
  for (const field of ["execution_id_sha256", "contract_sha256", "approval_sha256", "product_id", "template_id", "claimed_at", "completed_at"]) assert.match(plugin, new RegExp(field));
  assert.match(plugin, /failed_after_claim/);
  assert.match(plugin, /succeeded/);
  assert.doesNotMatch(plugin, /delete_option\s*\(/);
  assert.doesNotMatch(plugin, /set_transient|wp_cache_add|static\s+\$.*execution|global\s+\$.*execution/i);
});

test("pre-claim failures do not record execution and contract fingerprint cannot replace a claimed ID", () => {
  const request = plugin.slice(plugin.indexOf("function streetkingz_ai_guarded_writer_request"));
  const claimIndex = request.indexOf("streetkingz_ai_writer_claim_execution(");
  const beforeClaim = request.slice(0, claimIndex);
  assert.match(beforeClaim, /streetkingz_ai_writer_validate_request/);
  assert.match(beforeClaim, /streetkingz_ai_writer_execution_authorisation/);
  assert.match(beforeClaim, /streetkingz_ai_writer_source/);
  assert.match(beforeClaim, /streetkingz_ai_writer_prepare/);
  assert.match(beforeClaim, /streetkingz_ai_writer_persist_snapshot/);
  assert.doesNotMatch(beforeClaim, /add_option/);
  assert.match(plugin, /streetkingz_ai_writer_execution_option_name\(\$execution_id\)/);
  assert.match(plugin, /hash\('sha256', \$execution_id\)/);
});
