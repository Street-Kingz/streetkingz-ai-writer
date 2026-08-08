# Street Kingz AI Guarded Writer

This local-only plugin is deliberately bound to the explicit product 70/template 2003 approval packaged with it. It accepts no copy, product IDs, template IDs, widget IDs, fields, metadata or publication state from callers.

It introduces the separate `streetkingz_ai_write_approved_product_copy` capability but does not create a role or assign that capability. The existing authoritative GET reader remains independent.

The dry-run and execute routes share all approval/current-state checks. Execute is locked unless a separate, explicitly user-authorised `execution-authorisation.json` is installed beside the plugin and its exact hash is supplied. That file is intentionally absent from the plugin ZIP, so deployment plus capability assignment cannot enable writes. A valid execution contract must be bound to the packaged approval hash, current-state hashes, approved-target hashes, product/template identity, execute mode, and a one-time execution ID.

Execute additionally requires successful immutable rollback persistence before either write. Product writes contain only `ID`, `post_title`, and `post_excerpt`; Elementor writes use its document API with a parsed document whose only permitted target values are the packaged description and comparison values. Deployment and capability assignment remain separate from explicit live-write authorisation.
