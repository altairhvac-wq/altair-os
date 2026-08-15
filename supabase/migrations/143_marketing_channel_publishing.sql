-- Direct publishing channels: YouTube, Google Business Profile, TikTok.
--
-- ===================== WHAT THIS DOES NOT DO =====================
-- It does NOT create a second connected-account or token architecture.
-- Migrations 089/090/091 already provide one that is correct:
--   089  marketing_connected_accounts  — company-scoped, RLS'd, status +
--        scopes + token_expires_at + provider_resource_id/name + metadata
--   090  marketing_connected_account_secrets — SEPARATE table, service-role
--        only, AES-256-GCM ciphertext, key version, token hash
--   091  marketing_oauth_states — CSRF state for the authorize→callback hop
-- This migration EXTENDS that model. Nothing here stores a token.
--
-- ======================== TWO ADDITIONS ========================
-- 1. Two new providers on the existing enum. `google_business` was already
--    declared as a provider in 089 but never implemented.
--
-- 2. A PUBLISHING CAPABILITY, kept deliberately separate from `status`.
--    These answer different questions and collapsing them is how a UI ends
--    up promising something the API will refuse:
--
--      status      — is the CONNECTION alive?   connected / expired / error
--      capability  — is PUBLISHING allowed?     none / draft_only / direct
--
--    A TikTok account can be perfectly `connected` and still only
--    `draft_only`, because Direct Post requires app review that a valid
--    token says nothing about. A Google Business account can be `connected`
--    and `none`, because the Business Profile APIs require per-project quota
--    approval. Both are real states, neither is an error, and a single
--    field cannot express them.

-- ---------------------------------------------------------------- providers
-- Enum values cannot be added inside a transaction block that also uses them
-- in Postgres < 12; these are separate statements and `if not exists` makes
-- re-running the migration a no-op.
alter type public.marketing_connected_provider add value if not exists 'youtube';
alter type public.marketing_connected_provider add value if not exists 'tiktok';

-- --------------------------------------------------------------- capability
do $$
begin
  if not exists (select 1 from pg_type where typname = 'marketing_publish_capability') then
    create type public.marketing_publish_capability as enum (
      -- Connected, but this provider cannot publish for us yet. Google
      -- Business without API quota; TikTok before review.
      'none',
      -- Content can be delivered, but lands as an unpublished draft that a
      -- human finishes in the provider's own app. TikTok's fallback.
      'draft_only',
      -- Full programmatic publish.
      'direct'
    );
  end if;
end
$$;

alter table public.marketing_connected_accounts
  add column if not exists publish_capability public.marketing_publish_capability
    not null default 'none';

-- Why the capability is what it is, in the provider's own words where
-- possible. Shown to the operator so "not ready" is never a dead end — it
-- always names the next step. Never contains a token: see the check below.
alter table public.marketing_connected_accounts
  add column if not exists capability_detail text;

alter table public.marketing_connected_accounts
  add column if not exists capability_checked_at timestamptz;

-- Belt and braces. `capability_detail` is operator-facing prose that gets
-- rendered in a browser; a bounded length stops an upstream error body from
-- being pasted in wholesale, which is the realistic way a token would ever
-- end up in it.
alter table public.marketing_connected_accounts
  drop constraint if exists marketing_connected_accounts_capability_detail_len;
alter table public.marketing_connected_accounts
  add constraint marketing_connected_accounts_capability_detail_len
    check (capability_detail is null or char_length(capability_detail) <= 500);

comment on column public.marketing_connected_accounts.publish_capability is
  'What this connection can actually DO, independent of whether the token is valid. none = connected but publishing unavailable (missing API quota or app review); draft_only = content lands unpublished for a human to finish; direct = full programmatic publish.';

comment on column public.marketing_connected_accounts.capability_detail is
  'Operator-facing reason for the current capability, naming the next human step. Never contains credentials.';

-- ------------------------------------------------- delivery idempotency
-- The lesson from the duplicate-publish defect: a publish path without a
-- persisted provider id cannot be made idempotent after the fact, because
-- nothing records that the external write already happened.
--
-- One row per (company, provider, post). The unique constraint is the
-- duplicate guard itself — a second publish attempt for the same post to the
-- same provider cannot insert, so it cannot silently double-post.
create table if not exists public.marketing_channel_deliveries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  marketing_post_id uuid not null references public.marketing_posts (id) on delete cascade,
  provider public.marketing_connected_provider not null,
  connected_account_id uuid references public.marketing_connected_accounts (id) on delete set null,
  -- Claimed BEFORE the external call, settled after. A row stuck in
  -- 'in_flight' is the honest record of "we started an external write and
  -- never learned the outcome" — which is exactly the state the old
  -- publish+mark sequence could not represent.
  delivery_state text not null default 'in_flight',
  -- The provider's own id for what we created. Null until it tells us.
  provider_post_id text,
  provider_permalink text,
  failure_detail text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  settled_at timestamptz,
  constraint marketing_channel_deliveries_state_check
    check (delivery_state in ('in_flight', 'posted', 'draft', 'failed')),
  constraint marketing_channel_deliveries_failure_len
    check (failure_detail is null or char_length(failure_detail) <= 1000),
  constraint marketing_channel_deliveries_unique
    unique (company_id, marketing_post_id, provider)
);

create index if not exists marketing_channel_deliveries_company_provider_idx
  on public.marketing_channel_deliveries (company_id, provider);

create index if not exists marketing_channel_deliveries_in_flight_idx
  on public.marketing_channel_deliveries (company_id, created_at)
  where delivery_state = 'in_flight';

drop trigger if exists marketing_channel_deliveries_set_updated_at
  on public.marketing_channel_deliveries;
create trigger marketing_channel_deliveries_set_updated_at
before update on public.marketing_channel_deliveries
for each row execute function public.set_updated_at();

alter table public.marketing_channel_deliveries enable row level security;

-- Read follows the same posture as connected accounts: dispatchers can see
-- delivery state, because "did this actually post?" is an operational
-- question. Writes are service-role only — a delivery record is created by
-- the server-side publish path, never by a browser.
create policy "dispatchers can read marketing channel deliveries"
  on public.marketing_channel_deliveries
  for select
  to authenticated
  using (
    public.is_active_company_member(company_id)
    and public.can_dispatch_jobs(company_id)
  );

-- The SELECT policy above is only reachable if the role also holds a
-- table-level GRANT: RLS narrows an existing privilege, it does not create
-- one. Without this line the dispatcher-read policy would be silently inert.
-- This repo grants explicitly rather than relying on Supabase's default
-- privileges (see 089, 100, 102, 112, 113, 120).
grant select on table public.marketing_channel_deliveries to authenticated;
revoke insert, update, delete on table public.marketing_channel_deliveries from authenticated;
revoke all on table public.marketing_channel_deliveries from anon;
grant all on table public.marketing_channel_deliveries to service_role;

comment on table public.marketing_channel_deliveries is
  'One row per (company, post, provider) external delivery attempt. The unique constraint is the duplicate-publish guard; provider_post_id is persisted so a retry can recognise work that already happened.';
