const DEFAULT_BASE_URL = "https://api.dataforseo.com";
const DEFAULT_TIMEOUT_MS = 30000;

export class DataForSeoConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = "DataForSeoConfigurationError";
    this.code = "DATAFORSEO_CONFIGURATION";
  }
}

export class DataForSeoHttpError extends Error {
  constructor(message, { status, rateLimit, responseBody }) {
    super(message);
    this.name = "DataForSeoHttpError";
    this.code = "DATAFORSEO_HTTP_ERROR";
    this.status = status;
    this.rateLimit = rateLimit;
    this.responseBody = responseBody;
  }
}

export class DataForSeoTimeoutError extends Error {
  constructor(timeoutMs) {
    super(`DataForSEO request timed out after ${timeoutMs}ms.`);
    this.name = "DataForSeoTimeoutError";
    this.code = "DATAFORSEO_TIMEOUT";
    this.timeoutMs = timeoutMs;
  }
}

function positiveNumber(value, name, fallback) {
  const resolved = value === undefined || value === "" ? fallback : Number(value);
  if (!Number.isFinite(resolved) || resolved <= 0) {
    throw new DataForSeoConfigurationError(`${name} must be a positive number.`);
  }
  return resolved;
}

export function readDataForSeoConfig(env = process.env) {
  const login = env.DATAFORSEO_LOGIN;
  const password = env.DATAFORSEO_PASSWORD;
  if (!login || !password) {
    throw new DataForSeoConfigurationError(
      "DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD are required."
    );
  }
  return {
    login,
    password,
    timeoutMs: positiveNumber(env.DATAFORSEO_REQUEST_TIMEOUT_MS, "DATAFORSEO_REQUEST_TIMEOUT_MS", DEFAULT_TIMEOUT_MS),
    maxCostUsd: positiveNumber(env.DATAFORSEO_MAX_COST_USD, "DATAFORSEO_MAX_COST_USD", 0.05)
  };
}

export function captureRateLimitHeaders(headers) {
  const numeric = (name) => {
    const value = headers.get(name);
    return value === null || value === "" || !Number.isFinite(Number(value)) ? null : Number(value);
  };
  return {
    limit_per_minute: numeric("x-ratelimit-limit"),
    remaining: numeric("x-ratelimit-remaining")
  };
}

export function createDataForSeoClient({
  env = process.env,
  fetchImpl = globalThis.fetch,
  baseUrl = DEFAULT_BASE_URL
} = {}) {
  const config = readDataForSeoConfig(env);
  if (typeof fetchImpl !== "function") {
    throw new DataForSeoConfigurationError("A fetch implementation is required.");
  }
  const authorization = `Basic ${Buffer.from(`${config.login}:${config.password}`, "utf8").toString("base64")}`;

  return {
    config: { timeoutMs: config.timeoutMs, maxCostUsd: config.maxCostUsd },

    async post(endpoint, payload) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
      let response;
      try {
        response = await fetchImpl(new URL(endpoint, baseUrl), {
          method: "POST",
          headers: {
            authorization,
            "content-type": "application/json"
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
      } catch (error) {
        if (error?.name === "AbortError" || controller.signal.aborted) {
          throw new DataForSeoTimeoutError(config.timeoutMs);
        }
        throw error;
      } finally {
        clearTimeout(timeout);
      }

      const rawBody = await response.text();
      const rateLimit = captureRateLimitHeaders(response.headers);
      if (!response.ok) {
        throw new DataForSeoHttpError(`DataForSEO returned HTTP ${response.status}.`, {
          status: response.status,
          rateLimit,
          responseBody: rawBody
        });
      }
      return { status: response.status, rawBody, rateLimit };
    }
  };
}
