# Limitations

- Local Supabase proofs passed on Colima/Docker. Hosted deployment, managed backup/restore, disaster recovery, production key rotation and operational recovery remain unverified separate gates.
- No provider connector was implemented.
- `Business.connection_status` is proven for the current one-Connection-per-test-Business boundary; multi-provider aggregation semantics remain a future V1-04-era Product decision, not part of this closeout.
- V1-02 is not complete and must not be marked Done.
