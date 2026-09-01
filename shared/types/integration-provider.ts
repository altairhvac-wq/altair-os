/**
 * The provider vocabulary for every external system Altair OS connects to.
 *
 * ====================== WHY THIS FILE IS PURE ======================
 * No imports, not `server-only`, no `process.env`, no database client. It is
 * the one place a provider name is spelled, so the TypeScript union and the
 * `marketing_connected_provider` SQL enum can be proven equal by a static
 * verifier rather than by hoping two lists were edited together.
 *
 * That drift already happened once and cost real capability: migration 143
 * added `youtube` and `tiktok` to the SQL enum, but the TypeScript union was
 * never widened — and because `lib/integrations/oauth-state.ts` derives its
 * provider allowlist from the TypeScript side, OAuth state could not be
 * minted for either provider even though the database accepted the value.
 * The database was ready for eighteen months of calendar time and the type
 * was the blocker. `scripts/verify-integration-registry.mjs` now compares
 * this list against migrations 089/143/179 label-for-label.
 *
 * ================== KIND IS NOT A CAPABILITY ==================
 * `IntegrationKind` answers "what IS this connection", which is a fixed fact
 * about the provider, not a thing a token can change:
 *
 *   publisher     content is delivered TO it (Facebook, YouTube, TikTok…)
 *   asset_source  it PRODUCES creative and can never receive a post
 *                 (Higgsfield). It has no publish path at all — not a
 *                 disabled one, an absent one.
 *   first_party   an Altair-owned surface with no third-party credential
 *                 (the marketing site). No OAuth, no token, no expiry.
 *
 * Per-account, provider-reported ability ("can this connection publish right
 * now?") is a different question answered by `publish_capability` on the row
 * and by `deriveMarketingChannelState` in `./marketing-channel-connection`.
 * Collapsing the two is how a UI ends up offering "Publish to Higgsfield".
 */

export const INTEGRATION_PROVIDERS = [
  "facebook",
  "instagram",
  "google_business",
  "youtube",
  "tiktok",
  "linkedin",
  "reddit",
  "higgsfield",
  "altair_site",
] as const;

export type IntegrationProvider = (typeof INTEGRATION_PROVIDERS)[number];

/** Mirrors the `public.marketing_integration_kind` enum (migration 181). */
export const INTEGRATION_KINDS = [
  "publisher",
  "asset_source",
  "first_party",
] as const;

export type IntegrationKind = (typeof INTEGRATION_KINDS)[number];

/**
 * How a connection is authorized. `none` is not "unauthenticated" — it means
 * the surface is ours and needs no delegated credential, which is why
 * migration 181 constrains `first_party` rows to a null `token_expires_at`.
 */
export const INTEGRATION_AUTH_KINDS = [
  "oauth2",
  "oauth2_pkce",
  "api_key",
  "none",
] as const;

export type IntegrationAuthKind = (typeof INTEGRATION_AUTH_KINDS)[number];

export function isIntegrationProvider(
  value: string,
): value is IntegrationProvider {
  return (INTEGRATION_PROVIDERS as readonly string[]).includes(value);
}

export function isIntegrationKind(value: string): value is IntegrationKind {
  return (INTEGRATION_KINDS as readonly string[]).includes(value);
}
