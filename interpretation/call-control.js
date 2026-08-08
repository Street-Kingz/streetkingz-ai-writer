import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const callPattern = /^call_(\d{3})$/;
const lifecycleFile = (directory) => path.join(directory, "call-lifecycle.json");

async function existingCalls(modelDirectory) {
  try { return (await readdir(modelDirectory, { withFileTypes: true })).filter((entry) => entry.isDirectory() && callPattern.test(entry.name)).map((entry) => Number(entry.name.match(callPattern)[1])).sort((a, b) => a - b); }
  catch (error) { if (error.code === "ENOENT") return []; throw error; }
}

async function writeLifecycle(directory, lifecycle) {
  await writeFile(lifecycleFile(directory), `${JSON.stringify(lifecycle, null, 2)}\n`, "utf8");
}

export async function invokeControlledCall({ benchmarkDirectory, modelLabel, maxCalls = 1, retries = 0, timeoutMs = 0, invoke, now = () => new Date(), callId = randomUUID() }) {
  if (retries !== 0) throw new Error("Controlled benchmark retries must be zero.");
  if (!Number.isInteger(maxCalls) || maxCalls < 1) throw new Error("maxCalls must be a positive integer.");
  const modelDirectory = path.join(path.resolve(benchmarkDirectory), modelLabel);
  await mkdir(modelDirectory, { recursive: true });
  const calls = await existingCalls(modelDirectory);
  if (calls.length >= maxCalls) {
    const error = new Error(`Controlled call limit reached for ${modelLabel}: ${calls.length}/${maxCalls} calls already started.`);
    error.code = "CONTROLLED_CALL_LIMIT_REACHED";
    throw error;
  }
  const ordinal = calls.length + 1;
  const callDirectory = path.join(modelDirectory, `call_${String(ordinal).padStart(3, "0")}`);
  try { await mkdir(callDirectory, { recursive: false }); }
  catch (error) {
    if (error.code !== "EEXIST") throw error;
    const limitError = new Error(`Controlled call slot ${ordinal} is already reserved for ${modelLabel}.`);
    limitError.code = "CONTROLLED_CALL_LIMIT_REACHED";
    throw limitError;
  }
  const startedAt = now().toISOString();
  const lifecycle = { call_id: callId, model_label: modelLabel, ordinal, configured_max_calls: maxCalls, retries: 0, requested_calls: maxCalls, started_calls: 1, completed_calls: 0, failed_calls: 0, aborted_calls: 0, state: "started", started_at: startedAt, completed_at: null };
  await writeLifecycle(callDirectory, lifecycle);
  const controller = new AbortController();
  let timeout;
  try {
    const invocation = Promise.resolve().then(() => invoke({ signal: controller.signal, callId, callDirectory }));
    const result = timeoutMs > 0 ? await Promise.race([
      invocation,
      new Promise((_, reject) => { timeout = setTimeout(() => { controller.abort(); const error = new Error(`Controlled call ${callId} timed out after ${timeoutMs}ms.`); error.code = "CONTROLLED_CALL_ABORTED"; reject(error); }, timeoutMs); })
    ]) : await invocation;
    lifecycle.completed_calls = 1;
    lifecycle.state = "completed";
    lifecycle.completed_at = now().toISOString();
    await writeLifecycle(callDirectory, lifecycle);
    return { callId, callDirectory, lifecycle, result };
  } catch (error) {
    lifecycle[error.code === "CONTROLLED_CALL_ABORTED" ? "aborted_calls" : "failed_calls"] = 1;
    lifecycle.state = error.code === "CONTROLLED_CALL_ABORTED" ? "aborted" : "failed";
    lifecycle.completed_at = now().toISOString();
    lifecycle.error = { code: error.code || "CALL_FAILED", message: error.message };
    await writeLifecycle(callDirectory, lifecycle);
    throw error;
  } finally { if (timeout) clearTimeout(timeout); }
}

export async function benchmarkCallSummary({ benchmarkDirectory, modelLimits }) {
  const models = {};
  let integrity = true;
  const root = path.resolve(benchmarkDirectory);
  let actualModelLabels = [];
  try { actualModelLabels = (await readdir(root, { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  const modelLabels = [...new Set([...Object.keys(modelLimits), ...actualModelLabels])].sort((a, b) => a.localeCompare(b, "en"));
  for (const modelLabel of modelLabels) {
    const requested = modelLimits[modelLabel] ?? 0;
    const modelDirectory = path.join(path.resolve(benchmarkDirectory), modelLabel);
    const ordinals = await existingCalls(modelDirectory);
    const lifecycles = [];
    for (const ordinal of ordinals) lifecycles.push(JSON.parse(await readFile(lifecycleFile(path.join(modelDirectory, `call_${String(ordinal).padStart(3, "0")}`)), "utf8")));
    const totals = { requested_calls: requested, started_calls: lifecycles.length, completed_calls: lifecycles.filter((item) => item.state === "completed").length, failed_calls: lifecycles.filter((item) => item.state === "failed").length, aborted_calls: lifecycles.filter((item) => item.state === "aborted").length };
    if (totals.started_calls !== requested) integrity = false;
    models[modelLabel] = { ...totals, calls: lifecycles };
  }
  return { integrity: integrity ? "pass" : "failed", models };
}

export async function writeImmutableArtifact(callDirectory, filename, value) {
  await writeFile(path.join(callDirectory, filename), typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
}
