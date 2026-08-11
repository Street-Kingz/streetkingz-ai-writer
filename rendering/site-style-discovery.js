import { contrastRatio, validateSiteStyleProfile } from "./site-style-profile.js";
import { DEFAULT_SITE_STYLE_PROFILE } from "./site-style-profile.js";
import { canonicalJson, sha256 } from "../research/core/canonical.js";

export const SITE_DISCOVERY_VERSION = "1.0.0";
const hexes = (text) => [...text.matchAll(/#[0-9a-f]{6}\b/gi)].map((match) => match[0].toLowerCase());
const count = (values) => Object.entries(values.reduce((acc, value) => { acc[value] = (acc[value] || 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
const lum = (value) => { const ratio = contrastRatio(value, "#000000"); return ratio === null ? null : ratio; };
const isDark = (value) => { const ratio = lum(value); return ratio !== null && ratio < 3; };
const isLight = (value) => { const ratio = lum(value); return ratio !== null && ratio > 15; };
const cssValues = (styles, property) => [...styles.matchAll(new RegExp(`${property}\\s*:\\s*([^;}]*)`, "gi"))].map((match) => match[1].trim());
const confidence = (support, total) => support >= 3 ? "high" : support >= 2 ? "medium" : total ? "low" : "unknown";

export function extractSiteDiscoveryObservation({ url, page_type = "unknown", html = "", stylesheets = [] }) {
  const styles = stylesheets.join("\n"); const combined = `${html}\n${styles}`;
  const colors = count(hexes(combined)); const fonts = count([...combined.matchAll(/font-family\s*:\s*['"]?([^,'";}]+)/gi)].map((match) => match[1].trim())); const fontImports = [...combined.matchAll(/@import\s+url\(['"]?([^)'"\s]+)['"]?\)/gi)].map((match) => match[1]).filter(Boolean);
  const radii = count(cssValues(styles, "border-radius")); const shadows = count(cssValues(styles, "box-shadow"));
  const widths = cssValues(styles, "max-width").filter((value) => /\d/.test(value)); const paddings = cssValues(styles, "padding").filter((value) => /\d/.test(value));
  const mediaQueries = (styles.match(/@media\s*\([^)]*\)/gi) || []).length; const images = (html.match(/<img\b/gi) || []).length;
  const buttons = (html.match(/<(?:button|a)\b[^>]*class=[^>]*(?:button|cta|add_to_cart|add-to-cart)[^>]*>/gi) || []).length;
  const sections = (html.match(/<(?:section|main|header|footer)\b/gi) || []).length;
  const headings = { h1: (html.match(/<h1\b/gi) || []).length, h2: (html.match(/<h2\b/gi) || []).length, h3: (html.match(/<h3\b/gi) || []).length };
  const fullBleedSignals = (combined.match(/(?:full[-_ ]?width|stretched|width\s*:\s*100%|100vw)/gi) || []).length;
  const splitSignals = (combined.match(/(?:two[-_ ]column|split|columns|elementor-column)/gi) || []).length;
  const darkSections = (combined.match(/(?:background(?:-color)?\s*:\s*#(?:000000|111111)|dark|black)/gi) || []).length;
  const imageDominance = images && sections ? images / sections : images ? 1 : 0;
  const observation = {
    observation_version: SITE_DISCOVERY_VERSION, url, page_type, source_hash: sha256(html), evidence: { html_bytes: Buffer.byteLength(html), stylesheet_count: stylesheets.length, image_count: images, section_count: sections, heading_counts: headings },
    global_signals: { colors, fonts, font_imports: fontImports, radii, shadows, buttons, full_bleed_signals: fullBleedSignals, split_signals: splitSignals },
    geometry: { max_widths: widths, paddings, full_width_likelihood: fullBleedSignals ? "observed" : "uncertain", split_layout_likelihood: splitSignals ? "observed" : "uncertain" },
    surfaces: { dark_section_signals: darkSections, color_candidates: colors.slice(0, 12) },
    rhythm: { image_to_section_ratio: imageDominance, section_count: sections, spacing_values: paddings.slice(0, 12) },
    imagery: { count: images, dominant: imageDominance >= 0.3, full_bleed_signals: fullBleedSignals },
    responsive: { media_query_count: mediaQueries, responsive_evidence: mediaQueries ? "observed" : "unknown" }
  };
  return observation;
}

function dominant(observations, selector) { const values = observations.flatMap(selector).filter(Boolean); const result = count(values); return result[0]?.[0] || null; }
function dominantFont(observations) { const weighted = observations.flatMap((item) => item.global_signals.fonts.flatMap(([value, occurrences]) => Array(occurrences).fill(value))); return count(weighted)[0]?.[0] || null; }
function dominantFontImport(observations) { return count(observations.flatMap((item) => item.global_signals.font_imports || []))[0]?.[0] || null; }
function widest(values) { const clean = values.map((value) => value.match(/\d+(?:\.\d+)?(?:px|rem|%)/i)?.[0]).filter(Boolean); return clean.sort((a, b) => parseFloat(b) - parseFloat(a))[0] || null; }
function aggregateColors(observations) { return count(observations.flatMap((observation) => observation.global_signals.colors.map(([value, occurrences]) => Array(occurrences).fill(value)).flat())).slice(0, 20); }

export function discoverSiteStyleProfile({ site_id = null, pages = [], human_overrides = {} }) {
  if (!pages.length) return { artifact_type: "site_style_discovery", discovery_version: SITE_DISCOVERY_VERSION, status: "INSUFFICIENT_EVIDENCE", pages: [], profile: structuredClone(DEFAULT_SITE_STYLE_PROFILE), evidence: [], warnings: ["No representative pages supplied."] };
  const observations = pages.map((page) => page.observation || extractSiteDiscoveryObservation(page)); const colors = aggregateColors(observations); const dark = colors.find(([value]) => isDark(value))?.[0] || "#171717"; const light = colors.find(([value]) => isLight(value))?.[0] || "#ffffff";
  const accent = colors.find(([value]) => !isDark(value) && !isLight(value) && value !== "#ffffff")?.[0] || "#345678"; const font = dominantFont(observations) || DEFAULT_SITE_STYLE_PROFILE.typography.body; const condensed = /condensed|narrow/i.test(font); const fontFallback = condensed ? "'Arial Narrow', Arial, sans-serif" : "Arial, sans-serif";
  const maxWidth = widest(observations.flatMap((item) => item.geometry.max_widths)) || DEFAULT_SITE_STYLE_PROFILE.container.max_width; const fontImport = dominantFontImport(observations);
  const support = (predicate) => observations.filter(predicate).length; const globalConfidence = confidence(observations.length, observations.length);
  const profile = {
    ...structuredClone(DEFAULT_SITE_STYLE_PROFILE), profile_id: `${site_id || "discovered-site"}-style-v1`, profile_version: "1.0.0", site_id,
    theme_id: `${site_id || "discovered-site"}-theme-v1`, class_prefix: "discovered-editorial", container: { ...DEFAULT_SITE_STYLE_PROFILE.container, max_width: maxWidth }, typography: { ...DEFAULT_SITE_STYLE_PROFILE.typography, body: `${font}, ${fontFallback}`, heading: `${font}, ${fontFallback}`, primary_family: font, fallback_stack: fontFallback, font_availability: fontImport ? "stylesheet_reference" : "unverified", font_class: condensed ? "condensed_sans" : "sans", font_import: fontImport },
    surfaces: {
      page: { background: dark, text: light, text_muted: "#d6d6d6", heading: light, link: light, border: "#555555", accent, accent_text: light },
      surface: { background: light, text: dark, text_muted: "#666666", heading: dark, link: dark, border: "#dddddd", accent, accent_text: light },
      surface_alt: { background: "#f4f4f1", text: dark, text_muted: "#666666", heading: dark, link: dark, border: "#dddddd", accent, accent_text: light },
      surface_dark: { background: dark, text: light, text_muted: "#d6d6d6", heading: light, link: light, border: "#555555", accent, accent_text: light },
      surface_emphasis: { background: dark, text: light, text_muted: "#d6d6d6", heading: light, link: light, border: "#555555", accent, accent_text: light }
    },
    layout: { ...DEFAULT_SITE_STYLE_PROFILE.layout, page_canvas: observations.some((item) => item.geometry.full_width_likelihood === "observed") ? "full_width" : "contained", section_surface: observations.some((item) => item.geometry.full_width_likelihood === "observed") ? "full_width" : "contained", width_roles: { ...DEFAULT_SITE_STYLE_PROFILE.layout.width_roles } }, surface_assignment: { hero: "surface_emphasis", product_recommendation: "surface_dark" }, page_surface_role: "page", provenance: [], human_overrides
  };
  const evidence = [
    { rule: "dominant_colours", scope: "GLOBAL", observed: colors.slice(0, 5), supporting_urls: observations.map((item) => item.url), support_count: observations.length, confidence: globalConfidence },
    { rule: "font_family", scope: "GLOBAL", observed: font, supporting_urls: observations.map((item) => item.url), support_count: support((item) => item.global_signals.fonts.length > 0), confidence: confidence(support((item) => item.global_signals.fonts.length > 0), observations.length) },
    { rule: "full_width_composition", scope: "GLOBAL", observed: observations.some((item) => item.geometry.full_width_likelihood === "observed"), supporting_urls: observations.filter((item) => item.geometry.full_width_likelihood === "observed").map((item) => item.url), support_count: support((item) => item.geometry.full_width_likelihood === "observed"), confidence: confidence(support((item) => item.geometry.full_width_likelihood === "observed"), observations.length) },
    { rule: "page_type_geometry", scope: "PAGE_TYPE", observed: Object.fromEntries(observations.map((item) => [item.page_type, { full_width: item.geometry.full_width_likelihood, split: item.geometry.split_layout_likelihood }])), supporting_urls: observations.map((item) => item.url), support_count: observations.length, confidence: globalConfidence },
    { rule: "responsive_behaviour", scope: "GLOBAL", observed: observations.some((item) => item.responsive.media_query_count > 0), supporting_urls: observations.filter((item) => item.responsive.media_query_count > 0).map((item) => item.url), support_count: support((item) => item.responsive.media_query_count > 0), confidence: confidence(support((item) => item.responsive.media_query_count > 0), observations.length) }
  ];
  profile.design_grammar = {
    page_geometry: { canvas: observations.some((item) => item.geometry.full_width_likelihood === "observed") ? "full_width_sections" : "contained_canvas", max_content_width: maxWidth, confidence: evidence.find((item) => item.rule === "full_width_composition")?.confidence || "unknown" },
    section_geometry: { full_bleed: observations.some((item) => item.geometry.full_width_likelihood === "observed"), split_layout: observations.some((item) => item.geometry.split_layout_likelihood === "observed"), confidence: evidence.find((item) => item.rule === "page_type_geometry")?.confidence || "unknown" },
    visual_rhythm: { section_counts: observations.map((item) => ({ page_type: item.page_type, count: item.rhythm.section_count })), image_to_section_ratios: observations.map((item) => ({ page_type: item.page_type, ratio: item.rhythm.image_to_section_ratio })), spacing_samples: observations.flatMap((item) => item.rhythm.spacing_values).slice(0, 20) },
    image_behaviour: { dominant: observations.some((item) => item.imagery.dominant), full_bleed_signals: observations.reduce((sum, item) => sum + item.imagery.full_bleed_signals, 0), page_types: observations.map((item) => ({ page_type: item.page_type, count: item.imagery.count, dominant: item.imagery.dominant })) },
    responsive_behaviour: { evidence: observations.some((item) => item.responsive.media_query_count > 0) ? "observed" : "unknown", media_query_counts: observations.map((item) => ({ page_type: item.page_type, count: item.responsive.media_query_count })) },
    page_type_rules: Object.fromEntries(observations.map((item) => [item.page_type, { full_bleed: item.geometry.full_width_likelihood, split: item.geometry.split_layout_likelihood, image_dominance: item.imagery.dominant }]))
  };
  profile.discovery_evidence = evidence; profile.provenance = evidence.map((item) => ({ rule: item.rule, scope: item.scope, observed: item.observed, supporting_urls: item.supporting_urls, support_count: item.support_count, confidence: item.confidence })); const validation = validateSiteStyleProfile(profile); return { artifact_type: "site_style_discovery", discovery_version: SITE_DISCOVERY_VERSION, status: validation.status, pages: observations, profile, evidence, validation, profile_hash: sha256(canonicalJson(profile)) };
}
