-- Migration 175: a company deletion lifecycle with a grace period.
--
-- ============================== WHAT EXISTED ==============================
-- Nothing. There was no way for a customer to leave, and no defined way for an
-- operator to remove a tenant — which in practice means it gets done by hand,
-- against production, with a service-role client and no record. That is the
-- single most destructive thing anyone can do to this system, and it had no
-- procedure, no confirmation, no delay and no audit.
--
-- ============================== THE STATE MACHINE ==============================
--
--   (none) --request--> pending --cancel--> cancelled
--                          |
--                     (grace elapses)
--                          |
--                          v
--                      purging --success--> purged
--                          |
--                          +---failure----> failed  (resumable; the progress
--                                                    map records what was done)
--
-- pending is the whole point. A deletion request is a statement of intent, not
-- an execution: for GRACE_DAYS the company keeps working, and any owner or
-- admin can cancel it. Nothing is destroyed until the grace period elapses AND
-- an operator runs the purge. There is no automatic destruction, and no cron
-- entry that would create one.
--
-- ============================== WHAT THIS MIGRATION DOES NOT DO ==============================
-- It does not delete anything. Requesting, cancelling and reading state are
-- here; the destruction lives in scripts/purge-company.mjs, which is dry-run
-- by default, refuses a company whose grace period has not elapsed, and works
-- through a frozen dependency order one table at a time recording progress.
--
-- Keeping the destruction out of SQL is deliberate. A SECURITY DEFINER function
-- that deletes 65 tables is one typo away from deleting them for the wrong
-- company, and it cannot be resumed, dry-run, or watched while it runs.
--
-- ============================== AUTHORIZATION ==============================
-- manageCompany, which COMPANY_ROLE_PERMISSIONS grants to owner and admin. Plus
-- a typed confirmation matching the company name: this is the one action where
-- a mis-click is unrecoverable, so it takes a deliberate act to start and a
-- single click to stop.

begin;

create table if not exists public.company_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  status text not null default 'pending',
  requested_by uuid references public.profiles (id) on delete set null,
  requested_at timestamptz not null default now(),
  -- Nothing may be destroyed before this instant.
  scheduled_purge_at timestamptz not null,
  cancelled_by uuid references public.profiles (id) on delete set null,
  cancelled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  -- { "<table>": <rows deleted> }. What makes a failed purge resumable rather
  -- than a company half deleted with no record of how far it got.
  progress jsonb not null default '{}'::jsonb,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_deletion_requests_status_check
    check (status in ('pending', 'cancelled', 'purging', 'purged', 'failed')),
  constraint company_deletion_requests_failure_len
    check (failure_reason is null or char_length(failure_reason) <= 500)
);

comment on table public.company_deletion_requests is
  'Company deletion lifecycle. A request is intent, not execution: nothing is destroyed before scheduled_purge_at, and only by an operator running scripts/purge-company.mjs. Cancellable while pending.';

-- At most one live request per company. A second request while one is pending
-- would make "cancel" ambiguous.
create unique index if not exists company_deletion_requests_one_live_idx
  on public.company_deletion_requests (company_id)
  where status in ('pending', 'purging');

create index if not exists company_deletion_requests_due_idx
  on public.company_deletion_requests (scheduled_purge_at)
  where status = 'pending';

alter table public.company_deletion_requests enable row level security;

-- Members of the company may READ their own request: a workspace scheduled for
-- deletion must be able to say so, and to offer the cancel.
drop policy if exists company_deletion_requests_select on public.company_deletion_requests;
create policy company_deletion_requests_select
  on public.company_deletion_requests
  for select
  using (public.is_active_company_member(company_id));

-- No insert/update/delete policies. Every write goes through the functions
-- below, which check the permission and the confirmation.
revoke all on table public.company_deletion_requests from public;
revoke all on table public.company_deletion_requests from anon;
grant select on table public.company_deletion_requests to authenticated;
grant all on table public.company_deletion_requests to service_role;

-- ---------------------------------------------------------------------------
-- Request
-- ---------------------------------------------------------------------------
--
-- p_confirmation must equal the company's name. Not a checkbox: the act of
-- typing the name is the difference between "I meant this workspace" and "I
-- clicked the red button".

create or replace function public.request_company_deletion(
  p_company_id uuid,
  p_confirmation text,
  p_grace_days integer default 30
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $function$
declare
  v_user_id uuid := auth.uid();
  v_name text;
  v_grace integer := greatest(1, least(coalesce(p_grace_days, 30), 90));
  v_id uuid;
  v_scheduled timestamptz;
begin
  if p_company_id is null then
    raise exception 'company_id_required';
  end if;

  if v_user_id is null then
    raise exception 'authentication_required';
  end if;

  if not public.is_active_company_member(p_company_id) then
    raise exception 'insufficient_permission';
  end if;

  -- manageCompany. can_manage_billing is its superset under
  -- COMPANY_ROLE_PERMISSIONS -- owner and admin have manageCompany, and
  -- manageBilling additionally covers office_staff -- so billing access alone
  -- is NOT sufficient here and the owner/admin roles are checked directly.
  if not exists (
    select 1
    from public.company_memberships m
    where m.company_id = p_company_id
      and m.user_id = v_user_id
      and m.status = 'active'
      and m.role in ('owner', 'admin')
  ) then
    return jsonb_build_object('error', 'insufficient_permission');
  end if;

  select c.name into v_name from public.companies c where c.id = p_company_id;

  if v_name is null then
    return jsonb_build_object('error', 'company_not_found');
  end if;

  if p_confirmation is null or btrim(p_confirmation) <> btrim(v_name) then
    return jsonb_build_object('error', 'confirmation_mismatch');
  end if;

  if exists (
    select 1 from public.company_deletion_requests r
    where r.company_id = p_company_id and r.status in ('pending', 'purging')
  ) then
    return jsonb_build_object('error', 'already_requested');
  end if;

  v_scheduled := now() + make_interval(days => v_grace);

  insert into public.company_deletion_requests (
    company_id, status, requested_by, scheduled_purge_at
  )
  values (p_company_id, 'pending', v_user_id, v_scheduled)
  returning id into v_id;

  return jsonb_build_object(
    'id', v_id,
    'status', 'pending',
    'scheduledPurgeAt', v_scheduled
  );
end;
$function$;

revoke all on function public.request_company_deletion(uuid, text, integer) from public;
revoke all on function public.request_company_deletion(uuid, text, integer) from anon;
grant execute on function public.request_company_deletion(uuid, text, integer)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Cancel
-- ---------------------------------------------------------------------------
--
-- Only while pending. Once a purge has STARTED there is nothing coherent to
-- return to, and pretending otherwise would be worse than refusing.

create or replace function public.cancel_company_deletion(
  p_company_id uuid
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $function$
declare
  v_user_id uuid := auth.uid();
  v_updated integer;
begin
  if p_company_id is null then
    raise exception 'company_id_required';
  end if;

  if v_user_id is null then
    raise exception 'authentication_required';
  end if;

  if not public.is_active_company_member(p_company_id) then
    raise exception 'insufficient_permission';
  end if;

  if not exists (
    select 1
    from public.company_memberships m
    where m.company_id = p_company_id
      and m.user_id = v_user_id
      and m.status = 'active'
      and m.role in ('owner', 'admin')
  ) then
    return jsonb_build_object('error', 'insufficient_permission');
  end if;

  update public.company_deletion_requests
  set status = 'cancelled',
      cancelled_by = v_user_id,
      cancelled_at = now(),
      updated_at = now()
  where company_id = p_company_id
    and status = 'pending';

  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    -- Either nothing was pending, or a purge has already started. Both mean
    -- "there is nothing to cancel", and distinguishing them for the caller
    -- would only tell them whether their data is already gone.
    return jsonb_build_object('error', 'nothing_to_cancel');
  end if;

  return jsonb_build_object('status', 'cancelled');
end;
$function$;

revoke all on function public.cancel_company_deletion(uuid) from public;
revoke all on function public.cancel_company_deletion(uuid) from anon;
grant execute on function public.cancel_company_deletion(uuid)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Purge bookkeeping
-- ---------------------------------------------------------------------------
--
-- Called by the purge script, service_role only. Separated from the request
-- functions because these are operator machinery, not customer actions.
--
-- claim_company_deletion refuses to move a request to 'purging' unless the
-- grace period has elapsed. That check lives here rather than in the script so
-- that it holds even if the script is wrong.

create or replace function public.claim_company_deletion(
  p_company_id uuid
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $function$
declare
  v_row public.company_deletion_requests;
begin
  update public.company_deletion_requests
  set status = 'purging',
      started_at = coalesce(started_at, now()),
      updated_at = now()
  where company_id = p_company_id
    and status in ('pending', 'purging', 'failed')
    and scheduled_purge_at <= now()
  returning * into v_row;

  if v_row.id is null then
    return jsonb_build_object('claimed', false);
  end if;

  return jsonb_build_object(
    'claimed', true,
    'id', v_row.id,
    'progress', v_row.progress,
    'scheduledPurgeAt', v_row.scheduled_purge_at
  );
end;
$function$;

create or replace function public.record_company_deletion_progress(
  p_company_id uuid,
  p_progress jsonb
)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $function$
begin
  update public.company_deletion_requests
  set progress = coalesce(p_progress, '{}'::jsonb),
      updated_at = now()
  where company_id = p_company_id and status = 'purging';
end;
$function$;

create or replace function public.finish_company_deletion(
  p_company_id uuid,
  p_status text,
  p_failure_reason text default null
)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $function$
begin
  if p_status not in ('purged', 'failed') then
    raise exception 'invalid_terminal_status';
  end if;

  update public.company_deletion_requests
  set status = p_status,
      failure_reason = p_failure_reason,
      completed_at = case when p_status = 'purged' then now() else completed_at end,
      updated_at = now()
  where company_id = p_company_id and status = 'purging';
end;
$function$;

revoke all on function public.claim_company_deletion(uuid) from public;
revoke all on function public.claim_company_deletion(uuid) from anon;
revoke all on function public.claim_company_deletion(uuid) from authenticated;
grant execute on function public.claim_company_deletion(uuid) to service_role;

revoke all on function public.record_company_deletion_progress(uuid, jsonb) from public;
revoke all on function public.record_company_deletion_progress(uuid, jsonb) from anon;
revoke all on function public.record_company_deletion_progress(uuid, jsonb)
  from authenticated;
grant execute on function public.record_company_deletion_progress(uuid, jsonb)
  to service_role;

revoke all on function public.finish_company_deletion(uuid, text, text) from public;
revoke all on function public.finish_company_deletion(uuid, text, text) from anon;
revoke all on function public.finish_company_deletion(uuid, text, text) from authenticated;
grant execute on function public.finish_company_deletion(uuid, text, text) to service_role;

commit;
