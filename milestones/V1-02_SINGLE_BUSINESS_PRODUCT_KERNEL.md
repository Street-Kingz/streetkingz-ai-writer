# Milestone V1-02 — Single-Business Product Kernel

Status: Approved — Current
Roadmap milestone: V1-02
Milestone type: Product foundation
Decision owner: Ben
Implementation status: Authorised within this approved V1-02 contract only

## Objective

Create the minimum secure, durable customer foundation required for one account to connect one ecommerce business.

## Customer capability

A customer can create an account and establish one isolated business workspace with clear connection and data status.

This milestone is infrastructure only where that infrastructure directly enables this capability. It is not a general platform rebuild.

## Current repository basis

The existing repository is a Node 22 / Express application (`index.js`, `app.js`) with strong local evidence, provenance, controlled-call and contract-testing foundations. It has no Product account system, durable database, tenant model, session layer, customer API, queue or production deployment proof. JSON/Markdown files under `artifacts/` are experiment evidence, not Product persistence. The V1-02 architecture decision is proposed separately in `docs/architecture/V1-02_PRODUCT_KERNEL_ARCHITECTURE.md`.

## Required boundary

### Account

- one authenticated customer account;
- durable identity and secure session/authentication state;
- login/session renewal and logout;
- account deletion foundation.

The normal request path is: **Browser/customer → Supabase Auth → authenticated request carrying the user access token → Express → verified authenticated identity → caller/tenant-scoped data access**. The application Account record maps uniquely to the managed Supabase Auth user ID. Server authorization must verify the caller through the supported Supabase server/JWT mechanism (for example `getClaims()` or the appropriate caller-scoped server client); an unverified `getSession()` payload must never authorize access.

### Business

V1 permits exactly one account → one business.

The durable business record must contain only the minimum fields required by this contract: durable ID; owner/account relationship; business name; platform type/status; lifecycle/status; timestamps; and connection summary/status.

Database constraints, not only application JavaScript, must enforce one Account per Supabase Auth identity, a maximum of one Business per Account in V1, valid foreign-key ownership relationships and sensible uniqueness for one provider connection where applicable.

### Tenant isolation

Every customer-bound durable record is reachable only through the authenticated account/business boundary. Tenant isolation has two required layers: Express/server ownership validation and database-level Row Level Security (RLS) with explicit grants and ownership policies defined in migrations. RLS applies to Account, Business, Connection and customer-readable AuditEvent records where applicable. No route or service may trust a customer-supplied business ID without verifying ownership. A known business UUID must not grant access. Isolation must hold for normal API access, altered IDs, direct route parameters and malformed requests, and automated policy tests are required.

### Connections

Create a generic connection record/status foundation capable of later representing WooCommerce, Search Console and appropriate external evidence providers. V1-02 does not implement those connectors.

Connection state supports provider/type; status; consent state; connected/disconnected timestamps; health/error state; secret reference; last successful operation where relevant; and lifecycle timestamps.

### Secret handling

For future per-customer connector credentials, V1-02 proposes **Supabase Vault**. The Product Connection record stores only an opaque Vault secret reference/identifier; the credential remains encrypted at rest in Vault. Decrypted access is backend/privileged only. Anonymous/authenticated customer roles must not read Vault plaintext or decrypted views. Secrets must never be stored in browser/client state, returned by normal APIs, written to Product artefacts or logs. Supabase privileged keys, database administration credentials and deployment credentials remain deployment/environment secrets and are not customer Connection secrets. Disconnect/deletion must delete the Vault secret and clear the reference, using synthetic credentials in validation. If Vault cannot satisfy this bounded security/retention requirement, implementation stops for owner review rather than silently switching systems.

Privileged Supabase/server credentials bypass RLS and must not be the default database client for normal customer CRUD. Caller-scoped customer access must preserve the authenticated identity and respect RLS/tenant policies. Privileged administrative access is server-side only and limited to managed-auth deletion, secret lifecycle, migrations/maintenance or another explicitly approved system operation; every such action is bounded and auditable, never exposed to browser code, logged or placed in artefacts.

### Audit events

Persist bounded, effectively append-only audit events for account creation, business creation, connection creation, connection status changes, disconnection, business deletion requests and security-relevant failures. Customers cannot forge another tenant's event, edit historical events or delete another tenant's history. Each event includes actor, business/tenant where applicable, event type, timestamp, bounded safe metadata and a correlation/request ID where appropriate. Customer-readable events are RLS-protected; system-only events remain inaccessible to customers. This is an audit trail, not a generic analytics event system.

### Failure and support diagnostics

Provide stable error categories, correlation/request identifiers and bounded support-safe context. Sensitive payloads, credentials and tokens must never be logged.

### Disconnect and deletion foundations

Define and implement a predictable tested sequence: disable connections; delete customer connector secrets from Vault and clear references; delete or anonymise business-bound data according to a documented minimal retention policy; handle the Account record; and, for final deletion, delete the managed Supabase Auth identity. Provider-specific external revocation is outside V1-02, but the local credential lifecycle must be safe. Audit retention must be minimal, explicit and consistent with data minimisation; audit rows must not become a reason to retain PII indefinitely.

### Durable state

Account, business, connection and audit state must survive process restart. Local JSON artefacts are not sufficient Product persistence.

## Minimum domain model

### Account

`id`, managed-auth identity reference, managed identity/email reference as permitted, `status`, `created_at`, `updated_at`, deletion state/timestamps where required.

### Business

`id`, owner/account ID, `name`, ecommerce platform identifier/type, lifecycle/status, `created_at`, `updated_at`, connection summary/status.

### Connection

`id`, business ID, provider/type, status, consent state, secret reference, `connected_at`, `disconnected_at`, `last_success_at`, safe error state, `created_at`, `updated_at`.

### AuditEvent

`id`, actor/account reference, business reference where applicable, event type, correlation ID, bounded safe metadata, `created_at`.

No organisation, role, team, multi-business or speculative future fields are introduced by this milestone.

## Exact acceptance criteria

V1-02 is complete only when all applicable criteria pass:

1. Two synthetic customer accounts authenticate independently.
2. Each receives an isolated durable account identity.
3. Each can create exactly one business.
4. A second business for one account is rejected cleanly.
5. Account A cannot read Account B's business.
6. Account A cannot update or mutate Account B's business.
7. Account A cannot access Account B's connections.
8. Account A cannot access Account B's audit records.
9. Guessing IDs, altered route parameters and malformed requests do not bypass isolation.
10. Account, business, connection and audit state survives application restart.
11. A connection record can be created and transitioned without implementing a real commerce/search connector.
12. Connection status and consent transitions are validated, including disconnect/inactive state.
13. Secret material is never returned to a client.
14. Secret material is absent from logs, public artefacts and normal durable Product responses.
15. Synthetic secret deletion/disconnect behavior is proven.
16. Audit events are durable, bounded and tenant scoped.
17. Account/business deletion foundations behave predictably and preserve safe audit semantics.
18. Stable error categories and correlation diagnostics work without sensitive payloads.
19. Database migrations are reproducible from a clean environment.
20. Local development, integration tests and synthetic tenant-isolation tests are documented and reproducible.
21. No V1-03 connector capability has been accidentally built.
22. No team, multi-business or agency capability exists.
23. Applicable security, privacy, account and data-connector Definition-of-Done gates pass.
24. Full `npm test` remains green.
25. No Critical or High defect remains.

Tenant isolation is a hard completion gate; a failure blocks completion regardless of other passing criteria.

## Required future validation evidence

Implementation must eventually produce under `artifacts/validation/v1-02/`:

- architecture decision and approved contract references;
- schema and migration verification;
- authentication proof;
- one-account/one-business proof;
- cross-tenant denial proof;
- connection-state proof;
- secret-handling proof;
- audit-event proof;
- disconnect/deletion proof;
- safe diagnostics proof;
- test report;
- security and sensitive-data scan;
- final milestone completion report.

No passing evidence is created by this contract task.

## Benchmark

The benchmark is: “A competent production SaaS foundation should safely isolate two independent customers and persist their business/connection state without exposing secrets.” Feature-count comparison with Shopify, Semrush or another Product is not a V1-02 benchmark.

## Explicit non-goals

V1-02 does not include WooCommerce ingestion; Search Console connection implementation; DataForSEO connection implementation; opportunity or recommendation generation; DIY recommendation UI; paid executor work; WordPress writes; Street Kingz recommendation implementation; billing, subscriptions or pricing; teams or additional users; multi-business accounts; agency workspaces; Shopify; GA4; a generic permissions/RBAC framework; enterprise SSO; a generic workflow engine; distributed microservices; Kubernetes; an event bus; a data warehouse; a generic secrets platform; refactoring old writer code unless directly required; repository rename; or Product naming.

## Dependencies and stop conditions

Implementation depends on owner approval of this contract and the proposed V1-02 architecture decision. Stop if managed auth, durable persistence, secret handling or tenant isolation cannot be established with least privilege; if a core rewrite or speculative infrastructure becomes necessary; if credentials or secrets would enter logs/artefacts; or if a connector, executor or customer-facing recommendation capability is pulled into scope.

## Completion decision

PASS authorises the next approved Product milestone only as stated by ROADMAP.md. Failure blocks progression and requires an explicit governance review. Approval of this contract does not approve V1-03, executor work or the Street Kingz recommendation.
