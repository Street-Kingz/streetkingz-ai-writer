import dns from "node:dns/promises";
import net from "node:net";
import ipaddr from "ipaddr.js";
import { ProductError } from "./errors.js";

function blockedAddress(address) {
  if (!net.isIP(address)) return true;
  try { const parsed=ipaddr.parse(address); if (parsed.kind()==='ipv4-mapped') return blockedAddress(parsed.toIPv4Address().toString()); return parsed.range() !== 'unicast'; } catch { return true; }
}
export async function validateWooOrigin(value) {
  let u; try { u=new URL(value); } catch { throw new ProductError('INVALID_STORE_URL','Store URL is invalid.',400); }
  if (u.protocol!=='https:' || u.username || u.password || !u.hostname || u.hostname==='localhost' || u.hostname.endsWith('.local')) throw new ProductError('INVALID_STORE_URL','Store URL is invalid.',400);
  const addresses=await dns.lookup(u.hostname,{all:true}); if (!addresses.length || addresses.some(a=>blockedAddress(a.address))) throw new ProductError('INVALID_STORE_URL','Store URL is not allowed.',400);
  u.hash=''; u.search=''; u.pathname=u.pathname.replace(/\/+$/,'')||'/'; return u;
}
export async function wooRequest(origin, path, { method='GET', fields=[] , body }={}) {
  const base=await validateWooOrigin(origin); const target=new URL(path,base); const checked=await validateWooOrigin(target.origin);
  if (checked.origin!==base.origin) throw new ProductError('INVALID_STORE_URL','Store redirect is not allowed.',400);
  const url=new URL(target.pathname+target.search,checked); if(fields.length) url.searchParams.set('_fields',fields.join(','));
  const response=await fetch(url,{method,redirect:'error',body,headers:{accept:'application/json','content-type':'application/json'}}); if(!response.ok) throw new ProductError('PROVIDER_REQUEST_FAILED','WooCommerce request failed.',502); return response.json();
}
