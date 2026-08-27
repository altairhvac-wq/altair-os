-- Migration 156: align job_attachments row visibility with job visibility.
--
-- ============================== THE GAP ==============================
-- Migrations 153 and 154 made the BYTES of a job attachment follow the owning
-- job: public.can_read_company_file resolves the job id out of the object key
-- and mirrors the jobs SELECT policy, so a technician can open an attachment
-- only on a job assigned to them.
--
-- The attachment's ROW was never narrowed the same way. From migration 021 it
-- has been:
--
--     using (public.is_active_company_member(company_id))
--
-- So the two halves of one attachment disagree. A technician cannot fetch the
-- file, but can still read its row: file_name, caption, file_path, uploaded_by,
-- created_at — for every job in the company, including jobs they were never
-- assigned to and cannot otherwise see. File names and captions routinely carry
-- customer names, addresses and equipment details, so this is a real (if
-- metadata-only, same-tenant, authenticated-staff) confidentiality gap.
--
-- The INSERT policy has the same shape, which additionally lets any member
-- attach a row to any job in the company.
--
-- ============================== WHY NOW ==============================
-- The application already enforces the stricter rule and has all along.
-- app/actions/technician-job-work-history.ts refuses before it ever queries:
--
--     if (job.assignedTechnicianId !== context.user.id) {
--       return { error: "You can only view work history on jobs assigned to you." };
--     }
--
-- So RLS is weaker than the application's own rule. This migration moves that
-- rule down into the database, where it holds even if a future caller forgets
-- it. It closes a defense-in-depth gap; it does not change intended behavior.
--
-- ============================== WHY IT CANNOT BREAK A READ ==============================
-- job_attachments has exactly two read paths, and both are already gated at or
-- above the rule installed here:
--
--   1. app/(admin)/work/[jobId]/page.tsx and
--      app/actions/technician-job-work-history.ts
--      -> operational roles, or the assigned technician. Identical to this rule.
--
--   2. app/(admin)/customers/[customerId]/page.tsx
--      -> guarded by canManageCustomers, which is owner/admin/dispatcher/
--         office_staff. Every one of those satisfies can_view_operational_jobs,
--         so the new predicate is unconditionally true for them.
--
-- Verified end to end against a restored scratch project by
-- scripts/verify-storage-matrix-live.mjs, which drives real signed-in users
-- rather than impersonated claims.
--
-- ============================== NO NEW PRIVILEGED SURFACE ==============================
-- Migration 148 shipped a SECURITY DEFINER helper that was executable by
-- `authenticated` and leaked cross-tenant information. This migration defines
-- NO new function. It composes public.can_view_operational_jobs, which already
-- backs the jobs SELECT policy and whose grants are unchanged here. There is no
-- new callable surface to abuse.

begin;

-- ---------------------------------------------------------------------------
-- SELECT: you may see an attachment's row exactly when you may see its job.
-- ---------------------------------------------------------------------------
drop policy if exists "company members can read job attachments" on public.job_attachments;

create policy "job viewers can read job attachments"
  on public.job_attachments
  for select
  using (
    public.is_active_company_member(company_id)
    and exists (
      select 1
      from public.jobs j
      where j.id = job_attachments.job_id
        and j.company_id = job_attachments.company_id
        and (
          public.can_view_operational_jobs(j.company_id)
          or j.assigned_technician_id = auth.uid()
        )
    )
  );

-- ---------------------------------------------------------------------------
-- INSERT: and you may attach to a job only when you may see that job.
--
-- The row is metadata only — byte access is decided independently by
-- can_read_company_file against the path's own company and job segments — so
-- this is not closing an escalation. It stops a member from planting rows on
-- jobs outside their scope, which would corrupt the attachment list and the
-- orphan reaper's referential assumptions.
-- ---------------------------------------------------------------------------
drop policy if exists "company members can insert job attachments" on public.job_attachments;

create policy "job viewers can insert job attachments"
  on public.job_attachments
  for insert
  with check (
    public.is_active_company_member(company_id)
    and exists (
      select 1
      from public.jobs j
      where j.id = job_attachments.job_id
        and j.company_id = job_attachments.company_id
        and (
          public.can_view_operational_jobs(j.company_id)
          or j.assigned_technician_id = auth.uid()
        )
    )
  );

comment on table public.job_attachments is
  'Job photo/document metadata. Row visibility mirrors public.jobs (migration 156); byte visibility is decided by public.can_read_company_file (migration 153).';

commit;
