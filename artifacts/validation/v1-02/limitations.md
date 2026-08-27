# Limitations

- Local Supabase and isolated hosted Supabase/Render proofs passed. Free validation exercised portable logical destructive recovery, not paid provider-managed physical restore.
- Under accepted decision O-016, portable logical recovery invalidates connector credentials and requires customer re-authorisation. Credential-preserving recovery remains dependent on a supported provider-managed restore plan.
- Live platform/service key rotation was not performed; the supported replacement/redeploy procedure is documented in `docs/V1-02_PRODUCT_KERNEL_RECOVERY.md`.
- Supabase leaked-password protection was disabled in the isolated validation project and is a non-blocking production Auth-configuration recommendation.
- No provider connector was implemented.
- `Business.connection_status` is proven for the current one-Connection-per-test-Business boundary; multi-provider aggregation semantics remain a future V1-04-era Product decision, not part of this closeout.
- V1-02 remains IN PROGRESS pending final ChatGPT/owner acceptance and must not be self-marked Done.
