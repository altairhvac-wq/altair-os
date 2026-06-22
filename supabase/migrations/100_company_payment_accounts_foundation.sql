-- Phase 0.9: company payment accounts foundation (Stripe Connect linkage scaffold, no runtime yet).

create table public.company_payment_accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  provider text not null,
  provider_account_id text,
  status text not null default 'not_connected',
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  online_payments_enabled boolean not null default false,
  onboarding_completed_at timestamptz,
  disabled_at timestamptz,
  last_synced_at timestamptz,
  provider_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_payment_accounts_provider_check
    check (provider in ('stripe')),
  constraint company_payment_accounts_status_check
    check (
      status in (
        'not_connected',
        'pending',
        'active',
        'restricted',
        'disabled',
        'error'
      )
    ),
  constraint company_payment_accounts_company_provider_unique
    unique (company_id, provider)
);

create unique index company_payment_accounts_provider_account_id_uidx
  on public.company_payment_accounts (provider, provider_account_id)
  where provider_account_id is not null;

create index company_payment_accounts_company_id_idx
  on public.company_payment_accounts (company_id);

create index company_payment_accounts_provider_idx
  on public.company_payment_accounts (provider);

create index company_payment_accounts_status_idx
  on public.company_payment_accounts (status);

create index company_payment_accounts_provider_account_id_idx
  on public.company_payment_accounts (provider_account_id)
  where provider_account_id is not null;

drop trigger if exists company_payment_accounts_set_updated_at
  on public.company_payment_accounts;
create trigger company_payment_accounts_set_updated_at
before update on public.company_payment_accounts
for each row execute function public.set_updated_at();

alter table public.company_payment_accounts enable row level security;

create policy "billing and company managers can read company payment accounts"
  on public.company_payment_accounts
  for select
  to authenticated
  using (
    public.is_active_company_member(company_id)
    and (
      public.can_manage_billing(company_id)
      or public.has_company_role(
        company_id,
        array['owner', 'admin']::public.company_role[]
      )
    )
  );

grant select on table public.company_payment_accounts to authenticated;
grant all on table public.company_payment_accounts to service_role;

comment on table public.company_payment_accounts is
  'Per-company external payment provider account linkage (e.g. Stripe Connect). Phase 0.9: read-only for authorized company users; writes via service_role after onboarding exists.';

comment on column public.company_payment_accounts.provider is
  'External payment provider identifier. Phase 0.9: stripe only.';

comment on column public.company_payment_accounts.provider_account_id is
  'Provider-assigned connected account id. Null until onboarding begins.';

comment on column public.company_payment_accounts.provider_metadata is
  'Non-secret provider account metadata only. Must not store API keys or secret keys.';
