# One-Business Proof

Application routes handle the database uniqueness violation as `BUSINESS_LIMIT_REACHED`. The migration enforces `unique(account_id)` on Business.

The real Product API created exactly one Business for each of two authenticated Accounts. A second Business request returned HTTP 409 with `BUSINESS_LIMIT_REACHED`. Invalid foreign-key ownership returned PostgreSQL `23503`, and invalid connection state returned `23514`.

Status: PASS — Product API behavior and database constraints verified against PostgreSQL 17.
