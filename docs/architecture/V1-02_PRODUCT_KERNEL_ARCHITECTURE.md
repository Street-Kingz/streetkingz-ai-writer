# V1-02 Product Kernel Architecture Decision

Status: Proposed — Owner Review Required
Decision register item: O-008 — Technical Architecture and Deployment Stack
Question: What is the minimum production-credible architecture required to support the V1 single-account / single-business Product kernel while preserving the existing useful Node foundations and avoiding speculative infrastructure?

This is a bounded proposal for owner review. O-008 remains formally unresolved until Ben/ChatGPT approve this document and a separate governance task records the decision.

## Existing-code assessment

| Area | Repository evidence | Assessment |
|---|---|---|
| Runtime | `package.json` uses ES modules; current environment is Node v22.18.0 / npm 10.9.3 | Continue Node. No runtime rewrite is justified. |
| HTTP/application | `index.js` starts Express; `app.js` registers health, legacy article and Create SEO Article routes; `routes/` contains route handlers | Continue Express as the transport foundation; add bounded Product routes later rather than replacing the shell. |
| Persistence | JSON/Markdown artefacts under `artifacts/`; `services/productExtraction.js` writes local evidence files | Reuse artefact discipline for proof only. It is not acceptable Product persistence. |
| Authentication | No account/session/authentication module exists | Add managed authentication; do not build password or session cryptography. |
| Configuration/secrets | `config/index.js` reads environment variables; `.env` is ignored; provider scripts use environment configuration | Preserve environment loading for server configuration. Customer/provider secrets require managed secret storage, never Product artefacts. |
| Providers | DataForSEO, Search Console, WooCommerce/WordPress readers and OpenAI/Gemini adapters exist as bounded provider contracts | Reuse provider boundaries later; V1-02 creates only generic connection state, not connectors. |
| Audit/provenance | `research/`, `product-intelligence/`, `business-intelligence/`, `interpretation/` and `generation/` provide hashes, evidence IDs, lineage and controlled call lifecycle artefacts | Reuse the fail-closed provenance discipline; create a durable Product audit-event store distinct from evidence provenance. |
| Jobs/call control | `interpretation/call-control.js` and bounded workflow runs provide immutable call lifecycle controls | Reuse the bounded lifecycle pattern conceptually. Do not build a queue or executor in V1-02. |
| Tests | `npm test` runs Node's built-in test runner; the verified full suite is 900/900 with localhost permission | Preserve Node test conventions and add synthetic integration/tenant tests. |
| Deployment | No Dockerfile, compose file, CI workflow or production deployment proof was found | Select a minimal managed deployment and document it; production proof is a V1-02 acceptance dependency. |

### Reuse boundary

The current Node/Express foundation should continue. Product account/business/connection routes can be added beside the legacy routes behind explicit V1-02 boundaries. Existing article, research, CMS and Street Kingz-specific modules remain legacy/reusable foundations; they are not rewritten or promoted to the Product kernel. Existing local artefacts remain proof inputs/outputs only.

## Approaches compared

Only three realistic approaches were considered.

| Criterion | A — Supabase Auth + Postgres, Render Node service (recommended) | B — Managed Postgres + Clerk/Auth0, Render Node service | C — Firebase Auth + Firestore, managed Node service |
|---|---|---|---|
| Managed authentication | Supabase Auth | Clerk/Auth0 | Firebase Auth |
| Durable relational/equivalent persistence | Managed Postgres | Managed Postgres | Firestore document store |
| Tenant isolation | Postgres foreign keys plus server ownership checks; RLS can provide defence in depth | Postgres foreign keys plus server ownership checks; provider identity in app | Security rules and document path discipline |
| Encrypted secret handling | Deployment secret store plus managed encrypted secret facility; DB stores references | Separate secret manager required | Separate secret manager required; client SDK risks must be tightly constrained |
| Audit persistence | Relational append-only table | Relational append-only table | Collection with rules and retention discipline |
| Migrations | SQL migrations | SQL migrations | Rules/index/document migrations are less relationally explicit |
| Local development/testing | Local Supabase/Postgres-compatible workflow plus Node tests | Local Postgres plus mocked/hosted auth test boundary | Emulator suite plus document-rule tests |
| Deployment | Existing Node/Express service on Render or equivalent managed service | Same | Managed Node runtime plus Firebase services |
| Backups/recovery | Managed Postgres backup/recovery plan | Managed Postgres backup/recovery plan | Managed service recovery plan |
| Solo-founder burden/cost | One integrated auth/database boundary; moderate vendor dependence | More vendor/account/operational boundaries | Low initial setup, but document modelling/security rules add complexity |
| Migration from current repo | Additive Node routes and SQL schema; no framework rewrite | Additive Node routes and SQL schema | Additive routes but new document model and rule model |
| Node/Express compatibility | Direct | Direct | Direct through server SDK |
| Later connectors/jobs | Relational connection/job state fits | Relational connection/job state fits | Possible, but relational reporting/tenant joins require more modelling |
| Least privilege | Server-side service role, tenant checks/RLS, no browser database access | Server-side DB and auth verification, separate privilege boundaries | Rules plus server SDK; misconfigured rules are high risk |

Provider names are a proposal, not an owner-approved commitment. Pricing, regional availability, exact encryption facilities, backup retention and contractual terms require verification before implementation.

## Recommendation

Select **Approach A: existing Node/Express application + managed Supabase Auth and managed Postgres, deployed as a small managed Node service such as Render, with the deployment provider's secret store and/or the approved managed encrypted secret facility for customer credentials**.

### Why this approach

- preserves the working Node/Express foundation and existing test conventions;
- provides managed identity and relational durable state without building authentication or a database service;
- makes one-account/one-business tenancy explicit through foreign keys, ownership checks and defence-in-depth database policies;
- supports durable connection and audit records needed by later read-only connectors;
- keeps local development and synthetic tenant tests straightforward;
- avoids a framework rewrite, bespoke cryptography, distributed services and a generic platform build.

This is the minimum credible shape, not a claim that production is ready today.

## Runtime/application

Continue Node/Express. Add a bounded Product application boundary, request correlation middleware, authenticated route middleware, repository/service modules and validation without deleting or refactoring legacy writer routes. No frontend is required by V1-02.

## Authentication, request and identity model

Use managed Supabase Auth for customer identity and secure session lifecycle. The normal request path is **Browser/customer → Supabase Auth → authenticated request carrying the user access token → Express → verified authenticated identity → caller/tenant-scoped data access**. The application Account row maps uniquely to the Supabase Auth user ID. Server authorization must use the supported Supabase server/JWT verification path, such as `getClaims()` or the appropriate caller-scoped Supabase server mechanism; an unverified `getSession()` payload must never make an authorization decision. Passwords and refresh tokens are never handled as application-owned plaintext fields.

## Persistence and migrations

Use managed Postgres as the system of record. Add a migration directory and a small schema for Account, Business, Connection and AuditEvent. Migrations must run from a clean database in local/test and deployment environments. Database constraints must enforce one Account per Supabase Auth identity, a maximum of one Business per Account in V1, valid foreign-key ownership and sensible uniqueness for one provider connection where applicable.

## Tenant model

```text
Managed Auth Identity
        |
      Account (1)
        |
      Business (exactly 1 in V1)
        |
  Connections / AuditEvents
```

Every customer-bound record carries or derives a Business/Account boundary. The service resolves the verified authenticated account first, then the owned business, and rejects mismatches before reading or mutating child records. No route accepts an unverified business ID as authority. RLS is mandatory defence-in-depth for Account, Business, Connection and customer-readable AuditEvent tables: migrations define explicit grants and ownership policies, and automated policy tests accompany server ownership tests. A customer knowing another business UUID cannot gain access.

## Secret storage and privileged-key boundary

For future per-customer connector credentials, select **Supabase Vault** subject to owner verification of the exact Vault encryption, access and retention behavior. The Connection row stores only an opaque Vault secret reference/identifier; the actual credential is encrypted at rest in Vault. Decrypted access is backend/privileged only. Anonymous/authenticated customer roles must not read Vault plaintext or decrypted views. Disconnect/deletion deletes the Vault secret and clears the reference. Supabase privileged keys, database administration credentials and deployment credentials remain deployment/environment secrets and are never stored as customer Connection secrets. Synthetic credentials are used in tests; real provider connectors are V1-03+ work.

Supabase privileged/server credentials bypass RLS. They are never the default database client for normal customer CRUD and are never exposed to browser code, logged or placed in artefacts. Normal customer operations use caller-scoped access preserving the authenticated identity and tenant policies/RLS. Privileged administrative access is server-side only for managed-auth account deletion, Vault secret lifecycle, migrations/operational maintenance or another explicitly approved system operation. Each privileged action is bounded and auditable and must not be used merely to avoid writing correct tenant policies. If Supabase Vault is unsuitable for this bounded use, stop for owner review rather than silently selecting another secret system.

## Audit events and diagnostics

Use an append-oriented, effectively append-only `AuditEvent` table with bounded metadata and retention/deletion rules aligned to the account/business lifecycle. RLS protects customer-readable events; normal customer operations cannot forge another tenant's event, edit historical events or delete another tenant's history. Authentication/security middleware creates a request/correlation ID. Responses expose the correlation ID and stable error category only. Logs contain event category and correlation ID, not request bodies, tokens, secrets or raw provider responses. This is not a general analytics/event framework.

## Jobs and future execution

V1-02 does not need a queue or generic workflow engine. It should leave connection status and audit state compatible with later bounded background jobs. A later milestone may select a managed job mechanism after the data-connection and recommendation contracts are known. No executor infrastructure is authorised here.

## Deployment

Deploy the existing Node service as one small managed web service with HTTPS, environment-level configuration, managed database connectivity, health checks and restricted production credentials. The deployment shape is decided; the final hosting vendor remains an operational implementation choice provided it supports long-running Node/Express, HTTPS, environment secrets, health checks, logs and controlled deployment. Changing that hosting vendor does not change the Product architecture or reopen O-008. Do not introduce Kubernetes, microservices, an event bus or a self-managed database. Backup/recovery and rollback evidence are acceptance dependencies, not reasons to build a speculative platform now.

## Development and testing

Local development uses Node 22 conventions and a local Postgres-compatible database or an isolated managed development project. Tests use synthetic accounts and deterministic fixtures, run migrations from empty state, restart the application between persistence assertions, and exercise direct/altered/malformed IDs. No real customer or provider credentials enter tests or artefacts.

## Security and least-privilege constraints

- browser code receives identity/session information only through the managed auth boundary and never database service credentials;
- server routes verify identity and ownership before every business-scoped read/write;
- migration/service credentials are separate from normal request credentials;
- provider secrets are reference-based and inaccessible through normal read APIs;
- logs and support diagnostics are bounded and correlation-based;
- disconnect/deletion revokes access before deleting references and records the safe state transition;
- database policies/constraints provide defence in depth but do not replace server authorization tests.

## Proposed O-008 resolution

Proposed status after owner approval: **Accepted — select Approach A**. The consequence is incremental Node/Express evolution around managed Auth/Postgres, Supabase Vault for future customer connector secrets and a small managed deployment, with no current connector, executor, queue or multi-tenant expansion. Reopen O-008 only if the selected managed services cannot satisfy verified regional/security/backup requirements, Vault cannot satisfy the bounded secret lifecycle, materially conflict with the approved Product, become economically or contractually unsuitable, or require a framework/distributed rewrite to meet the V1-02 acceptance gates.

## Owner decisions required

Before implementation, Ben/ChatGPT must approve or reject: the V1-02 contract; the Approach A provider choice; the managed secret facility; deployment provider; regional/retention requirements; and the migration/testing boundary. Approval is a separate governance action that may update DECISIONS.md, mark the milestone contract Approved and authorise V1-02 Product code.
