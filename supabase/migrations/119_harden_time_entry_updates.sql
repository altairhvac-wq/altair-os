-- Migration 119: harden time_entries against direct technician PostgREST UPDATE.
--
-- Security context
-- ----------------
-- Finding: authenticated has table UPDATE on time_entries, and the RLS policy
-- "time managers and owners can update time entries" (migration 103) allows
-- UPDATE whenever technician_id = auth.uid().  PostgreSQL RLS does not restrict
-- which columns may be written.  A technician can therefore PATCH sensitive
-- fields (company_id, technician_id, job_id, entry_type, started_at, is_demo,
-- duration_minutes, notes, reopen closed rows, etc.) directly via PostgREST,
-- bypassing Server Actions and the time-tracking service.
--
-- Fix strategy (same hybrid pattern as jobs migrations 115/116)
-- -------------------------------------------------------------
-- 1. Introduce close_time_entry, a SECURITY DEFINER RPC that is the only
--    authorized technician write path for closing an open segment.  It enforces
--    auth, membership, ownership-or-manager, open-entry lock, ended_at validity,
--    and server-side duration calculation; it never mutates identity/schedule
--    columns.
-- 2. Replace the broad UPDATE policy with a manager-only policy so technicians
--    have no direct table-level UPDATE path.  Managers
--    (can_view_company_time_entries) retain direct UPDATE for corrections and
--    demo seeding.
--
-- What does NOT change
-- --------------------
-- • INSERT policies (clock-in / start break / start job labor)
-- • SELECT / DELETE policies
-- • Activity recording (still application-side)
-- • Reporting reads
-- • Manager correction workflows that already call closeTimeEntry

create or replace function public.close_time_entry(
  p_company_id uuid,
  p_entry_id uuid,
  p_ended_at timestamptz,
  p_notes text default null,
  p_update_notes boolean default false
)
returns public.time_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_entry    public.time_entries%rowtype;
  v_duration integer;
  v_is_manager boolean;
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

  -- 3. Lock the open entry ---------------------------------------------------
  select *
    into v_entry
  from public.time_entries
  where company_id = p_company_id
    and id = p_entry_id
  for update;

  if not found then
    raise exception 'Active time entry not found.'
      using errcode = 'P0002';
  end if;

  if v_entry.ended_at is not null then
    raise exception 'Active time entry not found.'
      using errcode = 'P0002';
  end if;

  -- 4. Authorization ---------------------------------------------------------
  --    Managers (billing or dispatch) may close any company entry.
  --    Technicians may close only their own open entry.
  v_is_manager := public.can_view_company_time_entries(p_company_id);

  if not v_is_manager and v_entry.technician_id is distinct from v_uid then
    raise exception 'Not authorized to close this time entry'
      using errcode = '42501';
  end if;

  -- 5. Validate and compute duration server-side -----------------------------
  if p_ended_at is null or p_ended_at < v_entry.started_at then
    raise exception 'ended_at must be at or after started_at'
      using errcode = '22023';
  end if;

  v_duration := greatest(
    0,
    round(
      extract(epoch from (p_ended_at - v_entry.started_at))::numeric / 60.0
    )
  )::integer;

  -- 6. Close only mutable close-fields ---------------------------------------
  update public.time_entries
  set
    ended_at = p_ended_at,
    duration_minutes = v_duration,
    notes = case
      when p_update_notes then p_notes
      else notes
    end
  where company_id = p_company_id
    and id = p_entry_id
  returning * into v_entry;

  return v_entry;
end;
$$;

revoke all on function public.close_time_entry(
  uuid, uuid, timestamptz, text, boolean
) from public;

grant execute on function public.close_time_entry(
  uuid, uuid, timestamptz, text, boolean
) to authenticated;

-- Technicians no longer have a direct table UPDATE path.
drop policy if exists "time managers and owners can update time entries"
  on public.time_entries;

create policy "time managers can update time entries"
on public.time_entries
for update
to authenticated
using (
  public.is_active_company_member(company_id)
  and public.can_view_company_time_entries(company_id)
)
with check (
  public.is_active_company_member(company_id)
  and public.can_view_company_time_entries(company_id)
);
