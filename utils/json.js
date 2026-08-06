function stripCodeFences(text) {
  if (!text) return text;
  const trimmed = String(text).trim();
  if (trimmed.startsWith("```")) {
    return trimmed.replace(/^```[a-zA-Z]*\s*/m, "").replace(/```$/m, "").trim();
  }
  return trimmed;
}

export function safeJsonParse(text) {
  const cleaned = stripCodeFences(text);
  return JSON.parse(cleaned);
}
