-- Migration 200: the trial starts without a card.
--
-- ===================== WHY =====================
-- Since migration 124 every new company was seeded `status='incomplete'` and
-- sent to Stripe Checkout before its first screen. For traffic arriving from a
-- video that is the wrong first screen (launch audit B2). The owner's decision
-- (2026-10-18): seed a 14-day trial at bootstrap and ask for the card near the
-- end. Checkout stays as the conversion step; it is no longer the gate.
--
-- ===================== WHAT CHANGES =====================
-- 1. bootstrap_company_for_new_user seeds `status='trialing'` with
--    trial_starts_at = now() and trial_ends_at = now() + 14 days. plan_key is
--    'starter' — the default public plan — rather than the internal 'beta'
--    (the column is NOT NULL with a check constraint, so it cannot be left
--    empty). The plan is only a label until Checkout records the one chosen.
--    access_grant stays 'none'; `on conflict (company_id) do nothing` stays.
--    No backfill: existing rows, incomplete or comped, are not rewritten.
--
--    Nothing on the Stripe side moves such a row when the trial ends, because
--    there is no Stripe subscription yet. The application resolver derives the
--    effective status from trial_ends_at (lib/saas-billing/trial-policy.ts),
--    so an expired card-free trial is gated exactly like an 'incomplete' row.
--
-- 2. saas_trial_reminders records which "add a payment method" reminder has
--    been sent to which company, so the daily billing-maintenance cron is
--    idempotent per company per reminder. service_role only: the cron writes
--    it, nothing in the product reads it.

create or replace function public.bootstrap_company_for_new_user(
  p_company_name text,
  p_trade text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_full_name text;
  v_company_id uuid;
  v_slug_base text;
  v_slug text;
  v_trade text := null;
  v_created_new_company boolean := false;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_company_name is null or length(trim(p_company_name)) = 0 then
    raise exception 'Company name is required';
  end if;

  if p_trade is not null and length(trim(p_trade)) > 0 then
    v_trade := lower(trim(p_trade));

    if v_trade not in (
      'hvac',
      'plumbing',
      'electrical',
      'roofing',
      'landscaping',
      'general_contracting',
      'appliance_repair',
      'garage_door',
      'cleaning',
      'other'
    ) then
      raise exception 'Invalid trade selection';
    end if;
  end if;

  select
    coalesce(u.email, ''),
    nullif(trim(u.raw_user_meta_data->>'full_name'), '')
  into v_email, v_full_name
  from auth.users u
  where u.id = v_user_id;

  insert into public.profiles (id, email, full_name)
  values (v_user_id, v_email, v_full_name)
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name);

  select cm.company_id
  into v_company_id
  from public.company_memberships cm
  where cm.user_id = v_user_id
    and cm.role = 'owner'
    and cm.status = 'active'
  order by cm.created_at asc
  limit 1;

  if v_company_id is null then
    v_slug_base := lower(regexp_replace(trim(p_company_name), '[^a-zA-Z0-9]+', '-', 'g'));
    v_slug_base := trim(both '-' from v_slug_base);

    if length(v_slug_base) = 0 then
      v_slug_base := 'company';
    end if;

    v_slug := v_slug_base || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);

    insert into public.companies (name, slug, trade)
    values (trim(p_company_name), v_slug, v_trade)
    returning id into v_company_id;

    insert into public.company_memberships (
      company_id,
      user_id,
      role,
      status,
      joined_at
    )
    values (
      v_company_id,
      v_user_id,
      'owner',
      'active',
      now()
    );

    v_created_new_company := true;
  end if;

  update public.profiles
  set default_company_id = v_company_id
  where id = v_user_id;

  if v_created_new_company then
    insert into public.company_subscriptions (
      company_id,
      plan_key,
      status,
      trial_starts_at,
      trial_ends_at,
      access_grant
    )
    values (
      v_company_id,
      'starter',
      'trialing',
      now(),
      now() + interval '14 days',
      'none'
    )
    on conflict (company_id) do nothing;
  end if;

  return v_company_id;
end;
$$;

comment on function public.bootstrap_company_for_new_user(text, text) is
  'Creates a company + owner membership for a new user. New companies start a 14-day card-free trial (status=trialing, trial_ends_at=now()+14d, access_grant=none); Stripe Checkout converts the trial when a payment method is added. Existing rows are not modified.';

revoke all on function public.bootstrap_company_for_new_user(text, text) from public;
grant execute on function public.bootstrap_company_for_new_user(text, text) to authenticated;

-- ===================== REMINDER LEDGER =====================

create table if not exists public.saas_trial_reminders (
  company_id uuid not null references public.companies (id) on delete cascade,
  reminder_key text not null,
  sent_at timestamptz not null default now(),
  constraint saas_trial_reminders_pkey primary key (company_id, reminder_key),
  constraint saas_trial_reminders_key_len
    check (char_length(reminder_key) between 1 and 64)
);

comment on table public.saas_trial_reminders is
  'One row per (company, reminder) once the "add a payment method" trial reminder has been sent. Written by the billing-maintenance cron with the service role; keeps the reminder idempotent.';

alter table public.saas_trial_reminders enable row level security;

-- No policies on purpose: nothing in the product reads this table through a
-- user session. The cron reaches it with the service role, which bypasses RLS.
revoke all on table public.saas_trial_reminders from public;
revoke all on table public.saas_trial_reminders from anon;
revoke all on table public.saas_trial_reminders from authenticated;
grant select, insert, delete on table public.saas_trial_reminders to service_role;
