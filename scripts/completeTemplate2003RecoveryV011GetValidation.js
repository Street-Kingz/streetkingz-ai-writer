import fs from "node:fs";
import path from "node:path";
const required=["WORDPRESS_BASE_URL","WORDPRESS_READ_USERNAME","WORDPRESS_READ_APPLICATION_PASSWORD","WORDPRESS_WRITE_USERNAME","WORDPRESS_WRITE_APPLICATION_PASSWORD","WORDPRESS_RECOVERY_USERNAME","WORDPRESS_RECOVERY_APPLICATION_PASSWORD"];
for(const key of required) if(!process.env[key]?.trim()) throw new Error(`MISSING_${key}`);
const base=process.env.WORDPRESS_BASE_URL.replace(/\/$/,"");
const auth={reader:[process.env.WORDPRESS_READ_USERNAME,process.env.WORDPRESS_READ_APPLICATION_PASSWORD],writer:[process.env.WORDPRESS_WRITE_USERNAME,process.env.WORDPRESS_WRITE_APPLICATION_PASSWORD],recovery:[process.env.WORDPRESS_RECOVERY_USERNAME,process.env.WORDPRESS_RECOVERY_APPLICATION_PASSWORD]};
const urls={reader:`${base}/wp-json/streetkingz-ai/v1/products/70/authoritative`,writer:`${base}/wp-json/streetkingz-ai/v1/approved-product-70-copy/approval/status`,recovery:`${base}/wp-json/streetkingz-ai/v1/incidents/template-2003-elementor-normalization/recover`};
const calls=[];const selected=h=>Object.fromEntries(["cache-control","x-litespeed-cache","x-litespeed-cache-control","age"].flatMap(k=>h.get(k)===null?[]:[[k,h.get(k)]]));
async function get(target,identity){const pair=identity?auth[identity]:null;const response=await fetch(urls[target],{headers:{accept:"application/json",...(pair?{authorization:`Basic ${Buffer.from(pair.join(":" )).toString("base64")}`}:{})}});const text=await response.text();let body={};try{body=JSON.parse(text)}catch{}const result={target,identity:identity||"anonymous",status:response.status,error_code:body.code||null,body_status:body.status||null,cache_headers:selected(response.headers)};calls.push(result);return result;}
for(const [target,identity] of [["reader","reader"],["reader","writer"],["reader","recovery"],["reader",null],["writer","writer"],["writer","reader"],["writer","recovery"],["writer",null],["recovery","recovery"],["recovery",null],["recovery","reader"],["recovery","writer"]]) await get(target,identity);
const expected={"reader:reader":200,"reader:writer":403,"reader:recovery":403,"reader:anonymous":403,"writer:writer":200,"writer:reader":403,"writer:recovery":403,"writer:anonymous":403,"recovery:recovery":200,"recovery:anonymous":403,"recovery:reader":403,"recovery:writer":403};
const pass=calls.every(v=>v.status===expected[`${v.target}:${v.identity}`]);
const out=path.join(process.cwd(),"artifacts/incidents/template-2003-elementor-normalization-2026-08-09/live-recovery-validation-v0.1.1-001/final-cache-check.json");
fs.writeFileSync(out,JSON.stringify({pass,calls,content_mutations:0},null,2)+"\n",{flag:"wx"});
if(!pass) process.exitCode=2;
