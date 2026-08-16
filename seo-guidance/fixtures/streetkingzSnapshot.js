import { createGuidanceSnapshot } from "../guidance.js";

const retrievedAt = "2026-08-16T00:00:00.000Z";
const sources = [
  { id: "google-search-essentials", content: "Google Search Essentials describes technical requirements, spam policies and key best practices. Eligibility is not a guarantee of crawling, indexing or serving. Create helpful, reliable, people-first content and follow structured-data guidance.", source_title: "Google Search Essentials" },
  { id: "google-spam-policies", content: "Google spam policies describe behaviors that can lead to lower ranking or omission from Search. Content should provide the best experience for people and uphold the principles of Search.", source_title: "Spam Policies for Google Web Search" },
  { id: "google-helpful-content", content: "Google guidance describes helpful, reliable, people-first content and asks whether content is created primarily to help people rather than manipulate Search.", source_title: "Creating Helpful, Reliable, People-First Content" },
  { id: "google-generative-ai", content: "Google Search guidance on generative AI focuses on using automation responsibly and ensuring content is helpful, accurate, relevant and not created primarily to manipulate rankings.", source_title: "Google Search Guidance on Generative AI Content" },
  { id: "google-ai-features", content: "Google AI Overviews and AI Mode use the same foundational SEO best practices as Google Search. There are no additional technical requirements or special optimizations required for inclusion; pages must be indexed and eligible for a Search snippet.", source_title: "AI Features and Your Website" },
  { id: "google-ranking-systems", content: "Google ranking systems use automated systems and many signals to present relevant useful results. The guide describes notable systems and explains that systems and updates evolve; it is documentation of systems, not a promise of a ranking outcome.", source_title: "A Guide to Google Search Ranking Systems" },
  { id: "google-how-search-works", content: "Google Search works through crawling, indexing and serving results. Google does not guarantee crawling, indexing or serving even when Search Essentials are followed.", source_title: "In-depth Guide to How Google Search Works" },
  { id: "google-structured-data", content: "Google structured-data documentation explains how markup helps Search understand page content. Eligibility for a supported feature must be established from Google's feature documentation; vocabulary alone is not a guarantee of a rich result.", source_title: "Intro to Structured Data Markup" },
  { id: "bing-webmaster-guidelines", content: "Bing Webmaster guidance is a secondary search-engine perspective. It may corroborate durable search practices but cannot override Google-specific policy.", source_title: "Bing Webmaster Guidelines" },
  { id: "schema-org-docs", content: "Schema.org defines shared vocabulary types and properties for structured data. Vocabulary semantics do not establish support by a particular search engine.", source_title: "Schema.org Documentation" },
  { id: "w3c-wai-standards", content: "W3C WAI publishes accessibility standards and guidance for accessible web content. Accessibility guidance is a web standard and must not be represented as a direct Google ranking-factor claim.", source_title: "W3C WAI Standards and Guidelines" }
].map((source) => ({ ...source, retrieved_at: retrievedAt }));

export const streetKingzGuidanceSnapshot = createGuidanceSnapshot({ sources, retrievedAt });
