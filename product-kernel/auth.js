import { createClient } from "@supabase/supabase-js";
import { productKernelConfig } from "../config/productKernel.js";
import { ProductError } from "./errors.js";

export function parseBearer(value) {
  if (!value) throw new ProductError("AUTH_REQUIRED", "Authentication is required.", 401);
  const match = /^Bearer\s+([^\s]+)$/i.exec(value);
  if (!match) throw new ProductError("AUTH_INVALID", "Malformed bearer authentication.", 401);
  return match[1];
}

export function callerClient(token, config = productKernelConfig()) {
  return createClient(config.url, config.publishableKey, { auth: { autoRefreshToken: false, persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
}

export async function verifyIdentity(token, { clientFactory = callerClient, config } = {}) {
  const client = clientFactory(token, config);
  if (!client.auth?.getClaims) throw new ProductError("AUTH_INVALID", "Verified identity support is unavailable.", 401);
  const { data, error } = await client.auth.getClaims(token);
  if (error || !data?.claims?.sub) throw new ProductError("AUTH_INVALID", "The access token is invalid or expired.", 401);
  return { authUserId: data.claims.sub, claims: data.claims };
}
