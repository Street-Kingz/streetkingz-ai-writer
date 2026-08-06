import { AI_PROVIDER, GEMINI_API_KEY, OPENAI_API_KEY } from "../config/index.js";
import { callGeminiJson } from "./gemini.js";
import { callOpenAIJson, openaiInCooldown } from "./openai.js";

export async function callLLMJson({ prompt, temperature = 0.35 }) {
  if (AI_PROVIDER === "gemini") return callGeminiJson({ prompt, temperature });
  if (AI_PROVIDER === "openai") return callOpenAIJson({ prompt, temperature });

  // AUTO: if OpenAI is in cooldown, go straight to Gemini (no wasting calls)
  if (openaiInCooldown() && GEMINI_API_KEY) {
    console.warn("OpenAI in cooldown, using Gemini");
    return callGeminiJson({ prompt, temperature });
  }

  // AUTO: try OpenAI first, fallback to Gemini on 429/5xx (or rate-limit text)
  if (OPENAI_API_KEY) {
    try {
      return await callOpenAIJson({ prompt, temperature });
    } catch (e) {
      const status = e?.status;
      const raw = String(e?.raw || e?.message || "");
      const isRateLimit = status === 429 || /rate[_\s-]?limit/i.test(raw);
      const isServery = status >= 500 && status <= 599;

      if ((isRateLimit || isServery) && GEMINI_API_KEY) {
        console.warn("OpenAI rate-limited/server error, falling back to Gemini");
        return callGeminiJson({ prompt, temperature });
      }
      throw e;
    }
  }

  if (GEMINI_API_KEY) return callGeminiJson({ prompt, temperature });
  throw new Error("No AI provider keys available");
}
