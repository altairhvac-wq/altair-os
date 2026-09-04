-- Provider vocabulary for the publishing/integration foundation.
--
-- ============ WHY THIS MIGRATION IS ALONE IN ITS FILE ============
-- `alter type ... add value` cannot share a transaction with a statement that
-- USES the new label. Migration 146's header records the same rule and the
-- same split. Nothing here references the new labels — that is exactly what
-- makes it safe — and migration 181, which does use them, is a separate file.
-- Getting this wrong fails at APPLY time, not at review time.
--
-- ============ WHAT ALREADY EXISTS ============
-- 089 created the enum with facebook / instagram / google_business.
-- 143 added youtube / tiktok.
-- This adds the remaining four, completing the nine-provider vocabulary that
-- `shared/types/integration-provider.ts` declares on the TypeScript side.
-- `scripts/verify-integration-registry.mjs` compares the two label-for-label,
-- because that drift is not hypothetical: the TypeScript union sat two values
-- behind this enum, and because `lib/integrations/oauth-state.ts` derived its
-- provider allowlist from the TypeScript side, YouTube and TikTok could not be
-- connected at all even though the database had accepted them since 143.
--
-- `higgsfield` and `altair_site` are NOT publishing channels and deliberately
-- do not appear in the `marketing_channel` enum (migration 180). Higgsfield
-- produces creative; altair_site is our own surface. Migration 181's
-- `integration_kind` is what carries that distinction structurally.

alter type public.marketing_connected_provider add value if not exists 'linkedin';
alter type public.marketing_connected_provider add value if not exists 'reddit';
alter type public.marketing_connected_provider add value if not exists 'higgsfield';
alter type public.marketing_connected_provider add value if not exists 'altair_site';
