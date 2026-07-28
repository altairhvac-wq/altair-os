-- Migration 122: harden time_entries against direct technician PostgREST INSERT.
--
-- Security context
-- ----------------
-- Finding: migration 119 removed technician UPDATE and introduced close_time_entry,
-- but the INSERT policy from migration 103 still allows technicians/subcontractors
-- to insert arbitrary time_entries rows (including closed, backdated, or
-- duration-bearing forged payroll segments). Partial unique indexes only prevent
-- duplicate *open* entries; unlimited closed forgeries remain possible.
--
-- Fix strategy (same hybrid pattern as migration 119)
-- ---------------------------------------------------
-- 1. Introduce create_time_entry, a SECURITY DEFINER RPC that is the only
--    authorized technician write path for opening a clock / break / job_labor
--    segment. It enforces auth, membership, self-ownership, entry-type rules,
--    same-company job linkage + assignment for job_labor, and forces:
--      technician_id = auth.uid()
--      started_at = now()
--      ended_at = null
--      duration_minutes = null
-- 2. Replace the broad INSERT policy so technicians/subcontractors have no
--    direct table-level INSERT path. Direct INSERT is limited to
--    can_manage_billing (owner / admin / office_staff) — the same role set as
--    application-level canCorrectCompanyTimeEntries — for demo seeding and
--    legitimate payroll-sensitive historical rows.
--
--    Intentionally NOT using can_view_company_time_entries here: that helper
--    also includes can_dispatch_jobs (dispatcher). Dispatchers may view company
--    time and open their own live segments via create_time_entry, but are not
--    granted direct historical/closed INSERT authority by this migration.
--    UPDATE/DELETE dispatcher scope is left unchanged (separate follow-up).
--
-- What does NOT change
-- --------------------
-- • SELECT / DELETE policies
-- • UPDATE policy from migration 119 (still can_view_company_time_entries)
-- • close_time_entry behavior
-- • Open-entry unique indexes from migration 052
-- • Application activity recording
-- • Manager correction flows that close open entries

create or replace function public.create_time_entry(
  p_company_id uuid,
  p_entry_type public.time_entry_type,
  p_job_id uuid default null,
  p_notes text default null
)
returns public.time_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid        uuid := auth.uid();
  v_entry      public.time_entries%rowtype;
  v_is_manager boolean;
  v_is_field   boolean;
  v_job        record;
  v_notes      text;
begin
  -- 1. Authentication --------------------------------------------------------
  if v_uid is null then
    raise exception 'Not authenticated'
      using errcode = '42501';
  end if;

  -- 2. Active company membership --------------------------------------------
  if not public.is_active_company_member(p_company_id) then
    raise exception 'Not a member of this company'
      using errcode = '42501';
  end if;

  -- 3. Authorization ---------------------------------------------------------
  --    Managers (billing or dispatch) may open their own entry via this RPC.
  --    Field technicians/subcontractors may open only their own entry.
  --    Technician identity is always forced from auth.uid(); callers cannot
  --    create entries for another technician through this path.
  v_is_manager := public.can_view_company_time_entries(p_company_id);
  v_is_field := public.has_company_role(
    p_company_id,
    array['technician', 'subcontractor']::public.company_role[]
  );

  if not (v_is_manager or v_is_field) then
    raise exception 'Not authorized to create time entries'
      using errcode = '42501';
  end if;

  -- 4. Entry-type / job linkage ---------------------------------------------
  if p_entry_type is null then
    raise exception 'Invalid time entry type'
      using errcode = '22023';
  end if;

  if p_entry_type = 'job_labor'::public.time_entry_type then
    if p_job_id is null then
      raise exception 'Job labor requires a job'
        using errcode = '22023';
    end if;

    select
      j.id,
      j.company_id,
      j.assigned_technician_id,
      j.status
    into v_job
    from public.jobs j
    where j.id = p_job_id
      and j.company_id = p_company_id;

    if not found then
      raise exception 'Linked job not found.'
        using errcode = 'P0002';
    end if;

    if v_job.assigned_technician_id is distinct from v_uid then
      raise exception 'You can only track labor on jobs assigned to you.'
        using errcode = '42501';
    end if;

    if v_job.status in (
      'completed'::public.job_status,
      'cancelled'::public.job_status
    ) then
      raise exception 'This job is no longer active.'
        using errcode = '22023';
    end if;
  elsif p_job_id is not null then
    raise exception 'Only job labor entries may reference a job'
      using errcode = '22023';
  end if;

  v_notes := nullif(btrim(coalesce(p_notes, '')), '');

  -- 5. Insert open segment with server-forced payroll fields ----------------
  insert into public.time_entries (
    company_id,
    technician_id,
    job_id,
    entry_type,
    started_at,
    ended_at,
    duration_minutes,
    notes
  )
  values (
    p_company_id,
    v_uid,
    case
      when p_entry_type = 'job_labor'::public.time_entry_type then p_job_id
      else null
    end,
    p_entry_type,
    now(),
    null,
    null,
    v_notes
  )
  returning * into v_entry;

  return v_entry;
exception
  when unique_violation then
    if p_entry_type = 'clock'::public.time_entry_type then
      raise exception 'You already have an open shift clock entry.'
        using errcode = '23505';
    elsif p_entry_type = 'break'::public.time_entry_type then
      raise exception 'You are already on break.'
        using errcode = '23505';
    elsif p_entry_type = 'job_labor'::public.time_entry_type then
      raise exception 'You already have open job work. Complete or stop it before starting another job.'
        using errcode = '23505';
    else
      raise exception 'You already have an active time entry.'
        using errcode = '23505';
    end if;
end;
$$;

revoke all on function public.create_time_entry(
  uuid, public.time_entry_type, uuid, text
) from public;

grant execute on function public.create_time_entry(
  uuid, public.time_entry_type, uuid, text
) to authenticated;

-- Technicians no longer have a direct table INSERT path.
-- Billing managers only: matches canCorrectCompanyTimeEntries product intent.
drop policy if exists "time managers and field technicians can insert time entries"
  on public.time_entries;

drop policy if exists "time managers can insert time entries"
  on public.time_entries;

create policy "billing managers can insert time entries"
on public.time_entries
for insert
to authenticated
with check (
  public.is_active_company_member(company_id)
  and public.can_manage_billing(company_id)
);
