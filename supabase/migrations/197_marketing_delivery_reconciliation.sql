-- 197: delivery reconciliation — a posted row may be DOWNGRADED, never deleted.
--
-- ==================== WHY (2026-09-06 incident) ====================
-- Three API-published Reels read `posted` with perfect provider metadata
-- (published=true, privacy=EVERYONE, all phases complete) while a non-admin
-- got "This page isn't available right now" — and one earlier automated Reel
-- (1067901225963123, Sep-2) no longer exists at Meta at all, with its
-- delivery row still claiming `posted` + a permalink. `posted` records that
-- the provider ACCEPTED the publish; it cannot keep asserting the object is
-- alive and publicly reachable when the provider stops serving it.
--
-- `posted_unverified` is the honest downgrade: the provider accepted this
-- once, and reconciliation later found the object missing or not publicly
-- accessible. The row keeps every original fact (provider ids, permalink,
-- provider_result evidence) — history is never deleted — and the transition
-- is ONE-WAY by code (a fresh publish claims a NEW row; nothing promotes a
-- downgraded row back).
alter table public.marketing_channel_deliveries
  drop constraint if exists marketing_channel_deliveries_delivery_state_check;

alter table public.marketing_channel_deliveries
  add constraint marketing_channel_deliveries_delivery_state_check
  check (delivery_state in ('in_flight', 'posted', 'draft', 'failed', 'posted_unverified'));

comment on column public.marketing_channel_deliveries.delivery_state is
  'in_flight | posted | draft | failed | posted_unverified. posted_unverified: '
  'the provider accepted the publish, but reconciliation later found the '
  'object missing or not publicly accessible (2026-09-06 incident). One-way '
  'downgrade from posted; rows are never deleted.';
