# Hosted limitations

- V1-02 remains IN PROGRESS pending ChatGPT/owner acceptance; this evidence does not mark it Done.
- Free hosted validation did not exercise Supabase paid provider-managed physical restore.
- Under O-011, portable logical recovery deliberately invalidates connector credentials and requires customer re-authorisation; it does not restore Vault ciphertext identity.
- Leaked-password protection was disabled in the isolated Supabase validation project and remains a production Auth-configuration recommendation.
- Live platform/service credential rotation was not performed because it added unnecessary risk; the supported replacement/redeploy procedure is documented and the provider secret stores were exercised.
- V1-02 has no real provider connector, provider-side credential revocation, recommendation logic, WordPress write or paid executor.
- Aggregate Business connection status semantics for multiple provider Connections remain a later connector-era design consideration; V1-02 validation uses one Connection per Business.
