const $ = id => document.getElementById(id);
let connectionId = new URLSearchParams(location.search).get("connection_id");
let sessionToken = null;
let bootstrapToken = null;
const sessionButton = document.createElement("button");
sessionButton.id = "session";
sessionButton.textContent = "Create local test session";
document.querySelector("section")?.prepend(sessionButton);
const show = value => { $("output").textContent = typeof value === "string" ? value : JSON.stringify(value, null, 2); };
async function call(path, options = {}) {
  const headers = { "content-type": "application/json", ...(options.headers || {}) };
  if (sessionToken) headers.authorization = "Bearer " + sessionToken;
  if (bootstrapToken) headers["x-v1-04-bootstrap"] = bootstrapToken;
  const response = await fetch(path, { ...options, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error?.message || "Request failed (" + response.status + ")");
  return body;
}
bootstrapToken = (await fetch("/internal/v1-04/bootstrap").then(response => response.json())).bootstrap;
sessionButton.onclick = async () => { try { const body = await call("/internal/v1-04/session", { method: "POST", body: JSON.stringify({ canonical_base_url: $("site")?.value }) }); sessionToken = body.access_token; $("status").textContent = "Local session ready"; show({ account: body.account_ready, business: body.business_ready, site: body.site_ready }); } catch (error) { show(error.message); } };
$("cleanup")?.addEventListener("click", async () => { try { await call("/internal/v1-04/session/cleanup", { method: "POST", body: "{}" }); sessionToken = null; connectionId = null; $("status").textContent = "Session cleaned"; show("Disposable session cleaned up."); } catch (error) { show(error.message); } });
async function start(path) { try { const result = await call(path, { method: "POST", body: JSON.stringify({}) }); connectionId = result.connection?.id || connectionId; const popup = window.open(result.authorization_url, "gsc-approval"); if (!popup) throw new Error("Browser blocked the Google authorization window. Allow popups for localhost and try again."); show("Waiting for Google Search Console approval..."); } catch (error) { show(error.message); } }
$("connect").onclick = () => start("/api/product/organic-evidence/search-console/connect");
$("reconnect").onclick = () => start("/api/product/organic-evidence/search-console/reconnect");
$("load").onclick = async () => { try { const body = await call("/api/product/organic-evidence/search-console/properties?connection_id=" + encodeURIComponent(connectionId || "")); $("properties").replaceChildren(...body.properties.map(p => Object.assign(document.createElement("option"), { value: p.siteUrl, textContent: p.siteUrl + " (" + p.permissionLevel + ")" }))); show(body); } catch (error) { show(error.message); } };
$("select").onclick = async () => { try { const body = await call("/api/product/organic-evidence/search-console/select", { method: "POST", body: JSON.stringify({ connection_id: connectionId, site_url: $("properties").value }) }); $("status").textContent = "Connected"; show(body); } catch (error) { show(error.message); } };
$("disconnect").onclick = async () => { try { const body = await call("/api/product/organic-evidence/search-console/disconnect", { method: "POST", body: JSON.stringify({ connection_id: connectionId }) }); $("status").textContent = "Disconnected"; show(body); } catch (error) { show(error.message); } };
