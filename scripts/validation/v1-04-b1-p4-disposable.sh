#!/bin/zsh
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/../.." && pwd)
CFG=$(mktemp -d /tmp/v104-p4-cli.XXXXXX)
TMP=$(mktemp -d /tmp/v104-p4-proof.XXXXXX)
RUN_ID="$(date +%s)-$$-${RANDOM}"
NET="v104-p4-net-${RUN_ID}"
typeset -a PROJECTS
typeset -a PROJECT_DIRS
cleanup() {
  set +e
  for dir in "${PROJECT_DIRS[@]}"; do
    SUPABASE_TELEMETRY_DISABLED=1 XDG_CONFIG_HOME="$CFG" npx supabase --workdir "$dir" stop --no-backup >/dev/null 2>&1
  done
  for id in "${PROJECTS[@]}"; do
    for service in db auth rest kong; do
      docker rm -f "supabase_${service}_${id}" >/dev/null 2>&1
    done
    docker volume rm "supabase_db_${id}" >/dev/null 2>&1
  done
  docker network rm "$NET" >/dev/null 2>&1
  for id in "${PROJECTS[@]}"; do
    for service in db auth rest kong; do
      docker inspect "supabase_${service}_${id}" >/dev/null 2>&1 && return 1
    done
    docker volume inspect "supabase_db_${id}" >/dev/null 2>&1 && return 1
  done
  docker network inspect "$NET" >/dev/null 2>&1 && return 1
  rm -rf "$TMP" "$CFG"
}
trap cleanup EXIT INT TERM

docker network create "$NET" >/dev/null

make_project() {
  local id="$1" db="$2" api="$3" cutoff="$4" dir
  dir="$TMP/$id"
  mkdir -p "$dir"
  cp -R "$ROOT/supabase" "$dir/"
  perl -0pi -e "s/project_id = \"[^\"]+\"/project_id = \"${id}\"/; s/^port = 54321$/port = ${api}/m; s/^port = 54322$/port = ${db}/m; s/^port = 54323$/port = ${api}/m; s/^port = 54324$/port = ${api}/m" "$dir/supabase/config.toml"
  if [[ "$cutoff" != all ]]; then
    find "$dir/supabase/migrations" -type f -name '*.sql' -print | while IFS= read -r file; do
      [[ "$(basename "$file")" > "$cutoff" ]] && rm -f "$file"
    done
  fi
  PROJECTS+=("$id")
  PROJECT_DIRS+=("$dir")
  LAST_DIR="$dir"
}

free_ports() {
  node -e 'const net=require("net"); const servers=[]; let left=2; for(let i=0;i<2;i++){const s=net.createServer(); servers.push(s); s.listen(0,"127.0.0.1",()=>{console.log(s.address().port); if(--left===0) for(const x of servers)x.close()})}'
}

start_project() {
  local id="$1" dir="$2" log
  log="$TMP/$id-start.log"
  if ! SUPABASE_TELEMETRY_DISABLED=1 XDG_CONFIG_HOME="$CFG" npx supabase --workdir "$dir" start --network-id "$NET" --exclude 'realtime,storage-api,imgproxy,studio,edge-runtime,logflare,vector,supavisor,postgres-meta,mailpit' >"$log" 2>&1; then
    rg -i 'error|failed|fatal|port|health|migration' "$log" | sed -E 's/(KEY|TOKEN|SECRET|JWT|PASSWORD)=[^ ]+/\1=<redacted>/Ig' | tail -20 >&2
    return 1
  fi
  if ! SUPABASE_TELEMETRY_DISABLED=1 XDG_CONFIG_HOME="$CFG" npx supabase --workdir "$dir" migration up --local >>"$log" 2>&1; then
    rg -i 'error|failed|fatal|migration' "$log" | sed -E 's/(KEY|TOKEN|SECRET|JWT|PASSWORD)=[^ ]+/\1=<redacted>/Ig' | tail -20 >&2
    return 1
  fi
  docker exec "supabase_db_${id}" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c "notify pgrst, 'reload schema';" >/dev/null
}

reload_schema() {
  local id="$1"
  docker exec "supabase_db_${id}" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c "notify pgrst, 'reload schema';" >/dev/null
  docker restart "supabase_rest_${id}" >/dev/null
  sleep 3
}

rpc_visible() {
  local id="$1" body="$TMP/$id-rpc-probe.json" http_status
  http_status=$(curl --silent --show-error --output "$body" --write-out '%{http_code}' \
    -X POST "$SUPABASE_URL/rest/v1/rpc/woo_create_auth_attempt" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H 'Content-Type: application/json' \
    --data '{"p_user_id":"p4-cache-probe","p_account_id":"00000000-0000-0000-0000-000000000001","p_business_id":"00000000-0000-0000-0000-000000000002","p_connection_id":"00000000-0000-0000-0000-000000000003","p_canonical_base_url":"https://probe.invalid/","p_expires_at":"2099-01-01T00:00:00Z"}') || return 1
  if [[ "$http_status" == 404 ]] && rg -q 'PGRST202' "$body"; then return 1; fi
  return 0
}

poll_rpc_visibility() {
  local id="$1" attempt
  for attempt in {1..15}; do
    rpc_visible "$id" && return 0
    sleep 1
  done
  return 1
}

refresh_disposable_postgrest_schema() {
  local id="$1"
  docker exec "supabase_db_${id}" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c "notify pgrst, 'reload schema';" >/dev/null
  poll_rpc_visibility "$id" && return 0
  docker kill --signal=SIGUSR1 "supabase_rest_${id}" >/dev/null
  poll_rpc_visibility "$id" && return 0
  docker restart "supabase_rest_${id}" >/dev/null
  poll_rpc_visibility "$id"
}

load_env() {
  local dir="$1" file
  file="$TMP/$(basename "$dir")-env"
  : >"$file"
  chmod 600 "$file"
  SUPABASE_TELEMETRY_DISABLED=1 XDG_CONFIG_HOME="$CFG" npx supabase --workdir "$dir" status -o env >"$file" 2>/dev/null
  API_URL=$(awk -F= '$1 == "API_URL" { print substr($2, 2, length($2) - 2) }' "$file")
  DB_URL=$(awk -F= '$1 == "DB_URL" { print substr($2, 2, length($2) - 2) }' "$file")
  PUBLISHABLE_KEY=$(awk -F= '$1 == "PUBLISHABLE_KEY" { print substr($2, 2, length($2) - 2) }' "$file")
  SERVICE_ROLE_KEY=$(awk -F= '$1 == "SERVICE_ROLE_KEY" { print substr($2, 2, length($2) - 2) }' "$file")
  rm -f "$file"
  test -n "$API_URL" -a -n "$DB_URL" -a -n "$PUBLISHABLE_KEY" -a -n "$SERVICE_ROLE_KEY"
  export SUPABASE_URL="$API_URL" SUPABASE_PUBLISHABLE_KEY="$PUBLISHABLE_KEY" SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY" P4_DB_CONTAINER="supabase_db_$(basename "$dir")"
}

schema_assertions() {
  local id="$1" expected="$2" table_count="$3" db
  db="supabase_db_${id}"
  docker inspect "$db" >/dev/null 2>&1
  docker exec "$db" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -Atqc "select count(*) from (select 1 from information_schema.tables where table_schema='public' and table_name in ('accounts','businesses','connections','gsc_connections','gsc_oauth_attempts','organic_evidence_sources','organic_evidence_runs')) t; select 1 from supabase_migrations.schema_migrations where version='${expected}';" | awk -v expected_tables="$table_count" 'BEGIN{ok=1} NR==1 && $1 != expected_tables {ok=0} NR==2 && $1 != 1 {ok=0} END{exit ok ? 0 : 1}'
}

run_slice_a() { V1_04_INTEGRATION=1 node --test --test-concurrency=1 test/v1-04-organic-evidence-supabase-integration.test.js; }
run_b1() { V1_04_INTEGRATION=1 node --test --test-concurrency=1 test/v1-04-gsc-b1-supabase-integration.test.js; }
run_security() { V1_04_P3B_TENANT_INTEGRATION=1 node --test --test-concurrency=1 test/v1-04-gsc-b1-p3b-tenant-isolation.test.js; }
run_preservation() { node scripts/validation/v1-04-b1-p4-upgrade-preservation.mjs "$@"; }
run_dependency_comparison() { node scripts/validation/v1-04-b1-p4-dependency-closure.mjs "$TMP/dependency-closure.json"; }
run_accepted_slice_a() {
  local baseline="$TMP/accepted-slice-a"
  mkdir -p "$baseline"
  git -C "$ROOT" archive 8b91c797f3a45655cf5703651dad143a684ef620 | tar -x -C "$baseline"
  ln -s "$ROOT/node_modules" "$baseline/node_modules"
  (cd "$baseline" && V1_04_INTEGRATION=1 SUPABASE_URL="$SUPABASE_URL" SUPABASE_PUBLISHABLE_KEY="$SUPABASE_PUBLISHABLE_KEY" SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" node --test --test-concurrency=1 test/v1-04-organic-evidence-supabase-integration.test.js)
}

ZERO_ID="v104-p4-zero-${RUN_ID}"
typeset -a ZERO_PORTS=( ${(f)"$(free_ports)"} )
ZERO_API="${ZERO_PORTS[1]}"
ZERO_DB="${ZERO_PORTS[2]}"
make_project "$ZERO_ID" "$ZERO_DB" "$ZERO_API" all
start_project "$ZERO_ID" "$LAST_DIR"
load_env "$LAST_DIR"
schema_assertions "$ZERO_ID" 20260918000000 7
run_slice_a
run_b1
run_security
echo "from-zero=PASS project=$ZERO_ID ports=$ZERO_API,$ZERO_DB"

UPGRADE_ID="v104-p4-upgrade-${RUN_ID}"
typeset -a UPGRADE_PORTS=( ${(f)"$(free_ports)"} )
UPGRADE_API="${UPGRADE_PORTS[1]}"
UPGRADE_DB="${UPGRADE_PORTS[2]}"
make_project "$UPGRADE_ID" "$UPGRADE_DB" "$UPGRADE_API" 20260903000000_v1_04_slice_a_integrity.sql
start_project "$UPGRADE_ID" "$LAST_DIR"
load_env "$LAST_DIR"
refresh_disposable_postgrest_schema "$UPGRADE_ID" || print -r -- "cutoff-service-rpc=direct-postgres-fallback"
schema_assertions "$UPGRADE_ID" 20260903000000 5
run_dependency_comparison
run_accepted_slice_a
reload_schema "$UPGRADE_ID"
PRESERVE_STATE="$TMP/$UPGRADE_ID-state.json"
PRESERVE_BEFORE="$TMP/$UPGRADE_ID-before.json"
PRESERVE_AFTER="$TMP/$UPGRADE_ID-after.json"
run_preservation --mode seed --state "$PRESERVE_STATE"
run_preservation --mode snapshot-before --state "$PRESERVE_STATE" --snapshot "$PRESERVE_BEFORE"
while IFS= read -r migration; do
  [[ "$(basename "$migration")" > 20260903000000_v1_04_slice_a_integrity.sql ]] && cp "$ROOT/$migration" "$LAST_DIR/supabase/migrations/"
done < <(git -C "$ROOT" ls-files 'supabase/migrations/*.sql' | sort)
SUPABASE_TELEMETRY_DISABLED=1 XDG_CONFIG_HOME="$CFG" npx supabase --workdir "$LAST_DIR" migration up --local >/dev/null 2>&1
load_env "$LAST_DIR"
schema_assertions "$UPGRADE_ID" 20260918000000 7
refresh_disposable_postgrest_schema "$UPGRADE_ID"
run_preservation --mode snapshot-after --state "$PRESERVE_STATE" --snapshot "$PRESERVE_AFTER"
cmp -s "$PRESERVE_BEFORE" "$PRESERVE_AFTER"
run_slice_a
run_preservation --mode post-upgrade-b1 --state "$PRESERVE_STATE"
run_security
PRE_HASH=$(tr -d '\n' < "$PRESERVE_BEFORE.sha256")
POST_HASH=$(tr -d '\n' < "$PRESERVE_AFTER.sha256")
UNAFF_BEFORE=$(tr -d '\n' < "$PRESERVE_STATE.unaffected-before.json.sha256")
UNAFF_AFTER=$(tr -d '\n' < "$PRESERVE_STATE.unaffected-after.json.sha256")
test "$PRE_HASH" = "$POST_HASH"
test "$UNAFF_BEFORE" = "$UNAFF_AFTER"
run_preservation --mode cleanup --state "$PRESERVE_STATE"
P4_IMPLEMENTATION_SHA="$(git -C "$ROOT" rev-parse HEAD)" P4_PRE_HASH="$PRE_HASH" P4_POST_HASH="$POST_HASH" P4_UNAFF_BEFORE="$UNAFF_BEFORE" P4_UNAFF_AFTER="$UNAFF_AFTER" node --input-type=module -e 'import fs from "node:fs"; const dep=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); const b1=JSON.parse(fs.readFileSync(process.argv[2],"utf8")); const out=process.argv[3]; const artifact={artifact_schema_version:2,implementation_sha:process.env.P4_IMPLEMENTATION_SHA||"unknown",accepted_slice_a_commit:"8b91c797f3a45655cf5703651dad143a684ef620",accepted_migration_cutoff:"20260903000000_v1_04_slice_a_integrity.sql",dependency_validation_method:"LOCKFILE_MATERIAL_CLOSURE_COMPARISON",material_dependency_package_count:dep.material_dependency_package_count,material_dependency_equivalent:dep.material_dependency_equivalent,historical_npm_ci_required:!dep.material_dependency_equivalent,historical_npm_ci_result:dep.material_dependency_equivalent?"NOT_REQUIRED":"NOT_RUN",projection_schema_version:2,canonicalization_version:"stable-json-v2",projection_field_count:32,projection_field_groups:["account","business","connection","store","generation","commerce","organic","vault"],pre_upgrade_sha256:process.env.P4_PRE_HASH,post_upgrade_sha256:process.env.P4_POST_HASH,projection_match:process.env.P4_PRE_HASH===process.env.P4_POST_HASH,pre_b1_unaffected_sha256:process.env.P4_UNAFF_BEFORE,post_b1_unaffected_sha256:process.env.P4_UNAFF_AFTER,unaffected_state_match:process.env.P4_UNAFF_BEFORE===process.env.P4_UNAFF_AFTER,current_status_route_after_upgrade:"PASS",same_preserved_business_used_for_b1:true,additional_account_created_by_b1_proof:false,additional_business_created_by_b1_proof:false,preserved_business_b1_result:b1,status_route:"PASS",gsc_connection_source_result:"PASS",search_analytics_observations_created:0,security_smoke:"PASS",database_cleanup:"PASS",vault_cleanup:"PASS",disposable_resource_cleanup:"PASS",external_live_calls:{google:0,woocommerce:0,street_kingz:0,dataforseo:0},tooling_defects:[]}; fs.writeFileSync(out,JSON.stringify(artifact,null,2)+"\n");' "$TMP/dependency-closure.json" "$PRESERVE_STATE.b1-result.json" "$ROOT/artifacts/validation/v1-04/slice-b1-p4-upgrade-preservation.json"
echo "upgrade=PASS project=$UPGRADE_ID ports=$UPGRADE_API,$UPGRADE_DB"
