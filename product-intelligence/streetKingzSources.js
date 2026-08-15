import { sha256 } from "../research/core/canonical.js";
import { createWordPressAuthoritativeReader } from "../cms/wordpressAuthoritativeReader.js";

export function createStreetKingzSourceReaders({ fetchImpl = fetch, wordpressConfig, clock = () => new Date() }) {
  if (typeof fetchImpl !== "function") throw new Error("A fetch implementation is required.");
  return {
    async readRenderedPage(productUrl) {
      const response = await fetchImpl(productUrl, {
        method: "GET",
        redirect: "follow",
        headers: { accept: "text/html", "user-agent": "StreetKingzProductIntelligenceEvidence/0.1" }
      });
      const html = await response.text();
      if (!response.ok) throw new Error(`Rendered product page read failed with HTTP ${response.status}.`);
      return {
        html,
        retrieval: {
          requested_url: productUrl,
          final_url: response.url || productUrl,
          http_status: response.status,
          retrieved_at: clock().toISOString(),
          response_size_bytes: Buffer.byteLength(html),
          response_sha256: sha256(html),
          request_count: 1,
          method: "GET"
        }
      };
    },
    async readAuthoritativeProduct({ productId }) {
      let raw = null;
      let retrieval = null;
      const reader = createWordPressAuthoritativeReader({
        config: wordpressConfig,
        fetchImpl,
        clock,
        persistRawResponse: async ({ body, provenance }) => {
          raw = JSON.parse(body);
          retrieval = provenance;
        }
      });
      const authoritativePost = await reader.readPost(productId);
      return { authoritativePost, raw, retrieval };
    }
  };
}

