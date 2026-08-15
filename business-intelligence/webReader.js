import { sha256 } from "../research/core/canonical.js";

export function createBusinessWebsiteReader({ fetchImpl = fetch, clock = () => new Date() } = {}) {
  if (typeof fetchImpl !== "function") throw new Error("A fetch implementation is required.");
  return async function readPage(url) {
    const response = await fetchImpl(url, { method: "GET", redirect: "follow", headers: { accept: "text/html", "user-agent": "StreetKingzBusinessIntelligenceEvidence/0.1" } });
    const html = await response.text();
    if (!response.ok) throw new Error(`Business website read failed for ${url} with HTTP ${response.status}.`);
    return { html, retrieval: { requested_url: url, final_url: response.url || url, http_status: response.status, retrieved_at: clock().toISOString(), response_size_bytes: Buffer.byteLength(html), response_sha256: sha256(html), request_count: 1, method: "GET" } };
  };
}
