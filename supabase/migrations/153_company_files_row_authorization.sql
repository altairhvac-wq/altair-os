-- Migration 153: join company-files storage authorization to the owning row.
--
-- ============================== THE DEFECT ==============================
-- The storage policy from migration 021 checks three things and stops:
--
--     bucket_id = 'company-files'
--     and (storage.foldername(name))[1] = 'company'
--     and public.is_active_company_member(((storage.foldername(name))[2])::uuid)
--
-- So ANY active member of a company can read ANY object under that company's
-- prefix, regardless of whether the owning database row would let them read it.
-- A technician's row permissions are narrower than company membership — the
-- expenses SELECT policy (migration 103) restricts them to their own receipts —
-- but the storage policy is not, so possession of an object key defeats the row
-- policy entirely.
--
-- Practical exploitation needs a path leak, because expense and job ids are
-- uuids and not enumerable. That makes this a wrong-shape defect rather than a
-- live breach, and it is still the wrong shape: the object and the row it
-- belongs to should be governed by one decision, not two.
--
-- ============================== PATH FAMILIES ==============================
-- Both builders live in lib/storage/company-files.ts and are exhaustive:
--
--   company/{companyId}/expenses/{expenseId}/{file}
--     foldername -> [1]=company [2]=companyId [3]=expenses [4]=expenseId
--
--   company/{companyId}/jobs/{jobId}/{attachmentId}/{file}
--     foldername -> [1]=company [2]=companyId [3]=jobs [4]=jobId [5]=attachmentId
--
-- ============================== THE MIRRORED SEMANTICS ==============================
-- Each family mirrors the SELECT policy of the row it belongs to, so there is
-- one definition of who may see a thing rather than two that can drift.
--
--   RECEIPTS mirror public.expenses (migration 103):
--       can_view_company_expenses(company)  -- billing OR dispatch
--       OR expenses.technician_id = auth.uid()
--
--   JOB ATTACHMENTS mirror public.jobs (migration 046):
--       can_view_operational_jobs(company)  -- billing OR dispatch OR customers
--       OR jobs.assigned_technician_id = auth.uid()
--
-- The attachment case deliberately mirrors the JOB rather than
-- public.job_attachments, whose own SELECT policy is still bare company
-- membership. An attachment is a view onto a job, so job visibility is the
-- right authority. That leaves public.job_attachments row metadata readable
-- company-wide — a narrower, separate gap recorded as follow-on work rather
-- than changed here, because tightening it could break attachment lists in the
-- UI and that deserves its own verification.
--
-- Resulting matrix:
--
--   Role                    Receipts                  Job attachments
--   owner / admin / office  all (can_manage_billing)  all
--   dispatcher              all (can_dispatch_jobs)   all
--   technician / subcon     own expenses only         assigned jobs only
--   other company           none                      none
--
-- ============================== ROLLOUT — READ THIS ==============================
-- Multiple PERMISSIVE policies on the same command are combined with OR in
-- PostgreSQL. Adding this policy while migration 021's broad policy still
-- exists therefore CHANGES NOTHING: the broad policy keeps granting access.
--
-- That is deliberate, and it is what makes the rollout safe:
--
--     1. Apply THIS migration. No behaviour changes. Nothing can break.
--     2. Verify every role can still reach what it should — see the checklist
--        in docs/development/storage-authorization.md.
--     3. Only then apply migration 154, which drops the broad policy. That is
--        the step where the tightening actually takes effect, and the step to
--        be ready to roll back.
--
-- Rollback of 154 is re-creating the 021 policy; rollback of this migration is
-- dropping the policy it adds.
--
-- ============================== SAFETY ==============================
-- Adds one SELECT policy on storage.objects. No table, no column, no data, and
-- no change to INSERT or DELETE on storage. Read-path only.

-- ---------------------------------------------------------------------------
-- Helper: is this object readable by the current user, per its owning row?
-- ---------------------------------------------------------------------------
--
-- SECURITY DEFINER because it reads public.expenses and public.jobs to answer
-- the question, and those tables are themselves RLS-protected — a SECURITY
-- INVOKER function would see nothing and deny everything.
--
-- It takes the OBJECT NAME rather than pre-split segments so that the parsing
-- rule lives in exactly one place. Every branch fails closed: an unrecognized
-- path shape, a missing row, or a malformed uuid all return false.
create or replace function public.can_read_company_file(p_object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_segments text[];
  v_company_id uuid;
  v_family text;
  v_entity_id uuid;
begin
  if auth.uid() is null then
    return false;
  end if;

  v_segments := storage.foldername(p_object_name);

  -- Shape: company/{companyId}/{family}/{entityId}/...
  if array_length(v_segments, 1) is null or array_length(v_segments, 1) < 4 then
    return false;
  end if;

  if v_segments[1] <> 'company' then
    return false;
  end if;

  begin
    v_company_id := v_segments[2]::uuid;
    v_entity_id := v_segments[4]::uuid;
  exception
    when invalid_text_representation then
      return false;
  end;

  -- Tenancy first. Everything below is a narrowing of this.
  if not public.is_active_company_member(v_company_id) then
    return false;
  end if;

  v_family := v_segments[3];

  if v_family = 'expenses' then
    -- Mirrors the public.expenses SELECT policy exactly.
    return exists (
      select 1
      from public.expenses e
      where e.id = v_entity_id
        and e.company_id = v_company_id
        and (
          public.can_view_company_expenses(v_company_id)
          or e.technician_id = auth.uid()
        )
    );
  end if;

  if v_family = 'jobs' then
    -- Mirrors the public.jobs SELECT policy exactly.
    return exists (
      select 1
      from public.jobs j
      where j.id = v_entity_id
        and j.company_id = v_company_id
        and (
          public.can_view_operational_jobs(v_company_id)
          or j.assigned_technician_id = auth.uid()
        )
    );
  end if;

  -- Unknown family: deny. lib/storage/company-files.ts has exactly two path
  -- builders, so a third shape means either a bug or an object this policy was
  -- never designed for. Neither should be readable by default.
  return false;
end;
$$;

comment on function public.can_read_company_file(text) is
  'Row-joined read authorization for the company-files bucket. Parses company/{companyId}/{family}/{entityId}/... and mirrors the SELECT policy of the owning expenses or jobs row. Fails closed on an unknown path shape, a missing row, or a malformed uuid.';

revoke all on function public.can_read_company_file(text) from public;
-- Callable by authenticated because storage policies are evaluated as the
-- requesting user. It leaks nothing on its own: it answers only about objects
-- the caller could already name, and answers false unless the owning row is
-- visible to them.
grant execute on function public.can_read_company_file(text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- The new, narrower read policy
-- ---------------------------------------------------------------------------
--
-- Additive. While migration 021's policy still exists this grants nothing new
-- and takes nothing away — PERMISSIVE policies are OR'd. Migration 154 removes
-- the broad one.
drop policy if exists "row authorized company file reads" on storage.objects;
create policy "row authorized company file reads"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'company-files'
  and public.can_read_company_file(name)
);
