-- Migration 123: reject future-dated close_time_entry ends.
--
-- Security context
-- ----------------
-- Finding: migration 119 introduced close_time_entry and validates only that
-- p_ended_at >= started_at. It does not reject a future p_ended_at. A
-- technician can open a legitimate segment, then call the RPC with an end
-- timestamp hours or days ahead. Duration is computed from that future end,
-- inflating duration_minutes (payroll integrity).
--
-- Fix strategy (Option B — universal guard, zero skew tolerance)
-- --------------------------------------------------------------
-- Preferring Option A (DB now() for ordinary close, caller time for
-- authorized historical correction) was evaluated and rejected for this
-- change because:
--   • Ordinary and correction share this same RPC signature.
--   • Non-manager technicians may still supply a historical ended_at for
--     own stale-shift self-correction (app gate: open ≥ 12 hours).
--   • Forcing now() for all non-managers would break that correction path.
--   • Separating the paths cleanly needs a signature/flag or duplicated
--     app heuristics — excess scope/risk for this fix.
--
-- Therefore retain the existing signature with a universal upper bound:
--   p_ended_at <= now()
-- Zero tolerance (no +N seconds/minutes). Audit confirmed no workflow
-- intentionally closes in the future; ordinary closes send current UTC
-- ISO timestamps; missed-clock-out correction already rejects future
-- values in application code. Any positive window is a material
-- inflation allowance for direct RPC callers, not a payroll-safe need.
--
-- What does NOT change
-- --------------------
-- • Function signature / grants / SECURITY DEFINER / search_path
-- • create_time_entry (migration 122)
-- • INSERT / UPDATE / DELETE RLS policies
-- • Authorization, company scoping, ownership checks, row locking
-- • Negative-duration protection and already-closed behavior
-- • Manager correction behavior (caller historical ended_at still accepted
--   when <= now() and >= started_at)
-- • Direct UPDATE permissions for time managers
-- • Application activity recording
-- • Return type (public.time_entries)

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

  -- Reject any future end. Zero tolerance — no clock-skew inflation window.
  if p_ended_at > now() then
    raise exception 'ended_at cannot be in the future'
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
