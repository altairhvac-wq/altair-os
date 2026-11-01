-- Migration 208: tolerate clock skew when closing a time entry.
--
-- Technician walk 2026-11-01: on a machine whose clock ran ~2 seconds ahead
-- of the database, every "Complete work" closed the job but failed to close
-- its labor entry ("End time cannot be in the future"). The technician was
-- then told "You are still working JOB-X" on every other job and could not
-- start their next one. Migration 123 rejected any end later than now() with
-- zero tolerance; the end timestamp is produced by the application server a
-- few milliseconds before this function runs, so any positive skew between
-- the two clocks trips it.
--
-- Change: an end up to 5 minutes ahead of now() is accepted and CLAMPED to
-- now() before the duration is computed and stored. Nothing later than the
-- database clock is ever stored, so the payroll-inflation window 123 closed
-- stays closed. Ends more than 5 minutes ahead are still rejected. Signature,
-- grants, authorization, locking and the historical-correction path are
-- unchanged from 123.

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
set search_path = public, pg_temp
as $$
declare
  v_uid      uuid := auth.uid();
  v_entry    public.time_entries%rowtype;
  v_duration integer;
  v_is_manager boolean;
  v_ended_at timestamptz;
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

  -- Reject a genuinely future end (more than a few minutes ahead of the
  -- database clock). An end that is only slightly ahead is clock skew between
  -- the caller and this server, not an attempt to inflate hours: it is
  -- clamped to now(), so the stored end can never exceed the server clock and
  -- no inflation window exists.
  if p_ended_at > now() + interval '5 minutes' then
    raise exception 'ended_at cannot be in the future'
      using errcode = '22023';
  end if;

  v_ended_at := least(p_ended_at, now());

  v_duration := greatest(
    0,
    round(
      extract(epoch from (v_ended_at - v_entry.started_at))::numeric / 60.0
    )
  )::integer;

  -- 6. Close only mutable close-fields ---------------------------------------
  update public.time_entries
  set
    ended_at = v_ended_at,
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
