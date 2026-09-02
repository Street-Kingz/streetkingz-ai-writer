#!/bin/zsh
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/../.." && pwd)
CFG=$(mktemp -d /tmp/v104-p4-cli.XXXXXX)
TMP=$(mktemp -d /tmp/v104-p4-proof.XXXXXX)
NET="v104-p4-net-$(date +%s)"
typeset -a PROJECTS
trap 'set +e; for id in "${PROJECTS[@]}"; do SUPABASE_TELEMETRY_DISABLED=1 XDG_CONFIG_HOME="$CFG" npx supabase stop --project-id "$id" --no-backup >/dev/null 2>&1; done; docker network rm "$NET" >/dev/null 2>&1; rm -rf "$TMP" "$CFG"' EXIT INT TERM

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
  echo "$dir"
}

start_project() {
  local id="$1" dir="$2" log
  log="$TMP/$id-start.log"
  SUPABASE_TELEMETRY_DISABLED=1 XDG_CONFIG_HOME="$CFG" npx supabase --workdir "$dir" start --network-id "$NET" --exclude 'realtime,storage-api,imgproxy,studio,edge-runtime,logflare,vector,supavisor,postgres-meta,mailpit' >"$log" 2>&1
  SUPABASE_TELEMETRY_DISABLED=1 XDG_CONFIG_HOME="$CFG" npx supabase --workdir "$dir" migration up --local >>"$log" 2>&1
}

load_env() {
  local dir="$1" file
  file="$TMP/$(basename "$dir")-env"
  chmod 600 "$file"
  SUPABASE_TELEMETRY_DISABLED=1 XDG_CONFIG_HOME="$CFG" npx supabase --workdir "$dir" status -o env >"$file" 2>/dev/null
  API_URL=$(sed -n 's/^API_URL=//p' "$file")
  DB_URL=$(sed -n 's/^DB_URL=//p' "$file")
  PUBLISHABLE_KEY=$(sed -n 's/^PUBLISHABLE_KEY=//p' "$file")
  SERVICE_ROLE_KEY=$(sed -n 's/^SERVICE_ROLE_KEY=//p' "$file")
  rm -f "$file"
  test -n "$API_URL" -a -n "$DB_URL" -a -n "$PUBLISHABLE_KEY" -a -n "$SERVICE_ROLE_KEY"
  export SUPABASE_URL="$API_URL" SUPABASE_PUBLISHABLE_KEY="$PUBLISHABLE_KEY" SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"
}

schema_assertions() {
  local id="$1" expected="$2" db="supabase_db_${id}"
  docker inspect "$db" >/dev/null 2>&1
  docker exec "$db" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -Atqc "select 1 from information_schema.tables where table_schema='public' and table_name='gsc_connections'; select 1 from information_schema.tables where table_schema='public' and table_name='organic_evidence_sources'; select 1 from supabase_migrations.schema_migrations where version='${expected}';" | grep -c '^1$' | grep -qx 3
}

run_slice_a() { V1_04_INTEGRATION=1 node --test --test-concurrency=1 test/v1-04-organic-evidence-supabase-integration.test.js; }
run_b1() { V1_04_INTEGRATION=1 node --test --test-concurrency=1 test/v1-04-gsc-b1-supabase-integration.test.js; }

ZERO=$(make_project v104-p4-zero-final 59422 59421 all)
start_project v104-p4-zero-final "$ZERO"
load_env "$ZERO"
schema_assertions v104-p4-zero-final 20260918000000
run_slice_a
run_b1
echo 'from-zero=PASS project=v104-p4-zero-final ports=59421-59439'

UPGRADE=$(make_project v104-p4-upgrade-final 60422 60421 20260903000000_v1_04_slice_a_integrity.sql)
start_project v104-p4-upgrade-final "$UPGRADE"
load_env "$UPGRADE"
schema_assertions v104-p4-upgrade-final 20260903000000
run_slice_a
cp "$ROOT"/supabase/migrations/2026090[4-9]*.sql "$UPGRADE/supabase/migrations/"
cp "$ROOT"/supabase/migrations/2026091*.sql "$UPGRADE/supabase/migrations/"
SUPABASE_TELEMETRY_DISABLED=1 XDG_CONFIG_HOME="$CFG" npx supabase --workdir "$UPGRADE" migration up --local >/dev/null 2>&1
load_env "$UPGRADE"
schema_assertions v104-p4-upgrade-final 20260918000000
run_slice_a
run_b1
echo 'upgrade=PASS project=v104-p4-upgrade-final ports=60421-60439'
