-- Migration 199: launch-readiness safety hardening (PR 2).
--
-- Source: docs/reference/launch-readiness-audit-2026-10-18.md. Each block
-- names the audit item it closes. Every statement is idempotent — the file can
-- be re-applied without error and without changing the result.
--
--   H1  accept_network_help_offer never checked the caller
--   M8  generate_expense_number(uuid) still executable by authenticated
--   M7  can_access_platform_admin fell back to the user-writable profiles.email
--   M12 the legacy bootstrap_company_for_new_user(text) overload
--   H4  team invites never expired, and claiming one trusted an unverified email
--   H8  a durable, per-event record of the dunning email (idempotency)

begin;

-- ===========================================================================
-- Shared helper: is the signed-in user's email address confirmed?
-- ===========================================================================
--
-- Supabase does not put a top-level `email_verified` claim in the access
-- token (it lives under user_metadata, where the user can in principle write
-- it), so the authoritative answer is auth.users.email_confirmed_at. Reading
-- that table requires SECURITY DEFINER; the function reads one row for
-- auth.uid() and nothing else, and is not callable anonymously.

create or replace function public.current_user_email_is_confirmed()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from auth.users u
    where u.id = auth.uid()
      and u.email_confirmed_at is not null
  );
$$;

comment on function public.current_user_email_is_confirmed() is
  'True when auth.users.email_confirmed_at is set for auth.uid(). Used by the platform-admin check and the team-invite claim policies (launch audit M7/H4).';

revoke all on function public.current_user_email_is_confirmed() from public;
revoke all on function public.current_user_email_is_confirmed() from anon;
grant execute on function public.current_user_email_is_confirmed()
  to authenticated, service_role;

-- ===========================================================================
-- H1: accept_network_help_offer — require owner/admin of the acting company
-- ===========================================================================
--
-- The function is SECURITY DEFINER and granted to authenticated. It verified
-- that the request belonged to p_acting_company_id but never that the CALLER
-- belonged to that company, so any signed-in user of any tenant could fill
-- another company's open request. Mirrors the check in migration 137.
-- Body otherwise unchanged from migration 140.

create or replace function public.accept_network_help_offer(
  p_help_request_id uuid,
  p_offer_id uuid,
  p_acting_company_id uuid,
  p_referral_id uuid
)
returns public.network_help_requests
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_request public.network_help_requests;
  v_offer public.network_help_offers;
begin
  if not public.has_company_role(
    p_acting_company_id,
    array['owner', 'admin']::public.company_role[]
  ) then
    raise exception 'insufficient_permission';
  end if;

  select * into v_request
  from public.network_help_requests
  where id = p_help_request_id
    and company_id = p_acting_company_id
  for update;

  if not found then
    raise exception 'Help request not found.';
  end if;

  if v_request.status <> 'open' then
    raise exception 'This help request is no longer open.';
  end if;

  select * into v_offer
  from public.network_help_offers
  where id = p_offer_id
    and help_request_id = p_help_request_id
  for update;

  if not found or v_offer.status <> 'pending' then
    raise exception 'This offer is no longer available.';
  end if;

  update public.network_help_offers
  set status = 'declined'
  where help_request_id = p_help_request_id
    and status = 'pending'
    and id <> p_offer_id;

  update public.network_help_offers
  set status = 'accepted'
  where id = p_offer_id;

  update public.network_help_requests
  set status = 'filled', filled_referral_id = p_referral_id
  where id = p_help_request_id
  returning * into v_request;

  return v_request;
end;
$$;

revoke all on function public.accept_network_help_offer(uuid, uuid, uuid, uuid) from public;
revoke all on function public.accept_network_help_offer(uuid, uuid, uuid, uuid) from anon;
grant execute on function public.accept_network_help_offer(uuid, uuid, uuid, uuid) to authenticated;

-- ===========================================================================
-- M8: generate_expense_number(uuid) — service_role only
-- ===========================================================================
--
-- Deprecated shim (migration 148). Application code allocates through
-- allocate_company_document_number; nothing user-facing calls this any more.

revoke execute on function public.generate_expense_number(uuid) from authenticated;
revoke all on function public.generate_expense_number(uuid) from public;
revoke all on function public.generate_expense_number(uuid) from anon;
grant execute on function public.generate_expense_number(uuid) to service_role;

-- ===========================================================================
-- M7: can_access_platform_admin — JWT email only, and it must be confirmed
-- ===========================================================================
--
-- Migration 093 fell back to profiles.email, a column the user can update,
-- when the JWT carried no email. Safe only because email-auth tokens always
-- carry one. Now: the token's email alone, and the account must have a
-- confirmed address. The allow-list is unchanged.

create or replace function public.can_access_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    lower(trim(coalesce(auth.jwt() ->> 'email', ''))) = any (
      array['altairhvac@gmail.com']::text[]
    )
    and public.current_user_email_is_confirmed();
$$;

revoke all on function public.can_access_platform_admin() from public;
revoke all on function public.can_access_platform_admin() from anon;
grant execute on function public.can_access_platform_admin() to authenticated;

-- ===========================================================================
-- M12: drop the legacy single-argument bootstrap overload
-- ===========================================================================
--
-- Migration 107 dropped it before redefining the (text, text) form, but the
-- audit observed both overloads in at least one environment. The client has
-- always passed both arguments; this only removes the one it never calls.

drop function if exists public.bootstrap_company_for_new_user(text);

-- ===========================================================================
-- H4: team invites expire after 14 days, and claiming one needs a confirmed email
-- ===========================================================================

alter table public.company_memberships
  add column if not exists invite_expires_at timestamptz;

comment on column public.company_memberships.invite_expires_at is
  'When a pending invite (status = invited) stops being claimable. Set to invited_at + 14 days by the application. Null on rows that are not invites.';

-- Pending invites that predate the column get a fresh 14-day window from the
-- moment this runs rather than expiring on the spot: the people holding those
-- links were never told they had a deadline.
update public.company_memberships
set invite_expires_at = now() + interval '14 days'
where status = 'invited'
  and user_id is null
  and invite_expires_at is null;

create index if not exists company_memberships_pending_invite_expiry_idx
  on public.company_memberships (invite_expires_at)
  where status = 'invited';

-- Policies from migration 030, recreated with two extra conditions:
--   * the invite has not expired
--   * the signed-in user's email address is confirmed
-- current_user_profile_email() already refuses to answer when the profile and
-- token emails disagree; that guard is kept.

drop policy if exists "users can view pending invites for their email"
  on public.company_memberships;
create policy "users can view pending invites for their email"
on public.company_memberships
for select
to authenticated
using (
  status = 'invited'
  and user_id is null
  and invite_email is not null
  and (invite_expires_at is null or invite_expires_at > now())
  and public.current_user_email_is_confirmed()
  and lower(trim(invite_email)) = public.current_user_profile_email()
);

drop policy if exists "users can accept pending invites for their email"
  on public.company_memberships;
create policy "users can accept pending invites for their email"
on public.company_memberships
for update
to authenticated
using (
  status = 'invited'
  and user_id is null
  and invite_email is not null
  and (invite_expires_at is null or invite_expires_at > now())
  and public.current_user_email_is_confirmed()
  and lower(trim(invite_email)) = public.current_user_profile_email()
)
with check (
  user_id = auth.uid()
  and status = 'active'
  and invite_email is not null
  and public.current_user_email_is_confirmed()
  and lower(trim(invite_email)) = public.current_user_profile_email()
);

drop policy if exists "users can view companies with pending invite"
  on public.companies;
create policy "users can view companies with pending invite"
on public.companies
for select
to authenticated
using (
  exists (
    select 1
    from public.company_memberships cm
    where cm.company_id = companies.id
      and cm.status = 'invited'
      and cm.user_id is null
      and cm.invite_email is not null
      and (cm.invite_expires_at is null or cm.invite_expires_at > now())
      and public.current_user_email_is_confirmed()
      and lower(trim(cm.invite_email)) = public.current_user_profile_email()
  )
);

-- ===========================================================================
-- H8: one dunning email per Stripe event
-- ===========================================================================
--
-- The webhook ledger already makes event PROCESSING idempotent, but a retry
-- after a partial failure would re-run the handler, and an email is not a
-- database write that can be rolled back. This table is claimed (insert, unique
-- on the event id) before the first send, so a second pass finds the claim and
-- sends nothing. Service-role only: it is written by the webhook and read by
-- nothing user-facing.

create table if not exists public.subscription_dunning_notices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  provider text not null default 'stripe',
  provider_event_id text not null,
  stripe_invoice_id text,
  grace_period_ends_at timestamptz,
  recipient_count integer not null default 0,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  constraint subscription_dunning_notices_provider_event_uidx
    unique (provider, provider_event_id)
);

comment on table public.subscription_dunning_notices is
  'One row per invoice.payment_failed event that triggered (or was claimed for) a dunning email to company owners. Written by the billing webhook (service_role); readable by the company''s owners and admins.';

create index if not exists subscription_dunning_notices_company_idx
  on public.subscription_dunning_notices (company_id, created_at desc);

alter table public.subscription_dunning_notices enable row level security;

-- Grants follow the repository convention (verify-integration-migrations):
-- authenticated may SELECT, narrowed by the policy below to the caller's own
-- company and to owners/admins; every write is service_role only.
revoke all on table public.subscription_dunning_notices from public;
revoke all on table public.subscription_dunning_notices from anon;
grant select on table public.subscription_dunning_notices to authenticated;
revoke insert, update, delete on table public.subscription_dunning_notices
  from authenticated;
grant all on table public.subscription_dunning_notices to service_role;

drop policy if exists "company owners and admins can read dunning notices"
  on public.subscription_dunning_notices;
create policy "company owners and admins can read dunning notices"
  on public.subscription_dunning_notices
  for select
  to authenticated
  using (
    public.has_company_role(
      company_id,
      array['owner', 'admin']::public.company_role[]
    )
  );

commit;
