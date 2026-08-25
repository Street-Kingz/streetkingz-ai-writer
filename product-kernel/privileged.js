import { createClient } from "@supabase/supabase-js";
import { productKernelConfig } from "../config/productKernel.js";

export function privilegedClient(config = productKernelConfig(process.env, { privileged: true })) {
  return createClient(config.url, config.privilegedKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

export const PRIVILEGED_OPERATION_ALLOWLIST = Object.freeze(["auth_delete", "vault_create", "vault_delete", "maintenance"]);
