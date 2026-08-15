#!/usr/bin/env bash
# Runs the media reservation concurrency proof against a real Postgres.
#
# Offline and destructive only to its own scratch database. It never reads a
# credential, never contacts Supabase, and never touches production data.
#
#   PGHOST=/tmp/pgsock PGPORT=5439 PGUSER=postgres \
#     bash scripts/proof-media-reservation-concurrency.sh
#
# Exits non-zero if any scenario produces the wrong number of winners.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB="${PROOF_DB:-media_reservation_proof}"
WORKERS="${PROOF_WORKERS:-8}"
COMPANY='11111111-1111-1111-1111-111111111111'
GRACE="2 hours"
PSQL=(psql -v ON_ERROR_STOP=1 -q)

fail=0
say() { printf '%s\n' "$*"; }

check() {
  local label="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    say "  PASS  ${label} (${actual})"
  else
    say "  FAIL  ${label} — expected ${expected}, got ${actual}"
    fail=1
  fi
}

# ---------------------------------------------------------------- scratch db
"${PSQL[@]}" -d postgres -c "drop database if exists ${DB};" >/dev/null 2>&1
"${PSQL[@]}" -d postgres -c "create database ${DB};" >/dev/null

# The REAL migration's table DDL, not a hand-copy: everything from the
# `create table` onward, minus the statements that need Supabase's own schemas
# (storage buckets, policies referencing auth helpers, role grants). If the
# table's constraints change, this proof changes with them.
python3 - "$HERE/../supabase/migrations/144_marketing_media_assets.sql" > /tmp/proof-144-table.sql <<'PY'
import sys
sql = open(sys.argv[1]).read()
start = sql.index('create table if not exists public.marketing_media_assets')
body = sql[start:]
# Stop before the RLS/policy/grant section: those reference roles and helper
# functions that only exist inside a Supabase project.
body = body[: body.index('alter table public.marketing_media_assets enable row level security')]
sys.stdout.write(body)
PY

# Scaffolding and the claim function first (a plpgsql body is not resolved
# until it is called, so the table may follow), then the real table DDL.
"${PSQL[@]}" -d "${DB}" -f "$HERE/proof-media-reservation-concurrency.sql" >/dev/null 2>&1 || exit 1
"${PSQL[@]}" -d "${DB}" -f /tmp/proof-144-table.sql >/dev/null 2>&1 || exit 1

# Waits until every worker is parked at the barrier, then releases them all.
# Arrivals are counted from pg_locks because a worker's uncommitted rows are
# invisible here by design — which is exactly the state being waited for.
release_when_all_arrived() {
  local expected="$1" waited=0 arrived
  while [ "${waited}" -lt 400 ]; do
    arrived="$("${PSQL[@]}" -d "${DB}" -tAc \
      "select count(*) from pg_locks where locktype = 'advisory' and classid = 424242;")"
    if [ "${arrived}" -ge "${expected}" ]; then break; fi
    sleep 0.05
    waited=$((waited + 1))
  done
  "${PSQL[@]}" -d "${DB}" -c "update public.proof_gate set open = true;" >/dev/null
}

# $1 scenario, $2 setup SQL, $3 claim function, $4 "barrier" to rendezvous
run_scenario() {
  local scenario="$1" setup="$2" fn="${3:-public.proof_reserve_media}" mode="${4:-}"
  "${PSQL[@]}" -d "${DB}" -c "delete from public.marketing_media_assets;" >/dev/null
  "${PSQL[@]}" -d "${DB}" -c "delete from public.proof_results where scenario = '${scenario}';" >/dev/null
  "${PSQL[@]}" -d "${DB}" -c \
    "delete from public.proof_gate; insert into public.proof_gate values (false);" >/dev/null
  if [ -n "${setup}" ]; then
    "${PSQL[@]}" -d "${DB}" -c "${setup}" >/dev/null
  fi

  # Every worker is its own OS process and its own connection — a real race,
  # not interleaved statements on one session.
  local worker worker_arg
  for worker in $(seq 1 "${WORKERS}"); do
    worker_arg="null"
    if [ "${mode}" = "barrier" ]; then worker_arg="${worker}"; fi
    "${PSQL[@]}" -d "${DB}" -c "
      insert into public.proof_results (worker, scenario, decision)
      select ${worker}, '${scenario}',
             ${fn}('${COMPANY}'::uuid, 'job-race', now(), interval '${GRACE}',
                   ${worker_arg}, '${scenario}');" >/dev/null &
  done

  if [ "${mode}" = "barrier" ]; then
    release_when_all_arrived "${WORKERS}"
  else
    "${PSQL[@]}" -d "${DB}" -c "update public.proof_gate set open = true;" >/dev/null
  fi
  wait
}

count() {
  "${PSQL[@]}" -d "${DB}" -tAc \
    "select count(*) from public.proof_results where scenario = '$1' and decision = '$2';"
}
rows() {
  "${PSQL[@]}" -d "${DB}" -tAc \
    "select count(*) from public.marketing_media_assets where source_job_id = 'job-race';"
}

say ""
say "Media reservation under real concurrency (${WORKERS} OS processes per scenario)"
say ""

# 1. No row. Exactly one caller may create it. No barrier is needed: the
#    contention is inside the INSERT itself and the constraint arbitrates.
run_scenario "fresh" ""
check "a brand-new job yields exactly one UPLOAD" 1 "$(count fresh UPLOAD)"
check "the losers are told IN_PROGRESS, never UPLOAD" "$((WORKERS - 1))" "$(count fresh IN_PROGRESS)"
check "and the constraint left exactly one row" 1 "$(rows)"

# 2. Already stored. Nobody uploads.
run_scenario "stored" "insert into public.marketing_media_assets
  (company_id, source_job_id, bucket, object_key, upload_state, stored_at)
  values ('${COMPANY}', 'job-race', 'marketing-media',
          '${COMPANY}/video/job-race.mp4', 'stored', now());"
check "a stored asset is never re-uploaded" 0 "$(count stored UPLOAD)"
check "every caller is told ALREADY_STORED" "${WORKERS}" "$(count stored ALREADY_STORED)"

# 3. A failed attempt. Exactly one may retry it. Barrier: the contention is in
#    the UPDATE, and without a rendezvous the losers return before reaching it.
run_scenario "failed" "insert into public.marketing_media_assets
  (company_id, source_job_id, bucket, object_key, upload_state)
  values ('${COMPANY}', 'job-race', 'marketing-media',
          '${COMPANY}/video/job-race.mp4', 'failed');" \
  public.proof_reserve_media barrier
check "a failed upload yields exactly one retry" 1 "$(count failed UPLOAD)"
check "the rest stand down" "$((WORKERS - 1))" "$(count failed IN_PROGRESS)"

# 4. A stale reservation. Exactly one may take it over. This is the scenario a
#    non-exclusive `in ('failed','pending')` predicate silently fails.
run_scenario "stale" "insert into public.marketing_media_assets
  (company_id, source_job_id, bucket, object_key, upload_state, created_at, updated_at)
  values ('${COMPANY}', 'job-race', 'marketing-media',
          '${COMPANY}/video/job-race.mp4', 'pending',
          now() - interval '9 hours', now() - interval '9 hours');" \
  public.proof_reserve_media barrier
check "a stale reservation is taken over by exactly one caller" 1 "$(count stale UPLOAD)"
check "the rest stand down" "$((WORKERS - 1))" "$(count stale IN_PROGRESS)"

# 5. A fresh reservation. Nobody may take it.
run_scenario "inflight" "insert into public.marketing_media_assets
  (company_id, source_job_id, bucket, object_key, upload_state)
  values ('${COMPANY}', 'job-race', 'marketing-media',
          '${COMPANY}/video/job-race.mp4', 'pending');"
check "an in-flight upload is never duplicated" 0 "$(count inflight UPLOAD)"
check "every caller is told IN_PROGRESS" "${WORKERS}" "$(count inflight IN_PROGRESS)"

# 6. CONTROL. The predicate the module must NOT use, run through the SAME
#    barrier and the same scenario. If this does not produce more than one
#    winner then the proof above is not exercising the race, and its passes
#    mean nothing.
"${PSQL[@]}" -d "${DB}" -c "
  create or replace function public.proof_reserve_media_nonexclusive(
    p_company uuid, p_job text, p_now timestamptz, p_grace interval,
    p_worker int default null, p_scenario text default null
  ) returns text language plpgsql as \$\$
  declare v_id uuid; v_state text; v_updated timestamptz; v_rows int;
  begin
    begin
      insert into public.marketing_media_assets
        (company_id, source_job_id, bucket, object_key, upload_state)
      values (p_company, p_job, 'marketing-media',
              p_company::text || '/video/' || p_job || '.mp4', 'pending');
      return 'UPLOAD';
    exception when unique_violation then null; end;
    select id, upload_state, updated_at into v_id, v_state, v_updated
      from public.marketing_media_assets
     where company_id = p_company and source_job_id = p_job;
    if v_state = 'stored' then return 'ALREADY_STORED'; end if;
    if v_state = 'pending' and p_now - v_updated <= p_grace then return 'IN_PROGRESS'; end if;
    if p_worker is not null then
      perform public.proof_wait_at_barrier(p_worker, p_scenario);
    end if;
    update public.marketing_media_assets set upload_state = 'pending', stored_at = null
     where id = v_id and upload_state in ('failed', 'pending');
    get diagnostics v_rows = row_count;
    if v_rows = 0 then return 'IN_PROGRESS'; end if;
    return 'UPLOAD';
  end \$\$;" >/dev/null

run_scenario "control" "insert into public.marketing_media_assets
  (company_id, source_job_id, bucket, object_key, upload_state)
  values ('${COMPANY}', 'job-race', 'marketing-media',
          '${COMPANY}/video/job-race.mp4', 'failed');" \
  public.proof_reserve_media_nonexclusive barrier

control_winners="$(count control UPLOAD)"
if [ "${control_winners}" -gt 1 ]; then
  say "  PASS  CONTROL — the rejected predicate really does admit ${control_winners} winners"
else
  say "  FAIL  CONTROL — the rejected predicate produced ${control_winners} winner(s); this proof is not exercising the race"
  fail=1
fi

"${PSQL[@]}" -d postgres -c "drop database if exists ${DB};" >/dev/null 2>&1

say ""
if [ "${fail}" -eq 0 ]; then
  say "All media reservation concurrency checks passed."
else
  say "Media reservation concurrency proof FAILED."
fi
exit "${fail}"
