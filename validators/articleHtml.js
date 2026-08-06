export function findHtmlIssues(html) {
  const issues = [];
  const s = String(html || "");

  if (/<h1\b/i.test(s)) issues.push("h1_found");

  if (/<h1[^>]*>\s*<p>/i.test(s)) issues.push("h1_contains_p");
  if (/<a\b[^>]*>\s*<p>/i.test(s)) issues.push("a_contains_p");
  if (/<li\b[^>]*>[\s\S]*?<p\b[\s>][\s\S]*?<\/li>/i.test(s)) issues.push("li_contains_p");
  if (/<p>\s*\d+\.\s*/i.test(s)) issues.push("numbered_paragraph_steps");
  if (/<ol\b/i.test(s)) issues.push("ordered_list_found");

  return issues;
}
