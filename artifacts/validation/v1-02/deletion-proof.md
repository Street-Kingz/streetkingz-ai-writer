# Deletion Proof

Deletion first marks the Account and its existing Business `deletion_requested` and writes both request audits in one transaction. Retry does not duplicate those events. In V1-02 Business deletion is account-deletion-bound; there is no standalone “delete Business but retain Account” workflow. Privileged bounded cleanup idempotently removes Vault/Business/Connection state, marks the Account `deleted`, and audits cleanup before managed Auth deletion. Non-active Accounts are rejected by ordinary Business, Connection and audit routes; only Account inspection and deletion retry remain available.

A controlled real Auth deletion failure left the Product Account safely `deleted` and non-operational with Business/Connection/Vault cleanup complete and safe failure evidence. After restoring Auth deletion, the same endpoint retried already-completed cleanup, removed the managed user, and reached final cascade semantics. Sign-in and refresh then failed.

Status: PASS — partial failure, non-active blocking, idempotent retry and final managed-identity deletion verified.
