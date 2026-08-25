# One-Business Proof

Application routes handle the database uniqueness violation as `BUSINESS_LIMIT_REACHED`. The migration enforces `unique(account_id)` on Business.

Two concurrent Account requests for the same managed user serialized safely: one created the Account and one returned it, with no duplicate or raw database error. Repeated Account creation remained idempotent. Each customer created one Business; a second Business returned `BUSINESS_LIMIT_REACHED`, and a duplicate provider Connection returned `CONNECTION_EXISTS`.

Status: PASS — Product API behavior and database constraints verified against PostgreSQL 17.
