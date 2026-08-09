# Street Kingz AI Guarded Writer

This plugin is deliberately bound to the explicit product 70/template 2003 approval packaged with it. It accepts no copy, product IDs, template IDs, widget IDs, fields, metadata or publication state from callers.

It creates the dedicated `streetkingz_ai_writer` role with exactly WordPress `read` plus `streetkingz_ai_write_approved_product_copy`. The role is never assigned to a user automatically, and the existing authoritative GET reader remains independent. `read` permits ordinary authenticated identity/Application Password use; it does not grant post, product, page, media, WooCommerce, plugin, theme, publication or administration rights.

Fresh activation creates the role. A versioned `init` migration also creates or reconciles it when an already-active v0.1.3 plugin is replaced, because WordPress does not rerun activation hooks in that case. The migration touches only this named role and stores its migration version; it never finds or modifies users. Deactivation and uninstall deliberately leave the role and user assignments intact to avoid surprise lockouts or account changes.

The dry-run and execute routes share all approval/current-state checks. Execute is locked unless a separate, explicitly user-authorised `execution-authorisation.json` is installed beside the plugin and its exact hash is supplied. That file is intentionally absent from the plugin ZIP, so deployment plus capability assignment cannot enable writes. A valid execution contract must be bound to the packaged approval hash, current-state hashes, approved-target hashes, product/template identity, execute mode, and a one-time execution ID.

Immediately before the first mutation, the plugin atomically claims a SHA-256-derived option name using one `INSERT IGNORE` against WordPress's persistent options table and its unique `option_name` constraint. Exactly one concurrent request can insert the claim. Claimed IDs are never deleted or made reusable. Their audit state advances from `claimed_executing` to either `succeeded` or `failed_after_claim`; failure to persist a final state still leaves the original claim permanently replay-blocked.

Execute additionally requires successful immutable rollback persistence before either write. Product writes contain only `ID`, `post_title`, and `post_excerpt`; Elementor writes use its document API with a parsed document whose only permitted target values are the packaged description and comparison values. Deployment and capability assignment remain separate from explicit live-write authorisation.
