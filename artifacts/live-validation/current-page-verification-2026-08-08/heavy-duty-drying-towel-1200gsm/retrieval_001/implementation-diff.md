# Proposed Product-Page Implementation Diff

State: awaiting human implementation approval

Verified content hash: `a5db743344a3c3bd732fa0acddb20df1bbe9a4097d9ba1f9070264e1f93b8c5f`

This is a deterministic mapping artifact. It does not modify the page, infer CMS field ownership or authorise publication.

## Title / H1

### Current live content

> Heavy Duty Drying Towel – 1200gsm

### Approved candidate

> Heavy Duty Car Drying Towel – 1200GSM

### Proposed operation

replace

### Reason

A unique rendered product H1 is identifiable.

### Evidence / approval provenance

- Final review SHA-256: `ae3068557451a6be6ceb25899b4583f091d17fe31e85751966045e55de74a880`
- Source generation SHA-256: `9b2edc8dfa2c8b9ab5c94bd4f4968b2df6a89186059036821f0f19ba3c34ccdc`
- Source locators: `h1[0]`

### Implementation notes

- Verify the WordPress field before writing.
- Do not alter metadata or heading hierarchy.


## Product description

### Current live content

> This Heavy Duty Drying Towel uses an ultra-dense 1200GSM dual-sided microfibre blend designed to pull water off the paint with almost no effort. Each pass removes a huge amount of water, making it ideal for larger vehicles, heavy rinse-downs, or anyone who wants the quickest, easiest drying experience possible.
>
> The 90 × 60 cm size offers excellent control while still covering large areas, meaning fewer passes, faster drying, and less contact with the paint — helping to prevent streaks, smears, and unwanted marks.
>
> Its double-sided plush construction holds a serious amount of water while staying soft, gentle, and manageable. Whether you prefer to lay it flat, pat dry, or glide it across the surface, this towel makes light work of even the wettest panels.

### Approved candidate

> Built for faster, easier vehicle drying, this heavy-duty microfibre towel uses a 1200GSM dual-layer, double-sided plush construction to pull water from paint with fewer passes and less contact. That helps reduce streaks, smears and unwanted marks. Suitable for cars, SUVs and vans, it can be used on clean, shampooed paintwork, glass and exterior plastics.

### Proposed operation

requires_cms_field_mapping

### Reason

Relevant rendered content is observable, but rendered HTML does not establish its CMS field boundaries.

### Evidence / approval provenance

- Final review SHA-256: `ae3068557451a6be6ceb25899b4583f091d17fe31e85751966045e55de74a880`
- Source generation SHA-256: `9b2edc8dfa2c8b9ab5c94bd4f4968b2df6a89186059036821f0f19ba3c34ccdc`
- Source locators: `section[h2="About this product"] p[0]`, `section[h2="About this product"] p[1]`, `section[h2="About this product"] p[2]`

### Implementation notes

- Map the exact CMS fields before replacing or consolidating content.
- Do not infer rendered section ordering or remove unrelated content.


## Comparison

### Current live content

> What’s the difference between this and the XL 800GSM Drying Towel?
> The Heavy Duty towel is thicker at 1200GSM and double-sided, so it holds more water and feels more substantial in the hand. The XL 800GSM towel is larger in size but lighter in feel, so it glides a bit easier. It mainly comes down to whether you prefer a lighter, larger towel or a smaller, heavier one.

### Approved candidate

> Choose the Heavy Duty 1200GSM if you prefer a thicker, double-sided towel that is smaller, heavier and more substantial in the hand. Choose the XL 800GSM if you prefer a larger, lighter towel that glides more easily.

### Proposed operation

replace

### Reason

One existing Heavy Duty / XL 800GSM FAQ comparison is identifiable for replacement or consolidation.

### Evidence / approval provenance

- Final review SHA-256: `ae3068557451a6be6ceb25899b4583f091d17fe31e85751966045e55de74a880`
- Source generation SHA-256: `9b2edc8dfa2c8b9ab5c94bd4f4968b2df6a89186059036821f0f19ba3c34ccdc`
- Source locators: `details[0]`

### Implementation notes

- Replace or consolidate the existing answer; never add a second comparison.
- Verify the FAQ CMS field before writing.


## Clarity / trust

### Current live content

> Extreme absorbency
>
> Safe on all paint

### Approved candidate

> Strong water-holding capacity, with a heavier feel once fully saturated. Suitable for paintwork when used correctly on a clean, shampooed surface.

### Proposed operation

requires_cms_field_mapping

### Reason

Current claim text is observable, but CMS field boundaries and nearby qualification placement are not established by rendered HTML.

### Evidence / approval provenance

- Final review SHA-256: `ae3068557451a6be6ceb25899b4583f091d17fe31e85751966045e55de74a880`
- Source generation SHA-256: `9b2edc8dfa2c8b9ab5c94bd4f4968b2df6a89186059036821f0f19ba3c34ccdc`
- Source locators: `li[9]`, `li[11]`

### Implementation notes

- Preserve useful existing safety FAQ guidance.
- Do not weaken correct-use or clean-paint qualifications.

### Existing content that must be preserved

> Will this towel scratch my paint?
> No, not when used correctly. The plush 1200GSM fibres are very soft and are designed to glide over the surface with minimal pressure. As always, only use it on clean, shampooed paint.


## Explicit exclusions

- No standalone differentiation implementation was produced because the final human decision rejected it.
- FAQ addition, metadata, specifications, care/usage and internal linking remain outside implementation scope.
- No WordPress field ownership, layout or publication action is inferred from rendered HTML.

## Drift guard

Immediately before any future write, retrieve the page and compare its content hash with `a5db743344a3c3bd732fa0acddb20df1bbe9a4097d9ba1f9070264e1f93b8c5f`. On mismatch: STOP and reverify.
