# Hosted tenant-isolation proof

Hosted two-tenant validation passed:

- Account A could not read Account B Business or AuditEvents.
- Account A could not transition Account B Connection through Express.
- authenticated raw Product-table writes were denied, including own-tenant workflow bypass attempts;
- authenticated table SELECT could not read `connections.secret_reference`;
- direct customer Connection RPC results excluded the reference and secret plaintext;
- effective hosted inspection found four RLS-enabled Product tables, four owner SELECT policies, zero authenticated raw write grants and exactly five intended customer mutation RPCs.
