# Tenant Isolation Proof

The schema enables RLS on all customer-bound tables, revokes anonymous access, defines ownership policies through Auth identity, and the route resolves ownership before child access.

With two real authenticated users and known cross-tenant UUIDs, Account A received zero rows when directly selecting Account B's Business, Connection and AuditEvent rows through the Data API. An attempted direct update of Account B's Business also affected and returned zero rows. Anonymous Account access was denied/empty, and authenticated execution of the privileged Vault read RPC was denied.

Status: PASS — real PostgreSQL RLS and direct Data API cross-tenant denial verified.
