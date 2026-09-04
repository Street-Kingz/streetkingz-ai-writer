# V1 Pre-Slice-A Security Hardening

Status: ACCEPTED. This gate was reviewed from the pre-hardening checkpoint
`7ac425b37d484c95c78c3a30c0ad389f5997b833`; implementation commit is
`c37f56eedcd97b4d2a9e74aeecb814bbcbe5eca8`. No external provider, Google, WooCommerce,
WordPress, or model calls were made.

## Route inventory

| Method/path | Class | Authentication / boundary | Side effect or cost | Production exposure |
|---|---|---|---|---|
| GET `/` | PUBLIC_SAFE | none; bounded health payload | none | enabled |
| `/api/product/account`, `/business`, `/connections`, `/audit-events` | AUTHENTICATED_PRODUCT | Bearer → verified Supabase identity → Account | bounded account/tenant reads and lifecycle RPCs | enabled |
| `/api/product/woocommerce/authorize`, `/verify`, `/status`, `/sync` | AUTHENTICATED_PRODUCT | same tenant auth and owned connection checks | OAuth setup, verification, or Woo sync | enabled; rate limited |
| `/api/product/woocommerce/callback`, `/return` | PROVIDER_CALLBACK | Woo attempt token/state and bounded callback payload; no Bearer required by protocol | callback state transition/verification | enabled; bounded parser |
| `/api/product/organic-evidence/*` | AUTHENTICATED_PRODUCT | Bearer and Business ownership | read-only status/snapshot or evidence acquisition | enabled; acquisition rate limited |
| `/api/product/organic-evidence/search-console/callback` | PROVIDER_CALLBACK | one-time state/PKCE attempt claim | OAuth callback and Vault staging | enabled; bounded query |
| `/internal/v1-03/*`, `/internal/v1-04/*` | INTERNAL_TEST_ONLY | explicit non-production flag plus loopback peer/host | local acceptance only | absent in production |
| `/generate-article`, `/workflows/create-seo-article` | LEGACY_DISABLED | explicit development flag plus loopback | legacy model/workflow work | absent in production |

The V1-04 acceptance module is not mounted by `app.js`; the V1-03 harness is
mounted only when `NODE_ENV` is non-production, its explicit flag is set, and
the loopback guard passes. Production cannot enable these routes with an
environment flag. OAuth callback exceptions retain their separate one-time
attempt/state/PKCE protections.

## Boundary controls

- Anonymous, invalid-token, and foreign-tenant protected requests remain denied
  by the existing Account → Business authentication boundary.
- Correlation middleware runs before CORS, rate limiting, body parsing and
  routers; IDs are reused when already present.
- Rate limits use `express-rate-limit` with standard headers: general Product
  API 120/60 seconds/IP; sensitive auth/connection/mutation 30/15 minutes/IP;
  expensive acquisition/refresh 10/hour/IP. A limit returns HTTP 429 with
  `RATE_LIMITED` and a correlation ID only.
- Express `trust proxy` is explicitly `false`; arbitrary forwarded headers do
  not select a new limiter identity. The current deployment assumption is one
  instance/local or a directly controlled proxy. A shared limiter is a future
  V1-11 deployment consideration for horizontal scale.
- CORS uses exact configured `PRODUCT_ALLOWED_ORIGINS`; wildcard and lookalike
  origins are denied. Missing Origin remains valid server-to-server behavior.
- Product JSON has a 64 KiB global bound; route-specific Woo parsers retain
  their narrower callback/request contracts. Malformed and oversized payloads
  return safe 400/413 responses.
- Product errors retain stable safe codes; unexpected errors return
  `INTERNAL_ERROR` with no stack, SQL, provider, path, token, or row details.
- Structured request logging contains event, correlation ID, method, safe route
  family, status and duration. Authorization, cookies, bodies, query strings,
  credentials and provider/database objects are excluded.

## Secrets and database posture

Secrets remain server/Vault-only. Tracked-file scanning found no tracked
credential files or high-confidence secret assignments; `.env.example` and
synthetic fixtures are allowlisted. Reachable Git history scan found no private
key or high-confidence provider-token match; secret rotation is not required.

The monotonic migration
`supabase/migrations/20260925000000_v1_security_hardening.sql` revokes default
anon/public table, sequence and routine access, keeps service-role execution,
and explicitly grants only the five authenticated Product lifecycle RPCs.
Local applied-schema assertions pass: 24 public tables, 0 tables without RLS,
0 unintended anon/public DML grants, 0 unintended authenticated direct writes,
0 unsafe SECURITY DEFINER grants, and 0 unsafe public views. All SECURITY
DEFINER functions use the established fixed empty search path. Permanent
assertions are in `supabase/tests/security-posture.sql`.

## Validation

- Focused security tests: 4 passed, including exact CORS, correlation, rate
  limiting/429, and loopback behavior.
- Full `npm test`: 1,130 passed, 0 failed, 21 pre-existing skips. No new
  required security test was skipped.
- Secret scanner: PASS; no values printed or retained.
- V1-05 corpus validator: unchanged and PASS; no fixture/hash/label changes.
- `git diff --check`: PASS.
- Normal local Supabase was not reset; accepted Account, Business, A/B/C
  evidence, and V1-05 corpus remain preserved.

Accepted limitations: rate limiting is single-instance memory-backed until a
future horizontal deployment requires a shared store; broader Helmet/CSP and
public-release browser headers remain outside this bounded API gate. Critical:
0. High: 0.
