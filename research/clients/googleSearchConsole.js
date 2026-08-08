const DEFAULT_API_BASE_URL = "https://www.googleapis.com/webmasters/v3";
const DEFAULT_TOKEN_URL = "https://oauth2.googleapis.com/token";
const DEFAULT_TIMEOUT_MS = 30000;

export class SearchConsoleConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = "SearchConsoleConfigurationError";
    this.code = "SEARCH_CONSOLE_CONFIGURATION";
  }
}

export class SearchConsoleAuthenticationError extends Error {
  constructor(message, { status, responseBody } = {}) {
    super(message);
    this.name = "SearchConsoleAuthenticationError";
    this.code = "SEARCH_CONSOLE_AUTHENTICATION";
    this.status = status;
    this.responseBody = responseBody;
  }
}

export class SearchConsoleHttpError extends Error {
  constructor(message, { status, responseBody }) {
    super(message);
    this.name = "SearchConsoleHttpError";
    this.code = "SEARCH_CONSOLE_HTTP_ERROR";
    this.status = status;
    this.responseBody = responseBody;
  }
}

export class SearchConsoleTimeoutError extends Error {
  constructor(timeoutMs) {
    super(`Google Search Console request timed out after ${timeoutMs}ms.`);
    this.name = "SearchConsoleTimeoutError";
    this.code = "SEARCH_CONSOLE_TIMEOUT";
    this.timeoutMs = timeoutMs;
  }
}

function positiveNumber(value, name, fallback) {
  const resolved = value === undefined || value === "" ? fallback : Number(value);
  if (!Number.isFinite(resolved) || resolved <= 0) throw new SearchConsoleConfigurationError(`${name} must be a positive number.`);
  return resolved;
}

export function readGoogleSearchConsoleConfig(env = process.env) {
  const required = [
    "GOOGLE_SEARCH_CONSOLE_SITE_URL",
    "GOOGLE_SEARCH_CONSOLE_CLIENT_ID",
    "GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET",
    "GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN"
  ];
  const missing = required.filter((name) => !env[name]);
  if (missing.length) throw new SearchConsoleConfigurationError(`Missing Google Search Console configuration: ${missing.join(", ")}.`);
  return {
    siteUrl: env.GOOGLE_SEARCH_CONSOLE_SITE_URL,
    clientId: env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID,
    clientSecret: env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET,
    refreshToken: env.GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN,
    timeoutMs: positiveNumber(env.GOOGLE_SEARCH_CONSOLE_REQUEST_TIMEOUT_MS, "GOOGLE_SEARCH_CONSOLE_REQUEST_TIMEOUT_MS", DEFAULT_TIMEOUT_MS)
  };
}

async function fetchWithTimeout(fetchImpl, url, options, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error?.name === "AbortError" || controller.signal.aborted) throw new SearchConsoleTimeoutError(timeoutMs);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function createGoogleSearchConsoleClient({
  env = process.env,
  fetchImpl = globalThis.fetch,
  apiBaseUrl = DEFAULT_API_BASE_URL,
  tokenUrl = DEFAULT_TOKEN_URL
} = {}) {
  const config = readGoogleSearchConsoleConfig(env);
  if (typeof fetchImpl !== "function") throw new SearchConsoleConfigurationError("A fetch implementation is required.");
  let accessToken = null;

  async function token() {
    if (accessToken) return accessToken;
    const body = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
      grant_type: "refresh_token"
    });
    const response = await fetchWithTimeout(fetchImpl, tokenUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: body.toString()
    }, config.timeoutMs);
    const rawBody = await response.text();
    let parsed;
    try { parsed = JSON.parse(rawBody); } catch { parsed = null; }
    if (!response.ok || typeof parsed?.access_token !== "string") {
      throw new SearchConsoleAuthenticationError(`Google OAuth token refresh failed with HTTP ${response.status}.`, { status: response.status, responseBody: rawBody });
    }
    accessToken = parsed.access_token;
    return accessToken;
  }

  return {
    config: { siteUrl: config.siteUrl, timeoutMs: config.timeoutMs },
    async querySearchAnalytics(requestBody) {
      const bearer = await token();
      const endpoint = `${apiBaseUrl}/sites/${encodeURIComponent(config.siteUrl)}/searchAnalytics/query`;
      const response = await fetchWithTimeout(fetchImpl, endpoint, {
        method: "POST",
        headers: { authorization: `Bearer ${bearer}`, "content-type": "application/json" },
        body: JSON.stringify(requestBody)
      }, config.timeoutMs);
      const rawBody = await response.text();
      if (!response.ok) throw new SearchConsoleHttpError(`Google Search Console returned HTTP ${response.status}.`, { status: response.status, responseBody: rawBody });
      return { status: response.status, rawBody };
    }
  };
}
