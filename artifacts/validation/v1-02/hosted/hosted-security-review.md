# Hosted security review

Effective database inspection:

- RLS Product tables: 4/4
- owner SELECT policies: 4
- authenticated raw table writes: 0
- authenticated `secret_reference` SELECT grants: 0
- authenticated Product mutation RPCs: exactly 5
- customer execution of cleanup/Vault/trigger helpers: 0
- SECURITY DEFINER functions without fixed search path: 0
- anon/authenticated Vault table grants: 0

Supabase advisors reported six WARN findings:

- five warnings identify the intentionally authenticated SECURITY DEFINER Product RPCs. These are the approved bounded mutation surface: each derives `auth.uid()`, validates ownership/state, has a fixed search path and is covered by direct-Data-API attack tests. Classification: informational/accepted by design.
- leaked-password protection disabled. Classification: Medium operational recommendation for a future production Auth configuration review; it does not expose tenant data or bypass V1-02 authorization in this isolated validation environment.

Critical findings: 0. High findings: 0.
