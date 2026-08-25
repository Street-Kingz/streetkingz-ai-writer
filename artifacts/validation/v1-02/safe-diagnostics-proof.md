# Safe Diagnostics Proof

Product requests receive correlation IDs and bounded error categories. Internal errors do not serialize stack traces, credentials, SQL, JWTs or provider payloads.

Server-generated UUID correlation IDs ignore caller-supplied values. Malformed Product JSON receives the Product error shape. A controlled raw PostgreSQL permission failure returned only `INTERNAL_ERROR` and a generic message; no code/message/detail/hint leaked. Deliberate ProductErrors retain approved stable codes/statuses.

Status: PASS — unit and real malformed/error-redaction proof.
