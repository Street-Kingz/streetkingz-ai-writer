#!/bin/zsh
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/../.." && pwd)
TMP=$(mktemp -d /tmp/v104-p4-combined.XXXXXX)
trap 'rm -rf "$TMP"' EXIT INT TERM
unset V1_02_INTEGRATION V1_03_INTEGRATION V1_03_ACCEPTANCE_HARNESS_INTEGRATION V1_04_INTEGRATION V1_04_P2_INTEGRATION V1_04_P2A_INTEGRATION V1_04_P2B_INTEGRATION V1_04_P3A_INTEGRATION V1_04_P3A1_INTEGRATION V1_04_P3A2_INTEGRATION V1_04_P3A3_INTEGRATION V1_04_P3B_HARNESS_INTEGRATION V1_04_P3B_TENANT_INTEGRATION

set -a
eval "$(cd "$ROOT" && npx supabase status -o env 2>/dev/null | grep -E '^(API_URL|PUBLISHABLE_KEY|SERVICE_ROLE_KEY)=')"
set +a
case "$API_URL" in http://127.0.0.1:*|http://localhost:*) ;; *) print -u2 "normal Supabase API is not loopback"; exit 1 ;; esac
export SUPABASE_URL="$API_URL" SUPABASE_PUBLISHABLE_KEY="$PUBLISHABLE_KEY" SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"

run_suite() {
  local name="$1" flag="$2" files="$3" log started ended exit_status summary
  log="$TMP/$name.tap"
  started=$(date +%s)
  unset V1_02_INTEGRATION V1_03_INTEGRATION V1_03_ACCEPTANCE_HARNESS_INTEGRATION V1_04_INTEGRATION V1_04_P2_INTEGRATION V1_04_P2A_INTEGRATION V1_04_P2B_INTEGRATION V1_04_P3A_INTEGRATION V1_04_P3A1_INTEGRATION V1_04_P3A2_INTEGRATION V1_04_P3A3_INTEGRATION V1_04_P3B_HARNESS_INTEGRATION V1_04_P3B_TENANT_INTEGRATION
  if [[ -n "$flag" ]]; then export "$flag=1"; fi
  if [[ "$name" == "v1-03-harness" ]]; then export V1_03_ACCEPTANCE_HARNESS=1; fi
  set +e
  (cd "$ROOT" && perl -e 'alarm 1800; exec @ARGV' -- node --test --test-concurrency=1 $=files) >"$log" 2>&1
  exit_status=$?
  set -e
  ended=$(date +%s)
  summary=$(rg '^# (tests|pass|fail|skipped|todo) ' "$log" | tail -5 | tr '\n' ';' || true)
  print "suite=$name exit=$exit_status duration=$((ended-started))s $summary"
  if (( exit_status != 0 )); then sed -E 's/(KEY|TOKEN|SECRET|PASSWORD)=[^ ]+/\1=<redacted>/Ig' "$log" | tail -30 >&2; return $exit_status; fi
  rg -q '^1\.\.1|^1\.\.([0-9]+)' "$log"
}

run_suite p1 "" "test/v1-04-b1-p1.test.js"
run_suite b1-focused "" "test/v1-04-gsc-b1.test.js"
run_suite b1-route-vault V1_04_INTEGRATION "test/v1-04-gsc-b1-supabase-integration.test.js"
run_suite p2-grouped V1_04_P2_INTEGRATION "test/v1-04-gsc-b1-p2-integration.test.js"
run_suite p2-a V1_04_P2A_INTEGRATION "test/v1-04-gsc-b1-p2a-failures.test.js"
run_suite p2-b V1_04_P2B_INTEGRATION "test/v1-04-gsc-b1-p2b-races.test.js"
run_suite p3-a V1_04_P3A_INTEGRATION "test/v1-04-gsc-b1-p3a-lifecycle.test.js"
run_suite p3-a1 V1_04_P3A1_INTEGRATION "test/v1-04-gsc-b1-p3a1-reconnect.test.js"
run_suite p3-a2 V1_04_P3A2_INTEGRATION "test/v1-04-gsc-b1-p3a2-reauth.test.js"
run_suite p3-a3 V1_04_P3A3_INTEGRATION "test/v1-04-gsc-b1-p3a3-disconnect-races.test.js"
run_suite p3-b-harness V1_04_P3B_HARNESS_INTEGRATION "test/v1-04-gsc-b1-p3b-acceptance-http.test.js"
run_suite p3-b-tenant V1_04_P3B_TENANT_INTEGRATION "test/v1-04-gsc-b1-p3b-tenant-isolation.test.js"
run_suite slice-a V1_04_INTEGRATION "test/v1-04-organic-evidence-supabase-integration.test.js"
run_suite v1-02 V1_02_INTEGRATION "test/v1-02-supabase-integration.test.js"
run_suite v1-03 V1_03_INTEGRATION "test/v1-03-supabase-integration.test.js test/v1-03-commerce-supabase-integration.test.js"
run_suite v1-03-incremental V1_03_INTEGRATION "test/v1-03-incremental-supabase-integration.test.js"
run_suite v1-03-pagination V1_03_INTEGRATION "test/v1-03-snapshot-pagination-supabase-integration.test.js"
run_suite v1-03-harness V1_03_ACCEPTANCE_HARNESS_INTEGRATION "test/v1-03-acceptance-harness-integration.test.js"
print "combined=P1-P3 PASS"
