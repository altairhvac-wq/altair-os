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
  -- The QuickBooks company this row was last disconnected from. Disconnect
  -- deletes what Altair sent (Intuit's terms), so reconnecting the SAME
  -- company must start from today: sending its open invoices again would
  -- duplicate them. Only the id is kept, never QuickBooks data.
  previous_realm_id text,

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

-- For a database that ran an earlier draft of this file (scratch only).
alter table public.accounting_connections add column if not exists previous_realm_id text;

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

-- ======================================================================
-- Queueing a change: one trigger on the four tables that are sent
-- ======================================================================
--
-- Invoices change in many places: the office's edit and send, a payment
-- (which moves the balance and status), the Stripe webhook, the nightly
-- overdue sweep, the job-completion draft. No application function is
-- crossed by all of them, so the queue is filled here, where every one of
-- them ends up. The application only has to SEND (lib/accounting/run.ts);
-- it cannot forget to queue.
--
-- What is queued, and only while the company has an active connection:
--   invoice   inserted or updated, not a draft, not demo data, and either
--             made since the connection started, leaving draft right now,
--             or already queued (setup queues the open ones it was told to).
--   payment   inserted, not demo data, unless its invoice is from before the
--             start and was never sent.
--   customer  updated, only if it was sent before. A customer is first sent
--   item      when an invoice uses it, by the engine, not here.
--
-- Queuing is cheap and safe to over-do: the engine compares what it would
-- send with what it last sent and makes no QuickBooks call when they match
-- (a payment moving an invoice's balance changes nothing that is sent).
--
-- A record somebody set aside (state 'skipped') stays set aside.
--
-- security definer because the triggering session (a technician completing
-- a job, the anonymous Stripe webhook's service role, a cron) has no write
-- on accounting_sync_records; set search_path pins every name it uses.

create or replace function public.accounting_enqueue_on_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_company uuid;
  v_entity text;
  v_local uuid;
  v_connection_id uuid;
  v_started_at timestamptz;
  v_invoice_created timestamptz;
  v_invoice_status text;
begin
  if tg_table_name = 'invoices' then
    if new.is_demo or new.status = 'draft' then
      return new;
    end if;
    v_company := new.company_id;
    v_entity := 'invoice';
    v_local := new.id;
  elsif tg_table_name = 'invoice_payments' then
    if new.is_demo then
      return new;
    end if;
    v_company := new.company_id;
    v_entity := 'payment';
    v_local := new.id;
  elsif tg_table_name = 'customers' then
    v_company := new.company_id;
    v_entity := 'customer';
    v_local := new.id;
  elsif tg_table_name = 'service_items' then
    v_company := new.company_id;
    v_entity := 'item';
    v_local := new.id;
  else
    return new;
  end if;

  select c.id, c.started_at
    into v_connection_id, v_started_at
    from public.accounting_connections c
   where c.company_id = v_company
     and c.status = 'active'
   limit 1;

  if v_connection_id is null then
    return new;
  end if;

  if v_entity in ('customer', 'item') then
    update public.accounting_sync_records r
       set state = 'pending',
           next_attempt_at = now(),
           attempts = 0,
           attention_code = null,
           attention_detail = '{}'::jsonb,
           attention_at = null,
           handled_at = null
     where r.connection_id = v_connection_id
       and r.entity_type = v_entity
       and r.local_id = v_local
       and r.state <> 'skipped';
    return new;
  end if;

  if v_entity = 'invoice' then
    if not (
      new.created_at >= v_started_at
      or (tg_op = 'UPDATE' and old.status = 'draft')
      or exists (
        select 1 from public.accounting_sync_records r
         where r.connection_id = v_connection_id
           and r.entity_type = 'invoice'
           and r.local_id = v_local
      )
    ) then
      return new;
    end if;
  else
    select i.created_at, i.status::text
      into v_invoice_created, v_invoice_status
      from public.invoices i
     where i.id = new.invoice_id;

    if exists (
      select 1 from public.accounting_sync_records r
       where r.connection_id = v_connection_id
         and r.entity_type = 'invoice'
         and r.local_id = new.invoice_id
         and r.state = 'skipped'
    ) then
      return new;
    end if;

    -- A payment can take a draft invoice straight to paid: the invoice
    -- leaves draft in the same statement, so it counts as current work.
    if not (
      v_invoice_created >= v_started_at
      or v_invoice_status = 'draft'
      or exists (
        select 1 from public.accounting_sync_records r
         where r.connection_id = v_connection_id
           and r.entity_type = 'invoice'
           and r.local_id = new.invoice_id
      )
    ) then
      return new;
    end if;
  end if;

  insert into public.accounting_sync_records as r
    (company_id, connection_id, entity_type, local_id, state, next_attempt_at)
  values
    (v_company, v_connection_id, v_entity, v_local, 'pending', now())
  on conflict (connection_id, entity_type, local_id) do update
    set state = 'pending',
        next_attempt_at = now(),
        attempts = 0,
        attention_code = null,
        attention_detail = '{}'::jsonb,
        attention_at = null,
        handled_at = null
    where r.state <> 'skipped';

  return new;
end;
$function$;

comment on function public.accounting_enqueue_on_change() is
  'Trigger: queues an invoice, payment, customer or price book item for the company''s active accounting connection (migration 222). Sends nothing itself.';

-- A trigger function is not called by users; nobody needs EXECUTE on it.
revoke all on function public.accounting_enqueue_on_change() from public;
revoke all on function public.accounting_enqueue_on_change() from anon;
revoke all on function public.accounting_enqueue_on_change() from authenticated;

drop trigger if exists invoices_accounting_enqueue on public.invoices;
create trigger invoices_accounting_enqueue
  after insert or update on public.invoices
  for each row execute function public.accounting_enqueue_on_change();

drop trigger if exists invoice_payments_accounting_enqueue on public.invoice_payments;
create trigger invoice_payments_accounting_enqueue
  after insert on public.invoice_payments
  for each row execute function public.accounting_enqueue_on_change();

drop trigger if exists customers_accounting_enqueue on public.customers;
create trigger customers_accounting_enqueue
  after update on public.customers
  for each row execute function public.accounting_enqueue_on_change();

drop trigger if exists service_items_accounting_enqueue on public.service_items;
create trigger service_items_accounting_enqueue
  after update on public.service_items
  for each row execute function public.accounting_enqueue_on_change();
