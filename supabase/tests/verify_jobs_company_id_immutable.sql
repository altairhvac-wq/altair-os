-- Manual verification script for migration 114_prevent_jobs_company_id_change.sql.
--
-- Purpose: prove that public.jobs.company_id cannot be changed by an ordinary
-- UPDATE once a row exists, while unrelated columns and no-op company_id
-- writes continue to work.
--
-- This is not part of an automated test suite (the repository has none for
-- the database layer). Run it manually against a disposable/local Supabase
-- Postgres connection, e.g.:
--
--   psql "$DATABASE_URL" -f supabase/tests/verify_jobs_company_id_immutable.sql
--
-- The script runs entirely inside one transaction and ROLLBACKs at the end,
-- so it never leaves test data behind and is safe to re-run. It must be
-- executed as a role that can bypass RLS for setup (e.g. the postgres role
-- or service_role), since it inserts companies/customers/jobs directly and
-- is exercising the trigger, not RLS.

begin;

do $$
declare
  v_company_a uuid;
  v_company_b uuid;
  v_customer_a uuid;
  v_job_id uuid;
  v_company_id_after uuid;
  v_notes_after text;
  v_caught boolean;
begin
  -- ---------------------------------------------------------------------
  -- Setup: two tenants and one job that belongs to company A.
  -- ---------------------------------------------------------------------
  insert into public.companies (name, slug)
  values ('Immutability Test Co A', 'immutability-test-co-a-' || gen_random_uuid())
  returning id into v_company_a;

  insert into public.companies (name, slug)
  values ('Immutability Test Co B', 'immutability-test-co-b-' || gen_random_uuid())
  returning id into v_company_b;

  insert into public.customers (company_id, name)
  values (v_company_a, 'Immutability Test Customer')
  returning id into v_customer_a;

  insert into public.jobs (company_id, customer_id, job_number, scheduled_at, notes)
  values (v_company_a, v_customer_a, 'IMMUT-TEST-1', now(), 'original notes')
  returning id into v_job_id;

  raise notice 'SETUP OK: company_a=%, company_b=%, job=%', v_company_a, v_company_b, v_job_id;

  -- ---------------------------------------------------------------------
  -- Case 1: updating a non-tenant column succeeds and leaves company_id
  -- untouched.
  -- ---------------------------------------------------------------------
  update public.jobs
  set notes = 'updated notes'
  where id = v_job_id;

  select company_id, notes into v_company_id_after, v_notes_after
  from public.jobs
  where id = v_job_id;

  if v_notes_after is distinct from 'updated notes' then
    raise exception 'CASE 1 FAILED: notes update did not persist (got %)', v_notes_after;
  end if;

  if v_company_id_after is distinct from v_company_a then
    raise exception 'CASE 1 FAILED: company_id changed unexpectedly to %', v_company_id_after;
  end if;

  raise notice 'CASE 1 PASSED: non-tenant column update succeeded, company_id unchanged (%).', v_company_id_after;

  -- ---------------------------------------------------------------------
  -- Case 2: updating company_id to a different tenant must raise.
  -- ---------------------------------------------------------------------
  v_caught := false;

  begin
    update public.jobs
    set company_id = v_company_b
    where id = v_job_id;
  exception
    when others then
      v_caught := true;
      if sqlerrm <> 'jobs.company_id is immutable after creation' then
        raise exception 'CASE 2 FAILED: unexpected error message: %', sqlerrm;
      end if;
      raise notice 'CASE 2 PASSED: cross-tenant company_id update raised as expected (%: %).', sqlstate, sqlerrm;
  end;

  if not v_caught then
    raise exception 'CASE 2 FAILED: company_id update to a different company did not raise an exception';
  end if;

  select company_id into v_company_id_after
  from public.jobs
  where id = v_job_id;

  if v_company_id_after is distinct from v_company_a then
    raise exception 'CASE 2 FAILED: company_id was mutated to % despite the exception', v_company_id_after;
  end if;

  raise notice 'CASE 2 CONFIRMED: company_id still % after the rejected update.', v_company_id_after;

  -- ---------------------------------------------------------------------
  -- Case 3: updating company_id to its current (unchanged) value succeeds.
  -- ---------------------------------------------------------------------
  update public.jobs
  set company_id = v_company_a
  where id = v_job_id;

  select company_id into v_company_id_after
  from public.jobs
  where id = v_job_id;

  if v_company_id_after is distinct from v_company_a then
    raise exception 'CASE 3 FAILED: no-op company_id update changed the value to %', v_company_id_after;
  end if;

  raise notice 'CASE 3 PASSED: no-op company_id update succeeded (%).', v_company_id_after;

  -- ---------------------------------------------------------------------
  -- Case 4: final confirmation that the original company_id is intact
  -- after all of the above.
  -- ---------------------------------------------------------------------
  select company_id into v_company_id_after
  from public.jobs
  where id = v_job_id;

  if v_company_id_after is distinct from v_company_a then
    raise exception 'CASE 4 FAILED: final company_id % does not match original %', v_company_id_after, v_company_a;
  end if;

  raise notice 'CASE 4 PASSED: final company_id % matches original tenant.', v_company_id_after;
  raise notice 'ALL CASES PASSED: jobs.company_id is immutable after creation.';
end;
$$;

rollback;
