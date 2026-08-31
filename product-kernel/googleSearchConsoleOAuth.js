import crypto from "node:crypto";
import { ProductError } from "./errors.js";
import { createVaultSecret, deleteVaultSecret } from "./vault.js";

export const GSC_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API_URL = "https://www.googleapis.com/webmasters/v3";

function config(env = process.env) {
  if (!env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID || !env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET || !env.GOOGLE_SEARCH_CONSOLE_CALLBACK_URL) throw new ProductError("GSC_NOT_CONFIGURED", "Google Search Console is not configured.", 503);
  let callback; try { callback = new URL(env.GOOGLE_SEARCH_CONSOLE_CALLBACK_URL); } catch { throw new ProductError("GSC_NOT_CONFIGURED", "Google Search Console callback is invalid.", 503); }
  if (callback.protocol !== "https:") throw new ProductError("GSC_NOT_CONFIGURED", "Google Search Console callback must use HTTPS.", 503);
  return { clientId: env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID, clientSecret: env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET, callbackUrl: callback.toString() };
}
const hash = value => crypto.createHash("sha256").update(value).digest("base64url");
export function publicSuffixRegistrableDomain(host) {
  const labels = host.toLowerCase().replace(/\.$/, "").split(".");
  if (labels.length < 2 || labels.some(label => !/^[a-z0-9-]+$/.test(label))) return null;
  const suffix2 = new Set(["co.uk","org.uk","ac.uk","gov.uk","com.au","co.nz","co.jp"]);
  return labels.length >= 3 && suffix2.has(labels.slice(-2).join(".")) ? labels.slice(-3).join(".") : labels.slice(-2).join(".");
}
export function canonicalBusinessUrl(value) { try { const u = new URL(value); if (u.protocol !== "https:" || u.username || u.password || u.hostname === "localhost" || /^[0-9.]+$/.test(u.hostname)) return null; u.hash=""; u.search=""; u.hostname=u.hostname.toLowerCase(); u.pathname=u.pathname.replace(/\/{2,}/g,"/").replace(/\/$/,"")||"/"; return u; } catch { return null; } }
export function normalizeProperty(value) {
  if (typeof value !== "string") return null;
  if (value.startsWith("sc-domain:")) { const domain=value.slice(10).toLowerCase().replace(/\.$/,""); const registrable=publicSuffixRegistrableDomain(domain); return registrable === domain ? { siteUrl:`sc-domain:${domain}`, type:"domain", domain } : null; }
  const url=canonicalBusinessUrl(value); return url ? { siteUrl:url.toString(), type:"url_prefix", url } : null;
}
export function propertyMatches(property, businessValue) {
  const business=canonicalBusinessUrl(businessValue); const normalized=normalizeProperty(property); if (!business || !normalized) return false;
  if (normalized.type === "domain") return publicSuffixRegistrableDomain(business.hostname) === normalized.domain;
  const p=normalized.url; if (p.protocol !== business.protocol || p.hostname !== business.hostname || (p.port||"") !== (business.port||"")) return false;
  return business.pathname === p.pathname || business.pathname.startsWith(p.pathname.endsWith("/") ? p.pathname : `${p.pathname}/`);
}
export function createGscTransport({ fetchImpl = globalThis.fetch, env = process.env } = {}) {
  const c=config(env); const call=async(url, options={})=>{const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),15000);try{const r=await fetchImpl(url,{...options,signal:controller.signal});const text=await r.text();let body;try{body=JSON.parse(text);}catch{body=null;}if(!r.ok) throw new ProductError(r.status===401?"GSC_REAUTH_REQUIRED":"GSC_PROVIDER_ERROR","Google Search Console request failed.",r.status===401?409:502);return body;}catch(e){if(e instanceof ProductError)throw e;throw new ProductError("GSC_PROVIDER_ERROR","Google Search Console request failed.",502);}finally{clearTimeout(timer);}};
  return { config:c, authorizationUrl({state,verifier}) { const u=new URL(AUTH_URL); u.search=new URLSearchParams({client_id:c.clientId,redirect_uri:c.callbackUrl,response_type:"code",scope:GSC_SCOPE,access_type:"offline",prompt:"consent",include_granted_scopes:"false",state,code_challenge:hash(verifier),code_challenge_method:"S256"}); return u.toString(); }, async exchangeCode(code,verifier){const r=await call(TOKEN_URL,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({code,client_id:c.clientId,client_secret:c.clientSecret,redirect_uri:c.callbackUrl,grant_type:"authorization_code",code_verifier:verifier}).toString()});if(typeof r.refresh_token!=="string"||!r.refresh_token)throw new ProductError("GSC_REFRESH_TOKEN_REQUIRED","Google did not return durable offline authorization.",409);if(typeof r.scope !== "string"||!r.scope.split(/\s+/).includes(GSC_SCOPE))throw new ProductError("GSC_SCOPE_INVALID","Google authorization did not grant the required read-only scope.",409);return r;}, async accessToken(refreshToken){const r=await call(TOKEN_URL,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({refresh_token:refreshToken,client_id:c.clientId,client_secret:c.clientSecret,grant_type:"refresh_token"}).toString()});if(typeof r.access_token!=="string")throw new ProductError("GSC_REAUTH_REQUIRED","Google authorization requires reconnection.",409);return r.access_token;}, async sitesList(accessToken){return call(`${API_URL}/sites`,{headers:{authorization:`Bearer ${accessToken}`}});}, async site(accessToken,siteUrl){return call(`${API_URL}/sites/${encodeURIComponent(siteUrl)}`,{headers:{authorization:`Bearer ${accessToken}`}})} };
}
let transportFactory = options => createGscTransport(options);
export function setGoogleSearchConsoleTransportFactory(factory) { transportFactory = factory; }
export function googleSearchConsoleTransport(options) { return transportFactory(options); }
export { config as googleSearchConsoleConfig, hash as hashOAuthState };
