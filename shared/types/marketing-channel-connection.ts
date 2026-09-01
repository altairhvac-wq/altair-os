/**
 * Direct publishing channels — the state vocabulary the integrations
 * surfaces render, and the pure rules that derive it.
 *
 * ====================== WHY THIS FILE IS PURE ======================
 * Type-only and pure-data imports. Not `server-only`, not a database client,
 * not `process.env`. The whole connect/publish state machine is therefore
 * testable without a browser, a database, or a provider — which matters
 * because every one of these states is reachable only through a third party
 * we cannot summon on demand. A state we cannot test is a state we will
 * render wrong.
 *
 * ================== THREE FACTS, NOT ONE STATUS ==================
 * A channel's display state is derived from three INDEPENDENT facts, and
 * conflating any two of them produces a UI that lies:
 *
 *   1. Is the integration CONFIGURED here?   (client id/secret present)
 *   2. Is the CONNECTION alive?              (status + token expiry)
 *   3. Is PUBLISHING permitted by them?      (capability)
 *
 * A TikTok account can be configured, connected, token-valid — and still
 * only able to create drafts, because Direct Post requires an app review
 * that no token reflects. A Google Business account can be fully connected
 * and publish nothing, because the Business Profile APIs need per-project
 * quota that is granted outside OAuth entirely. Neither is an error. Both
 * are ordinary, and the operator needs to see which one they are in.
 */
import {
  INTEGRATION_CAPABILITIES,
  PUBLISHER_PROVIDERS,
} from "./integration-capability";

/**
 * Every provider content can be delivered TO.
 *
 * Derived from the capability matrix rather than hand-listed, so a provider
 * declared `kind: "publisher"` is automatically a publish channel and an
 * asset source can never become one by an editing slip. This list was three
 * values while the matrix knew about seven publishers; deriving it removes
 * the class of drift entirely.
 */
export const MARKETING_PUBLISH_CHANNELS = PUBLISHER_PROVIDERS;
export type MarketingPublishChannel = (typeof PUBLISHER_PROVIDERS)[number];

/** Mirrors the `marketing_publish_capability` enum (migration 143). */
export const MARKETING_PUBLISH_CAPABILITIES = [
  "none",
  "draft_only",
  "direct",
] as const;
export type MarketingPublishCapability =
  (typeof MARKETING_PUBLISH_CAPABILITIES)[number];

/**
 * What the Distribution tab shows. Ordered roughly worst→best so a reader
 * can see the progression; nothing depends on the order.
 */
export const MARKETING_CHANNEL_STATES = [
  /** No client credentials on this deployment. Nothing to click yet. */
  "NOT_CONFIGURED",
  /** Configured, never connected. This is where "Connect" appears. */
  "NOT_CONNECTED",
  /** Authorize started, callback not yet completed. */
  "CONNECTING",
  /** Connected; the token is past its expiry and refresh has not run. */
  "TOKEN_EXPIRED",
  /** Connected, but the provider needs the human to authorize again. */
  "REAUTH_REQUIRED",
  /** Connected and healthy, but the provider grants us no publish access. */
  "API_ACCESS_REQUIRED",
  /** Connected; content can be delivered as an unpublished draft only. */
  "DRAFT_UPLOAD_ONLY",
  /** Connected and fully able to publish programmatically. */
  "DIRECT_PUBLISH_READY",
  /** The last operation against this connection failed. */
  "ERROR",
] as const;
export type MarketingChannelState = (typeof MARKETING_CHANNEL_STATES)[number];

/** The subset of a connected-account row this derivation needs. */
export type MarketingChannelAccountFacts = {
  readonly status: "connected" | "expired" | "disconnected" | "error";
  readonly publishCapability: MarketingPublishCapability;
  readonly tokenExpiresAt: string | null;
  readonly hasRefreshToken: boolean;
  readonly lastError: string | null;
  readonly capabilityDetail: string | null;
  readonly accountName: string | null;
  readonly resourceName: string | null;
};

export type DeriveMarketingChannelStateInput = {
  /** Client id/secret present on this deployment for this provider. */
  readonly configured: boolean;
  /** Null when no account row exists at all. */
  readonly account: MarketingChannelAccountFacts | null;
  /** A pending, unexpired OAuth state row exists for this provider. */
  readonly authorizeInFlight?: boolean;
  /** Injected. Never read a clock inside a render path. */
  readonly nowIso: string;
};

/**
 * Order matters and is deliberate.
 *
 * Configuration is checked first because an unconfigured deployment cannot
 * meaningfully be in any other state. Connection health is checked before
 * capability because a dead token makes capability unknowable rather than
 * false — reporting `API_ACCESS_REQUIRED` for an account whose token merely
 * expired would send the operator to a developer console to fix something
 * that isn't broken.
 */
export function deriveMarketingChannelState(
  input: DeriveMarketingChannelStateInput,
): MarketingChannelState {
  if (!input.configured) return "NOT_CONFIGURED";

  const account = input.account;
  if (!account || account.status === "disconnected") {
    return input.authorizeInFlight ? "CONNECTING" : "NOT_CONNECTED";
  }

  if (account.status === "error") return "ERROR";

  // Expiry is a fact about time, not a status someone remembered to write —
  // so an account still marked `connected` whose token expired five minutes
  // ago reports expired, without waiting for a background job to notice.
  const expired =
    account.status === "expired" || isTokenExpired(account.tokenExpiresAt, input.nowIso);

  if (expired) {
    // A refresh token means this is recoverable without the human; without
    // one, only a fresh consent will fix it. Different states because they
    // ask different things of the operator.
    return account.hasRefreshToken ? "TOKEN_EXPIRED" : "REAUTH_REQUIRED";
  }

  if (account.publishCapability === "none") return "API_ACCESS_REQUIRED";
  if (account.publishCapability === "draft_only") return "DRAFT_UPLOAD_ONLY";
  return "DIRECT_PUBLISH_READY";
}

export function isTokenExpired(
  tokenExpiresAt: string | null,
  nowIso: string,
): boolean {
  if (!tokenExpiresAt) return false; // Unknown expiry is not expiry.
  const expiry = Date.parse(tokenExpiresAt);
  const now = Date.parse(nowIso);
  if (Number.isNaN(expiry) || Number.isNaN(now)) return false;
  return expiry <= now;
}

/**
 * THE GATE. A channel may be handed real content only in these two states.
 *
 * Everything else — including `ERROR`, `TOKEN_EXPIRED` and the tempting
 * `API_ACCESS_REQUIRED` — returns false. This is the single function the
 * publish path consults, so "can we send this?" has exactly one answer in
 * the codebase rather than one per call site.
 */
export function canAcceptContent(state: MarketingChannelState): boolean {
  return state === "DIRECT_PUBLISH_READY" || state === "DRAFT_UPLOAD_ONLY";
}

/** Whether reaching the provider would actually PUBLISH, vs leave a draft. */
export function publishesImmediately(state: MarketingChannelState): boolean {
  return state === "DIRECT_PUBLISH_READY";
}

export type MarketingChannelDescriptor = {
  readonly channel: MarketingPublishChannel;
  readonly label: string;
  /** What the connected identity is called, for the "Connected — X" line. */
  readonly identityLabel: string;
  readonly connectPath: string;
  /** Env var NAMES required to configure. Never values. */
  readonly requiredEnvVars: readonly string[];
};

/**
 * Projected from `INTEGRATION_CAPABILITIES` rather than restated.
 *
 * The label, identity noun, connect path and env-var names all already live
 * in the capability matrix; writing them twice is how a descriptor ends up
 * advertising a connect path that no longer exists. Publishers always carry
 * a connect path — asserted by `scripts/verify-integration-registry.mjs` —
 * so the projection is total for every channel in this record.
 */
export const MARKETING_CHANNEL_DESCRIPTORS: Readonly<
  Record<MarketingPublishChannel, MarketingChannelDescriptor>
> = Object.freeze(
  Object.fromEntries(
    PUBLISHER_PROVIDERS.map((provider) => {
      const capability = INTEGRATION_CAPABILITIES[provider];
      return [
        provider,
        {
          channel: provider,
          label: capability.label,
          identityLabel: capability.identityLabel,
          // Non-null for every publisher; the registry verifier proves it.
          connectPath: capability.connectPath ?? "",
          requiredEnvVars: capability.requiredEnvVars,
        } satisfies MarketingChannelDescriptor,
      ];
    }),
  ),
) as Readonly<Record<MarketingPublishChannel, MarketingChannelDescriptor>>;

/**
 * One line of operator-facing copy per state. Kept beside the state machine
 * so a new state cannot be added without someone deciding what it says —
 * `describeMarketingChannelState` is exhaustive over the union, so omitting
 * a case is a compile error rather than a blank card.
 */
export function describeMarketingChannelState(
  state: MarketingChannelState,
  descriptor: MarketingChannelDescriptor,
  account: MarketingChannelAccountFacts | null,
): string {
  switch (state) {
    case "NOT_CONFIGURED":
      return `${descriptor.label} is not set up on this deployment yet.`;
    case "NOT_CONNECTED":
      return `Connect a ${descriptor.label} ${descriptor.identityLabel} to publish directly.`;
    case "CONNECTING":
      return `Waiting for ${descriptor.label} to finish authorizing…`;
    case "TOKEN_EXPIRED":
      return "Access expired. It will refresh automatically on the next publish.";
    case "REAUTH_REQUIRED":
      return `Access expired and cannot refresh. Reconnect ${descriptor.label}.`;
    case "API_ACCESS_REQUIRED":
      return (
        account?.capabilityDetail ??
        `${descriptor.label} is connected, but has not granted this app publishing access yet.`
      );
    case "DRAFT_UPLOAD_ONLY":
      return (
        account?.capabilityDetail ??
        `Connected — uploads arrive as a draft to finish in ${descriptor.label}.`
      );
    case "DIRECT_PUBLISH_READY":
      return "Direct publishing enabled.";
    case "ERROR":
      return account?.lastError ?? `${descriptor.label} reported an error.`;
  }
}

/** The "Connected — @name" identity line, or null when there isn't one. */
export function formatChannelIdentity(
  account: MarketingChannelAccountFacts | null,
): string | null {
  if (!account) return null;
  const name = account.resourceName?.trim() || account.accountName?.trim();
  return name ? name : null;
}
