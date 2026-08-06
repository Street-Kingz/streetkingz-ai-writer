import { GEMINI_API_KEY } from "../config/index.js";
import { safeJsonParse } from "../utils/json.js";

export async function callGeminiJson({ prompt, temperature = 0.35 }) {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not set");

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": GEMINI_API_KEY
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature,
        responseMimeType: "application/json"
      }
    })
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    console.error("Gemini API error:", errorText);
    const err = new Error(`Gemini API error: ${resp.status}`);
    err.status = resp.status;
    err.provider = "gemini";
    err.raw = errorText;
    throw err;
  }

  const data = await resp.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p?.text || "").join("").trim();
  if (!text) throw new Error("No content returned from Gemini");
  return safeJsonParse(text);
}
