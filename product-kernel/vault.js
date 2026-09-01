import { ProductError } from "./errors.js";

// Vault SQL/RPC names are deliberately isolated here. No caller-scoped route can access plaintext.
async function createVaultSecretImpl(admin, secretValue, name = "v1-02-connector") {
  if (!secretValue) throw new ProductError("SECRET_OPERATION_FAILED", "Connector secret creation failed.", 503);
  const { data, error } = await admin.rpc("vault_create_secret", { secret_value: secretValue, secret_name: name });
  if (error || !data) throw new ProductError("SECRET_OPERATION_FAILED", "Connector secret creation failed.", 503);
  const secretReference = typeof data === "string" ? data : data.id || data.secret_id;
  if (!secretReference) throw new ProductError("SECRET_OPERATION_FAILED", "Connector secret creation failed.", 503);
  return { secretReference };
}

async function deleteVaultSecretImpl(admin, secretReference) {
  if (!secretReference) return { deleted: true };
  const { data, error } = await admin.rpc("vault_delete_secret", { secret_id: secretReference });
  if (error) throw new ProductError("SECRET_OPERATION_FAILED", "Connector secret removal failed.", 503);
  return { deleted: true };
}

export const createVaultSecretProduction = createVaultSecretImpl;
export const deleteVaultSecretProduction = deleteVaultSecretImpl;

let adapter = { create: createVaultSecretImpl, remove: deleteVaultSecretImpl };

export async function createVaultSecret(admin, secretValue, name = "v1-02-connector") {
  return adapter.create(admin, secretValue, name);
}

export async function deleteVaultSecret(admin, secretReference) {
  return adapter.remove(admin, secretReference);
}

// Explicitly test-only seam; request data cannot select or replace this adapter.
export function setVaultAdapterForTests(next) {
  adapter = next ? { create: next.create, remove: next.remove } : { create: createVaultSecretImpl, remove: deleteVaultSecretImpl };
}
