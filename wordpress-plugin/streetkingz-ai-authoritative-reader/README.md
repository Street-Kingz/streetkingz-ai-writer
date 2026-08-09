# Street Kingz AI Authoritative Reader

This isolated plugin registers one authenticated GET route:

`/wp-json/streetkingz-ai/v1/products/{id}/authoritative`

Activation creates the `streetkingz_ai_reader` role with only WordPress `read` and the custom `streetkingz_ai_read_product_source` capability. It does not assign the role to any user. A WordPress administrator must explicitly assign the dedicated AI Writer account to this role.

The endpoint rejects anonymous users, users lacking the custom capability, missing IDs, and non-product posts. It returns only allowlisted product fields and the fixed, allowlisted Elementor product template after verifying its product template type and Theme Builder conditions apply to the requested product. No template ID is accepted from the request. It contains no mutation routes or calls.

Version 1.1.1 normalises bounded PHP-serialized, JSON-array, nested-array and trailing-slash variants of Elementor product conditions. It supports only all-product or exact-product include/exclude rules; exclusions win and unknown formats or rules fail closed. Safe condition-shape diagnostics are returned to the authorised reader without exposing unrelated post meta.

Version 1.1.3 preserves the v1.1.2 authoritative contract and adds a route-scoped cache exclusion. The Reader marks authoritative REST requests non-cacheable before dispatch and emits explicit WordPress and LiteSpeed no-cache response directives, preventing an authenticated response from being replayed without the capability check. Existing cached objects must be purged once when deploying this fix.

Version 1.1.2 added the observed Elementor product-tag rule `include/product/in_product_tag/{term_id}` and its exclusion counterpart. It validates the numeric term in the `product_tag` taxonomy with WordPress `term_exists`, verifies object membership with `has_term`, treats matching exclusions as authoritative, and fails closed for unknown taxonomy conditions.
