# Tenant Isolation Proof

The schema enables RLS on all customer-bound tables, revokes anonymous access, defines ownership policies through Auth identity, and the route resolves ownership before child access.

With two real authenticated users and known cross-tenant UUIDs, Account A received zero rows for Account B's Business, Connection and AuditEvent rows; foreign transition RPC access was denied. Same-tenant raw Data API insert/update/delete attacks against Account, Business, Connection, protected fields and AuditEvent all failed at table privileges. Column-level grants also denied direct reads of internal `secret_reference`. Direct caller RPC attacks enforced ownership/state rules, and privileged cleanup/Vault RPCs were denied.

Status: PASS — Express authorization, cross-tenant RLS and own-tenant direct mutation defence verified separately.
