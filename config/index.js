export const PORT = process.env.PORT || 3000;

export const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Optional: force a provider: "openai" | "gemini" | "auto" (default)
export const AI_PROVIDER = (process.env.AI_PROVIDER || "auto").toLowerCase();

if (!OPENAI_API_KEY) console.warn("⚠️ OPENAI_API_KEY not set (OpenAI calls disabled).");
if (!GEMINI_API_KEY) console.warn("⚠️ GEMINI_API_KEY not set (Gemini calls disabled).");
if (!OPENAI_API_KEY && !GEMINI_API_KEY) {
  console.warn(
    "⚠️ No AI keys set. /generate-article will not work until you add OPENAI_API_KEY and/or GEMINI_API_KEY."
  );
}
