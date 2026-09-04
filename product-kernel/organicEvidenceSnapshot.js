const SOURCE_KINDS = ["commerce", "site", "search_console", "external_search"];

export function usableEvidenceKind(source, run, rowCount = 0) {
  if (source?.current_complete_run && run?.state === "complete") return "current_complete";
  if ((source?.evidence_state === "partial" || run?.state === "partial") && rowCount > 0) return "usable_partial";
  if (source?.current_complete_run) return "lkg";
  return "none";
}

export function buildProgressiveState(states) {
  const available = [];
  const unavailable = [];
  const partial = [];
  const stale = [];
  const limitations = [];
  for (const kind of SOURCE_KINDS) {
    const state = states[kind] || {};
    const selected = state.selected_evidence || state.primary?.selection || "none";
    if (["current_complete", "lkg", "usable", "usable_partial"].includes(selected)) available.push(kind);
    if (["none", "not_connected", "unavailable"].includes(selected)) unavailable.push(kind);
    if (selected === "usable_partial" || state.source_state === "partial") partial.push(kind);
    if (state.source_state === "stale" || selected === "stale") stale.push(kind);
    if (Array.isArray(state.limitations)) limitations.push(...state.limitations.map(value => `${kind}:${value}`));
  }
  return { available_source_classes: available, unavailable_source_classes: unavailable, partial_source_classes: partial, stale_source_classes: stale, limitations };
}

export function buildSnapshot({ business, commerce, site, searchConsole, external, snapshotGeneratedAt }) {
  const sources = { commerce, site, search_console: searchConsole, external_search: external };
  return {
    business: { id: business.id },
    commerce,
    site,
    search_console: searchConsole,
    external_search: external,
    progressive: buildProgressiveState(sources),
    snapshot_generated_at: snapshotGeneratedAt
  };
}
