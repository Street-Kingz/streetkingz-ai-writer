#!/bin/zsh
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
TMP=$(mktemp -d /tmp/v105-slice-c.XXXXXX)
CFG=$(mktemp -d /tmp/v105-slice-c-cli.XXXXXX)
RUN_ID="$(date +%s)-$$-${RANDOM}"
ID="v105-slice-c-${RUN_ID}"
NET="v105-slice-c-net-${RUN_ID}"
REPORT="$TMP/e2e-report.json"
cleanup() {
  set +e
  SUPABASE_TELEMETRY_DISABLED=1 XDG_CONFIG_HOME="$CFG" npx supabase --workdir "$TMP" stop --no-backup >/dev/null 2>&1
  for service in db auth rest kong; do docker rm -f "supabase_${service}_${ID}" >/dev/null 2>&1; done
  docker volume rm "supabase_db_${ID}" >/dev/null 2>&1
  docker network rm "$NET" >/dev/null 2>&1
  rm -rf "$TMP" "$CFG"
}
trap cleanup EXIT INT TERM

free_ports() {
  node -e 'const net=require("net"); const servers=[]; let left=4; for(let i=0;i<4;i++){const s=net.createServer(); servers.push(s); s.listen(0,"127.0.0.1",()=>{console.log(s.address().port); if(--left===0) for(const x of servers)x.close()})}'
}

typeset -a PORTS=( ${(f)"$(free_ports)"} )
API="${PORTS[1]}"
DB="${PORTS[2]}"
STUDIO="${PORTS[3]}"
SMTP="${PORTS[4]}"

cp -R "$ROOT/supabase" "$TMP/"
perl -0pi -e "s/project_id = \"[^\"]+\"/project_id = \"$ID\"/; s/^port = 54321$/port = $API/m; s/^port = 54322$/port = $DB/m; s/^port = 54323$/port = $STUDIO/m; s/^port = 54324$/port = $SMTP/m" "$TMP/supabase/config.toml"

docker network create "$NET" >/dev/null
SUPABASE_TELEMETRY_DISABLED=1 XDG_CONFIG_HOME="$CFG" npx supabase --workdir "$TMP" start --network-id "$NET" --exclude 'realtime,storage-api,imgproxy,studio,edge-runtime,logflare,vector,supavisor,postgres-meta,mailpit' >/dev/null
SUPABASE_TELEMETRY_DISABLED=1 XDG_CONFIG_HOME="$CFG" npx supabase --workdir "$TMP" migration up --local >/dev/null

envfile="$TMP/supabase-env"
: > "$envfile"
chmod 600 "$envfile"
SUPABASE_TELEMETRY_DISABLED=1 XDG_CONFIG_HOME="$CFG" npx supabase --workdir "$TMP" status -o env >"$envfile" 2>/dev/null
API_URL=$(awk -F= '$1 == "API_URL" { print substr($2, 2, length($2) - 2) }' "$envfile")
PUBLISHABLE_KEY=$(awk -F= '$1 == "PUBLISHABLE_KEY" { print substr($2, 2, length($2) - 2) }' "$envfile")
SERVICE_ROLE_KEY=$(awk -F= '$1 == "SERVICE_ROLE_KEY" { print substr($2, 2, length($2) - 2) }' "$envfile")
rm -f "$envfile"

test -n "$API_URL" -a -n "$PUBLISHABLE_KEY" -a -n "$SERVICE_ROLE_KEY"
DB_CONTAINER="supabase_db_$ID"
EXPECTED=$(find "$ROOT/supabase/migrations" -maxdepth 1 -name '*.sql' -print | wc -l | tr -d ' ')
APPLIED=$(docker exec "$DB_CONTAINER" psql -U postgres -d postgres -Atqc "select count(*) from supabase_migrations.schema_migrations")
[[ "$EXPECTED" == "$APPLIED" ]]
docker exec "$DB_CONTAINER" psql -U postgres -d postgres -Atqc "select 1 from supabase_migrations.schema_migrations where version='20260931000000'" | grep -qx 1
docker exec "$DB_CONTAINER" psql -U postgres -d postgres -Atqc "select 1 from information_schema.tables where table_schema='public' and table_name='organic_recommendations'" | grep -qx 1

docker exec "$DB_CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f /dev/stdin < "$ROOT/supabase/tests/security-posture.sql" >/dev/null

docker exec "$DB_CONTAINER" psql -U postgres -d postgres -c "notify pgrst, 'reload schema';" >/dev/null
sleep 2
(
  cd "$ROOT"
  NODE_ENV=test \
  SUPABASE_URL="$API_URL" \
  SUPABASE_PUBLISHABLE_KEY="$PUBLISHABLE_KEY" \
  SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY" \
  PRODUCT_ALLOWED_ORIGINS="http://127.0.0.1" \
  V1_05_SLICE_C_E2E_REPORT="$REPORT" \
  node scripts/validation/v1-05-slice-c-e2e.mjs
)

node -e 'const r=require(process.argv[1]); if(r.result!=="PASS") process.exit(1)' "$REPORT"
echo "from-zero=PASS migration_count=$EXPECTED migration37=PASS security_posture=PASS authenticated_two_tenant_e2e=PASS ports=$API,$DB"
