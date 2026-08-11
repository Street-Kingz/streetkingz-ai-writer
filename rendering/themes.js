import { DEFAULT_SITE_STYLE_PROFILE, SITE_STYLE_PROFILE_VERSION } from "./site-style-profile.js";

export const STREET_KINGZ_THEME = Object.freeze({
  ...structuredClone(DEFAULT_SITE_STYLE_PROFILE),
  profile_id: "street-kingz-site-v1",
  profile_version: SITE_STYLE_PROFILE_VERSION,
  site_id: "streetkingz.co.uk",
  theme_id: "street-kingz-editorial-v2",
  class_prefix: "sk-editorial",
  container: { max_width: "72rem", reading_width: "50rem", gutter: "1.25rem" },
  typography: { body: "Arial, sans-serif", heading: "'Encode Sans Condensed', 'Arial Narrow', Arial, sans-serif", line_height: 1.6, font_import: "https://streetkingz.co.uk/wp-content/uploads/elementor/google-fonts/css/encodesanscondensed.css" },
  surfaces: {
    page: { background: "#000000", text: "#ffffff", text_muted: "#d6d6d6", heading: "#ffffff", link: "#ffffff", border: "#444444", accent: "#b81e0f", accent_text: "#ffffff" },
    surface: { background: "#ffffff", text: "#000000", text_muted: "#666666", heading: "#000000", link: "#8a1316", border: "#dddddd", accent: "#b81e0f", accent_text: "#ffffff" },
    surface_alt: { background: "#f7f7f7", text: "#000000", text_muted: "#666666", heading: "#000000", link: "#8a1316", border: "#dddddd", accent: "#b81e0f", accent_text: "#ffffff" },
    surface_dark: { background: "#000000", text: "#ffffff", text_muted: "#d6d6d6", heading: "#ffffff", link: "#ffffff", border: "#555555", accent: "#b81e0f", accent_text: "#ffffff" },
    surface_emphasis: { background: "#111111", text: "#ffffff", text_muted: "#d6d6d6", heading: "#ffffff", link: "#ffffff", border: "#444444", accent: "#b81e0f", accent_text: "#ffffff" }
  },
  surface_assignment: { hero: "surface_emphasis", quick_answer: "surface_alt", criteria_cards: "surface_alt", rich_text_section: "surface", product_recommendation: "surface_dark", key_takeaway: "surface_alt", faq: "surface_alt", conclusion: "surface" },
  page_surface_role: "page",
  colors: { page: "#ffffff", ink: "#000000", muted: "#666666", surface: "#f7f7f7", border: "#dddddd", accent: "#b81e0f", accent_dark: "#8a1316", accent_text: "#ffffff", dark: "#000000" },
  shape: { radius: "12px", shadow: "0 8px 24px rgba(0,0,0,.08)" },
  media: { product_images: { product_20fcada95c00204601928709: { url: "https://streetkingz.co.uk/wp-content/uploads/2025/11/1200gsm-Fold-scaled-.webp", alt: "Heavy Duty Drying Towel – 1200gsm" } } },
  provenance: [
    { source_url: "https://streetkingz.co.uk/", pattern: "black/white brand hierarchy, condensed display type, direct practical messaging and red action accents", confidence: "observed" },
    { source_url: "https://streetkingz.co.uk/product/heavy-duty-drying-towel-1200gsm/", pattern: "ecommerce product imagery, dark product feature treatment and rounded CTA language", confidence: "observed" }
  ],
  human_overrides: {}
});
