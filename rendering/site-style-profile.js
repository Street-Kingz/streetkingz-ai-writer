import { DEFAULT_THEME } from "./contracts.js";

export const SITE_STYLE_PROFILE_VERSION = "1.0.0";

export const DEFAULT_SITE_STYLE_PROFILE = Object.freeze({
  ...structuredClone(DEFAULT_THEME),
  profile_id: "default-neutral-v1",
  profile_version: SITE_STYLE_PROFILE_VERSION,
  site_id: null,
  provenance: [],
  human_overrides: {}
});

const hex = (value) => {
  if (typeof value !== "string" || !/^#[0-9a-f]{6}$/i.test(value)) return null;
  return [1, 3, 5].map((offset) => parseInt(value.slice(offset, offset + 2), 16) / 255);
};
const luminance = (value) => { const rgb = hex(value); if (!rgb) return null; return rgb.map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4).reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0); };
export function contrastRatio(foreground, background) { const first = luminance(foreground); const second = luminance(background); if (first === null || second === null) return null; const [light, dark] = first >= second ? [first, second] : [second, first]; return (light + 0.05) / (dark + 0.05); }

export function validateSiteStyleProfile(profile) {
  const errors = [];
  for (const key of ["profile_id", "profile_version", "theme_id", "class_prefix", "container", "typography", "colors", "shape", "breakpoints", "primitives"]) if (!profile?.[key]) errors.push(`Missing profile field: ${key}`);
  if (profile?.profile_version !== SITE_STYLE_PROFILE_VERSION) errors.push("Unsupported SiteStyleProfile version.");
  if (profile?.container && (!profile.container.reading_width || !profile.container.gutter)) errors.push("Container reading width and gutter are required.");
  if (profile?.colors && (!profile.colors.page || !profile.colors.ink || !profile.colors.accent)) errors.push("Page, ink and accent colours are required.");
  const typography = profile?.typography; if (typography) { if (!typography.body || !typography.heading) errors.push("Typography families are required."); if (typography.fallback_stack && /(^|[,\s])serif([,\s]|$)/i.test(typography.fallback_stack) && /condensed|narrow/i.test(`${typography.body} ${typography.heading}`)) errors.push("Condensed typography cannot use a serif fallback."); if (typography.font_availability === "unverified" && !typography.fallback_stack) errors.push("Unverified fonts require an explicit fallback stack."); }
  const surfaces = profile?.surfaces;
  for (const role of ["page", "surface", "surface_alt", "surface_dark", "surface_emphasis"]) {
    const surface = surfaces?.[role];
    if (!surface) { errors.push(`Missing surface role: ${role}`); continue; }
    for (const key of ["background", "text", "text_muted", "heading", "link", "border", "accent", "accent_text"]) if (!surface[key]) errors.push(`Missing ${role}.${key}`);
    for (const [name, foreground, minimum] of [["text", surface.text, 4.5], ["heading", surface.heading, 4.5], ["text_muted", surface.text_muted, 4.5], ["link", surface.link, 4.5]]) {
      const ratio = contrastRatio(foreground, surface.background); if (ratio === null || ratio < minimum) errors.push(`Insufficient contrast ${role}.${name}: ${ratio === null ? "invalid colour" : ratio.toFixed(2)}`);
    }
  }
  const cta = surfaces?.surface_dark; if (cta) { const ratio = contrastRatio(cta.accent_text, cta.accent); if (ratio === null || ratio < 4.5) errors.push(`Insufficient CTA contrast: ${ratio === null ? "invalid colour" : ratio.toFixed(2)}`); }
  return { status: errors.length ? "FAIL" : "PASS", errors };
}

export function createSiteStyleProfile(overrides = {}) {
  const profile = { ...structuredClone(DEFAULT_SITE_STYLE_PROFILE), ...structuredClone(overrides), profile_version: SITE_STYLE_PROFILE_VERSION };
  const validation = validateSiteStyleProfile(profile); if (validation.status === "FAIL") throw new Error(validation.errors.join("; "));
  return profile;
}
