import { OPENAI_API_KEY } from "../config/index.js";
import { safeJsonParse } from "../utils/json.js";

let OPENAI_COOLDOWN_UNTIL_MS = 0;

function setOpenAICooldownFromResponse(resp, fallbackSeconds = 6 * 60 * 60) {
  const ra = resp?.headers?.get?.("retry-after");
  const secs = ra ? Number(ra) : NaN;
  const wait = Number.isFinite(secs) && secs > 0 ? secs : fallbackSeconds;
  OPENAI_COOLDOWN_UNTIL_MS = Date.now() + wait * 1000;
}

export function openaiInCooldown() {
  return Date.now() < OPENAI_COOLDOWN_UNTIL_MS;
}

// ---------------------------
// OpenAI caller (JSON mode)
// ---------------------------

export async function callOpenAIJson({ prompt, temperature = 0.35 }) {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Return strictly valid JSON only. No prose, no markdown, no code fences." },
        { role: "user", content: prompt }
      ]
    })
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    console.error("OpenAI API error:", errorText);

    // ✅ NEW: put OpenAI into cooldown on rate limit so AUTO uses Gemini next
    if (resp.status === 429) {
      setOpenAICooldownFromResponse(resp, 6 * 60 * 60);
    }

    const err = new Error(`OpenAI API error: ${resp.status}`);
    err.status = resp.status;
    err.provider = "openai";
    err.raw = errorText;
    throw err;
  }

  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content returned from OpenAI");
  return safeJsonParse(content);
}
