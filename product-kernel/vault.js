import { ProductError } from "./errors.js";

// Vault SQL/RPC names are deliberately isolated here. No caller-scoped route can access plaintext.
export async function createVaultSecret(admin, secretValue, name = "v1-02-connector") {
  if (!secretValue) throw new ProductError("SECRET_OPERATION_FAILED", "Connector secret creation failed.", 503);
  const { data, error } = await admin.rpc("vault_create_secret", { secret_value: secretValue, secret_name: name });
  if (error || !data) throw new ProductError("SECRET_OPERATION_FAILED", "Connector secret creation failed.", 503);
  const secretReference = typeof data === "string" ? data : data.id || data.secret_id;
  if (!secretReference) throw new ProductError("SECRET_OPERATION_FAILED", "Connector secret creation failed.", 503);
  return { secretReference };
}

export async function deleteVaultSecret(admin, secretReference) {
  if (!secretReference) return { deleted: true };
  const { data, error } = await admin.rpc("vault_delete_secret", { secret_id: secretReference });
  if (error || data !== true) throw new ProductError("SECRET_OPERATION_FAILED", "Connector secret removal failed.", 503);
  return { deleted: true };
}
