# AI Writer Article Draft

Version 0.1.0. This plugin is an intentionally narrow control plane for creating one exact, human-approved Gutenberg draft post.

It does not include a contract, execution ID, credentials, or test content. Install alone does not create content. A separate contract must be installed by an account with `streetkingz_ai_create_article_draft`; execution is one-time and validates persisted state before success.

Routes are under `/wp-json/ai-writer/v1/article-draft/`:

- `POST contract` — install one exact contract.
- `GET status` — inspect bounded state.
- `GET dry-run` — validate without claim or mutation.
- `POST execute` — claim once and create exactly one draft post.
- `DELETE contract` — remove an unclaimed contract.

The role contains only `read` and `streetkingz_ai_create_article_draft`. The endpoint never accepts an existing post ID, arbitrary fields, meta, taxonomy, media, Elementor data, or publication state.
