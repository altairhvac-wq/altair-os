/**
 * The capability matrix — what each provider can actually do.
 *
 * ================== WHY A MATRIX AND NOT `if (provider === …)` ==================
 * Every publishing decision in this system is a question about a capability,
 * not about a brand: "does this accept a video?", "does it need media at
 * all?", "how long may the body be?", "does reaching it publish, or leave a
 * draft?". Written as provider-name branches, each new platform means
 * hunting every `switch` in the codebase and hoping none was missed. Written
 * as data, a new platform is one entry and the compiler finds the gaps —
 * `Record<IntegrationProvider, ProviderCapability>` is total, so omitting a
 * provider is a type error, not a runtime surprise in a publish path.
 *
 * ====================== THIS TABLE IS NOT THE TRUTH ======================
 * These are STATIC facts about a platform's API — its limits and shapes.
 * They are not a claim that a given company's connection works. Three
 * separate questions, deliberately kept apart (the reasoning is written out
 * in `./marketing-channel-connection`):
 *
 *   1. What can this PLATFORM do?     → this file
 *   2. Is this deployment CONFIGURED? → env vars, checked at runtime
 *   3. Can THIS connection publish?   → `publish_capability` on the row
 *
 * A provider listed here with `transport: "resumable_upload"` still cannot
 * publish a thing until (2) and (3) are also true.
 *
 * ====================== LIMITS MIRROR THE TRANSPORT ======================
 * Character limits here match `lib/integrations/channel-publish-requests.ts`
 * EXACTLY, because that module is what actually clamps bytes at send time.
 * Where `shared/types/marketing-channels.ts` carries a stricter drafting
 * guidance number (YouTube tags: 480 there, 500 in the transport), the
 * transport constant is authoritative here and the drafting number stays a
 * house style rule. `scripts/verify-integration-capability.mjs` asserts the
 * equality so the two cannot drift apart silently.
 */
import type {
  IntegrationAuthKind,
  IntegrationKind,
  IntegrationProvider,
} from "./integration-provider";
import { INTEGRATION_PROVIDERS } from "./integration-provider";

/** What a package's assets may be. Mirrors `marketing_media_assets.media_kind`. */
export type MediaKind = "video" | "image";

/**
 * How content physically reaches the provider.
 *
 *   pull_from_url     we hand over a signed URL and they fetch it
 *   resumable_upload  a metadata call returns an upload URL, then bytes
 *   multipart         one request carries metadata and bytes together
 *   json_only         no media transfer at all — text and links
 *   internal          never leaves Altair; a first-party write
 */
export type PublishTransport =
  | "pull_from_url"
  | "resumable_upload"
  | "multipart"
  | "json_only"
  | "internal";

/**
 * The visibility a publish defaults to when the caller does not say.
 *
 * No provider defaults to `public`. A bug in a caller should produce an
 * invisible artefact someone has to promote deliberately, never a public
 * post on a real brand account — the same reasoning that makes
 * `buildYouTubeUploadInitRequest` default to `private`
 * (`channel-publish-requests.ts:85`) and TikTok to `SELF_ONLY` (:284).
 */
export type DefaultVisibility =
  | "private"
  | "unlisted"
  | "self_only"
  | "draft"
  | "internal_draft";

export type ProviderCapability = {
  readonly provider: IntegrationProvider;
  readonly kind: IntegrationKind;
  readonly label: string;
  /** What the connected identity is CALLED, for "Connected — X" copy. */
  readonly identityLabel: string;
  readonly authKind: IntegrationAuthKind;
  /** Where "Connect" points. Null when there is nothing to authorize. */
  readonly connectPath: string | null;
  /** Env var NAMES required to configure. Never values, ever. */
  readonly requiredEnvVars: readonly string[];
  /** Whether a long-lived connection depends on refreshing. */
  readonly requiresRefreshToken: boolean;

  /* ----------------------------------------------------------- content */
  readonly acceptsMediaKinds: readonly MediaKind[];
  /** True when a post without media is impossible, not merely worse. */
  readonly requiresMedia: boolean;
  readonly maxAssets: number;
  /** Null when the provider has no separate title field. */
  readonly titleMaxChars: number | null;
  readonly bodyMaxChars: number;
  readonly supportsHashtags: boolean;
  readonly supportsLink: boolean;
  readonly supportsThumbnail: boolean;
  readonly supportsScheduling: boolean;
  /** Whether the provider can report back on published content. */
  readonly supportsAnalytics: boolean;

  /* --------------------------------------------------------- mechanics */
  readonly defaultVisibility: DefaultVisibility;
  readonly transport: PublishTransport;
  readonly maxAttempts: number;
  /**
   * How long we may poll a provider for an async publish result.
   *
   * MUST stay below `DELIVERY_IN_FLIGHT_GRACE_MS` (5 min,
   * `shared/types/marketing-delivery.ts`) or a delivery would be treated as
   * abandoned while its poll is still legitimately running — and a second
   * attempt would double-post. Asserted by
   * `scripts/verify-integration-registry.mjs`.
   */
  readonly pollBudgetMs: number;
  /** Provider-published ceiling, where one is documented. */
  readonly rateLimitPerDay: number | null;
  /**
   * Whether a human must approve before content may leave. Reddit is true
   * on policy grounds, not technical ones: subreddits have their own rules
   * and an automated post is a reputational risk, so it never goes without
   * a person having said yes to that specific destination.
   */
  readonly requiresManualApproval: boolean;
};

const CONNECT_BASE = "/api/marketing/connected-accounts";

export const INTEGRATION_CAPABILITIES: Readonly<
  Record<IntegrationProvider, ProviderCapability>
> = {
  facebook: {
    provider: "facebook",
    kind: "publisher",
    label: "Facebook",
    identityLabel: "Page",
    authKind: "oauth2",
    connectPath: `${CONNECT_BASE}/facebook/authorize`,
    requiredEnvVars: ["FACEBOOK_APP_ID", "FACEBOOK_APP_SECRET"],
    requiresRefreshToken: false,
    acceptsMediaKinds: ["video", "image"],
    requiresMedia: false,
    maxAssets: 10,
    titleMaxChars: null,
    bodyMaxChars: 5_000,
    supportsHashtags: true,
    supportsLink: true,
    supportsThumbnail: true,
    supportsScheduling: true,
    supportsAnalytics: true,
    defaultVisibility: "draft",
    transport: "pull_from_url",
    maxAttempts: 3,
    pollBudgetMs: 120_000,
    rateLimitPerDay: null,
    requiresManualApproval: true,
  },
  instagram: {
    provider: "instagram",
    kind: "publisher",
    label: "Instagram",
    identityLabel: "account",
    // Publishing uses the Instagram Business account linked to a connected
    // Facebook Page — there is no separate Instagram Login here, which is
    // why this shares Facebook's credentials and has no connect path of
    // its own. Stated in MARKETING_CONNECTED_PROVIDER_OPTIONS since 089.
    authKind: "oauth2",
    connectPath: `${CONNECT_BASE}/facebook/authorize`,
    requiredEnvVars: ["FACEBOOK_APP_ID", "FACEBOOK_APP_SECRET"],
    requiresRefreshToken: false,
    acceptsMediaKinds: ["video", "image"],
    requiresMedia: true,
    maxAssets: 10,
    titleMaxChars: null,
    bodyMaxChars: 2_200,
    supportsHashtags: true,
    supportsLink: false,
    supportsThumbnail: true,
    supportsScheduling: false,
    supportsAnalytics: true,
    defaultVisibility: "draft",
    transport: "pull_from_url",
    maxAttempts: 3,
    pollBudgetMs: 120_000,
    rateLimitPerDay: 50,
    requiresManualApproval: true,
  },
  google_business: {
    provider: "google_business",
    kind: "publisher",
    label: "Google Business",
    identityLabel: "location",
    authKind: "oauth2",
    connectPath: `${CONNECT_BASE}/google-business/authorize`,
    requiredEnvVars: ["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET"],
    requiresRefreshToken: true,
    acceptsMediaKinds: ["image"],
    requiresMedia: false,
    maxAssets: 1,
    titleMaxChars: null,
    // GOOGLE_BUSINESS_MAX_SUMMARY, channel-publish-requests.ts:184.
    bodyMaxChars: 1_500,
    supportsHashtags: false,
    supportsLink: true,
    supportsThumbnail: false,
    supportsScheduling: false,
    supportsAnalytics: false,
    defaultVisibility: "draft",
    transport: "json_only",
    maxAttempts: 3,
    pollBudgetMs: 60_000,
    rateLimitPerDay: null,
    requiresManualApproval: true,
  },
  youtube: {
    provider: "youtube",
    kind: "publisher",
    label: "YouTube",
    identityLabel: "channel",
    authKind: "oauth2",
    connectPath: `${CONNECT_BASE}/youtube/authorize`,
    requiredEnvVars: ["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET"],
    requiresRefreshToken: true,
    acceptsMediaKinds: ["video", "image"],
    requiresMedia: true,
    // The video plus its thumbnail. Two calls, two assets, one post.
    maxAssets: 2,
    // YOUTUBE_MAX_TITLE / YOUTUBE_MAX_DESCRIPTION, channel-publish-requests.ts:70-71.
    titleMaxChars: 100,
    bodyMaxChars: 5_000,
    supportsHashtags: true,
    supportsLink: true,
    supportsThumbnail: true,
    supportsScheduling: true,
    supportsAnalytics: true,
    defaultVisibility: "private",
    transport: "resumable_upload",
    maxAttempts: 3,
    pollBudgetMs: 240_000,
    rateLimitPerDay: null,
    requiresManualApproval: true,
  },
  tiktok: {
    provider: "tiktok",
    kind: "publisher",
    label: "TikTok",
    identityLabel: "username",
    authKind: "oauth2_pkce",
    connectPath: `${CONNECT_BASE}/tiktok/authorize`,
    requiredEnvVars: ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET"],
    requiresRefreshToken: true,
    acceptsMediaKinds: ["video"],
    requiresMedia: true,
    maxAssets: 1,
    // TIKTOK_MAX_TITLE, channel-publish-requests.ts:246.
    titleMaxChars: 2_200,
    bodyMaxChars: 2_200,
    supportsHashtags: true,
    supportsLink: false,
    supportsThumbnail: false,
    supportsScheduling: false,
    supportsAnalytics: true,
    // SELF_ONLY until an app review says otherwise, matching the transport
    // default at channel-publish-requests.ts:284.
    defaultVisibility: "self_only",
    transport: "pull_from_url",
    maxAttempts: 3,
    pollBudgetMs: 240_000,
    rateLimitPerDay: null,
    requiresManualApproval: true,
  },
  linkedin: {
    provider: "linkedin",
    kind: "publisher",
    label: "LinkedIn",
    identityLabel: "organization",
    authKind: "oauth2",
    connectPath: `${CONNECT_BASE}/linkedin/authorize`,
    requiredEnvVars: ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET"],
    requiresRefreshToken: true,
    acceptsMediaKinds: ["video", "image"],
    requiresMedia: false,
    maxAssets: 9,
    titleMaxChars: null,
    bodyMaxChars: 3_000,
    supportsHashtags: true,
    supportsLink: true,
    supportsThumbnail: false,
    supportsScheduling: false,
    supportsAnalytics: true,
    defaultVisibility: "draft",
    transport: "multipart",
    maxAttempts: 3,
    pollBudgetMs: 120_000,
    rateLimitPerDay: null,
    requiresManualApproval: true,
  },
  reddit: {
    provider: "reddit",
    kind: "publisher",
    label: "Reddit",
    identityLabel: "subreddit",
    authKind: "oauth2",
    connectPath: `${CONNECT_BASE}/reddit/authorize`,
    requiredEnvVars: ["REDDIT_CLIENT_ID", "REDDIT_CLIENT_SECRET"],
    requiresRefreshToken: true,
    acceptsMediaKinds: ["image"],
    requiresMedia: false,
    maxAssets: 1,
    titleMaxChars: 300,
    bodyMaxChars: 40_000,
    // Reddit treats hashtags as noise; they read as spam to moderators.
    supportsHashtags: false,
    supportsLink: true,
    supportsThumbnail: false,
    supportsScheduling: false,
    supportsAnalytics: false,
    defaultVisibility: "draft",
    transport: "json_only",
    // One attempt. A retry against a subreddit that rate-limited us reads
    // as exactly the behaviour their spam rules exist to catch.
    maxAttempts: 1,
    pollBudgetMs: 60_000,
    rateLimitPerDay: 10,
    requiresManualApproval: true,
  },
  higgsfield: {
    provider: "higgsfield",
    kind: "asset_source",
    label: "Higgsfield",
    identityLabel: "workspace",
    authKind: "api_key",
    // No OAuth hop: an API key is entered once and stored like any other
    // integration secret. Null connectPath, and `verify-integration-oauth`
    // asserts no authorize route is advertised for it.
    connectPath: null,
    requiredEnvVars: ["HIGGSFIELD_API_KEY"],
    requiresRefreshToken: false,
    // What it PRODUCES, not what it accepts. Nothing is ever delivered here.
    acceptsMediaKinds: [],
    requiresMedia: false,
    maxAssets: 0,
    titleMaxChars: null,
    bodyMaxChars: 0,
    supportsHashtags: false,
    supportsLink: false,
    supportsThumbnail: false,
    supportsScheduling: false,
    supportsAnalytics: false,
    defaultVisibility: "internal_draft",
    transport: "internal",
    maxAttempts: 3,
    pollBudgetMs: 240_000,
    rateLimitPerDay: null,
    requiresManualApproval: true,
  },
  altair_site: {
    provider: "altair_site",
    kind: "first_party",
    label: "Altair website",
    identityLabel: "site",
    // Our own surface. No delegated credential exists to hold, which is why
    // migration 181 forbids a `token_expires_at` on a first_party row.
    authKind: "none",
    connectPath: null,
    requiredEnvVars: [],
    requiresRefreshToken: false,
    acceptsMediaKinds: ["image"],
    requiresMedia: false,
    maxAssets: 10,
    titleMaxChars: 200,
    bodyMaxChars: 100_000,
    supportsHashtags: false,
    supportsLink: true,
    supportsThumbnail: true,
    supportsScheduling: true,
    supportsAnalytics: false,
    defaultVisibility: "draft",
    transport: "internal",
    maxAttempts: 3,
    pollBudgetMs: 30_000,
    rateLimitPerDay: null,
    requiresManualApproval: true,
  },
};

export function capabilityFor(
  provider: IntegrationProvider,
): ProviderCapability {
  return INTEGRATION_CAPABILITIES[provider];
}

/** Derived, never hand-listed — a new publisher cannot be forgotten here. */
export const PUBLISHER_PROVIDERS: readonly IntegrationProvider[] =
  INTEGRATION_PROVIDERS.filter(
    (provider) => INTEGRATION_CAPABILITIES[provider].kind === "publisher",
  );

export function isPublisherProvider(provider: IntegrationProvider): boolean {
  return INTEGRATION_CAPABILITIES[provider].kind === "publisher";
}

/**
 * Providers that accept a given media kind. The shape automation should ask
 * for — "who takes a video?" — rather than naming platforms.
 */
export function providersAcceptingMedia(
  kind: MediaKind,
): readonly IntegrationProvider[] {
  return PUBLISHER_PROVIDERS.filter((provider) =>
    INTEGRATION_CAPABILITIES[provider].acceptsMediaKinds.includes(kind),
  );
}

/**
 * Why a provider cannot take a piece of content, in operator-facing words.
 *
 * Exhaustive over the reason union, so adding a reason without deciding what
 * it says to a human is a compile error rather than a blank card — the same
 * discipline `describeMarketingChannelState` uses.
 */
export type CapabilityGap =
  | { readonly reason: "not_a_publisher" }
  | { readonly reason: "media_kind_unsupported"; readonly kind: MediaKind }
  | { readonly reason: "media_required" }
  | { readonly reason: "too_many_assets"; readonly count: number }
  | { readonly reason: "title_too_long"; readonly length: number }
  | { readonly reason: "body_too_long"; readonly length: number }
  | { readonly reason: "title_required" };

export function describeCapabilityGap(
  gap: CapabilityGap,
  capability: ProviderCapability,
): string {
  switch (gap.reason) {
    case "not_a_publisher":
      return `${capability.label} does not receive published content.`;
    case "media_kind_unsupported":
      return `${capability.label} does not accept ${gap.kind} content.`;
    case "media_required":
      return `${capability.label} cannot publish without media attached.`;
    case "too_many_assets":
      return `${capability.label} accepts at most ${capability.maxAssets} asset(s); this package has ${gap.count}.`;
    case "title_too_long":
      return `The title is ${gap.length} characters; ${capability.label} allows ${capability.titleMaxChars ?? 0}.`;
    case "body_too_long":
      return `The body is ${gap.length} characters; ${capability.label} allows ${capability.bodyMaxChars}.`;
    case "title_required":
      return `${capability.label} requires a title.`;
  }
}
