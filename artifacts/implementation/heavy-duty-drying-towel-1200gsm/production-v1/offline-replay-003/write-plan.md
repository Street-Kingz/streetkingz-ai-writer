# Heavy Duty Drying Towel – CMS Field-Level Write Plan

Approval state: **awaiting_human_implementation_approval**

Product/post ID: **70**

No WordPress write or publication operation was performed.

## Title / H1

- **Product/post ID:** 70
- **CMS storage:** wp_posts.post_title
- **Mapping status:** SAFE_TO_WRITE_AFTER_HUMAN_APPROVAL
- **Proposed operation:** replace_field
- **Raw stored value available:** NO
- **Current-value hash:** `cab90254eb8700633239c7e848924783eb643a1136b42d75c8ee9653415ccbdb`

### Current rendered target

> Heavy Duty Drying Towel – 1200gsm

### Approved candidate

> Heavy Duty Car Drying Towel – 1200GSM

### Observed value (not a complete rollback source)

> Heavy Duty Drying Towel – 1200gsm

### Content that survives unchanged

- The field-level change must preserve all content outside the exact authorised target.

### Content that would be removed

- Only the exact current target quoted above.

### Implementation conditions

- Do not write unless the live page hash still equals `a5db743344a3c3bd732fa0acddb20df1bbe9a4097d9ba1f9070264e1f93b8c5f`.
- BLOCKED: capture the authoritative raw CMS value, its hash and its exact rollback value before writing.
- The rendered/view-context value above is diagnostic only and cannot serve as a lossless rollback source.
- The public product REST title matches the unique verified H1.

## Product description

- **Product/post ID:** 70
- **CMS storage:** elementor_rendered_widget.widget:c80e718:text-editor
- **Mapping status:** BLOCKED
- **Proposed operation:** requires_human_copy_merge
- **Raw stored value available:** NO
- **Current-value hash:** `92d491526ff3102eeec7c734264ac925bf909ed86b6406f00b5fdc5b458b0401`

### Current rendered target

> This Heavy Duty Drying Towel uses an ultra-dense 1200GSM dual-sided microfibre blend designed to pull water off the paint with almost no effort. Each pass removes a huge amount of water, making it ideal for larger vehicles, heavy rinse-downs, or anyone who wants the quickest, easiest drying experience possible.
> 
> The 90 × 60 cm size offers excellent control while still covering large areas, meaning fewer passes, faster drying, and less contact with the paint — helping to prevent streaks, smears, and unwanted marks.
> 
> Its double-sided plush construction holds a serious amount of water while staying soft, gentle, and manageable. Whether you prefer to lay it flat, pat dry, or glide it across the surface, this towel makes light work of even the wettest panels.

### Approved candidate

> Built for faster, easier vehicle drying, this heavy-duty microfibre towel uses a 1200GSM dual-layer, double-sided plush construction to pull water from paint with fewer passes and less contact. That helps reduce streaks, smears and unwanted marks. Suitable for cars, SUVs and vans, it can be used on clean, shampooed paintwork, glass and exterior plastics.

### Observed value (not a complete rollback source)

> This Heavy Duty Drying Towel uses an ultra-dense 1200GSM dual-sided microfibre blend designed to pull water off the paint with almost no effort. Each pass removes a huge amount of water, making it ideal for larger vehicles, heavy rinse-downs, or anyone who wants the quickest, easiest drying experience possible.
> 
> The 90 × 60 cm size offers excellent control while still covering large areas, meaning fewer passes, faster drying, and less contact with the paint — helping to prevent streaks, smears, and unwanted marks.
> 
> Its double-sided plush construction holds a serious amount of water while staying soft, gentle, and manageable. Whether you prefer to lay it flat, pat dry, or glide it across the surface, this towel makes light work of even the wettest panels.

### Content that survives unchanged

- How to use it section
- Tech Specs section
- FAQ section
- all unrelated post_content sections

### Content that would be removed

- This Heavy Duty Drying Towel uses an ultra-dense 1200GSM dual-sided microfibre blend designed to pull water off the paint with almost no effort. Each pass removes a huge amount of water, making it ideal for larger vehicles, heavy rinse-downs, or anyone who wants the quickest, easiest drying experience possible.
- The 90 × 60 cm size offers excellent control while still covering large areas, meaning fewer passes, faster drying, and less contact with the paint — helping to prevent streaks, smears, and unwanted marks.
- Its double-sided plush construction holds a serious amount of water while staying soft, gentle, and manageable. Whether you prefer to lay it flat, pat dry, or glide it across the surface, this towel makes light work of even the wettest panels.

### Implementation conditions

- Do not write unless the live page hash still equals `a5db743344a3c3bd732fa0acddb20df1bbe9a4097d9ba1f9070264e1f93b8c5f`.
- BLOCKED: capture the authoritative raw CMS value, its hash and its exact rollback value before writing.
- The rendered/view-context value above is diagnostic only and cannot serve as a lossless rollback source.
- All three live paragraphs render from one Elementor text widget, but its raw _elementor_data value is unavailable and the approved copy requires a human merge.

## Comparison

- **Product/post ID:** 70
- **CMS storage:** elementor_rendered_widget.nested-accordion:4691e088/answer-widget:40869c27
- **Mapping status:** BLOCKED
- **Proposed operation:** requires_raw_elementor_data
- **Raw stored value available:** NO
- **Current-value hash:** `92794eebd4cea5df6fbb577943794509a413d4fb2ad1ac2885c223ed8e1afcc5`

### Current rendered target

> What’s the difference between this and the XL 800GSM Drying Towel?
> The Heavy Duty towel is thicker at 1200GSM and double-sided, so it holds more water and feels more substantial in the hand. The XL 800GSM towel is larger in size but lighter in feel, so it glides a bit easier. It mainly comes down to whether you prefer a lighter, larger towel or a smaller, heavier one.

### Approved candidate

> Choose the Heavy Duty 1200GSM if you prefer a thicker, double-sided towel that is smaller, heavier and more substantial in the hand. Choose the XL 800GSM if you prefer a larger, lighter towel that glides more easily.

### Observed value (not a complete rollback source)

> What’s the difference between this and the XL 800GSM Drying Towel?
> The Heavy Duty towel is thicker at 1200GSM and double-sided, so it holds more water and feels more substantial in the hand. The XL 800GSM towel is larger in size but lighter in feel, so it glides a bit easier. It mainly comes down to whether you prefer a lighter, larger towel or a smaller, heavier one.

### Content that survives unchanged

- FAQ question
- all other FAQs
- all non-comparison post_content

### Content that would be removed

- The Heavy Duty towel is thicker at 1200GSM and double-sided, so it holds more water and feels more substantial in the hand. The XL 800GSM towel is larger in size but lighter in feel, so it glides a bit easier. It mainly comes down to whether you prefer a lighter, larger towel or a smaller, heavier one.

### Implementation conditions

- Do not write unless the live page hash still equals `a5db743344a3c3bd732fa0acddb20df1bbe9a4097d9ba1f9070264e1f93b8c5f`.
- BLOCKED: capture the authoritative raw CMS value, its hash and its exact rollback value before writing.
- The rendered/view-context value above is diagnostic only and cannot serve as a lossless rollback source.
- The unique comparison answer renders from an Elementor nested-accordion text widget, but raw _elementor_data is unavailable for a bounded replacement.

## Clarity / trust

- **Product/post ID:** 70
- **CMS storage:** wp_posts.post_excerpt
- **Mapping status:** BLOCKED
- **Proposed operation:** requires_raw_post_excerpt
- **Raw stored value available:** NO
- **Current-value hash:** `2b7a205a2f4e4eb4f29d0f4ac84b4e0e00b71d5d7def5e9327dd8c3d3c477f70`

### Current rendered target

> Extreme absorbency
> Safe on all paint

### Approved candidate

> Strong water-holding capacity, with a heavier feel once fully saturated. Suitable for paintwork when used correctly on a clean, shampooed surface.

### Observed value (not a complete rollback source)

> <ul class="a-unordered-list a-vertical a-spacing-mini">
> <li>1200GSM dual layer thickness</li>
> <li>Extreme absorbency</li>
> <li>Soft premium feel</li>
> <li>Safe on all paint</li>
> <li>Ideal for larger vehicles</li>
> </ul>
> 

### Content that survives unchanged

- 1200GSM dual layer thickness
- Soft premium feel
- Ideal for larger vehicles
- Will this towel scratch my paint?
No, not when used correctly. The plush 1200GSM fibres are very soft and are designed to glide over the surface with minimal pressure. As always, only use it on clean, shampooed paint.

### Content that would be removed

- Extreme absorbency
- Safe on all paint

### Implementation conditions

- Do not write unless the live page hash still equals `a5db743344a3c3bd732fa0acddb20df1bbe9a4097d9ba1f9070264e1f93b8c5f`.
- BLOCKED: capture the authoritative raw CMS value, its hash and its exact rollback value before writing.
- The rendered/view-context value above is diagnostic only and cannot serve as a lossless rollback source.
- The short claims or detailed safety guidance could not be mapped to separate CMS fields.


## Explicitly blocked fields and operations

- post_name
- metadata
- schema
- images
- pricing
- inventory
- product_attributes
- layout
- specifications
- care_usage
- internal_links
- additional_faqs
- differentiation

The product slug remains `heavy-duty-drying-towel-1200gsm` and no slug change is authorised.

## Drift and rollback contract

1. Retrieve the live page immediately before any future write and require its hash to equal `a5db743344a3c3bd732fa0acddb20df1bbe9a4097d9ba1f9070264e1f93b8c5f`.
2. First obtain the authoritative raw value for every target whose raw value is unavailable; no such target is write-eligible yet.
3. Read each target CMS field immediately before writing and require its raw-value hash to equal the authoritative recorded field hash.
4. On either mismatch, stop and reverify.
5. Preserve each exact raw CMS value as the rollback source.
6. A future write remains subject to separate human implementation approval and post-write verification.
