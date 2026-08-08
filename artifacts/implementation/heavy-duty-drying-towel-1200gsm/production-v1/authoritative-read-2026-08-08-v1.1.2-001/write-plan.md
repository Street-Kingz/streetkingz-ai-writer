# Authoritative CMS Field-Level Write Plan

Approval state: **awaiting_human_implementation_approval**

Product/post ID: **70**

No WordPress write or publication operation was performed.

## Title / H1

- Source: `wp_posts.post_title`
- Status: **SAFE_TO_WRITE_AFTER_HUMAN_APPROVAL**
- Operation: `replace_field`
- Authoritative current-value hash: `70d2740df079f126b15fac1a79dbb579accf5cc9b3b8c0f69f2ab8d89496326a`

### Exact authoritative current value / rollback source

> Heavy Duty Drying Towel - 1200gsm

### Approved candidate

> Heavy Duty Car Drying Towel – 1200GSM

### Content that survives

- post_name/slug
- all unrelated fields

### Content that would be removed or omitted

- Heavy Duty Drying Towel - 1200gsm

Reason: Raw post_title is authoritative and the slug remains explicitly excluded.

## Product description

- Source: `wp_postmeta._elementor_data#c80e718.settings.editor`
- Status: **REQUIRES_HUMAN_COPY_MERGE**
- Operation: `human_merge_then_patch_property`
- Authoritative current-value hash: `72f9f609c59de983f61e8305d6cea67d8ae07d5743ca77e0d0efcd5fea2169b7`

### Exact authoritative current value / rollback source

> <p data-start="228" data-end="540">This Heavy Duty Drying Towel uses an ultra-dense 1200GSM dual-sided microfibre blend designed to pull water off the paint with almost no effort. Each pass removes a huge amount of water, making it ideal for larger vehicles, heavy rinse-downs, or anyone who wants the quickest, easiest drying experience possible.</p><p data-start="542" data-end="747">The 90 × 60 cm size offers excellent control while still covering large areas, meaning fewer passes, faster drying, and less contact with the paint — helping to prevent streaks, smears, and unwanted marks.</p><p data-start="749" data-end="992">Its double-sided plush construction holds a serious amount of water while staying soft, gentle, and manageable. Whether you prefer to lay it flat, pat dry, or glide it across the surface, this towel makes light work of even the wettest panels.</p>

### Approved candidate

> Built for faster, easier vehicle drying, this heavy-duty microfibre towel uses a 1200GSM dual-layer, double-sided plush construction to pull water from paint with fewer passes and less contact. That helps reduce streaks, smears and unwanted marks. Suitable for cars, SUVs and vans, it can be used on clean, shampooed paintwork, glass and exterior plastics.

### Content that survives

- all unrelated Elementor elements
- This Heavy Duty Drying Towel uses an ultra-dense 1200GSM dual-sided microfibre blend designed to pull water off the paint with almost no effort. Each pass removes a huge amount of water, making it ideal for larger vehicles, heavy rinse-downs, or anyone who wants the quickest, easiest drying experience possible.
- The 90 × 60 cm size offers excellent control while still covering large areas, meaning fewer passes, faster drying, and less contact with the paint — helping to prevent streaks, smears, and unwanted marks.
- Its double-sided plush construction holds a serious amount of water while staying soft, gentle, and manageable. Whether you prefer to lay it flat, pat dry, or glide it across the surface, this towel makes light work of even the wettest panels.

### Content that would be removed or omitted

- 90 × 60 cm sizing/control
- heavy-rinse positioning
- lay/pat/glide usage
- wettest-panels wording

Reason: The approved candidate omits useful concepts present in the authoritative widget.

## Comparison

- Source: `wp_postmeta._elementor_data#40869c27.settings.editor`
- Status: **SAFE_TO_WRITE_AFTER_HUMAN_APPROVAL**
- Operation: `patch_property`
- Authoritative current-value hash: `019780f33556ba09df132a4a92e473f2523fe41615c7f058916b96ebec31ba07`

### Exact authoritative current value / rollback source

> <p data-start="2442" data-end="2667">The Heavy Duty towel is thicker at 1200GSM and double-sided, so it holds more water and feels more substantial in the hand. The XL 800GSM towel is larger in size but lighter in feel, so it glides a bit easier. It mainly comes down to whether you prefer a lighter, larger towel or a smaller, heavier one.</p>

### Approved candidate

> Choose the Heavy Duty 1200GSM if you prefer a thicker, double-sided towel that is smaller, heavier and more substantial in the hand. Choose the XL 800GSM if you prefer a larger, lighter towel that glides more easily.

### Content that survives

- accordion 4691e088
- FAQ question
- all other accordion items

### Content that would be removed or omitted

- The Heavy Duty towel is thicker at 1200GSM and double-sided, so it holds more water and feels more substantial in the hand. The XL 800GSM towel is larger in size but lighter in feel, so it glides a bit easier. It mainly comes down to whether you prefer a lighter, larger towel or a smaller, heavier one.

Reason: Only the exact comparison answer widget property needs replacement.

## Clarity / trust

- Source: `wp_posts.post_excerpt`
- Status: **REQUIRES_HUMAN_CHANGE**
- Operation: `partial_replace_excerpt_items`
- Authoritative current-value hash: `42403585f01631a26e0ab3139ad11ad40874882d46dc70a94e756fc24e653675`

### Exact authoritative current value / rollback source

> <ul class="a-unordered-list a-vertical a-spacing-mini">
>  	<li>1200GSM dual layer thickness</li>
>  	<li>Extreme absorbency</li>
>  	<li>Soft premium feel</li>
>  	<li>Safe on all paint</li>
>  	<li>Ideal for larger vehicles</li>
> </ul>

### Approved candidate

> Strong water-holding capacity, with a heavier feel once fully saturated. Suitable for paintwork when used correctly on a clean, shampooed surface.

### Content that survives

- 1200GSM dual layer thickness
- Soft premium feel
- Ideal for larger vehicles
- Detailed safety widget 43d7d6f0: No, not when used correctly. The plush 1200GSM fibres are very soft and are designed to glide over the surface with minimal pressure. As always, only use it on clean, shampooed paint.

### Content that would be removed or omitted

- Extreme absorbency
- Safe on all paint

Reason: The raw excerpt contains additional useful list items which must survive a bounded partial replacement.


## Drift guards

1. Require live-page hash `a5db743344a3c3bd732fa0acddb20df1bbe9a4097d9ba1f9070264e1f93b8c5f` immediately before writing.
2. Require every authoritative CMS raw-value hash recorded in the mapping artifact.
3. On any mismatch, stop and reverify.
4. Preserve the complete original `_elementor_data` and field values for rollback.

## Explicitly blocked

- slug
- metadata
- schema
- layout
- images
- pricing
- inventory
- product_attributes
- specifications
- care_usage
- internal_links
- additional_faqs
- differentiation
