const required = (name, value) => {
  if (!value) throw new Error(`${name} is required for the V1-02 Product kernel.`);
  return value;
};

export function productKernelConfig(env = process.env, { privileged = false } = {}) {
  const config = {
    url: required("SUPABASE_URL", env.SUPABASE_URL),
    publishableKey: required("SUPABASE_PUBLISHABLE_KEY", env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY)
  };
  if (privileged) config.privilegedKey = required("SUPABASE_SERVICE_ROLE_KEY", env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY);
  return config;
}

export function wooCommerceRouteConfig(env = process.env) {
  const originValue = required("PRODUCT_PUBLIC_ORIGIN", env.PRODUCT_PUBLIC_ORIGIN);
  const appName = required("WOOCOMMERCE_APP_NAME", env.WOOCOMMERCE_APP_NAME).trim();
  let origin;
  try { origin = new URL(originValue); } catch { throw new Error("PRODUCT_PUBLIC_ORIGIN must be a valid HTTPS origin."); }
  if (origin.protocol !== "https:" || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash || appName.length > 100) throw new Error("PRODUCT_PUBLIC_ORIGIN must be a valid HTTPS origin.");
  return { productOrigin: origin.origin, appName };
}
