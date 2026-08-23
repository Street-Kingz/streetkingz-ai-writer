import crypto from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";

// This helper is commonly invoked directly (`node scripts/...`), unlike the
// package scripts that pass `--env-file=.env`. Load the repository-local
// environment explicitly so direct invocation uses the same convention.
process.loadEnvFile(new URL("../.env", import.meta.url));

const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const AUTHORISATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const CALLBACK_HOST = "127.0.0.1";

function requiredEnvironment(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required in the local .env file.`);
  return value;
}

function openBrowser(url) {
  const command = process.platform === "darwin"
    ? { executable: "open", args: [url] }
    : process.platform === "win32"
      ? { executable: "cmd", args: ["/c", "start", "", url] }
      : { executable: "xdg-open", args: [url] };

  try {
    const child = spawn(command.executable, command.args, { detached: true, stdio: "ignore" });
    child.on("error", () => {});
    child.unref();
    return true;
  } catch {
    return false;
  }
}

async function exchangeCode({ code, clientId, clientSecret, redirectUri }) {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code"
    }).toString()
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`Google OAuth token exchange failed with HTTP ${response.status}.`);
  if (!payload?.refresh_token) {
    throw new Error("Google did not return a refresh token. Revoke the app grant if necessary, then rerun this helper and consent again.");
  }
  return payload;
}

function saveRefreshToken(refreshToken) {
  const envPath = new URL("../.env", import.meta.url);
  const existing = fs.readFileSync(envPath, "utf8");
  const setting = `GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN=${refreshToken}`;
  const pattern = /^GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN=.*$/m;
  const updated = pattern.test(existing)
    ? existing.replace(pattern, setting)
    : `${existing}${existing.endsWith("\n") || existing.length === 0 ? "" : "\n"}${setting}\n`;
  fs.writeFileSync(envPath, updated, { encoding: "utf8", mode: 0o600 });
  const saved = fs.readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .some((line) => line.startsWith("GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN=") && line.slice(line.indexOf("=") + 1).trim().length > 0);
  if (!saved) throw new Error("The refresh token could not be verified in .env.");
}

const clientId = requiredEnvironment("GOOGLE_SEARCH_CONSOLE_CLIENT_ID");
const clientSecret = requiredEnvironment("GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET");
const state = crypto.randomBytes(32).toString("base64url");

const server = http.createServer();
server.listen(0, CALLBACK_HOST, () => {
  const address = server.address();
  const redirectUri = `http://localhost:${address.port}/oauth2/callback`;
  const authorisationUrl = new URL(AUTHORISATION_ENDPOINT);
  authorisationUrl.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state
  }).toString();

  console.log("Google OAuth authorisation is required.");
  console.log(`Open this URL if a browser did not open automatically:\n${authorisationUrl.toString()}`);
  console.log("After approving read-only Search Console access, return to this terminal.");
  openBrowser(authorisationUrl.toString());

  server.on("request", async (request, response) => {
    const callback = new URL(request.url, redirectUri);
    if (callback.pathname !== "/oauth2/callback") {
      response.writeHead(404).end("Not found");
      return;
    }

    try {
      if (callback.searchParams.get("state") !== state) throw new Error("OAuth state validation failed.");
      const oauthError = callback.searchParams.get("error");
      if (oauthError) throw new Error(`Google OAuth authorisation failed: ${oauthError}.`);
      const code = callback.searchParams.get("code");
      if (!code) throw new Error("Google OAuth callback did not contain an authorisation code.");
      const tokens = await exchangeCode({ code, clientId, clientSecret, redirectUri });
      saveRefreshToken(tokens.refresh_token);
      response.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
      response.end("Search Console authorisation succeeded and the refresh token was saved to the local .env.");
      console.log("\nAuthorisation succeeded.");
      console.log(`Scope: ${tokens.scope || SCOPE}`);
      console.log("GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN was saved to the local .env.");
      process.exitCode = 0;
    } catch (error) {
      response.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
      response.end("Search Console authorisation failed. Return to the terminal for details.");
      console.error(error.message);
      process.exitCode = 1;
    } finally {
      server.close();
    }
  });
});

server.on("error", (error) => {
  console.error(`Unable to start the localhost OAuth callback: ${error.message}`);
  process.exitCode = 1;
});
