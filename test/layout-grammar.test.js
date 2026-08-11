import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_THEME } from "../rendering/contracts.js";
import { renderSemanticPageHtml, renderStreetKingzEditorialCss } from "../rendering/html.js";
import { DEFAULT_SITE_STYLE_PROFILE, validateSiteStyleProfile } from "../rendering/site-style-profile.js";

const page = { h1: "Example", introduction_deck: "Intro", components: [{ component_id: "wide", component_type: "criteria_cards", data: { heading: "Criteria", cards: [{ title: "One", explanation: "Text" }] } }, { component_id: "read", component_type: "rich_text_section", data: { heading: "Reading", paragraphs: ["Text"] } }] };
const allowlists = { products: [], internal_links: [] };

test("page canvas, section surface, site container and reading width are independent", () => {
  const theme = structuredClone(DEFAULT_THEME); theme.layout = { ...theme.layout, page_canvas: "full_width", section_surface: "full_width" }; theme.container = { max_width: "70rem", reading_width: "42rem", gutter: "1rem" };
  const html = renderSemanticPageHtml(page, { theme, allowlists }); const css = renderStreetKingzEditorialCss(theme);
  assert.match(html, /data-width-role="wide"/); assert.match(html, /data-width-role="reading"/); assert.match(css, /width:100%;max-width:100%/); assert.match(css, /max-width:70rem/); assert.match(css, /max-width:42rem/); assert.match(css, /html,body\{margin:0;padding:0/);
});

test("synthetic contained profile produces different geometry without domain logic", () => {
  const theme = structuredClone(DEFAULT_THEME); theme.layout = { ...theme.layout, page_canvas: "contained", section_surface: "contained" }; theme.container = { max_width: "52rem", reading_width: "46rem", gutter: "2rem" }; const css = renderStreetKingzEditorialCss(theme);
  assert.match(css, /max-width:52rem/); assert.match(css, /max-width:46rem/); assert.doesNotMatch(css, /streetkingz/i);
});

test("condensed unverified typography has an explicit non-serif fallback", () => {
  const theme = structuredClone(DEFAULT_SITE_STYLE_PROFILE); theme.typography = { ...theme.typography, body: "Example Condensed, Arial Narrow, Arial, sans-serif", heading: "Example Condensed, Arial Narrow, Arial, sans-serif", primary_family: "Example Condensed", fallback_stack: "Arial Narrow, Arial, sans-serif", font_availability: "unverified" }; assert.equal(validateSiteStyleProfile(theme).status, "PASS"); const css = renderStreetKingzEditorialCss(theme); assert.match(css, /Arial Narrow/); assert.doesNotMatch(css, /,\s*serif(?:[,;}])/);
});
