# V1-04 Slice C — Real Site Evidence Acceptance

- Date/time: 2026-09-03T17:01:15Z
- Branch: `feature/v1-04-organic-evidence`
- Implementation SHA: `ae76d85c5a650fc1897e459ba26f2a93ad045d49`
- Business canonical URL: `https://streetkingz.co.uk/`
- Discovery priority respected: PASS

## Bounded acquisition

- `MAX_DISCOVERED_URLS`: 500
- `MAX_INSPECTED_PAGES`: 100
- `MAX_SITEMAP_DOCUMENTS`: 20
- `MAX_URLS_PER_SITEMAP`: 1,000
- `MAX_LINKS_EXTRACTED_PER_PAGE`: 100
- `MAX_LINK_FRONTIER_DEPTH`: 2
- `MAX_REDIRECTS`: 3
- HTML byte cap: 1 MiB
- Sitemap byte cap: 2 MiB
- Robots byte cap: 256 KiB
- Concurrency: 2
- Request timeout: 15,000 ms
- Run deadline: 120,000 ms

## Sanitized real-run results

- Homepage attempts: 1
- Accepted current Woo Product URLs: 0
- Accepted current Woo Category URLs: 0
- Sitemap documents fetched: 14
- Sitemap URLs discovered: 88
- Link-frontier URLs discovered: 24
- Total unique discovered URLs: 113
- Total inspected pages: 100
- Successful HTML pages: 90
- Redirects followed within boundary: 6
- 404/410 responses: 1
- Other 4xx responses: 0
- 5xx responses: 0
- Fetch failures: 0
- Robots-disallowed: 0
- Non-HTML responses: 9
- Oversized responses: 0
- Foreign URLs retained: 0
- Private-network requests: 0
- Cap hits: `inspected_page_cap`
- Completeness: `partial`
- Limitations: `inspected_page_cap`
- `evidence_as_of`: 2026-09-03T17:01:14.517Z

## Validation and preservation

- Product relations verified: 0; no accepted current Product URL was available
- Category relations verified: 0; current commerce schema supplied no Category URL
- Canonical validation: PASS; same-boundary 64, external 26, absent 10, invalid 0
- Indexability-declaration validation: PASS
- Duplicate validation: PASS
- LKG/history behavior: PASS; prior complete run retained as current/LKG and
  partial run retained separately
- Raw HTML retained: NO
- PII/auth data retained: NO
- Google calls: 0
- Search Analytics calls: 0
- WooCommerce API calls: 0
- Authenticated WordPress calls: 0
- DataForSEO calls: 0
- Other external calls: 0
- Commerce unchanged: PASS
- GSC evidence unchanged: PASS
- Critical remaining: 0
- High remaining: 0

The partial run reached the explicit page budget and was not promoted as the
current complete inventory. No query strings, private IDs, cookies, headers,
raw HTML, credentials or unrelated tenant data are included here.
