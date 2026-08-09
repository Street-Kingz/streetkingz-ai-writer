# Street Kingz AI Template 2003 Incident Recovery

Incident-only plugin for restoring the exact preserved `_elementor_data` raw value on post 2003. It exposes one fixed REST resource and cannot address another post or meta key.

Activation creates the role `streetkingz_ai_template_2003_recovery` with only `read` and `streetkingz_ai_recover_template_2003`. It never assigns that role to a user. Normal Writer credentials/capability are insufficient.

The clean package contains no contract, recovery ID, approval, credentials, or target data. A separately human-authorised runtime contract must bind the known current/target hashes and carry the exact preserved raw target. Installation reserves but does not claim its one-time recovery ID. Only `execute` atomically claims it.

Version 0.1.2 adds a separate non-executable validation manifest at the fixed `validation-manifest`, `validation/status`, and `validation/dry-run` resources. Validation state contains no recovery ID or human recovery approval, cannot be promoted, is mutually exclusive with an active production contract, and can only produce a zero-write dry-run. All validation and production Recovery resources are covered by route-scoped LiteSpeed no-cache enforcement.

The recovery write updates exactly the existing template-2003 `_elementor_data` row. It does not use Elementor `Document::save()`. It clears only post/meta caches for 2003 and requests bounded LiteSpeed purges for post 2003 and product 70. On verification failure, it restores the exact raw incident value captured immediately before claim.
