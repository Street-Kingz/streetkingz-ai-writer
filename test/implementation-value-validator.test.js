import test from "node:test";
import assert from "node:assert/strict";
import { validateImplementationCmsValue } from "../cms/implementationValueValidator.js";

const descriptionText = "Built for faster, easier vehicle drying, this Heavy Duty microfibre car drying towel uses a 1200GSM dual-layer, double-sided plush construction to pull water from paint with fewer passes and less contact. That helps reduce streaks, smears and unwanted marks, while the 90 × 60 cm size balances coverage with control.\nSuitable for cars, SUVs and vans—especially larger vehicles and heavy rinse-downs—it can be used on clean, shampooed paintwork, glass and exterior plastics.\nLay it flat, pat dry or glide it across even the wettest panels.";
const descriptionHtml = "<p>Built for faster, easier vehicle drying, this Heavy Duty microfibre car drying towel uses a 1200GSM dual-layer, double-sided plush construction to pull water from paint with fewer passes and less contact. That helps reduce streaks, smears and unwanted marks, while the 90 × 60 cm size balances coverage with control.</p><p>Suitable for cars, SUVs and vans—especially larger vehicles and heavy rinse-downs—it can be used on clean, shampooed paintwork, glass and exterior plastics.</p><p>Lay it flat, pat dry or glide it across even the wettest panels.</p>";
const excerptItems = ["1200GSM dual-layer thickness", "Strong water-holding capacity, with a heavier feel once fully saturated", "Soft premium feel", "Suitable for paintwork when used correctly on a clean, shampooed surface", "Ideal for larger vehicles"];
const excerptHtml = `<ul class="a-unordered-list a-vertical a-spacing-mini">${excerptItems.map((item) => `<li>${item}</li>`).join("")}</ul>`;

test("corrected description and structured excerpt pass semantic round trip", () => {
  assert.deepEqual(validateImplementationCmsValue({ html: descriptionHtml, intendedText: descriptionText, expectedStructure: { paragraphs: 3, lists: 0, items: 0 } }).errors, []);
  assert.deepEqual(validateImplementationCmsValue({ html: excerptHtml, intendedText: excerptItems.join("\n"), expectedStructure: { paragraphs: 0, lists: 1, items: 5 } }).errors, []);
});

test("previous description boundary defects are rejected", () => {
  for (const defective of [descriptionHtml.replace("control.</p><p>Suitable", "control.Suitable"), descriptionHtml.replace("plastics.</p><p>Lay", "plastics.Lay")]) {
    const result = validateImplementationCmsValue({ html: defective, intendedText: descriptionText, expectedStructure: { paragraphs: 3, lists: 0, items: 0 } });
    assert.equal(result.valid, false);
    assert.ok(result.errors.includes("CONCATENATED_SENTENCE_BOUNDARY"));
  }
});

test("concatenated list text, orphan closing tags and malformed lists are rejected", () => {
  for (const defective of [excerptHtml.replace("thickness</li><li>Strong", "thicknessStrong"), excerptHtml.replace("saturated</li><li>Soft", "saturatedSoft")]) {
    const result = validateImplementationCmsValue({ html: defective, intendedText: excerptItems.join("\n"), expectedStructure: { paragraphs: 0, lists: 1, items: 5 } });
    assert.equal(result.valid, false);
    assert.ok(result.errors.includes("CONCATENATED_WORD_BOUNDARY"));
  }
  assert.equal(validateImplementationCmsValue({ html: "Text</li>", intendedText: "Text", expectedStructure: { paragraphs: 0, lists: 0, items: 0 } }).valid, false);
  assert.equal(validateImplementationCmsValue({ html: "<ul><li>One<li>Two</li></ul>", intendedText: "One\nTwo", expectedStructure: { paragraphs: 0, lists: 1, items: 2 } }).valid, false);
});

test("ordinary legitimate inline HTML remains accepted", () => {
  const result = validateImplementationCmsValue({ html: "<p>Soft <strong>microfibre</strong> towel with <em>1200GSM</em> construction.</p>", intendedText: "Soft microfibre towel with 1200GSM construction.", expectedStructure: { paragraphs: 1, lists: 0, items: 0 } });
  assert.deepEqual(result.errors, []);
});
