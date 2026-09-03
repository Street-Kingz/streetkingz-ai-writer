const packageKey = name => `node_modules/${name}`;

function entry(lock, name) {
  return lock.packages?.[packageKey(name)] || null;
}

function walk(lock, roots) {
  const seen = new Set();
  const queue = [...roots];
  while (queue.length) {
    const name = queue.shift();
    if (seen.has(name)) continue;
    seen.add(name);
    const pkg = entry(lock, name);
    if (!pkg) continue;
    for (const dependency of Object.keys(pkg.dependencies || {}).sort()) queue.push(dependency);
  }
  return [...seen].sort();
}

export function compareMaterialClosures(accepted, current, roots = ["@supabase/supabase-js", "express", "body-parser", "cors", "ipaddr.js"]) {
  const names = [...new Set([...walk(accepted, roots), ...walk(current, roots)])].sort();
  const packages = names.map(name => {
    const old = entry(accepted, name);
    const now = entry(current, name);
    const acceptedVersion = old?.version || null;
    const currentVersion = now?.version || null;
    const acceptedIntegrity = old?.integrity || null;
    const currentIntegrity = now?.integrity || null;
    return { name, accepted_version: acceptedVersion, current_version: currentVersion, accepted_integrity: acceptedIntegrity, current_integrity: currentIntegrity, result: acceptedVersion === currentVersion && acceptedIntegrity === currentIntegrity ? "IDENTICAL" : "DIFFERENT" };
  });
  return { roots: [...roots].sort(), packages, material_dependency_package_count: packages.length, material_dependency_equivalent: packages.every(pkg => pkg.result === "IDENTICAL") };
}

export function canonicalDependencyResult(result) {
  return JSON.stringify({ roots: result.roots, packages: result.packages, material_dependency_package_count: result.material_dependency_package_count, material_dependency_equivalent: result.material_dependency_equivalent });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const fs = await import("node:fs/promises");
  const { execFileSync } = await import("node:child_process");
  const root = process.cwd();
  const accepted = JSON.parse(execFileSync("git", ["show", "8b91c797f3a45655cf5703651dad143a684ef620:package-lock.json"], { cwd: root, encoding: "utf8" }));
  const current = JSON.parse(await fs.readFile(`${root}/package-lock.json`, "utf8"));
  const output = process.argv[2];
  if (!output) throw new Error("output path required");
  await fs.writeFile(output, JSON.stringify(compareMaterialClosures(accepted, current), null, 2));
}
