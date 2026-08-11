export const RENDERER_CONTRACT_VERSION = "1.0.0";

export const DEFAULT_THEME = Object.freeze({
  theme_id: "generic-editorial-v1",
  class_prefix: "editorial",
  container: { max_width: "72rem", reading_width: "48rem", gutter: "1.25rem" },
  layout: { page_canvas: "contained", section_surface: "contained", width_roles: { hero: "wide", quick_answer: "reading", criteria_cards: "wide", rich_text_section: "reading", product_recommendation: "wide", key_takeaway: "reading", faq: "reading", conclusion: "reading", image_text: "wide", comparison_table: "wide", product_comparison: "wide", call_to_action: "reading", related_guides: "reading" } },
  breakpoints: { mobile: "0-47.99rem", desktop: "48rem+" },
  typography: { body: "system-ui, sans-serif", heading: "system-ui, sans-serif", primary_family: "system-ui", fallback_stack: "sans-serif", font_availability: "system", font_class: "sans", line_height: 1.65, font_import: null },
  surfaces: {
    page: { background: "#ffffff", text: "#171717", text_muted: "#666666", heading: "#171717", link: "#171717", border: "#dddddd", accent: "#171717", accent_text: "#ffffff" },
    surface: { background: "#ffffff", text: "#171717", text_muted: "#666666", heading: "#171717", link: "#171717", border: "#dddddd", accent: "#171717", accent_text: "#ffffff" },
    surface_alt: { background: "#f4f4f1", text: "#171717", text_muted: "#666666", heading: "#171717", link: "#171717", border: "#dddddd", accent: "#171717", accent_text: "#ffffff" },
    surface_dark: { background: "#171717", text: "#ffffff", text_muted: "#dddddd", heading: "#ffffff", link: "#ffffff", border: "#666666", accent: "#171717", accent_text: "#ffffff" },
    surface_emphasis: { background: "#f4f4f1", text: "#171717", text_muted: "#666666", heading: "#171717", link: "#171717", border: "#dddddd", accent: "#171717", accent_text: "#ffffff" }
  },
  surface_assignment: {},
  colors: { page: "#ffffff", ink: "#171717", muted: "#666666", surface: "#f4f4f1", border: "#dddddd", accent: "#171717", accent_text: "#ffffff", dark: "#171717" },
  shape: { radius: "0.25rem", shadow: "none" },
  media: { product_images: {} },
  primitives: { section: "section", card: "article", callout: "aside", table: "table", faq: "details" }
});

export function createRendererContract(theme = DEFAULT_THEME) {
  return { renderer_contract_version: RENDERER_CONTRACT_VERSION, theme: structuredClone(theme), wordpress: { persistence: "not_implemented", writes: false, elementor_document_save: false } };
}
