-- The connection model behind provider-agnostic publishing.
--
-- Extends migrations 089 / 090 / 143 in place. It does NOT create a second
-- connected-account or token architecture — 143's header made that decision
-- and this follows it. Every column here is additive with a default, so the
-- live Facebook connections and their ciphertext are untouched.

-- ------------------------------------------------------------ integration kind
-- WHAT a connection is, as distinct from what it can currently DO.
--
--   publisher     content is delivered TO it
--   asset_source  it PRODUCES creative and can never receive a post
--   first_party   an Altair-owned surface with no third-party credential
--
-- Without this, everything in marketing_connected_accounts is implicitly a
-- publish target, and "publish to Higgsfield" is a representable state that
-- only a code path's good manners prevents. The publish gate reads this
-- column, so an asset source is refused structurally rather than by habit.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'marketing_integration_kind') then
    create type public.marketing_integration_kind as enum (
      'publisher',
      'asset_source',
      'first_party'
    );
  end if;
end
$$;

alter table public.marketing_connected_accounts
  add column if not exists integration_kind public.marketing_integration_kind
    not null default 'publisher';

-- ---------------------------------------------------------- granted scopes
-- `scopes` records what we ASKED for: complete-connect.ts writes the constant
-- it requested, so a user who unticked a permission on the consent screen is
-- stored as though they had granted everything. The publish then fails later
-- with an opaque provider error and nothing on the row explains why.
--
-- This column records what the provider actually GRANTED, read back after
-- consent. The difference between the two IS the diagnosis.
alter table public.marketing_connected_accounts
  add column if not exists granted_scopes text[] not null default '{}';

-- Why the last capability probe failed, if it did. Operator-facing prose
-- rendered in a browser, so it is length-bounded for the same reason
-- capability_detail is (143): a bounded field cannot absorb an upstream
-- error body wholesale, which is the realistic way a token would end up in
-- one.
alter table public.marketing_connected_accounts
  add column if not exists capability_probe_error text;

alter table public.marketing_connected_accounts
  drop constraint if exists marketing_connected_accounts_probe_error_len;
alter table public.marketing_connected_accounts
  add constraint marketing_connected_accounts_probe_error_len
    check (capability_probe_error is null or char_length(capability_probe_error) <= 500);

-- ------------------------------------------------------------- health signals
-- "Is this connection healthy?" was answerable only as "did the last thing
-- that touched it throw?". last_success_at makes the useful question —
-- "has this worked recently?" — answerable without reading the delivery
-- ledger, and gives the Integrations page a real "last used" line.
alter table public.marketing_connected_accounts
  add column if not exists last_success_at timestamptz;

alter table public.marketing_connected_accounts
  add column if not exists last_attempt_at timestamptz;

-- A first-party surface has no delegated credential, so it cannot have an
-- expiring one. Structural, not advisory: it stops `altair_site` rows from
-- ever entering the TOKEN_EXPIRED / REAUTH_REQUIRED branches of the state
-- machine, which have no meaning for a surface we own.
alter table public.marketing_connected_accounts
  drop constraint if exists marketing_connected_accounts_first_party_no_expiry;
alter table public.marketing_connected_accounts
  add constraint marketing_connected_accounts_first_party_no_expiry
    check (integration_kind <> 'first_party' or token_expires_at is null);

create index if not exists marketing_connected_accounts_company_kind_status_idx
  on public.marketing_connected_accounts (company_id, integration_kind, status);

-- ==================== THE CAPABILITY BACKFILL ====================
-- publish_capability has defaulted to 'none' since 143 and no code has ever
-- written it. Once the publish path consults canAcceptContent(), a 'none'
-- row reports API_ACCESS_REQUIRED — "connected, but the provider grants us
-- no publish access" — which for the live Facebook Pages would be false.
--
-- The promotion is scoped to EVIDENCE, not inference. A row is promoted only
-- if it currently holds a credential AND has actually completed an external
-- publish: a settled 'posted' delivery in marketing_channel_deliveries with
-- a provider_post_id the provider itself returned. That is a fact recorded
-- at the time, not an assumption about what a token can probably do.
--
-- Everything else stays 'none' and waits for a live capability probe. A
-- connection that has never published is not evidence of anything, and
-- guessing 'direct' for it is exactly the "do not mark it connected unless
-- it really is" failure this design exists to avoid.
update public.marketing_connected_accounts a
   set publish_capability = 'direct',
       capability_checked_at = now(),
       capability_detail =
         'Backfilled by migration 181 from a completed publish on this connection, recorded before publish_capability had a writer.'
 where a.status = 'connected'
   and a.publish_capability = 'none'
   and exists (
     select 1
       from public.marketing_connected_account_secrets s
      where s.connected_account_id = a.id
   )
   and exists (
     select 1
       from public.marketing_channel_deliveries d
      where d.connected_account_id = a.id
        and d.company_id = a.company_id
        and d.delivery_state = 'posted'
        and d.provider_post_id is not null
   );

-- ---------------------------------------------------- refresh lifecycle
-- refresh_token_encrypted exists (090) and is never populated, because
-- Facebook's long-lived Page tokens do not refresh. Every provider added
-- here does: YouTube, TikTok, LinkedIn, Reddit and Google Business all issue
-- refresh tokens, and TikTok's refresh token ITSELF expires — a fact the
-- schema could not previously record, so a connection would simply start
-- failing with no column able to say it was foreseeable.
alter table public.marketing_connected_account_secrets
  add column if not exists refresh_expires_at timestamptz;

alter table public.marketing_connected_account_secrets
  add column if not exists last_refreshed_at timestamptz;

alter table public.marketing_connected_account_secrets
  add column if not exists refresh_failure_count smallint not null default 0;

alter table public.marketing_connected_account_secrets
  drop constraint if exists marketing_connected_account_secrets_refresh_failures_sane;
alter table public.marketing_connected_account_secrets
  add constraint marketing_connected_account_secrets_refresh_failures_sane
    check (refresh_failure_count >= 0 and refresh_failure_count <= 1000);

-- ------------------------------------------------------------ privilege fix
-- 089 granted to authenticated and service_role but never revoked from anon,
-- unlike 143 and 144 which both do. RLS already blocks anon here (no anon
-- policy exists), so this closes the privilege itself rather than relying on
-- the policy layer alone — the same belt-and-braces posture as the tables
-- written after it.
revoke all on table public.marketing_connected_accounts from anon;

comment on column public.marketing_connected_accounts.integration_kind is
  'What this connection IS. publisher = content is delivered to it; asset_source = it produces creative and can never receive a post; first_party = an Altair-owned surface with no third-party credential. The publish gate refuses anything that is not a publisher.';

comment on column public.marketing_connected_accounts.granted_scopes is
  'What the provider actually granted, read back after consent. `scopes` is what we asked for; a partial consent makes them differ, and that difference is the diagnosis when a publish later fails with an opaque permission error.';

comment on column public.marketing_connected_accounts.last_success_at is
  'When this connection last completed an operation against the provider. Distinct from updated_at, which any local edit touches.';

comment on column public.marketing_connected_account_secrets.refresh_expires_at is
  'When the REFRESH token itself expires, where the provider says so (TikTok). Null means no known expiry, not "never".';
