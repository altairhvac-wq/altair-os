-- Migration 149: close two authorization defects in the migration 148 allocator.
--
-- Both were introduced by migration 148 and found during the post-Phase-3
-- adversarial regression review. Neither affects the correctness of document
-- numbering; both are authorization posture.
--
-- ============================== DEFECT 1 (P1) ==============================
-- CROSS-TENANT INFORMATION DISCLOSURE.
--
-- public.max_existing_document_number(uuid, text) is SECURITY DEFINER, so it
-- reads jobs / estimates / invoices / expenses with RLS bypassed. It performs
-- NO membership check, and migration 148 granted EXECUTE on it to
-- `authenticated`.
--
-- Any signed-in user could therefore run
--
--     select public.max_existing_document_number('<any company uuid>', 'invoice');
--
-- and learn that company's highest invoice number — a direct proxy for how
-- much business a competitor has written. The company UUIDs required are not
-- secret: public.network_profiles exposes other companies' company_id to every
-- authenticated user through the Community directory
-- (listVisibleNetworkProfiles / findNearbyNetworkProfiles), so the identifiers
-- are obtainable inside the product.
--
-- FIX: revoke EXECUTE from `authenticated`.
--
-- This cannot break allocation. PostgreSQL checks EXECUTE on a called function
-- against the CURRENT user, and inside a SECURITY DEFINER function the current
-- user is the definer — not the original caller. allocate_company_document_number
-- is SECURITY DEFINER and owned by the same role that owns
-- max_existing_document_number, so it retains EXECUTE implicitly. The helper is
-- called from nowhere else: no application code references it (the TypeScript
-- allocator calls only allocate_company_document_number).
--
-- document_number_base(text) is revoked with it. It returns a per-type
-- constant and leaks nothing, but there is no reason for it to be callable
-- either, and a narrower surface is easier to reason about later.
--
-- ============================== DEFECT 2 (P2) ==============================
-- AUTHORIZATION WIDER THAN BOTH THE APPLICATION AND RLS.
--
-- The estimate/invoice branch of allocate_company_document_number accepted
--
--     can_manage_billing(company)  OR  can_dispatch_jobs(company)
--
-- can_dispatch_jobs is owner/admin/DISPATCHER. But:
--
--   * every estimate and invoice creation path in the application requires
--     permissions.manageBilling (owner/admin/office_staff), and
--   * the RLS INSERT policy on public.invoices (migration 046) requires
--     can_manage_billing(company_id).
--
-- A dispatcher therefore could not create an invoice, but could still consume
-- invoice numbers by calling the allocator directly through PostgREST. The
-- impact is bounded — allocation only advances a counter, so the result is
-- gaps in the customer's invoice numbering, never a record, a read, or a
-- write to business data. It is nonetheless a check that is looser than the
-- two it is supposed to sit behind, which is how the next defect gets missed.
--
-- FIX: the estimate/invoice branch now requires can_manage_billing alone,
-- matching RLS and the application exactly.
--
-- Technician-authored field estimates are unaffected: canCreateFieldEstimate
-- authorizes them in the application and they reach the database through the
-- service-role client, which takes the auth.uid() IS NULL branch.
--
-- The job/expense branch is unchanged. Both are correct as they stand:
-- technicians submit expenses through their own RLS INSERT policy (migration
-- 103) and dispatchers create jobs.
--
-- ==============================================================================
-- This migration adds no table, changes no data, and takes no lock on any
-- table holding customer records.
-- ==============================================================================

-- ---------------------------------------------------------------------------
-- Defect 1 — stop exposing the RLS-bypassing helpers to end users
-- ---------------------------------------------------------------------------

revoke execute on function public.max_existing_document_number(uuid, text)
  from authenticated;
revoke execute on function public.document_number_base(text)
  from authenticated;

comment on function public.max_existing_document_number(uuid, text) is
  'SECURITY DEFINER seed helper for allocate_company_document_number. Reads with RLS bypassed and performs no membership check, so it is intentionally NOT executable by `authenticated` — migration 148 granted it in error, which let any signed-in user read another company''s highest document number. Call it only from allocate_company_document_number.';

-- ---------------------------------------------------------------------------
-- Defect 2 — align the estimate/invoice branch with RLS and the application
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
  -- Skipped when there is no authenticated actor: that is the service-role
  -- path (demo seeding, completion-draft invoices, backfills), which the
  -- application has already authorized. Mirrors how migration 111's
  -- role-hierarchy trigger treats auth.uid() IS NULL. `anon` holds no EXECUTE
  -- on this function, so that branch is not reachable without the service key.
  --
  -- Each branch now matches the RLS INSERT policy for the table the number is
  -- destined for, so the allocator can never be the loosest check in the path.
  -- ------------------------------------------------------------------
  if v_user_id is not null then
    if not public.is_active_company_member(p_company_id) then
      raise exception 'insufficient_permission';
    end if;

    if p_document_type in ('job', 'expense') then
      -- Dispatchers create jobs; technicians submit expenses under their own
      -- INSERT policy from migration 103, reaching this through the
      -- service-role branch above.
      if not (
        public.can_dispatch_jobs(p_company_id)
        or public.can_manage_billing(p_company_id)
      ) then
        raise exception 'insufficient_permission';
      end if;
    else
      -- estimate / invoice.
      --
      -- can_manage_billing ONLY. This previously also accepted
      -- can_dispatch_jobs, which let a dispatcher consume invoice numbers they
      -- could never use: RLS on public.invoices requires can_manage_billing to
      -- insert, and every application path requires permissions.manageBilling.
      if not public.can_manage_billing(p_company_id) then
        raise exception 'insufficient_permission';
      end if;
    end if;
  end if;

  -- ------------------------------------------------------------------
  -- Seed value for a company that has never allocated this type.
  --
  -- Only computed when no counter row exists, because
  -- max_existing_document_number scans that company's documents and this
  -- function runs on every create. After the first allocation the counter is
  -- authoritative and the scan never happens again.
  --
  -- The EXISTS check races benignly: if two sessions both see "no counter",
  -- one INSERT wins and the loser falls into ON CONFLICT DO UPDATE, which
  -- discards its own seed and increments the winner's row. Both callers still
  -- receive distinct values.
  -- ------------------------------------------------------------------
  if exists (
    select 1
    from public.company_document_counters c
    where c.company_id = p_company_id
      and c.document_type = p_document_type
  ) then
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
  'Atomically consumes and returns the next document number for a company. Monotonic and delete-proof: seeded once from the highest existing numeric suffix, then only ever incremented. Gaps are expected when a create fails after allocation; duplicates are impossible. Per-type authorization matches the RLS INSERT policy of the destination table.';

revoke all on function public.allocate_company_document_number(uuid, text) from public;
grant execute on function public.allocate_company_document_number(uuid, text)
  to authenticated, service_role;
