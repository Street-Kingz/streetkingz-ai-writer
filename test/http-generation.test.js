import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import {
  GENERATE_REQUEST,
  MALFORMED_PROVIDER_JSON,
  invalidHtmlArticle,
  openAIResponse,
  validArticle
} from "./fixtures/providerResponses.js";
import { requestJson, startServer, stopServer } from "./helpers/http.js";

process.env.OPENAI_API_KEY = "test-openai-key";
delete process.env.GEMINI_API_KEY;
process.env.AI_PROVIDER = "openai";

const queuedResponses = [];
const providerRequests = [];

globalThis.fetch = async (url, options) => {
  providerRequests.push({ url, options, body: JSON.parse(options.body) });
  const next = queuedResponses.shift();
  if (!next) throw new Error(`Unexpected unmocked provider call to ${url}`);
  return next;
};

const { default: app } = await import("../app.js");

let server;

before(async () => {
  server = await startServer(app);
});

after(async () => {
  await stopServer(server);
});

test("successful OpenAI generation preserves request and response behaviour", async () => {
  queuedResponses.push(Response.json(openAIResponse()));
  const initialCalls = providerRequests.length;

  const response = await requestJson(server, {
    method: "POST",
    path: "/generate-article",
    body: GENERATE_REQUEST
  });

  assert.equal(response.status, 200);
  assert.equal(providerRequests.length, initialCalls + 1);
  const providerRequest = providerRequests.at(-1);
  assert.equal(providerRequest.url, "https://api.openai.com/v1/chat/completions");
  assert.equal(providerRequest.body.model, "gpt-4o-mini");
  assert.equal(providerRequest.body.temperature, 0.4);
  assert.equal(providerRequest.body.response_format.type, "json_object");
  assert.equal(response.body.primary_keyword, GENERATE_REQUEST.primary_keyword);
  assert.equal(response.body.slug, "how-to-dry-a-car");
  assert.deepEqual(response.body.image_placeholders, []);
});

test("metadata and HTML enforcement preserve the existing output rules", async () => {
  queuedResponses.push(Response.json(openAIResponse()));

  const response = await requestJson(server, {
    method: "POST",
    path: "/generate-article",
    body: GENERATE_REQUEST
  });

  assert.equal(response.status, 200);
  const article = response.body;
  assert.equal(
    article.meta_description,
    "how to dry a car: Practical drying advice. UK delivery available. UK delivery available. UK delivery available. UK delivery available."
  );
  assert.equal(article.meta_description.length, 134);
  assert.equal(
    article.meta_description.toLowerCase().split(GENERATE_REQUEST.primary_keyword).length - 1,
    1
  );
  assert.doesNotMatch(article.content_html, /<h1\b/i);
  assert.doesNotMatch(article.content_html, /<ol\b/i);
  assert.doesNotMatch(article.content_html, /https:\/\/example\.com\/not-allowed/);
  assert.match(article.content_html, /<section class="sk-featured-box">/);
  assert.match(article.content_html, /<h2>Choosing the right products<\/h2>/);
  assert.match(article.content_html, /<h2>Who this is not for<\/h2>/);
  assert.match(article.content_html, /<p>Ben, founder of Street Kingz\.<\/p>/);
  assert.match(article.content_html, /<!-- ENFORCED_OK -->/);
  assert.match(article.content_html, /<!-- ENFORCE_CORE_RAN -->/);
});

test("malformed provider JSON preserves the internal error response", async () => {
  queuedResponses.push(
    Response.json({ choices: [{ message: { content: MALFORMED_PROVIDER_JSON } }] })
  );

  const response = await requestJson(server, {
    method: "POST",
    path: "/generate-article",
    body: GENERATE_REQUEST
  });

  assert.equal(response.status, 500);
  assert.deepEqual(response.body, { error: "Internal server error" });
});

test("HTML validation issues trigger one retry at the lower temperature", async () => {
  queuedResponses.push(
    Response.json(openAIResponse(invalidHtmlArticle())),
    Response.json(openAIResponse(validArticle({ content_html: "<h2>FAQs</h2><p>Valid retry.</p>" })))
  );
  const initialCalls = providerRequests.length;

  const response = await requestJson(server, {
    method: "POST",
    path: "/generate-article",
    body: GENERATE_REQUEST
  });

  assert.equal(response.status, 200);
  assert.equal(providerRequests.length, initialCalls + 2);
  assert.equal(providerRequests.at(-2).body.temperature, 0.4);
  assert.equal(providerRequests.at(-1).body.temperature, 0.25);
  assert.match(response.body.content_html, /Valid retry\./);
});

test("HTML validation failure after retry preserves the 422 response", async () => {
  queuedResponses.push(
    Response.json(openAIResponse(invalidHtmlArticle())),
    Response.json(openAIResponse(invalidHtmlArticle()))
  );
  const initialCalls = providerRequests.length;

  const response = await requestJson(server, {
    method: "POST",
    path: "/generate-article",
    body: GENERATE_REQUEST
  });

  assert.equal(providerRequests.length, initialCalls + 2);
  assert.equal(response.status, 422);
  assert.deepEqual(response.body, {
    error: "Generated HTML failed validation",
    issues: ["h1_found"]
  });
});
