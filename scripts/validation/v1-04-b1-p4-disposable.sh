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
  for name in $(docker ps -a --format '{{.Names}}' | rg '^supabase_.*v104-p4-'); do
    docker rm -f "$name" >/dev/null 2>&1
  done
  for name in $(docker volume ls --format '{{.Name}}' | rg 'v104-p4'); do
    docker volume rm "$name" >/dev/null 2>&1
  done
  docker network rm "$NET" >/dev/null 2>&1
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
  export SUPABASE_URL="$API_URL" SUPABASE_PUBLISHABLE_KEY="$PUBLISHABLE_KEY" SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"
}

schema_assertions() {
  local id="$1" expected="$2" table_count="$3" db
  db="supabase_db_${id}"
  docker inspect "$db" >/dev/null 2>&1
  docker exec "$db" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -Atqc "select count(*) from (select 1 from information_schema.tables where table_schema='public' and table_name in ('accounts','businesses','connections','gsc_connections','gsc_oauth_attempts','organic_evidence_sources','organic_evidence_runs')) t; select 1 from supabase_migrations.schema_migrations where version='${expected}';" | awk -v expected_tables="$table_count" 'BEGIN{ok=1} NR==1 && $1 != expected_tables {ok=0} NR==2 && $1 != 1 {ok=0} END{exit ok ? 0 : 1}'
}

run_slice_a() { V1_04_INTEGRATION=1 node --test --test-concurrency=1 test/v1-04-organic-evidence-supabase-integration.test.js; }
run_b1() { V1_04_INTEGRATION=1 node --test --test-concurrency=1 test/v1-04-gsc-b1-supabase-integration.test.js; }

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
echo "from-zero=PASS project=$ZERO_ID ports=$ZERO_API,$ZERO_DB"

UPGRADE_ID="v104-p4-upgrade-${RUN_ID}"
typeset -a UPGRADE_PORTS=( ${(f)"$(free_ports)"} )
UPGRADE_API="${UPGRADE_PORTS[1]}"
UPGRADE_DB="${UPGRADE_PORTS[2]}"
make_project "$UPGRADE_ID" "$UPGRADE_DB" "$UPGRADE_API" 20260903000000_v1_04_slice_a_integrity.sql
start_project "$UPGRADE_ID" "$LAST_DIR"
load_env "$LAST_DIR"
schema_assertions "$UPGRADE_ID" 20260903000000 5
run_slice_a
for migration in "${ROOT}"/supabase/migrations/*.sql; do
  [[ "$(basename "$migration")" > 20260903000000_v1_04_slice_a_integrity.sql ]] && cp "$migration" "$LAST_DIR/supabase/migrations/"
done
SUPABASE_TELEMETRY_DISABLED=1 XDG_CONFIG_HOME="$CFG" npx supabase --workdir "$LAST_DIR" migration up --local >/dev/null 2>&1
load_env "$LAST_DIR"
schema_assertions "$UPGRADE_ID" 20260918000000 7
run_slice_a
run_b1
echo "upgrade=PASS project=$UPGRADE_ID ports=$UPGRADE_API,$UPGRADE_DB"
