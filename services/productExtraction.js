import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { extractProductPage, validateProductUrl } from "../extractors/productPage.js";
import { renderProductFactsMarkdown } from "../renderers/productArtifacts.js";

const DEFAULT_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function safeTimestamp(value) {
  return value.replace(/[:.]/g, "-");
}

function urlKey(url) {
  return createHash("sha256").update(url).digest("hex").slice(0, 16);
}

function productSlug(url) {
  return new URL(url).pathname.split("/").filter(Boolean).at(-1);
}

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

async function fetchRenderedPage(url, { fetchImpl, cacheDir, force, cacheMaxAgeMs, now }) {
  const directory = path.join(cacheDir, urlKey(url));
  const htmlPath = path.join(directory, "page.html");
  const metadataPath = path.join(directory, "fetch.json");

  if (!force && await exists(htmlPath) && await exists(metadataPath)) {
    const metadata = JSON.parse(await readFile(metadataPath, "utf8"));
    const age = now().getTime() - new Date(metadata.fetched_at).getTime();
    if (Number.isFinite(age) && age <= cacheMaxAgeMs) {
      return {
        html: await readFile(htmlPath, "utf8"),
        cacheHit: true,
        htmlPath,
        metadataPath,
        metadata
      };
    }
  }

  const response = await fetchImpl(url, {
    headers: { "User-Agent": "StreetKingzProductExtractor/1.0" },
    redirect: "follow"
  });
  if (!response.ok) {
    throw new Error(`Product page fetch failed with HTTP ${response.status}.`);
  }
  const html = await response.text();
  const fetchedAt = now().toISOString();
  const metadata = {
    schema_version: "1.0.0",
    artifact_type: "raw_page_metadata",
    source_url: url,
    fetched_at: fetchedAt,
    status: response.status,
    content_type: response.headers.get("content-type"),
    sha256: createHash("sha256").update(html).digest("hex")
  };
  await mkdir(directory, { recursive: true });
  await writeFile(htmlPath, html, "utf8");
  await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
  return { html, cacheHit: false, htmlPath, metadataPath, metadata };
}

export async function extractProductFromUrl(url, options = {}) {
  const validatedUrl = validateProductUrl(url);
  const outputRoot = path.resolve(options.outputRoot || "artifacts/product-extraction");
  const cacheDir = path.resolve(options.cacheDir || path.join(outputRoot, "cache"));
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const now = options.now || (() => new Date());
  if (typeof fetchImpl !== "function") throw new Error("A fetch implementation is required.");

  const fetched = await fetchRenderedPage(validatedUrl, {
    fetchImpl,
    cacheDir,
    force: Boolean(options.force),
    cacheMaxAgeMs: options.cacheMaxAgeMs ?? DEFAULT_CACHE_MAX_AGE_MS,
    now
  });
  const extractedAt = now().toISOString();
  const facts = extractProductPage(fetched.html, validatedUrl, { extractedAt });
  const interpretation = {
    schema_version: "1.0.0",
    artifact_type: "ai_interpretation",
    product_url: validatedUrl,
    created_at: extractedAt,
    status: "not_generated",
    reason: "Phase 2 records page-supported facts only. No AI interpretation was requested or generated.",
    items: []
  };

  const runDirectory = path.join(outputRoot, productSlug(validatedUrl), safeTimestamp(extractedAt));
  const rawDirectory = path.join(runDirectory, "raw");
  const rawHtmlPath = path.join(rawDirectory, "page.html");
  const rawMetadataPath = path.join(rawDirectory, "fetch.json");
  const factsPath = path.join(runDirectory, "facts.json");
  const interpretationPath = path.join(runDirectory, "interpretation.json");
  const markdownPath = path.join(runDirectory, "summary.md");
  const runPath = path.join(runDirectory, "run.json");
  await mkdir(rawDirectory, { recursive: true });
  await writeFile(rawHtmlPath, fetched.html, "utf8");
  await writeFile(rawMetadataPath, `${JSON.stringify(fetched.metadata, null, 2)}\n`, "utf8");
  await writeFile(factsPath, `${JSON.stringify(facts, null, 2)}\n`, "utf8");
  await writeFile(interpretationPath, `${JSON.stringify(interpretation, null, 2)}\n`, "utf8");
  await writeFile(markdownPath, renderProductFactsMarkdown(facts, interpretation), "utf8");
  await writeFile(
    runPath,
    `${JSON.stringify({
      schema_version: "1.0.0",
      artifact_type: "product_extraction_run",
      product_url: validatedUrl,
      created_at: extractedAt,
      cache_hit: fetched.cacheHit,
      raw: {
        html: "raw/page.html",
        metadata: "raw/fetch.json"
      },
      cache: {
        html: path.relative(runDirectory, fetched.htmlPath),
        metadata: path.relative(runDirectory, fetched.metadataPath)
      },
      structured: {
        facts: "facts.json",
        interpretation: "interpretation.json"
      },
      human_readable: "summary.md"
    }, null, 2)}\n`,
    "utf8"
  );

  return {
    facts,
    interpretation,
    cacheHit: fetched.cacheHit,
    paths: {
      runDirectory,
      rawHtml: rawHtmlPath,
      rawMetadata: rawMetadataPath,
      cacheHtml: fetched.htmlPath,
      cacheMetadata: fetched.metadataPath,
      facts: factsPath,
      interpretation: interpretationPath,
      markdown: markdownPath,
      run: runPath
    }
  };
}
