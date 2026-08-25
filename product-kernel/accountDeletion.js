import { ProductError } from "./errors.js";
export async function deleteAccountFoundation({ caller, admin, authUserId, account, correlationId }) {
  if (!account) throw new ProductError("TENANT_NOT_FOUND", "Product account is not provisioned.", 404);
  const { error: requestError } = await caller.rpc("product_request_account_deletion", { p_correlation_id: correlationId });
  if (requestError) throw new ProductError("ACCOUNT_DELETION_FAILED", "Account deletion could not be started.", 503);
  const { error: cleanupError } = await admin.rpc("product_cleanup_account", { p_auth_user_id: authUserId, p_correlation_id: correlationId });
  if (cleanupError) throw new ProductError(cleanupError.message?.includes("SECRET_OPERATION_FAILED") ? "SECRET_OPERATION_FAILED" : "ACCOUNT_DELETION_FAILED", "Account deletion could not be completed.", 503);
  const { error: authError } = await admin.auth.admin.deleteUser(authUserId);
  if (authError) throw new ProductError("ACCOUNT_DELETION_FAILED", "Managed identity deletion failed.", 503);
  return { deleted: true };
}
