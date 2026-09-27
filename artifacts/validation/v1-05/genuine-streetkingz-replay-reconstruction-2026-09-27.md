# V1-05 Genuine Street Kingz Replay Reconstruction — Blocked

Prepared: 2026-09-27

Starting Product commit: `28fd9537b71152c46b44d1a3405421e8a60a0159`

Branch: `feature/v1-05-opportunity-recommendation`

## Scope and safety result

This was a read-only inventory and sufficiency audit. No new database was
created. No database was changed. No WooCommerce, public-site, Search Console,
external-search, DataForSEO, AI or model call was made.

Lossless reconstruction is **not possible** from the surviving evidence.
The replay is stopped before destination creation and before Product loading.

## Surviving evidence inventory

| Path | Type / size | Hash or identity | Evidence | Reconstruction use |
|---|---:|---|---|---|
| `/Users/ben/Library/Application Support/StreetKingz/v1-05/input-preparation-2026-09-14/catalogue-acquisition.json` | JSON, 33,951 bytes, mode `0600` | SHA-256 `b63fd10c97f88aa7588f448e347567d5c9b1ebdb1924433d1440a154d489c4c2` | Genuine commerce acquisition archive: 30 products, 11 categories, 103 product/category links and 6 variations | Sufficient for genuine commerce reconstruction only; private and not committed |
| `artifacts/validation/v1-05/genuine-streetkingz-input-preparation-2026-09-14/input-report.md` | Markdown, 28,254 bytes | Report artifact | Historical source/run identities, counts, provenance descriptions and prior packet hashes | Reference only; does not contain raw site or GSC rows |
| `artifacts/validation/v1-05/genuine-streetkingz-discovery-2026-09-14/frozen-input.json` | JSON, 3,035 bytes | Historical compact manifest | Source identities, counts, coverage summaries, historical packet identity | Reference only; no product, site-page or observation arrays |
| `artifacts/validation/v1-05/genuine-streetkingz-discovery-2026-09-14/candidates.json` | JSON, 132,592 bytes | Historical derived output | Pre-fix candidates and derived evidence references | BEFORE comparison only; not valid runtime input |
| `artifacts/validation/v1-05/genuine-streetkingz-discovery-2026-09-14/discovery-report.md` | Markdown, 25,608 bytes | Historical report | Pre-fix discovery counts, maturity defect and target-resolution defect | Reference only; not raw evidence |
| `artifacts/validation/v1-05/genuine-streetkingz-discovery-2026-09-14/resume-after-break-status.md` | Markdown, 1,379 bytes | Recovery status | Confirms the prior isolated destination was absent and replay was not safely reconstructed | Confirms the current block |
| `artifacts/validation/v1-05/live-sessions/` and root Slice B cache/ledger files | JSON caches and ledgers | Historical validation artifacts | Model/evaluation history and accounting | Not relevant raw Street Kingz input; not used |

The compact and derived artifacts were not treated as substitutes for missing
raw rows.

## Required evidence reconciliation

| Required dataset | Historical target | Surviving lossless rows | Result |
|---|---:|---:|---|
| Genuine commerce generation | 30 products, 11 categories, 103 relationships, 6 variations | Complete private catalogue archive | Available |
| Search Console selected run | 1,125 observations, accepted source run 750, provider-limited completeness | No retained observation export or database | Missing |
| Genuine site run 3 | 113 discovered URLs, 100 inspected-page rows, full page provenance and partial lifecycle state | No retained discovered-URL export, inspected-page export or database | Missing |
| Source/run lifecycle metadata | Selected run IDs, source IDs, run states, completeness and provenance | Only prose/compact summaries; no raw durable records | Missing |
| External search | Missing / zero selected | Compact manifest says missing / zero | Reconstructible as an explicit missing source, but not sufficient to replace missing first-party rows |

The protected historical endpoints `127.0.0.1:54321` and `127.0.0.1:54274`
were not available, and no matching containers or temporary replay destination
were present. The previously documented destination under `/private/tmp` is
absent.

## Why reconstruction stops

The private catalogue archive cannot recreate Search Console observations,
site discovered URLs, inspected page fields, page provenance, or the selected
run lifecycle. Counts, prose reports, candidate evidence references and
remembered values are insufficient for a lossless normal Product replay.

No synthetic commerce, historical recovery site run, or inferred page data was
used as a substitute.

## Minimum future reconstruction

The minimum required input is either:

1. recovery of the original isolated destination; or
2. a private data-only reconstruction containing the genuine commerce archive,
   the accepted Search Console run and all 1,125 observations, the genuine
   site run 3 discovered/page rows, source/run lifecycle metadata, and the
   current repository migrations.

Once those raw records are available, the normal path can be run as:

`loadDiscoveryEvidence() → discoverCandidates()`

with historical and new packet identities recorded separately. This task did
not perform that reconstruction.

## Exact stopping point

Stopped before isolated destination creation, data restoration, normal Product
loading and deterministic replay.

The historical 58-candidate result remains a BEFORE reference only. No
corrected genuine after-state is claimed.

## Learning Layer

A derived artifact is an answer about evidence, not the evidence itself. The
normal loader needs the original rows and provenance to prove that a replay is
genuine. Safe experiment: compare the compact manifest with the private
catalogue archive and observe that commerce rows can be counted, while site
and GSC rows cannot be regenerated from counts alone.
