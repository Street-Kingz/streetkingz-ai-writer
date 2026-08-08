# Street Kingz AI Authoritative Reader

This isolated plugin registers one authenticated GET route:

`/wp-json/streetkingz-ai/v1/products/{id}/authoritative`

Activation creates the `streetkingz_ai_reader` role with only WordPress `read` and the custom `streetkingz_ai_read_product_source` capability. It does not assign the role to any user. A WordPress administrator must explicitly assign the dedicated AI Writer account to this role.

The endpoint rejects anonymous users, users lacking the custom capability, missing IDs, and non-product posts. It returns only allowlisted product fields and the fixed, allowlisted Elementor product template after verifying its product template type and Theme Builder conditions apply to the requested product. No template ID is accepted from the request. It contains no mutation routes or calls.
