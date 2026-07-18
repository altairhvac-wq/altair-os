-- Phase 1: Altair SaaS subscription billing foundation.
-- Isolated from Stripe Connect customer invoice payments
-- (company_payment_accounts / payment_attempts / payment_provider_events).

-- ---------------------------------------------------------------------------
-- company_billing_accounts: one Stripe Customer per company (platform account)
-- ---------------------------------------------------------------------------

create table public.company_billing_accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  stripe_customer_id text,
  livemode boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_billing_accounts_company_id_unique unique (company_id)
);

create unique index company_billing_accounts_stripe_customer_id_uidx
  on public.company_billing_accounts (stripe_customer_id)
  where stripe_customer_id is not null;

create index company_billing_accounts_company_id_idx
  on public.company_billing_accounts (company_id);

drop trigger if exists company_billing_accounts_set_updated_at
  on public.company_billing_accounts;
create trigger company_billing_accounts_set_updated_at
before update on public.company_billing_accounts
for each row execute function public.set_updated_at();

alter table public.company_billing_accounts enable row level security;

create policy "company managers can read company billing accounts"
  on public.company_billing_accounts
  for select
  to authenticated
  using (
    public.is_active_company_member(company_id)
    and public.has_company_role(
      company_id,
      array['owner', 'admin']::public.company_role[]
    )
  );

revoke all on table public.company_billing_accounts from anon;
grant select on table public.company_billing_accounts to authenticated;
grant all on table public.company_billing_accounts to service_role;

comment on table public.company_billing_accounts is
  'Altair SaaS billing: platform Stripe Customer linkage per company. Isolated from Connect company_payment_accounts.';

comment on column public.company_billing_accounts.stripe_customer_id is
  'Platform Stripe Customer id. Null until the company takes its first SaaS billing action.';

-- ---------------------------------------------------------------------------
-- company_subscriptions: local mirror of SaaS subscription + access grants
-- ---------------------------------------------------------------------------

create table public.company_subscriptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  billing_account_id uuid references public.company_billing_accounts (id) on delete set null,
  plan_key text not null default 'beta',
  stripe_subscription_id text,
  status text not null default 'active',
  trial_starts_at timestamptz,
  trial_ends_at timestamptz,
  current_period_starts_at timestamptz,
  current_period_ends_at timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  access_grant text not null default 'none',
  grace_period_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_subscriptions_company_id_unique unique (company_id),
  constraint company_subscriptions_plan_key_check
    check (plan_key in ('beta', 'starter', 'growth', 'pro')),
  constraint company_subscriptions_status_check
    check (
      status in (
        'active',
        'trialing',
        'past_due',
        'canceled',
        'unpaid',
        'incomplete',
        'incomplete_expired',
        'paused'
      )
    ),
  constraint company_subscriptions_access_grant_check
    check (access_grant in ('none', 'beta_comped'))
);

create unique index company_subscriptions_stripe_subscription_id_uidx
  on public.company_subscriptions (stripe_subscription_id)
  where stripe_subscription_id is not null;

create index company_subscriptions_company_id_idx
  on public.company_subscriptions (company_id);

create index company_subscriptions_billing_account_id_idx
  on public.company_subscriptions (billing_account_id);

create index company_subscriptions_status_idx
  on public.company_subscriptions (status);

drop trigger if exists company_subscriptions_set_updated_at
  on public.company_subscriptions;
create trigger company_subscriptions_set_updated_at
before update on public.company_subscriptions
for each row execute function public.set_updated_at();

alter table public.company_subscriptions enable row level security;

create policy "company managers can read company subscriptions"
  on public.company_subscriptions
  for select
  to authenticated
  using (
    public.is_active_company_member(company_id)
    and public.has_company_role(
      company_id,
      array['owner', 'admin']::public.company_role[]
    )
  );

revoke all on table public.company_subscriptions from anon;
grant select on table public.company_subscriptions to authenticated;
grant all on table public.company_subscriptions to service_role;

comment on table public.company_subscriptions is
  'Altair SaaS subscription mirror + access grants. Reads Postgres only at request time; Stripe is never queried from the resolver.';

comment on column public.company_subscriptions.access_grant is
  'Non-Stripe access grants. beta_comped = complimentary closed-beta access.';

-- ---------------------------------------------------------------------------
-- subscription_event_ledger: SaaS webhook idempotency (service_role writes)
-- ---------------------------------------------------------------------------

create table public.subscription_event_ledger (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies (id) on delete set null,
  provider text not null default 'stripe',
  provider_event_id text not null,
  event_type text not null,
  processing_status text not null default 'received',
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscription_event_ledger_provider_check
    check (provider in ('stripe')),
  constraint subscription_event_ledger_processing_status_check
    check (
      processing_status in (
        'received',
        'processing',
        'processed',
        'failed',
        'ignored'
      )
    ),
  constraint subscription_event_ledger_provider_event_id_unique
    unique (provider, provider_event_id)
);

create index subscription_event_ledger_company_id_idx
  on public.subscription_event_ledger (company_id);

create index subscription_event_ledger_processing_status_idx
  on public.subscription_event_ledger (processing_status);

create index subscription_event_ledger_created_at_desc_idx
  on public.subscription_event_ledger (created_at desc);

create index subscription_event_ledger_event_type_idx
  on public.subscription_event_ledger (event_type);

drop trigger if exists subscription_event_ledger_set_updated_at
  on public.subscription_event_ledger;
create trigger subscription_event_ledger_set_updated_at
before update on public.subscription_event_ledger
for each row execute function public.set_updated_at();

alter table public.subscription_event_ledger enable row level security;

-- Service-role only: no authenticated/anon policies (matches payment_provider_events).
revoke all on table public.subscription_event_ledger from authenticated;
revoke all on table public.subscription_event_ledger from anon;
grant all on table public.subscription_event_ledger to service_role;

comment on table public.subscription_event_ledger is
  'SaaS billing webhook ledger. Service_role only. Isolated from payment_provider_events.';

-- ---------------------------------------------------------------------------
-- Bootstrap: new companies get complimentary beta access (no Stripe Customer)
-- ---------------------------------------------------------------------------

create or replace function public.bootstrap_company_for_new_user(
  p_company_name text,
  p_trade text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
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
      access_grant
    )
    values (
      v_company_id,
      'beta',
      'active',
      'beta_comped'
    )
    on conflict (company_id) do nothing;
  end if;

  return v_company_id;
end;
$$;

revoke all on function public.bootstrap_company_for_new_user(text, text) from public;
grant execute on function public.bootstrap_company_for_new_user(text, text) to authenticated;

-- Backfill existing companies so Settings/resolver have a local subscription row.
insert into public.company_subscriptions (
  company_id,
  plan_key,
  status,
  access_grant
)
select
  c.id,
  'beta',
  'active',
  'beta_comped'
from public.companies c
where not exists (
  select 1
  from public.company_subscriptions s
  where s.company_id = c.id
);
