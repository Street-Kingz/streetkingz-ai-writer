import { ProductError } from "./errors.js";
import { deleteVaultSecret } from "./vault.js";

export async function deleteAccountFoundation({ caller, admin, authUserId, account }) {
  if (!account) throw new ProductError("TENANT_NOT_FOUND", "Product account is not provisioned.", 404);
  const { data: business, error: businessError } = await caller.from("businesses").select("id").eq("account_id", account.id).maybeSingle();
  if (businessError) throw businessError;
  if (business) {
    const { data: connections, error } = await caller.from("connections").select("id,secret_reference").eq("business_id", business.id);
    if (error) throw error;
    for (const connection of connections || []) await deleteVaultSecret(admin, connection.secret_reference);
    const { error: deleteBusinessError } = await caller.from("businesses").delete().eq("id", business.id);
    if (deleteBusinessError) throw deleteBusinessError;
  }
  const { error: accountError } = await caller.from("accounts").update({ status: "deleted", deleted_at: new Date().toISOString() }).eq("id", account.id);
  if (accountError) throw accountError;
  const { error: authError } = await admin.auth.admin.deleteUser(authUserId);
  if (authError) throw new ProductError("SECRET_OPERATION_FAILED", "Managed identity deletion failed.", 503);
  return { deleted: true };
}
