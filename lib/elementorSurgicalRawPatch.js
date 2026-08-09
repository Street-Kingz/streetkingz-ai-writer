import crypto from "node:crypto";

export const FIXED_TEMPLATE_ID = 2003;
export const FIXED_EDITOR_TARGETS = Object.freeze(["c80e718", "40869c27"]);

export function phpJsonString(value) {
  if (typeof value !== "string") throw new TypeError("Raw Elementor editor values must be strings.");
  const encoded = JSON.stringify(value).replaceAll("/", "\\/");
  let output = "";
  for (const character of encoded) {
    const point = character.codePointAt(0);
    if (point <= 0x7f) {
      output += character;
    } else if (point <= 0xffff) {
      output += `\\u${point.toString(16).padStart(4, "0")}`;
    } else {
      const adjusted = point - 0x10000;
      output += `\\u${(0xd800 + (adjusted >> 10)).toString(16)}\\u${(0xdc00 + (adjusted & 0x3ff)).toString(16)}`;
    }
  }
  return output;
}

export function locateAll(items, id, parents = [], output = []) {
  for (const item of items) {
    if (item?.id === id) output.push({ element: item, parents });
    locateAll(item?.elements || [], id, [...parents, item?.id], output);
  }
  return output;
}

export function patchFixedRawEditorToken(raw, id, oldValue, newValue) {
  if (!FIXED_EDITOR_TARGETS.includes(id)) throw Object.assign(new Error("RAW_PATCH_TARGET_FORBIDDEN"), { code: "RAW_PATCH_TARGET_FORBIDDEN" });
  const prefix = `"id":${phpJsonString(id)},"elType":"widget","settings":{"editor":`;
  const first = raw.indexOf(prefix);
  if (first < 0 || raw.indexOf(prefix, first + 1) >= 0) throw Object.assign(new Error("RAW_PATCH_ANCHOR_AMBIGUOUS"), { code: "RAW_PATCH_ANCHOR_AMBIGUOUS" });
  const start = first + prefix.length;
  const oldToken = phpJsonString(oldValue);
  const newToken = phpJsonString(newValue);
  if (raw.slice(start, start + oldToken.length) !== oldToken) throw Object.assign(new Error("RAW_PATCH_OLD_VALUE_MISMATCH"), { code: "RAW_PATCH_OLD_VALUE_MISMATCH" });
  if (![",", "}"].includes(raw[start + oldToken.length])) throw Object.assign(new Error("RAW_PATCH_BOUNDARY_INVALID"), { code: "RAW_PATCH_BOUNDARY_INVALID" });
  return {
    raw: raw.slice(0, start) + newToken + raw.slice(start + oldToken.length),
    span: { element_id: id, property: "settings.editor", start, old_token: oldToken, new_token: newToken, prefix_sha256: sha256(raw.slice(0, start)), suffix_sha256: sha256(raw.slice(start + oldToken.length)) },
  };
}

export function buildFixedSurgicalTemplate(raw, replacements) {
  const original = JSON.parse(raw);
  let patchedRaw = raw;
  const spans = [];
  for (const id of FIXED_EDITOR_TARGETS) {
    const matches = locateAll(original, id);
    if (matches.length !== 1 || typeof matches[0].element?.settings?.editor !== "string" || typeof replacements[id] !== "string") throw Object.assign(new Error("RAW_PATCH_TARGET_AMBIGUOUS"), { code: "RAW_PATCH_TARGET_AMBIGUOUS" });
    const result = patchFixedRawEditorToken(patchedRaw, id, matches[0].element.settings.editor, replacements[id]);
    patchedRaw = result.raw;
    spans.push(result.span);
  }
  const patched = JSON.parse(patchedRaw);
  const expected = structuredClone(original);
  for (const id of FIXED_EDITOR_TARGETS) locateAll(expected, id)[0].element.settings.editor = replacements[id];
  if (!isDeepStrictEqual(patched, expected)) throw Object.assign(new Error("RAW_PATCH_UNEXPECTED_DIFFERENCE"), { code: "RAW_PATCH_UNEXPECTED_DIFFERENCE" });
  return { raw: patchedRaw, parsed: patched, original, spans, raw_sha256: sha256(patchedRaw), unexpected_changed_paths: 0 };
}

function isDeepStrictEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object" || Array.isArray(a) !== Array.isArray(b)) return false;
  const aKeys = Object.keys(a), bKeys = Object.keys(b);
  return aKeys.length === bKeys.length && aKeys.every((key, index) => key === bKeys[index] && isDeepStrictEqual(a[key], b[key]));
}

export function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
