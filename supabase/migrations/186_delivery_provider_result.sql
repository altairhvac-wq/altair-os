-- What the provider said, kept on the delivery ledger for reconciliation.
--
-- ==================== THE GAP THIS CLOSES ====================
-- `marketing_channel_deliveries` (143, extended by 145) records THAT an
-- external write happened and the ids it produced: provider_post_id,
-- provider_media_id, provider_permalink. That was enough for Facebook, where
-- a published post is a published post.
--
-- It is not enough for a YouTube upload, because the thing most worth
-- recording is not an id — it is the VISIBILITY. A video uploaded privately
-- and a video uploaded publicly produce identical rows under 143, and the
-- supervised canary's entire premise is that the first happened and the
-- second did not. A reconciliation that cannot answer "was it private?"
-- cannot check the one property the canary was authorized on.
--
-- The same argument covers the channel: `connected_account_id` says which
-- CONNECTION was used, and a credential can act for a channel the connection
-- is not bound to (a Brand Account picked at consent). The channel the
-- provider reports is the only record of where the video actually landed.
--
-- ==================== WHY JSONB AND NOT COLUMNS ====================
-- These are PROVIDER-SHAPED facts, and they differ per provider: YouTube has
-- privacyStatus and uploadStatus, TikTok has a publish_id and a poll status,
-- LinkedIn has neither. Columns would mean a nullable pair per provider on a
-- shared ledger, every one of them null for every other provider — and the
-- next provider would add two more. A jsonb keeps the ledger's own shape
-- stable while letting each adapter record what its provider actually says.
--
-- It is deliberately NOT a general-purpose bag. The size cap below is what
-- stops it becoming one: an adapter cannot dump a response body in here, which
-- is the realistic way a token would ever reach this table.

alter table public.marketing_channel_deliveries
  add column if not exists provider_result jsonb not null default '{}'::jsonb;

-- Bounded for the same reason 143 bounds `failure_detail` and 181 bounds
-- `capability_detail`: a field with no ceiling is a field that will one day
-- hold an upstream error body, and an upstream error body is where a
-- credential ends up. 2 KB is ample for a handful of provider status fields
-- and far too small for a response dump.
alter table public.marketing_channel_deliveries
  drop constraint if exists marketing_channel_deliveries_provider_result_size;
alter table public.marketing_channel_deliveries
  add constraint marketing_channel_deliveries_provider_result_size
    check (pg_column_size(provider_result) <= 2048);

-- An object, not an array or a bare scalar. Every reader indexes it by key.
alter table public.marketing_channel_deliveries
  drop constraint if exists marketing_channel_deliveries_provider_result_object;
alter table public.marketing_channel_deliveries
  add constraint marketing_channel_deliveries_provider_result_object
    check (jsonb_typeof(provider_result) = 'object');

-- The reconciliation query the canary needs: every delivery that reached a
-- provider without proving it is private. Partial, so it indexes the handful
-- of rows worth looking at rather than the whole ledger.
create index if not exists marketing_channel_deliveries_unverified_privacy_idx
  on public.marketing_channel_deliveries (company_id, created_at)
  where delivery_state = 'posted'
    and provider_result ->> 'privacyStatus' is distinct from 'private';

comment on column public.marketing_channel_deliveries.provider_result is
  'Provider-reported facts about the delivered object, as the adapter read them back: for YouTube privacyStatus, uploadStatus, channelId and verifiedAt. Bounded at 2KB and constrained to an object so it cannot absorb a response body. Never contains a credential.';
