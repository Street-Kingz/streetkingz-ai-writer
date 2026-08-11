import { createSiteAdapter } from "./site-adapter.js";

// This configuration records only patterns evidenced by the captured public site.
// It does not claim that an editorial-native component exists where none was verified.
export const STREET_KINGZ_SITE_ADAPTER = createSiteAdapter({
  adapter_id: "street-kingz-wordpress-v1", site_id: "streetkingz.co.uk", cms: { platform: "wordpress", theme: "kadence", builder: "elementor", persistence: "not_implemented", writes: false },
  provenance: [
    { source_url: "https://streetkingz.co.uk/", observation: "Kadence site shell and global content/container patterns", confidence: "medium" },
    { source_url: "https://streetkingz.co.uk/product/heavy-duty-drying-towel-1200gsm/", observation: "WooCommerce product presentation and Elementor Theme Builder product template", confidence: "medium" }
  ],
  mappings: {
    hero: { state: "COMPOSED", target: "kadence-entry-hero-plus-responsive-media", confidence: "low" },
    quick_answer: { state: "NATIVE", target: "kadence-entry-content-callout", confidence: "low" },
    rich_text_section: { state: "NATIVE", target: "kadence-entry-content", confidence: "medium" },
    criteria_cards: { state: "FALLBACK", target: "generic-fallback-renderer", confidence: "none", notes: "No reusable editorial criteria pattern verified." },
    comparison_table: { state: "FALLBACK", target: "generic-fallback-renderer", confidence: "none" },
    product_recommendation: { state: "COMPOSED", target: "woocommerce-product-reference-plus-native-theme-content", confidence: "low" },
    product_comparison: { state: "FALLBACK", target: "generic-fallback-renderer", confidence: "none" },
    key_takeaway: { state: "COMPOSED", target: "kadence-entry-content-callout", confidence: "low" },
    faq: { state: "COMPOSED", target: "native-details-or-existing-accordion", confidence: "low" },
    conclusion: { state: "NATIVE", target: "kadence-entry-content", confidence: "medium" },
    call_to_action: { state: "COMPOSED", target: "native-theme-button", confidence: "low" },
    image_text: { state: "COMPOSED", target: "native-responsive-media-plus-content", confidence: "low" },
    related_guides: { state: "NATIVE", target: "kadence-entry-content-links", confidence: "low" }
  }
});

export const SYNTHETIC_SECOND_SITE_ADAPTER = createSiteAdapter({
  adapter_id: "synthetic-light-shop-v1", site_id: "example.test", cms: { platform: "generic-cms", persistence: "not_implemented", writes: false },
  mappings: {
    hero: { state: "NATIVE", target: "masthead-pattern", confidence: "high" },
    rich_text_section: { state: "NATIVE", target: "article-body", confidence: "high" },
    criteria_cards: { state: "COMPOSED", target: "comparison-grid", confidence: "medium" },
    product_recommendation: { state: "NATIVE", target: "simple-product-card", confidence: "high" },
    faq: { state: "UNSUPPORTED", confidence: "none" },
    call_to_action: { state: "NATIVE", target: "inline-link-cta", confidence: "high" }
  }
});
