import dns from "node:dns/promises";
import net from "node:net";
import ipaddr from "ipaddr.js";
import https from "node:https";
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
export async function wooRequest(origin, path, { fields=[] }={}) {
  const base=await validateWooOrigin(origin); const target=new URL(path,base); const checked=await validateWooOrigin(target.origin);
  if (checked.origin!==base.origin) throw new ProductError('INVALID_STORE_URL','Store redirect is not allowed.',400);
  const url=new URL(target.pathname+target.search,checked); if(fields.length) url.searchParams.set('_fields',fields.join(','));
  const addresses=await dns.lookup(url.hostname,{all:true}); const address=addresses.find(a=>!blockedAddress(a.address)); if(!address) throw new ProductError('PROVIDER_REQUEST_FAILED','Store address is unavailable.',502);
  return new Promise((resolve,reject)=>{ const req=https.request(url,{method:'GET',hostname:url.hostname,servername:url.hostname,headers:{accept:'application/json'},lookup:(_h,_o,cb)=>cb(null,address.address,address.family),timeout:10000,rejectUnauthorized:true},res=>{ let size=0; const chunks=[]; res.on('data',c=>{ size+=c.length; if(size>2_000_000){ req.destroy(new Error('RESPONSE_TOO_LARGE')); return; } chunks.push(c); }); res.on('end',()=>{ if(res.statusCode===401||res.statusCode===403) return reject(new ProductError('PROVIDER_AUTH_INVALID','WooCommerce credentials are invalid or revoked.',401)); if(res.statusCode===429) return reject(new ProductError('PROVIDER_RATE_LIMITED','WooCommerce rate limit reached.',429)); if(!res.headers['content-type']?.includes('json')) return reject(new ProductError('PROVIDER_MALFORMED_RESPONSE','WooCommerce returned an invalid response.',502)); try { if(res.statusCode<200||res.statusCode>=300) throw new Error('provider'); resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { reject(new ProductError('PROVIDER_MALFORMED_RESPONSE','WooCommerce returned an invalid response.',502)); } }); }); req.on('timeout',()=>req.destroy(new ProductError('PROVIDER_TIMEOUT','WooCommerce request timed out.',504))); req.on('error',e=>reject(e instanceof ProductError?e:new ProductError('PROVIDER_UNAVAILABLE','WooCommerce is unavailable.',502))); req.end(); });
}
