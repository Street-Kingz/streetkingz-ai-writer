import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { GENERATE_REQUEST, geminiResponse } from "./fixtures/providerResponses.js";
import { requestJson, startServer, stopServer } from "./helpers/http.js";

process.env.OPENAI_API_KEY = "test-openai-key";
process.env.GEMINI_API_KEY = "test-gemini-key";
process.env.AI_PROVIDER = "auto";

const providerUrls = [];

globalThis.fetch = async (url) => {
  providerUrls.push(url);

  if (providerUrls.length === 1) {
    return new Response("rate_limit", {
      status: 429,
      headers: { "retry-after": "60" }
    });
  }

  if (url.includes("generativelanguage.googleapis.com")) {
    return Response.json(geminiResponse());
  }

  throw new Error(`Unexpected provider call to ${url}`);
};

const { default: app } = await import("../app.js");

let server;

before(async () => {
  server = await startServer(app);
});

after(async () => {
  await stopServer(server);
});

test("OpenAI 429 falls back to Gemini and repeated requests share cooldown state", async () => {
  const first = await requestJson(server, {
    method: "POST",
    path: "/generate-article",
    body: GENERATE_REQUEST
  });
  const second = await requestJson(server, {
    method: "POST",
    path: "/generate-article",
    body: GENERATE_REQUEST
  });

  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(providerUrls.length, 3);
  assert.equal(providerUrls[0], "https://api.openai.com/v1/chat/completions");
  assert.match(providerUrls[1], /generativelanguage\.googleapis\.com/);
  assert.match(providerUrls[2], /generativelanguage\.googleapis\.com/);
});
