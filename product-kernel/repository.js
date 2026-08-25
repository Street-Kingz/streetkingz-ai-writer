import { ProductError } from "./errors.js";
export function requireOwned(result, code = "TENANT_NOT_FOUND") { if (result.error) throw result.error; if (!result.data) throw new ProductError(code, "The requested Product record was not found.", 404); return result.data; }

export async function resolveAccount(client, authUserId) {
  const result = await client.from("accounts").select("id,auth_user_id,status,created_at,updated_at").eq("auth_user_id", authUserId).maybeSingle();
  return result.error ? (() => { throw result.error; })() : result.data;
}
