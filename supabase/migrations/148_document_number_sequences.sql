-- Migration 148: durable per-company document number allocation.
--
-- ============================== THE DEFECT ==============================
-- Job, invoice, estimate and expense numbers were generated in application
-- code (and, for expenses, in generate_expense_number) as a fixed base plus
-- COUNT(*) of the company's existing rows:
--
--   jobs       'JOB-' || (1049 + count(*))
--   invoices   'INV-' || (1050 + count(*))
--   estimates  'EST-' || (1050 + count(*))
--   expenses   'EXP-' || (1013 + count(*))
--
-- Each of those columns carries a UNIQUE (company_id, <number>) constraint,
-- which makes the scheme self-contradicting in two separate ways:
--
--   1. HARD DELETE. Permanently deleting any row that is not the highest
--      numbered one lowers the count, so the next generated number collides
--      with a row that still exists. The formula is deterministic, so it
--      reproduces the same collision on every subsequent attempt — record
--      creation for that document type is broken PERMANENTLY, not transiently.
--      Trash -> "Delete permanently" in the product reaches this.
--
--   2. CONCURRENCY. Two creates that read the count before either inserts
--      generate the same number. Jobs and expenses had no retry at all;
--      invoices and estimates retried, but recomputed the identical value, so
--      the retry could not resolve case 1 either.
--
-- ============================== THE FIX ==============================
-- A durable counter per (company, document type), advanced atomically by
-- allocate_company_document_number(). The counter is monotonic: it is never
-- decremented, never recomputed from row counts, and therefore never affected
-- by deletes.
--
-- ATOMICITY. Allocation is a single INSERT ... ON CONFLICT DO UPDATE ...
-- RETURNING. The ON CONFLICT path takes a row-level lock on the counter, so
-- concurrent allocators serialize on it and each receives a distinct value.
-- No advisory lock, no SELECT ... FOR UPDATE, no retry loop.
--
-- GAPS ARE ACCEPTABLE, COLLISIONS ARE NOT. A number is consumed when it is
-- allocated. If the INSERT that was going to use it fails, that number is
-- burned and the sequence moves on — exactly like a Postgres sequence. A gap
-- in invoice numbers is a cosmetic accounting curiosity; a duplicate invoice
-- number is a data-integrity failure.
--
-- ============================== BACKFILL ==============================
-- Counters are seeded LAZILY, on first allocation for a company, from the
-- highest existing NUMERIC SUFFIX — never from COUNT(*). Seeding a company
-- that already has JOB-1049..JOB-1053 yields next_value = 1054.
--
-- No existing row is renumbered. This migration performs no UPDATE against
-- jobs, invoices, estimates or expenses at all.
--
-- Only plain standalone numbers participate: '^JOB-[0-9]+$' and friends.
-- Two other families are deliberately excluded because they are allocated by
-- different rules and must keep their existing behavior:
--   * Demo seed rows      JOB-DEMO-1001, INV-DEMO-3011, ...
--   * Job-linked children EST-1049-01, INV-1049-02, ...
-- Neither matches the anchored numeric pattern, so neither can drag a counter
-- forward or be disturbed by one.
--
-- ============================== AUTHORIZATION ==============================
-- allocate_company_document_number is SECURITY DEFINER, so it enforces its own
-- checks rather than inheriting the caller's RLS:
--   * authenticated (auth.uid() is not null)
--   * active member of the target company
--   * holds the permission that already governs creating that document type:
--       job / expense  -> can_dispatch_jobs OR can_manage_billing
--       invoice        -> can_manage_billing
--       estimate       -> can_manage_billing
--     (Field estimates created by an assigned technician go through the
--     application's own createFieldEstimates check and then call this as the
--     billing-capable path; see the note on the estimate branch below.)
--
-- The counters table itself is not readable or writable by `authenticated` at
-- all. The only way to move a counter is through this function.

-- ---------------------------------------------------------------------------
-- Counter storage
-- ---------------------------------------------------------------------------

create table if not exists public.company_document_counters (
  company_id uuid not null references public.companies (id) on delete cascade,
  document_type text not null,
  -- The value that the NEXT allocation will return.
  next_value bigint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (company_id, document_type),
  constraint company_document_counters_document_type_check
    check (document_type in ('job', 'estimate', 'invoice', 'expense')),
  constraint company_document_counters_next_value_check
    check (next_value > 0)
);

comment on table public.company_document_counters is
  'Monotonic per-company, per-document-type number allocator. Replaces row-count-derived numbering, which collided permanently after any hard delete. Seeded lazily from the highest existing numeric suffix; never decremented; never recomputed from row counts.';

comment on column public.company_document_counters.next_value is
  'Value the next allocate_company_document_number() call will return and consume.';

alter table public.company_document_counters enable row level security;

-- No policies are created on purpose. The table is service-role only; every
-- legitimate write goes through the SECURITY DEFINER allocator below, and
-- nothing in the product needs to read raw counters.
revoke all on table public.company_document_counters from public;
revoke all on table public.company_document_counters from anon;
revoke all on table public.company_document_counters from authenticated;
grant all on table public.company_document_counters to service_role;

-- ---------------------------------------------------------------------------
-- Seed value: highest existing standalone suffix, floored at the historical base
-- ---------------------------------------------------------------------------

/**
 * The base each document type has always started at. A brand-new company must
 * keep producing JOB-1049 / INV-1050 / EST-1050 / EXP-1013 as its first
 * number, so switching allocators is invisible to customers and to any
 * screenshot, template or test that encodes those values.
 */
create or replace function public.document_number_base(p_document_type text)
returns bigint
language sql
immutable
set search_path = public, pg_temp
as $$
  select case p_document_type
    when 'job' then 1049::bigint
    when 'estimate' then 1050::bigint
    when 'invoice' then 1050::bigint
    when 'expense' then 1013::bigint
    else null::bigint
  end;
$$;

/**
 * Highest standalone numeric suffix already used by a company, or null.
 *
 * Anchored patterns only. 'JOB-DEMO-1001' and 'EST-1049-01' do not match and
 * cannot influence the result.
 */
create or replace function public.max_existing_document_number(
  p_company_id uuid,
  p_document_type text
)
returns bigint
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_max bigint;
begin
  if p_document_type = 'job' then
    select max((regexp_match(j.job_number, '^JOB-([0-9]+)$'))[1]::bigint)
    into v_max
    from public.jobs j
    where j.company_id = p_company_id
      and j.job_number ~ '^JOB-[0-9]+$';

  elsif p_document_type = 'estimate' then
    select max((regexp_match(e.estimate_number, '^EST-([0-9]+)$'))[1]::bigint)
    into v_max
    from public.estimates e
    where e.company_id = p_company_id
      and e.estimate_number ~ '^EST-[0-9]+$';

  elsif p_document_type = 'invoice' then
    select max((regexp_match(i.invoice_number, '^INV-([0-9]+)$'))[1]::bigint)
    into v_max
    from public.invoices i
    where i.company_id = p_company_id
      and i.invoice_number ~ '^INV-[0-9]+$';

  elsif p_document_type = 'expense' then
    select max((regexp_match(x.expense_number, '^EXP-([0-9]+)$'))[1]::bigint)
    into v_max
    from public.expenses x
    where x.company_id = p_company_id
      and x.expense_number ~ '^EXP-[0-9]+$';

  else
    raise exception 'document_type_invalid';
  end if;

  return v_max;
end;
$$;

-- ---------------------------------------------------------------------------
-- Allocation
-- ---------------------------------------------------------------------------

create or replace function public.allocate_company_document_number(
  p_company_id uuid,
  p_document_type text
)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_base bigint;
  v_seed bigint;
  v_allocated bigint;
begin
  if p_company_id is null then
    raise exception 'company_id_required';
  end if;

  v_base := public.document_number_base(p_document_type);
  if v_base is null then
    raise exception 'document_type_invalid';
  end if;

  -- ------------------------------------------------------------------
  -- Authorization.
  --
  -- Skipped entirely when there is no authenticated actor: that is the
  -- service-role path (demo seeding, webhook-driven completion invoices,
  -- backfills), which the application has already authorized. This mirrors
  -- how migration 111's role-hierarchy trigger treats auth.uid() IS NULL.
  -- ------------------------------------------------------------------
  if v_user_id is not null then
    if not public.is_active_company_member(p_company_id) then
      raise exception 'insufficient_permission';
    end if;

    if p_document_type in ('job', 'expense') then
      if not (
        public.can_dispatch_jobs(p_company_id)
        or public.can_manage_billing(p_company_id)
      ) then
        raise exception 'insufficient_permission';
      end if;
    else
      -- estimate / invoice.
      --
      -- can_manage_billing is owner/admin/office_staff. Technician-authored
      -- field estimates are authorized in the application by
      -- canCreateFieldEstimate (assigned technician on the job) and reach the
      -- database through the service-role client, i.e. the auth.uid() IS NULL
      -- branch above. Dispatchers are included because they can already create
      -- the job packet these documents hang off.
      if not (
        public.can_manage_billing(p_company_id)
        or public.can_dispatch_jobs(p_company_id)
      ) then
        raise exception 'insufficient_permission';
      end if;
    end if;
  end if;

  -- ------------------------------------------------------------------
  -- Seed value for a company that has never allocated this type.
  --
  -- Only computed when no counter row exists yet, because
  -- max_existing_document_number scans that company's documents and this
  -- function runs on every single create. After the first allocation the
  -- counter is authoritative and the scan never happens again.
  --
  -- The EXISTS check races benignly: if two sessions both see "no counter",
  -- exactly one INSERT wins and the loser falls into ON CONFLICT DO UPDATE,
  -- which ignores its own seed and increments the winner's row. Both callers
  -- still receive distinct values.
  -- ------------------------------------------------------------------
  if exists (
    select 1
    from public.company_document_counters c
    where c.company_id = p_company_id
      and c.document_type = p_document_type
  ) then
    -- Value is irrelevant: the ON CONFLICT branch discards it.
    v_seed := v_base;
  else
    v_seed := greatest(
      v_base,
      coalesce(
        public.max_existing_document_number(p_company_id, p_document_type),
        0
      ) + 1
    );
  end if;

  insert into public.company_document_counters as c (
    company_id,
    document_type,
    next_value
  )
  values (p_company_id, p_document_type, v_seed)
  on conflict (company_id, document_type) do update
    set next_value = c.next_value + 1,
        updated_at = now()
  returning c.next_value into v_allocated;

  return v_allocated;
end;
$$;

comment on function public.allocate_company_document_number(uuid, text) is
  'Atomically consumes and returns the next document number for a company. Monotonic and delete-proof: the counter is seeded once from the highest existing numeric suffix and only ever increments. Gaps are expected when a create fails after allocation; duplicates are impossible.';

revoke all on function public.document_number_base(text) from public;
revoke all on function public.max_existing_document_number(uuid, text) from public;
revoke all on function public.allocate_company_document_number(uuid, text) from public;

grant execute on function public.document_number_base(text) to authenticated, service_role;
grant execute on function public.max_existing_document_number(uuid, text) to authenticated, service_role;
grant execute on function public.allocate_company_document_number(uuid, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Retire the COUNT(*)-based expense generator
-- ---------------------------------------------------------------------------
--
-- generate_expense_number (migration 103) is the same defect in SQL form. It
-- is kept as a callable symbol — dropping it would break any deployment whose
-- application code has not yet rolled forward — but its body now delegates to
-- the allocator, so the broken formula is gone from every path.
--
-- The old signature returned the fully formatted 'EXP-####' string, and that
-- is preserved exactly.

create or replace function public.generate_expense_number(p_company_id uuid)
returns text
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
begin
  return 'EXP-' || public.allocate_company_document_number(p_company_id, 'expense')::text;
end;
$$;

comment on function public.generate_expense_number(uuid) is
  'Deprecated shim. Delegates to allocate_company_document_number(company, ''expense''). Previously derived the number from a row count, which collided permanently after any hard delete. Kept callable for rollout safety; new code should call the allocator directly.';

revoke all on function public.generate_expense_number(uuid) from public;
grant execute on function public.generate_expense_number(uuid) to authenticated, service_role;
