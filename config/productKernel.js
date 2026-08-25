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
