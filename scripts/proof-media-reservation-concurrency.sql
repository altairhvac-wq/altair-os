-- Concurrency proof for the media reservation claim (independent audit P2-4).
--
-- ======================== WHAT THIS PROVES ========================
-- That the SEQUENCE OF STATEMENTS `reserveMediaUpload` issues admits exactly
-- one winner under real concurrency, against a real Postgres — not that a
-- mock returned what a mock was told to return.
--
-- The claim has two halves and they fail in different ways, so both are
-- exercised:
--
--   1. FIRST RESERVATION. Two callers, no row. Both INSERT; the unique
--      constraint on (company_id, source_job_id) lets exactly one commit and
--      raises 23505 at the other. This is why the module inserts first and
--      interprets the error, instead of reading, deciding, and then writing.
--
--   2. RE-CLAIM. A row exists in `failed`, or in `pending` past the grace.
--      Here the danger is subtler: under READ COMMITTED a blocked UPDATE
--      re-evaluates its WHERE clause against the row version the WINNER just
--      committed. A predicate of `upload_state in ('failed','pending')` still
--      matches that row, so BOTH callers would win. Each branch is therefore
--      written so the winner's own write falsifies the loser's predicate.
--
-- ==================== WHAT IT DELIBERATELY DOES NOT DO ====================
-- It contacts no Supabase project, reads no credential and touches no
-- production data. It runs against a scratch database created and dropped by
-- `proof-media-reservation-concurrency.sh`.

\set ON_ERROR_STOP on

-- --------------------------------------------------------------- scaffolding
-- The two objects migration 144 depends on, reproduced minimally so the real
-- table DDL below can be applied verbatim.
create table if not exists public.companies (id uuid primary key);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

insert into public.companies (id)
values ('11111111-1111-1111-1111-111111111111')
on conflict do nothing;

-- ------------------------------------------------------------------ barrier
-- A rendezvous, so every worker reaches the contended statement at once.
--
-- Arrival is announced with a SESSION-level advisory lock rather than a row,
-- because a worker's rows are invisible to the coordinator until the worker
-- commits — which is precisely what the coordinator is waiting for it not to
-- do yet. An advisory lock shows up in `pg_locks` immediately.
create table if not exists public.proof_gate (open boolean not null);

/** Namespace for the arrival locks, so the coordinator can count them. */
create or replace function public.proof_barrier_class() returns int
language sql immutable as $$ select 424242 $$;

create or replace function public.proof_wait_at_barrier(p_worker int, p_scenario text)
returns void language plpgsql as $$
declare
  v_waited int := 0;
begin
  perform p_scenario;  -- label only; kept for readability at the call site
  perform pg_advisory_lock(public.proof_barrier_class(), p_worker);

  while v_waited < 1200 loop
    if exists (select 1 from public.proof_gate where open) then
      return;
    end if;
    perform pg_sleep(0.05);
    v_waited := v_waited + 1;
  end loop;
  raise exception 'barrier timed out';
end $$;

-- ------------------------------------------------------- the claim, in SQL
-- A branch-for-branch transcription of `reserveMediaUpload`. Each statement
-- here is the statement the module issues, in the order it issues it; the
-- structural guards in `verify-marketing-media.mjs` are what keep the module
-- from drifting away from this shape.
create or replace function public.proof_reserve_media(
  p_company uuid,
  p_job text,
  p_now timestamptz,
  p_grace interval,
  p_worker int default null,
  p_scenario text default null
) returns text language plpgsql as $$
declare
  v_key text := p_company::text || '/video/' || p_job || '.mp4';
  v_id uuid;
  v_state text;
  v_updated timestamptz;
  v_rows int;
begin
  -- 1. INSERT FIRST. The constraint arbitrates; there is no read-then-write
  --    window for a second caller to slip through.
  begin
    insert into public.marketing_media_assets
      (company_id, source_job_id, bucket, object_key, upload_state)
    values (p_company, p_job, 'marketing-media', v_key, 'pending');
    return 'UPLOAD';
  exception when unique_violation then
    null;  -- someone else created it; its state decides what happens next
  end;

  select id, upload_state, updated_at
    into v_id, v_state, v_updated
    from public.marketing_media_assets
   where company_id = p_company and source_job_id = p_job;

  if v_state = 'stored' then
    return 'ALREADY_STORED';
  end if;

  if v_state = 'pending' and p_now - v_updated <= p_grace then
    return 'IN_PROGRESS';
  end if;

  -- BARRIER. Without it the race is not actually run: the first caller
  -- commits before the others have finished reading, they see a fresh
  -- `pending` and return IN_PROGRESS at the check above — so every predicate,
  -- exclusive or not, looks correct. Holding every caller here until all have
  -- decided puts them all at the UPDATE together, which is the only state in
  -- which the difference between the two predicates is observable.
  if p_worker is not null then
    perform public.proof_wait_at_barrier(p_worker, p_scenario);
  end if;

  -- 2. RE-CLAIM, exclusively. Two branches, each falsified by the winner.
  if v_state = 'failed' then
    update public.marketing_media_assets
       set upload_state = 'pending', stored_at = null
     where id = v_id and upload_state = 'failed';
  else
    update public.marketing_media_assets
       set upload_state = 'pending', stored_at = null
     where id = v_id
       and upload_state = 'pending'
       and updated_at <= p_now - p_grace;
  end if;

  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    return 'IN_PROGRESS';
  end if;
  return 'UPLOAD';
end $$;

-- Records what each concurrent worker was told, so the outcome can be counted
-- after the fact rather than inferred from timing.
create table if not exists public.proof_results (
  worker int not null,
  scenario text not null,
  decision text not null
);
