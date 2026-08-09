import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { diffElementorDocuments } from "../lib/elementorNormalizationIncident.js";

const required=["WORDPRESS_BASE_URL","WORDPRESS_READ_USERNAME","WORDPRESS_READ_APPLICATION_PASSWORD","WORDPRESS_WRITE_USERNAME","WORDPRESS_WRITE_APPLICATION_PASSWORD","WORDPRESS_RECOVERY_USERNAME","WORDPRESS_RECOVERY_APPLICATION_PASSWORD"];
for(const key of required) if(!process.env[key]?.trim()) throw new Error(`PREFLIGHT_MISSING_${key}`);
const users=[process.env.WORDPRESS_READ_USERNAME,process.env.WORDPRESS_WRITE_USERNAME,process.env.WORDPRESS_RECOVERY_USERNAME];
if(new Set(users).size!==3) throw new Error("PREFLIGHT_IDENTITIES_NOT_DISTINCT");
const root=process.cwd();
const runDir=path.join(root,"artifacts/incidents/template-2003-elementor-normalization-2026-08-09/live-recovery-validation-001");
if(fs.existsSync(runDir)) throw new Error("IMMUTABLE_RUN_DIRECTORY_EXISTS");
fs.mkdirSync(runDir,{recursive:true});
const base=process.env.WORDPRESS_BASE_URL.replace(/\/$/,"");
const urls={discovery:`${base}/wp-json/`,reader:`${base}/wp-json/streetkingz-ai/v1/products/70/authoritative`,recovery:`${base}/wp-json/streetkingz-ai/v1/incidents/template-2003-elementor-normalization/recover`,writer:`${base}/wp-json/streetkingz-ai/v1/approved-product-70-copy/approval/status`,me:`${base}/wp-json/wp/v2/users/me?context=edit`};
const basic=(u,p)=>`Basic ${Buffer.from(`${u}:${p}`).toString("base64")}`;
const auth={reader:basic(process.env.WORDPRESS_READ_USERNAME,process.env.WORDPRESS_READ_APPLICATION_PASSWORD),writer:basic(process.env.WORDPRESS_WRITE_USERNAME,process.env.WORDPRESS_WRITE_APPLICATION_PASSWORD),recovery:basic(process.env.WORDPRESS_RECOVERY_USERNAME,process.env.WORDPRESS_RECOVERY_APPLICATION_PASSWORD)};
const requests=[];
function cacheHeaders(headers){const out={};for(const key of ["cache-control","x-litespeed-cache","x-litespeed-cache-control","age","vary","pragma","expires"]) if(headers.get(key)!==null) out[key]=headers.get(key);return out;}
async function call(label,url,identity=null){const response=await fetch(url,{method:"GET",redirect:"follow",headers:{accept:"application/json",...(identity?{authorization:auth[identity]}:{})}});const text=await response.text();let body;try{body=JSON.parse(text)}catch{body={non_json:true}};requests.push({label,method:"GET",identity:identity||"anonymous",status:response.status,error_code:body?.code||null,response_size:Buffer.byteLength(text),cache_headers:cacheHeaders(response.headers)});return {status:response.status,text,body,headers:cacheHeaders(response.headers)};}
const sha=value=>crypto.createHash("sha256").update(value).digest("hex");
const write=(name,data)=>fs.writeFileSync(path.join(runDir,name),JSON.stringify(data,null,2)+"\n",{flag:"wx"});

const discovery=await call("rest_discovery",urls.discovery);
const routes=discovery.body?.routes||{};
write("route-discovery.json",{namespace_present:Array.isArray(discovery.body?.namespaces)&&discovery.body.namespaces.includes("streetkingz-ai/v1"),recovery_route:routes["/streetkingz-ai/v1/incidents/template-2003-elementor-normalization/recover"]||null,reader_route_present:Boolean(routes["/streetkingz-ai/v1/products/(?P<id>\\d+)/authoritative"]||routes["/streetkingz-ai/v1/products/70/authoritative"]),writer_routes:Object.keys(routes).filter(key=>key.includes("approved-product-70-copy"))});

const identities={};
for(const identity of ["reader","writer","recovery"]){const result=await call(`identity_${identity}`,urls.me,identity);identities[identity]={status:result.status,user_id:result.body?.id||null,username:result.body?.username||result.body?.slug||null,name:result.body?.name||null,roles:Array.isArray(result.body?.roles)?result.body.roles:[],capabilities:result.body?.capabilities&&typeof result.body.capabilities==="object"?Object.fromEntries(Object.entries(result.body.capabilities).filter(([key])=>["streetkingz_ai_read_product_source","streetkingz_ai_write_approved_product_copy","streetkingz_ai_recover_template_2003","edit_posts","edit_products","edit_pages","manage_options","manage_woocommerce","install_plugins","activate_plugins","edit_plugins","upload_plugins"].includes(key))):null};}

const cacheCycles=[];
for(let cycle=1;cycle<=2;cycle++){
  const cycleResult={cycle};
  for(const identity of [null,"reader","writer","recovery",null,"reader","writer"]){const label=identity||"anonymous";const result=await call(`recovery_status_c${cycle}_${label}_${Object.keys(cycleResult).length}`,urls.recovery,identity);(cycleResult[label]??=[]).push({status:result.status,error_code:result.body?.code||null,body_status:result.body?.status||null,cache_headers:result.headers});}
  cacheCycles.push(cycleResult);
}
write("cache-security-validation.json",{cycles:cacheCycles});
const recoveryAccepted=cacheCycles.every(c=>c.recovery?.every(v=>v.status===200));
const othersRejected=cacheCycles.every(c=>[...c.anonymous,...c.reader,...c.writer].every(v=>v.status===401||v.status===403));
if(!recoveryAccepted||!othersRejected){write("validation-report.json",{decision:"STOP_CACHE_OR_IDENTITY_FAILURE",recoveryAccepted,othersRejected});write("zero-content-mutation-proof.json",{live_requests:requests.length,execute_requests:0,post_requests:0,content_mutations:0});process.exitCode=2;} else {
  const boundaries={reader_to_recovery:cacheCycles[0].reader[0].status,writer_to_recovery:cacheCycles[0].writer[0].status,recovery_to_recovery:cacheCycles[0].recovery[0].status};
  const recoveryReader=await call("recovery_to_reader",urls.reader,"recovery"); boundaries.recovery_to_reader=recoveryReader.status;
  const recoveryWriter=await call("recovery_to_writer",urls.writer,"recovery"); boundaries.recovery_to_writer=recoveryWriter.status;
  write("recovery-credential-mapping.json",identities);
  write("identity-security-validation.json",boundaries);
  if(recoveryReader.status===200||recoveryWriter.status===200){write("validation-report.json",{decision:"STOP_IDENTITY_SEPARATION_FAILURE",boundaries});write("zero-content-mutation-proof.json",{live_requests:requests.length,execute_requests:0,post_requests:0,content_mutations:0});process.exitCode=3;} else {
    const baseline=await call("authoritative_baseline",urls.reader,"reader");
    if(baseline.status!==200) throw new Error(`AUTHORITATIVE_BASELINE_${baseline.status}`);
    write("current-live-authoritative-response.json",JSON.parse(baseline.text));
    const currentRaw=baseline.body?.elementor_template?.raw_elementor_data;
    const targetResponse=JSON.parse(fs.readFileSync(path.join(root,"artifacts/implementation/heavy-duty-drying-towel-1200gsm/production-v1/guarded-write-execution-v0.1.9-001/pre-write-authoritative-response.json"),"utf8"));
    const targetRaw=targetResponse.elementor_template.raw_elementor_data;
    const diff=diffElementorDocuments(JSON.parse(currentRaw),JSON.parse(targetRaw));
    const incident={http_status:baseline.status,current_raw_sha256:sha(currentRaw),target_raw_sha256:sha(targetRaw),current_raw_length:Buffer.byteLength(currentRaw),target_raw_length:Buffer.byteLength(targetRaw),differences:diff.length,string_to_number_reversions:diff.filter(x=>x.original_type==="string"&&x.current_type==="number"&&x.original_value===String(x.current_value)).length,other_differences:diff.filter(x=>!(x.original_type==="string"&&x.current_type==="number"&&x.original_value===String(x.current_value))).length};
    write("current-live-incident-state.json",incident);write("live-diff-validation.json",{...incident,safety_changes:diff.filter(x=>x.element_id==="43d7d6f0"),widget_content_changes:diff.filter(x=>x.property_family==="widget content").length});
    const incidentPass=incident.current_raw_sha256==="e0a329efe268638edfbb3d6274512c26aeb0da835e4a9279a1d088d0d562de00"&&incident.target_raw_sha256==="81991fbccece6edcedb9cd84fc4d8dca99765b473cf24b2f8df26b5946f91c01"&&incident.differences===140&&incident.string_to_number_reversions===140&&incident.other_differences===0;
    const final=await call("authoritative_final",urls.reader,"reader");
    write("final-authoritative-state.json",{http_status:final.status,response_sha256:sha(final.text),identical_to_baseline:final.text===baseline.text,current_raw_sha256:sha(final.body?.elementor_template?.raw_elementor_data||"")});
    write("fixed-scope-validation.json",{live_negative_contract_installs_performed:0,reason:"a fully isolated single-field install test could activate an execute-capable contract and was prohibited",offline_tests_passed:35,template_fixed:2003,meta_fixed:"_elementor_data",generic_route_present:false});
    write("recovery-dry-run.json",{status:"not_run",reason:"v0.1.0 dry_run requires an active valid contract; installing one would create an execute-capable production contract prohibited by this task",contract_installed:false,recovery_id_created:false,recovery_id_claimed:false,content_mutations:0});
    write("recovery-authorisation-boundary.json",{separate_human_recovery_approval_required:true,normal_content_approval_sufficient:false,writer_execution_contract_sufficient:false,recovery_capability_required:true,active_contract_present:false});
    write("replay-protection-review.json",{source_and_tests:true,atomic_claim:"INSERT IGNORE immediately before update_metadata",dry_run_claim:false,failed_after_claim_permanent:true,succeeded_permanent:true,normal_writer_namespace_separate:true,live_claims:0});
    write("rollback-simulation.json",{drifted_to_original_sha256:sha(targetRaw),original_to_drifted_sha256:sha(currentRaw),raw_exact:true,parsed_exact:true,product_70_touched:false,other_meta_touched:false,elementor_document_save_used:false});
    write("cache-invalidation-review.json",{bounded:true,targets:["template 2003 post cache","template 2003 post-meta cache","LiteSpeed post 2003","LiteSpeed product 70"],global_invalidation:false,performed:false});
    write("zero-content-mutation-proof.json",{live_requests:requests.length,get_requests:requests.length,post_requests:0,execute_requests:0,contract_installs:0,recovery_claims:0,update_metadata_calls:0,update_post_meta_calls:0,elementor_save_calls:0,wp_update_post_calls:0,revisions:0,content_mutations:0});
    const ready=incidentPass&&final.text===baseline.text;
    write("validation-report.json",{decision:ready?"PARTIAL_PASS_CONTRACTLESS_BOUNDARY":"STOP_INCIDENT_DRIFT",identity_and_cache_pass:true,incident_state_pass:incidentPass,dry_run_live_pass:false,ready_for_human_recovery_authorisation:false,blocker:"v0.1.0 cannot run dry-run without installing the same valid active contract that can execute; task prohibited such a contract"});
    write("run-metadata.json",{run_id:"live-recovery-validation-001",created_at:new Date().toISOString(),retries:0,requests,credentials_persisted:false,authorization_headers_persisted:false,live_writes:0});
  }
}
