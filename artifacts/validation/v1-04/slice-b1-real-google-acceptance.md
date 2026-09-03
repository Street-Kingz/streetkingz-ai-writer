# V1-04 B1 — Real Google Search Console Acceptance

Date: 2026-09-03

Branch: `feature/v1-04-organic-evidence`

Implementation SHA: `6bb8341b08f2624bcade095cd80e67a4ce185191`

P4 acceptance SHA: `6bb8341b08f2624bcade095cd80e67a4ce185191`

The exact reprovisioned local Street Kingz tenant was reused. Its WooCommerce
fixture and commerce evidence are synthetic; no WooCommerce or Street Kingz
site request was made.

- canonical URL: `https://streetkingz.co.uk/`
- new Account: NO
- new Business: NO
- local HTTPS callback: PASS
- system browser used: YES
- requested scope: `webmasters.readonly`
- extra scopes: NONE
- authorization-code exchange: PASS
- refresh token returned: YES
- refresh token Vault-only: PASS
- access token persisted: NO
- callback metadata accepted: `code`, `iss`, `scope`, `state`, each once
- callback replay: safely rejected
- total properties returned: 1
- eligible Street Kingz properties: 1
- selected siteUrl: `https://streetkingz.co.uk/`
- property type: `url_prefix`
- permission level: `siteOwner`
- exact property probe: PASS
- final connection: `connected`
- credential-health check: PASS
- Search Console source state: `never_collected`
- Search Analytics calls: 0
- Search Analytics observations: 0
- Google write calls: 0
- WooCommerce calls: 0
- Street Kingz site calls: 0
- DataForSEO calls: 0
- synthetic Woo/commerce fixture unchanged: PASS
- Slice-A organic state unchanged: PASS
- temporary material removed: PASS
- active GSC connection retained: YES
- B2 started: NO

Final B1 decision: ACCEPTED. The retained read-only connection is ready for a
separately authorised B2 task. Search Analytics collection was not performed.
