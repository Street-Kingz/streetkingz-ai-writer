# V1-05 Blind Evaluation Input Review

Status: PROPOSED — OWNER REVIEW REQUIRED.

This is the reviewer-input view of the v2 packets. It intentionally excludes
expected interventions, run outcomes, commercial effects, severity flags and
reviewer rationale. Reviewers should inspect whether the available source facts
are sufficient for the labelled stage; the answer-key manifest is separate.

| Case | Fixture | Provenance | Maturity | Available source facts |
|---|---|---|---|---|
| V105-EVAL-001 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-001` | real | rich | Two products, a category, product pages, query/page metrics, demand and an organic result. |
| V105-EVAL-002 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-002` | real | sparse | Two wheel-care products, one product page, limited query metrics and a GB demand observation. |
| V105-EVAL-003 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-003` | historical | rich | Polisher and pad products, product/content pages, query metrics and a GB organic result. |
| V105-EVAL-004 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-004` | synthetic | sparse | Two categories and products, two category pages, missing Search Console and one GB demand result. |
| V105-EVAL-005 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-005` | real | rich | Glass products/category, category and product pages, query metrics and GB organic result. |
| V105-EVAL-006 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-006` | synthetic | sparse | Interior products/category and an indexed guide page; Search Console and external rows are absent. |
| V105-EVAL-007 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-007` | real | rich | Leather products, guide/product pages, query metrics and GB organic result. |
| V105-EVAL-008 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-008` | real | rich | Foam products/category, product/category/guide pages, query metrics and GB organic result. |
| V105-EVAL-009 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-009` | synthetic | sparse | Bucket products/category, category/product pages, limited query metrics and GB demand result. |
| V105-EVAL-010 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-010` | real | rich | Tar remover/polish products, category and guide pages, query metrics and GB organic result. |
| V105-EVAL-011 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-011` | synthetic | mixed | Trim products, product/guide pages, limited query metrics and a two-result GB SERP. |
| V105-EVAL-012 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-012` | synthetic | sparse | Glass products/category, category/product pages, missing Search Console and a low-volume GB result. |
| V105-EVAL-013 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-013` | real | rich | Rinse products/category, category/product pages, query metrics and GB organic result. |
| V105-EVAL-014 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-014` | real | rich | Drying/wash products, category and product pages with an internal link, query metrics and GB result. |
| V105-EVAL-015 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-015` | historical | mixed | Wheel products, linked category/product pages, limited query metrics and a GB demand row. |
| V105-EVAL-016 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-016` | synthetic | sparse | Detailing products, category/product pages with no internal links, and an explicit Product↔Category commerce relation; Search Console/external rows absent. |
| V105-EVAL-017 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-017` | real | rich | Ceramic products, category/product pages, query metrics, demand and stock quantity values. |
| V105-EVAL-018 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-018` | synthetic | sparse | Finishing products, product/guide pages, missing Search Console and a two-result GB SERP. |
| V105-EVAL-019 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-019` | synthetic | sparse | Dated category/product pages from 2025; Search Console and external rows absent. |
| V105-EVAL-020 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-020` | real | rich | Tyre products/category, product/category pages, query metrics, GB result and zero stock for one item. |
| V105-EVAL-021 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-021` | synthetic | mixed | Polish products/category, product/category pages, limited query metrics and no external rows. |
| V105-EVAL-022 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-022` | synthetic | sparse | Wash products/category with unavailable page inventory and no Search Console/external rows. |
| V105-EVAL-023 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-023` | real | mixed | Sealant product/category, product page, limited query metrics and a provider-limited external source. |
| V105-EVAL-024 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-024` | synthetic | sparse | One wash product, no categories or pages, and missing Search Console/external sources. |
| V105-EVAL-025 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-025` | synthetic | rich | Two same-named products, one product page, two related query rows and a GB organic result. |
| V105-EVAL-026 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-026` | real | rich | Repeated wheel-brush catalogue records, product/category pages, query metrics and GB result. |
| V105-EVAL-027 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-027` | synthetic | mixed | Wash product/guide pages with two related query/page rows and two matching GB organic results. |
| V105-EVAL-028 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-028` | synthetic | rich | Tyre guide/category pages with separate query/page rows and two matching GB organic results. |
| V105-EVAL-029 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-029` | historical | rich | Repeated polish products, product/category pages, query metrics and GB organic result. |
| V105-EVAL-030 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-030` | real | rich | Wash product/guide pages with two query/page rows and two matching GB organic results. |
| V105-EVAL-031 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-031` | synthetic | rich | GB business and pages paired with a US external observation for the same wording. |
| V105-EVAL-032 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-032` | real | rich | Business-named home/product pages, branded query metrics and a GB organic result. |
| V105-EVAL-033 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-033` | synthetic | mixed | GB business/category page paired with German-language DE query and external evidence. |
| V105-EVAL-034 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-034` | synthetic | sparse | Business-named home/product pages with missing Search Console and external sources. |
| V105-EVAL-035 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-035` | real | rich | Wheel and glass products/pages; glass query metrics point to a wheel product page. |
| V105-EVAL-036 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-036` | synthetic | rich | Wheel category and product pages; a category query is attached to a product page and GB SERP. |
| V105-EVAL-037 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-037` | synthetic | sparse | Product page has an external canonical and is non-indexable; other sources are missing. |
| V105-EVAL-038 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-038` | historical | rich | Tyre products/pages paired with glass-care query metrics and a GB result for the tyre page. |
| V105-EVAL-039 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-039` | real | mixed | Product/category relationship, price, stock, 90-day sales/revenue/COGS, query metrics and GB demand of 20. |
| V105-EVAL-040 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-040` | synthetic | rich | Category/product relationship, price, stock, 90-day sales/revenue and GB demand of 25. |
| V105-EVAL-041 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-041` | synthetic | rich | Wheel-care catalogue/pages paired with 12,000-impression/query demand for a different service. |
| V105-EVAL-042 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-042` | real | mixed | Trim-care catalogue/pages paired with 11,000-impression/query demand for a different service. |
| V105-EVAL-043 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-043` | real | rich | Two interior guide pages, category page, reciprocal query/page metrics and two organic results. |
| V105-EVAL-044 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-044` | historical | rich | Paint guide/product pages, query metrics and one GB organic result. |
| V105-EVAL-045 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-045` | synthetic | mixed | Wash category/guide/product pages with internal-link direction and two query/page rows. |
| V105-EVAL-046 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-046` | synthetic | sparse | Dated wax category/product pages and a dated GB demand observation. |
| V105-EVAL-047 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-047` | synthetic | sparse | Polish product/category with explicit null COGS/margin and missing Search Console/external rows. |
| V105-EVAL-048 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-048` | real | mixed | Two content pages, shared query/page metrics, GB organic results and differing stock/sales values. |
