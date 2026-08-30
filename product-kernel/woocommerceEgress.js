import dns from "node:dns/promises";
import net from "node:net";
import https from "node:https";
import ipaddr from "ipaddr.js";
import { ProductError } from "./errors.js";

const MAX_BYTES=2_000_000,TIMEOUT_MS=10_000,MAX_REDIRECTS=3;
function blocked(address){if(!net.isIP(address))return true;try{const p=ipaddr.parse(address);if(p.kind()==='ipv4-mapped')return blocked(p.toIPv4Address().toString());return p.range()!=='unicast';}catch{return true;}}
function invalid(){return new ProductError('INVALID_STORE_URL','Store URL is invalid.',400);}
const providerError=(code,message,status)=>new ProductError(code,message,status);
const cancelledError=()=>providerError('PROVIDER_TIMEOUT','WooCommerce request timed out.',504);
function throwIfCancelled(operation){if(operation?.cancelled)throw operation.error||cancelledError();}

export async function validateWooOrigin(value,{lookup=dns.lookup,operation,unavailableCode='INVALID_STORE_URL'}={}){
 let u;try{u=new URL(value);}catch{throw invalid();}
 if(u.protocol!=='https:'||u.username||u.password||!u.hostname||net.isIP(u.hostname)||u.hostname==='localhost'||u.hostname.endsWith('.local')||(u.port&&u.port!=='443'))throw invalid();
 throwIfCancelled(operation);let addresses;
 try{addresses=await lookup(u.hostname,{all:true});}catch(error){throwIfCancelled(operation);if(error instanceof ProductError)throw error;if(unavailableCode==='STORE_UNAVAILABLE')throw new ProductError('STORE_UNAVAILABLE','Store address is unavailable.',502);if(unavailableCode==='PROVIDER_UNAVAILABLE')throw providerError('PROVIDER_UNAVAILABLE','WooCommerce is unavailable.',502);throw invalid();}
 throwIfCancelled(operation);if(!addresses.length||addresses.some(a=>blocked(a.address)))throw new ProductError('INVALID_STORE_URL','Store URL is not allowed.',400);
 u.hash='';u.search='';u.pathname=u.pathname.replace(/\/+$/,'')||'/';return{url:u,addresses};
}

export async function validateWooOriginWithDeadline(value,{deadlineMs=5_000,...options}={}){
 const operation={cancelled:false,error:new ProductError('STORE_UNAVAILABLE','Store address validation timed out.',504)};let timer;
 const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{operation.cancelled=true;reject(operation.error);},deadlineMs);});
 try{return await Promise.race([validateWooOrigin(value,{...options,operation,unavailableCode:'STORE_UNAVAILABLE'}),deadline]);}finally{clearTimeout(timer);}
}

export { TIMEOUT_MS };

export function appendStorePath(base,path){const u=new URL(base);u.pathname=`${u.pathname.replace(/\/+$/,'')}/${path.replace(/^\/+/, '')}`;u.search='';u.hash='';return u;}
const withinBase=(pathname,base)=>base==='/'||pathname===base||pathname.startsWith(`${base}/`);

const COLLECTION_QUERY_KEYS=new Set(['_fields','page','per_page','after','before','modified_after','modified_before','dates_are_gmt','orderby','order','status']);
function collectionQuery(query={}){const out=new URLSearchParams();for(const [key,value] of Object.entries(query)){if(!COLLECTION_QUERY_KEYS.has(key)||Array.isArray(value)||typeof value!=='string'&&typeof value!=='number'&&typeof value!=='boolean')throw invalid();if(key==='_fields'){if(!value)throw invalid();out.set(key,String(value));}else out.set(key,String(value));}return out;}
async function performWooRequest(origin,path,{fields=[],query={},credentials,lookup=dns.lookup,request=https.request,timeoutMs=TIMEOUT_MS,maxBytes=MAX_BYTES,maxRedirects=MAX_REDIRECTS,includeHeaders=false}={},operation){
 if(typeof path!=='string'||/[?#]/.test(path))throw invalid();
 if(!Array.isArray(fields)||fields.some(v=>typeof v!=='string'||!/^[-a-z0-9_.]+$/i.test(v)))throw invalid();
 const first=await validateWooOrigin(origin,{lookup,operation,unavailableCode:'PROVIDER_UNAVAILABLE'});throwIfCancelled(operation);
 const expected=first.url;let target=appendStorePath(expected,path),validation=first;const requested=collectionQuery(query);if(fields.length)requested.set('_fields',fields.join(','));for(const [key,value] of requested)target.searchParams.set(key,value);
 for(const key of target.searchParams.keys())if(!COLLECTION_QUERY_KEYS.has(key))throw invalid();
 for(let redirects=0;;redirects++){
  throwIfCancelled(operation);const checked=validation;if(checked.url.hostname!==expected.hostname||!withinBase(checked.url.pathname,expected.pathname))throw invalid();for(const key of target.searchParams.keys())if(!COLLECTION_QUERY_KEYS.has(key))throw invalid();const pinned=checked.addresses[0];throwIfCancelled(operation);
  const result=await new Promise((resolve,reject)=>{throwIfCancelled(operation);const auth=credentials?`Basic ${Buffer.from(`${credentials.consumerKey}:${credentials.consumerSecret}`,'utf8').toString('base64')}`:undefined;
   const req=request(target,{method:'GET',hostname:target.hostname,port:443,servername:target.hostname,rejectUnauthorized:true,headers:{accept:'application/json',host:target.host,...(auth?{authorization:auth}:{})},lookup:(_h,_o,cb)=>_o?.all?cb(null,[pinned]):cb(null,pinned.address,pinned.family),timeout:timeoutMs},res=>{let size=0;const chunks=[];operation.response=res;res.on('error',()=>reject(providerError('PROVIDER_UNAVAILABLE','WooCommerce is unavailable.',502)));res.on('data',c=>{if(operation.cancelled)return;size+=c.length;if(size>maxBytes)req.destroy(providerError('PROVIDER_RESPONSE_TOO_LARGE','WooCommerce response exceeded the allowed size.',502));else chunks.push(c);});res.on('end',()=>{operation.response=null;resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks).toString('utf8')});});});
   operation.request=req;if(operation.cancelled){req.destroy(operation.error);return;}req.on('timeout',()=>req.destroy(providerError('PROVIDER_TIMEOUT','WooCommerce request timed out.',504)));req.on('error',e=>reject(e instanceof ProductError?e:providerError('PROVIDER_UNAVAILABLE','WooCommerce is unavailable.',502)));req.end();});
  operation.request=null;throwIfCancelled(operation);
  if([301,302,303,307,308].includes(result.status)){if(redirects>=maxRedirects)throw providerError('PROVIDER_REDIRECT_LIMIT','WooCommerce redirect limit exceeded.',502);if(!result.headers.location)throw providerError('PROVIDER_MALFORMED_RESPONSE','WooCommerce returned an invalid response.',502);let next;try{next=new URL(result.headers.location,target);}catch{throw providerError('PROVIDER_MALFORMED_RESPONSE','WooCommerce returned an invalid response.',502);}next.search='';for(const [key,value] of requested)next.searchParams.set(key,value);throwIfCancelled(operation);const nextChecked=await validateWooOrigin(next,{lookup,operation,unavailableCode:'PROVIDER_UNAVAILABLE'});throwIfCancelled(operation);if(nextChecked.url.hostname!==expected.hostname||!withinBase(nextChecked.url.pathname,expected.pathname))throw invalid();target=next;validation=nextChecked;continue;}
  if(result.status===401||result.status===403)throw providerError('PROVIDER_AUTH_INVALID','WooCommerce credentials are invalid or revoked.',401);if(result.status===429)throw providerError('PROVIDER_RATE_LIMITED','WooCommerce rate limit reached.',429);if(result.status<200||result.status>=300)throw providerError('PROVIDER_UNAVAILABLE','WooCommerce is unavailable.',502);if(!String(result.headers['content-type']||'').toLowerCase().includes('json'))throw providerError('PROVIDER_MALFORMED_RESPONSE','WooCommerce returned an invalid response.',502);try{const data=JSON.parse(result.body);return includeHeaders?{data,headers:result.headers}:data;}catch{throw providerError('PROVIDER_MALFORMED_RESPONSE','WooCommerce returned an invalid response.',502);}
 }
}

export async function wooRequest(origin,path,options={}){const deadlineMs=options.deadlineMs??options.timeoutMs??TIMEOUT_MS,operation={request:null,response:null,cancelled:false,error:cancelledError()};let timer;const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{operation.cancelled=true;operation.response?.destroy(operation.error);operation.request?.destroy(operation.error);reject(operation.error);},deadlineMs);});try{return await Promise.race([performWooRequest(origin,path,options,operation),deadline]);}finally{clearTimeout(timer);}}

export async function wooCollectionRequest(origin,path,options={}){return wooRequest(origin,path,{...options,includeHeaders:true});}
