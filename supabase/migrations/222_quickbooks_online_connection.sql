-- Migration 222: a company's connection to QuickBooks Online.
--
-- ============================ WHAT THIS IS ============================
-- Altair sends a company's customers, price book items, invoices and
-- payments into that company's own QuickBooks Online, one way. Three tables:
--
--   accounting_connections         one row per company and provider: which
--                                  QuickBooks company, the owner's setup
--                                  answers, and whether it is working.
--   accounting_connection_secrets  the encrypted keys to that QuickBooks
--                                  company. Nobody reads this but the
--                                  service role.
--   accounting_sync_records        one row per Altair record that is sent or
--                                  waiting to be: its QuickBooks id, whether
--                                  it arrived, and if not, why in plain words.
--                                  It is the queue and the link table at once.
--
-- Nothing here holds QuickBooks data. Altair stores QuickBooks record ids,
-- the account names the owner picked, and the QuickBooks company name shown
-- on screen. Intuit's developer terms (from 2026-12-12) require deleting what
-- an app holds within 30 days of a disconnect: the application deletes the
-- secrets and the sync records at disconnect (lib/accounting/connection.ts).
--
-- ============================ WHO MAY DO WHAT ============================
-- Owners and admins read the connection (Settings > Integrations). Everyone
-- who can see invoices (owner, admin, office staff: can_manage_billing) reads
-- the sync records, which is what the "In QuickBooks" label on an invoice
-- needs. Nobody writes any of it with their own session: the application
-- writes through the service role after it has checked the caller
-- (app/actions/quickbooks.ts), the same split every table since 179 uses.
--
-- The secrets table is stricter: row level security on, no policy, no grant
-- to anon or authenticated at all. It is read in one module,
-- lib/accounting/connection.ts.
--
-- Additive only. Applying this migration changes no existing row, and it can
-- be run twice.

-- ======================================================================
-- accounting_connections
-- ======================================================================

create table if not exists public.accounting_connections (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,

  -- Only QuickBooks Online today. A text check, not an enum, so a second
  -- provider is a one-line constraint change rather than an enum migration.
  provider text not null,
  -- Which Intuit environment the keys belong to.
  environment text not null,
  -- Intuit's id for the QuickBooks company ("realmId").
  realm_id text not null,
  -- Shown on screen: "Sending to <name>". Read once at connect.
  external_company_name text,

  -- setup: signed in, the owner has not answered the setup questions yet.
  --        Nothing is sent.
  -- active: sending.
  -- reauth_required: Intuit refused the keys (expired after 100 days unused,
  --        or revoked in QuickBooks). Nothing is sent until the owner
  --        connects again.
  -- disconnected: the owner disconnected. Keys and sync records are gone.
  status text not null default 'setup',

  -- ---- the owner's setup answers
  -- from_today: only records from started_at on.
  -- from_today_with_open: also invoices still unpaid at started_at.
  start_mode text,
  started_at timestamptz,
  income_account_ref text,
  income_account_name text,
  deposit_account_ref text,
  deposit_account_name text,

  -- ---- what Altair learned about the QuickBooks company at setup
  -- automated: QuickBooks works out sales tax itself (US Automated Sales Tax).
  -- manual:    the company keeps its own tax rates; manual_tax_code_ref is the
  --            one the owner picked.
  -- none:      sales tax is off in QuickBooks.
  tax_mode text,
  manual_tax_code_ref text,
  manual_tax_code_name text,
  -- True when QuickBooks accepts our invoice numbers (custom transaction
  -- numbers is on). When false, QuickBooks numbers invoices itself.
  custom_doc_numbers boolean,
  -- The QuickBooks item a hand-typed invoice line is sent as.
  general_item_ref text,

  -- ---- one sender at a time
  -- Claimed with a conditional update before sending, so the instant send,
  -- the daily job and the "Send now" button never run side by side for one
  -- company. Expires on its own if a sender dies.
  sync_lock_until timestamptz,
  last_sync_at timestamptz,

  connected_by uuid references public.profiles (id) on delete set null,
  connected_at timestamptz not null default now(),
  disconnected_by uuid references public.profiles (id) on delete set null,
  disconnected_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint accounting_connections_provider_check
    check (provider in ('quickbooks_online')),
  constraint accounting_connections_environment_check
    check (environment in ('sandbox', 'production')),
  constraint accounting_connections_status_check
    check (status in ('setup', 'active', 'reauth_required', 'disconnected')),
  constraint accounting_connections_start_mode_check
    check (start_mode is null or start_mode in ('from_today', 'from_today_with_open')),
  constraint accounting_connections_tax_mode_check
    check (tax_mode is null or tax_mode in ('automated', 'manual', 'none')),
  constraint accounting_connections_realm_length
    check (char_length(realm_id) between 1 and 64),
  constraint accounting_connections_active_is_set_up
    check (
      status <> 'active'
      or (start_mode is not null and started_at is not null and income_account_ref is not null)
    )
);

create unique index if not exists accounting_connections_company_provider_idx
  on public.accounting_connections (company_id, provider);

comment on table public.accounting_connections is
  'One row per company and accounting provider (QuickBooks Online). Owner/admin read; service-role write after an application check. Holds ids and the owner''s setup answers, never keys or QuickBooks data.';

drop trigger if exists accounting_connections_set_updated_at on public.accounting_connections;
create trigger accounting_connections_set_updated_at
  before update on public.accounting_connections
  for each row execute function public.set_updated_at();

alter table public.accounting_connections enable row level security;

-- RLS narrows a privilege; it does not create one. Everything is taken away
-- first (Supabase grants ALL, TRUNCATE included, on a new public table), and
-- only the read is given back for the policy below to narrow.
revoke all on table public.accounting_connections from public;
revoke all on table public.accounting_connections from anon;
revoke all on table public.accounting_connections from authenticated;
revoke insert, update, delete on table public.accounting_connections from authenticated;
grant select on table public.accounting_connections to authenticated;
grant all on table public.accounting_connections to service_role;

drop policy if exists "owners and admins can view accounting connections" on public.accounting_connections;

create policy "owners and admins can view accounting connections"
on public.accounting_connections
for select
to authenticated
using (
  public.has_company_role(
    company_id,
    array['owner', 'admin']::public.company_role[]
  )
);

-- ======================================================================
-- accounting_connection_secrets
-- ======================================================================

create table if not exists public.accounting_connection_secrets (
  connection_id uuid primary key references public.accounting_connections (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,

  -- Both written by lib/integrations/crypto.ts (AES-256-GCM, versioned key).
  -- Never plaintext.
  access_token_ciphertext text not null,
  access_token_expires_at timestamptz not null,
  refresh_token_ciphertext text not null,
  -- Intuit rolls this forward on every refresh (100 days from last use).
  refresh_token_expires_at timestamptz,

  -- Intuit revokes a refresh token that is used twice at once. A refresh
  -- claims this first with a conditional update; a second caller waits and
  -- reads the new token instead of refreshing again.
  refresh_lock_until timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.accounting_connection_secrets is
  'Encrypted QuickBooks keys, one row per connection. Service role only: RLS on, no policy, no grant to anon or authenticated. Read only by lib/accounting/connection.ts.';

drop trigger if exists accounting_connection_secrets_set_updated_at on public.accounting_connection_secrets;
create trigger accounting_connection_secrets_set_updated_at
  before update on public.accounting_connection_secrets
  for each row execute function public.set_updated_at();

alter table public.accounting_connection_secrets enable row level security;

revoke all on table public.accounting_connection_secrets from public;
revoke all on table public.accounting_connection_secrets from anon;
revoke all on table public.accounting_connection_secrets from authenticated;
grant all on table public.accounting_connection_secrets to service_role;

-- ======================================================================
-- accounting_sync_records
-- ======================================================================

create table if not exists public.accounting_sync_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  connection_id uuid not null references public.accounting_connections (id) on delete cascade,

  entity_type text not null,
  -- The Altair record: customers.id, service_items.id, invoices.id or
  -- invoice_payments.id. No foreign key: the four live in four tables, and a
  -- deleted Altair record must not take its QuickBooks link with it silently.
  local_id uuid not null,

  -- The QuickBooks record, once it exists.
  remote_id text,
  remote_sync_token text,

  -- pending:   waiting to be sent (new, or changed since it was sent).
  -- sent:      in QuickBooks and up to date.
  -- attention: could not be sent, or arrived different; attention_* says
  --            why. Held until the record changes again or someone presses
  --            Try again or Mark as handled.
  -- skipped:   deliberately not sent (for example, a paid invoice from
  --            before the start date). Kept so it is not looked at again.
  state text not null default 'pending',
  -- What was last sent, as a hash. A change that would send the same thing
  -- again is not sent.
  sent_fingerprint text,

  attention_code text,
  -- Plain facts for the on-screen sentence: amounts, names, an address.
  -- Never a QuickBooks error body (those are classified, not stored).
  attention_detail jsonb not null default '{}'::jsonb,
  attention_at timestamptz,
  handled_at timestamptz,

  attempts integer not null default 0,
  next_attempt_at timestamptz,
  last_attempt_at timestamptz,
  -- Intuit's id for the last request, for their support desk.
  last_intuit_tid text,
  sent_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint accounting_sync_records_entity_type_check
    check (entity_type in ('customer', 'item', 'invoice', 'payment')),
  constraint accounting_sync_records_state_check
    check (state in ('pending', 'sent', 'attention', 'skipped')),
  constraint accounting_sync_records_attempts_range
    check (attempts between 0 and 1000),
  constraint accounting_sync_records_detail_object
    check (jsonb_typeof(attention_detail) = 'object')
);

create unique index if not exists accounting_sync_records_link_idx
  on public.accounting_sync_records (connection_id, entity_type, local_id);

create index if not exists accounting_sync_records_due_idx
  on public.accounting_sync_records (connection_id, state, next_attempt_at);

create index if not exists accounting_sync_records_local_idx
  on public.accounting_sync_records (company_id, entity_type, local_id);

comment on table public.accounting_sync_records is
  'One row per Altair record sent (or waiting to be) to the company''s accounting provider: its remote id and whether it arrived. Billing roles read; service-role write after an application check.';

drop trigger if exists accounting_sync_records_set_updated_at on public.accounting_sync_records;
create trigger accounting_sync_records_set_updated_at
  before update on public.accounting_sync_records
  for each row execute function public.set_updated_at();

alter table public.accounting_sync_records enable row level security;

revoke all on table public.accounting_sync_records from public;
revoke all on table public.accounting_sync_records from anon;
revoke all on table public.accounting_sync_records from authenticated;
revoke insert, update, delete on table public.accounting_sync_records from authenticated;
grant select on table public.accounting_sync_records to authenticated;
grant all on table public.accounting_sync_records to service_role;

drop policy if exists "billing roles can view accounting sync records" on public.accounting_sync_records;

create policy "billing roles can view accounting sync records"
on public.accounting_sync_records
for select
to authenticated
using (public.can_manage_billing(company_id));
