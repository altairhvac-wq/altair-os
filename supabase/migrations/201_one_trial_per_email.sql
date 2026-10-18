-- Migration 201: one free trial per person.
--
-- ===================== WHY =====================
-- Since migration 200 a new company starts a 14-day trial with no card. The
-- only thing a trial costs is an email address, and nothing stopped one person
-- from signing up again with a fresh one — or with the SAME one, dressed up:
-- `jane+2@gmail.com`, `j.ane@gmail.com` and `Jane@gmail.com` all reach the
-- same inbox. This migration makes the trial a one-per-inbox offer.
--
-- ===================== WHAT CHANGES =====================
-- 1. normalize_trial_email(text): lowercases, trims, drops a `+tag`, and for
--    Gmail (gmail.com / googlemail.com) drops the dots in the local part, so
--    the three spellings above compare equal. IMMUTABLE and dependency-free;
--    lib/saas-billing/trial-policy.ts mirrors it for the Checkout rule and the
--    verifier (scripts/test-saas-billing-app-access.mjs) keeps the two honest.
--
-- 2. company_subscriptions.trial_withheld_reason: why a company was seeded
--    WITHOUT a trial. Only one value today, 'email_already_trialed'. It exists
--    so the product can tell a withheld trial apart from the pre-200 rows that
--    were born `incomplete` and never trialed: those still get the original
--    card-required trial at Checkout; a withheld one never does, and the
--    activation page says so instead of promising 14 free days.
--
-- 3. bootstrap_company_for_new_user: before seeding the subscription for a
--    NEW company, looks for any auth user whose normalized email equals the
--    caller's, who has ever held an owner membership of a company whose
--    subscription has a trial_ends_at. If one exists the new company is seeded
--    `status='incomplete'`, no trial dates, trial_withheld_reason set: it lands
--    on /activate-subscription like an expired trial would.
--
--    What does NOT change: the same user signing up twice still gets their
--    existing company (the owner-membership lookup runs first, as before);
--    `on conflict (company_id) do nothing` stays; there is no backfill — no
--    existing row is touched, comped or otherwise. A platform admin can still
--    comp a withheld company from /platform.
--
--    The lookup reads auth.users (the function is SECURITY DEFINER and already
--    reads it for the caller's email). It is a sequential scan with a function
--    call per row, acceptable at the current account count; if sign-ups grow,
--    maintain a normalized-email column on profiles and index that instead of
--    indexing a table the auth service owns.

create or replace function public.normalize_trial_email(p_email text)
returns text
language plpgsql
immutable
strict
set search_path = public, pg_temp
as $$
declare
  v_email text := lower(trim(p_email));
  v_at integer;
  v_local text;
  v_domain text;
begin
  v_at := position('@' in v_email);

  if v_at = 0 then
    return v_email;
  end if;

  v_local := substr(v_email, 1, v_at - 1);
  v_domain := substr(v_email, v_at + 1);

  -- Everything from the first '+' is a tag the mailbox ignores.
  if position('+' in v_local) > 0 then
    v_local := substr(v_local, 1, position('+' in v_local) - 1);
  end if;

  if v_domain in ('gmail.com', 'googlemail.com') then
    v_local := replace(v_local, '.', '');
    v_domain := 'gmail.com';
  end if;

  return v_local || '@' || v_domain;
end;
$$;

comment on function public.normalize_trial_email(text) is
  'Collapses an email to the inbox it reaches: lowercase, no +tag, and for Gmail no dots. Used to allow one free trial per inbox. Mirrored by lib/saas-billing/trial-policy.ts normalizeTrialEmail.';

-- Called only from inside bootstrap_company_for_new_user (SECURITY DEFINER,
-- runs as the owner). Nothing else needs it, so nobody else gets it.
revoke all on function public.normalize_trial_email(text) from public;
revoke all on function public.normalize_trial_email(text) from anon;
revoke all on function public.normalize_trial_email(text) from authenticated;
grant execute on function public.normalize_trial_email(text) to service_role;

-- ===================== WITHHELD-TRIAL MARKER =====================

alter table public.company_subscriptions
  add column if not exists trial_withheld_reason text;

alter table public.company_subscriptions
  drop constraint if exists company_subscriptions_trial_withheld_reason_check;

alter table public.company_subscriptions
  add constraint company_subscriptions_trial_withheld_reason_check
  check (
    trial_withheld_reason is null
    or trial_withheld_reason in ('email_already_trialed')
  );

comment on column public.company_subscriptions.trial_withheld_reason is
  'Set at bootstrap when the company was seeded without a free trial. email_already_trialed: the owner''s normalized email already owned a trialed company (migration 201). Null for every row that was offered a trial.';

-- ===================== BOOTSTRAP =====================

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
  v_trial_already_used boolean := false;
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
    -- One trial per inbox: has this address, in any spelling, already owned a
    -- company that was given a trial? Decided before the new company exists,
    -- so the new row can never match itself.
    if length(v_email) > 0 then
      select exists (
        select 1
        from auth.users u
        join public.company_memberships cm
          on cm.user_id = u.id
         and cm.role = 'owner'
        join public.company_subscriptions cs
          on cs.company_id = cm.company_id
        where cs.trial_ends_at is not null
          and u.email is not null
          and public.normalize_trial_email(u.email) = public.normalize_trial_email(v_email)
      )
      into v_trial_already_used;
    end if;

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
    if v_trial_already_used then
      insert into public.company_subscriptions (
        company_id,
        plan_key,
        status,
        trial_starts_at,
        trial_ends_at,
        access_grant,
        trial_withheld_reason
      )
      values (
        v_company_id,
        'starter',
        'incomplete',
        null,
        null,
        'none',
        'email_already_trialed'
      )
      on conflict (company_id) do nothing;
    else
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
  end if;

  return v_company_id;
end;
$$;

comment on function public.bootstrap_company_for_new_user(text, text) is
  'Creates a company + owner membership for a new user. New companies start a 14-day card-free trial (status=trialing, trial_ends_at=now()+14d, access_grant=none) unless the owner''s normalized email already owned a trialed company, in which case the row is seeded status=incomplete with trial_withheld_reason=email_already_trialed (one trial per inbox, migration 201). Stripe Checkout converts the trial when a payment method is added. Existing rows are not modified.';

revoke all on function public.bootstrap_company_for_new_user(text, text) from public;
grant execute on function public.bootstrap_company_for_new_user(text, text) to authenticated;
