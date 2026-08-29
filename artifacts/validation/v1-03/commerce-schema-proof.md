# V1-03 foundation schema proof

Real local Supabase operations passed all 33 named integration behaviours. Composite foreign keys enforce Account → Business → Connection → Store ownership and same-Store Generation attribution. Authenticated roles are SELECT-only and see evidence only when its complete snapshot Generation is the Store's current generation. The service-only promotion RPC rejects partial/failed/cross-Store candidates and changes the current pointer atomically.
