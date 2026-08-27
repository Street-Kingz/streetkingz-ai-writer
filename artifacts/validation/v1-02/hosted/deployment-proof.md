# Hosted deployment proof

Render deployed the existing Node/Express application with `npm ci`, `npm start`, provider-assigned `PORT`, HTTPS and `/` as its health check. Required Supabase values are stored as Render environment secrets and were not changed after the source pause/resume.

After source resume, HTTPS health returned the expected `status: ok`; a two-user Product smoke passed and persisted state survived a Render restart. A private scan of 500 validation-service log records found zero Supabase secret-key, JWT, credential-bearing database URL, Authorization-header or synthetic Vault-plaintext patterns.

Final live deployment: `dep-da7svnl2e28c73dns29g`, commit `559657cc2100934409019d11b23f3acbcd7459df`.
