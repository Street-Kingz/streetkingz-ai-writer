#!/bin/zsh
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
TMP=$(mktemp -d /tmp/v105-slice-b.XXXXXX)
CFG=$(mktemp -d /tmp/v105-slice-b-cli.XXXXXX)
ID="v105-slice-b-$(date +%s)-$$"
API=55431
DB=55432
cleanup() { set +e; SUPABASE_TELEMETRY_DISABLED=1 XDG_CONFIG_HOME="$CFG" npx supabase --workdir "$TMP" stop --no-backup >/dev/null 2>&1; docker rm -f "supabase_db_$ID" "supabase_auth_$ID" "supabase_rest_$ID" "supabase_kong_$ID" >/dev/null 2>&1; docker volume rm "supabase_db_$ID" >/dev/null 2>&1; rm -rf "$TMP" "$CFG"; }
trap cleanup EXIT INT TERM
mkdir -p "$TMP"
cp -R "$ROOT/supabase" "$TMP/"
perl -0pi -e "s/project_id = \"[^\"]+\"/project_id = \"$ID\"/; s/^port = 54321$/port = $API/m; s/^port = 54322$/port = $DB/m; s/^port = 54323$/port = $API/m; s/^port = 54324$/port = $API/m" "$TMP/supabase/config.toml"
SUPABASE_TELEMETRY_DISABLED=1 XDG_CONFIG_HOME="$CFG" npx supabase --workdir "$TMP" start --network-id "v105-slice-b-net-$$" --exclude 'realtime,storage-api,imgproxy,studio,edge-runtime,logflare,vector,supavisor,postgres-meta,mailpit' >/dev/null
SUPABASE_TELEMETRY_DISABLED=1 XDG_CONFIG_HOME="$CFG" npx supabase --workdir "$TMP" migration up --local >/dev/null
DB_CONTAINER="supabase_db_$ID"
docker exec "$DB_CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f /dev/stdin < "$ROOT/supabase/tests/security-posture.sql"
docker exec "$DB_CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -Atqc "select count(*) from supabase_migrations.schema_migrations where version='20260929000000'; select column_name from information_schema.columns where table_schema='public' and table_name='businesses' and column_name in ('primary_market','primary_language'); select proname from pg_proc where proname in ('product_set_business_locale','claim_candidate_interpretation_batch'); select column_name from information_schema.columns where table_schema='public' and table_name='organic_candidate_evaluation_runs' and column_name in ('retry_used','estimated_cost_usd','cost_status'); select column_name from information_schema.columns where table_schema='public' and table_name='organic_candidate_interpretation_batches' and column_name in ('claim_token','claimed_at','claim_expires_at','response_id');" | sort
echo "from-zero=PASS migration_count=33 security_posture=PASS"
