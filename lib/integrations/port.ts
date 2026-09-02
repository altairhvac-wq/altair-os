/**
 * The adapter port — the one shape every external integration is reached
 * through.
 *
 * ===================== WHY THIS FILE HAS NO CODE =====================
 * Types only. No `import "server-only"`, no constants, no helpers, nothing
 * that survives compilation. Every import below is `import type`, so the
 * emitted JavaScript for this module is empty and importing it from a
 * Client Component, a pure verifier, or a Server Action costs nothing and
 * drags in no provider transport.
 *
 * That is deliberate. A port that carries even one runtime constant becomes
 * a module that the capability matrix, the publish path and the UI all
 * import for different reasons, and the first provider adapter that lands a
 * `fetch` next to it turns the shared vocabulary into a server-only module
 * by accident.
 *
 * ================== THE ERROR CONTRACT, WHICH IS SPLIT ==================
 * The codebase already draws a line between the two kinds of external call,
 * and this port keeps it rather than inventing a third convention:
 *
 *   PUBLISH THROWS. Every Facebook publish function throws on every failure
 *   (`lib/integrations/facebook/publish.ts`, `reels.ts`), and the caller's
 *   `catch` is what settles the delivery `failed` and releases the claim —
 *   `app/actions/marketing-publish.ts` around the `publishFacebookPageReel`
 *   call. A publish that returned `{ ok: false }` would be trivially
 *   ignorable, and an ignored publish failure strands the delivery row
 *   `in_flight`, which `decideDelivery` then reports as
 *   NEEDS_RECONCILIATION — a human being sent to look at Meta for a post
 *   that never happened. Throwing makes "unhandled" impossible.
 *
 *   COLLECTORS RETURN A UNION. `fetchReelInsights` in
 *   `lib/integrations/facebook/reel-insights.ts` returns
 *   `{ ok: true, ... } | { ok: false, kind, detail, ... }` for the reason
 *   written above it: the caller's whole job is to keep going, and one Reel
 *   too fresh to have numbers must not stop the other nine from being
 *   collected. The same reasoning covers every non-publish path here —
 *   refresh, capability probe, insights — where the correct response to a
 *   failure is to record it on the connection and carry on.
 *
 * So: `publish` is the only method on this port that signals failure by
 * throwing. Everything else answers with a discriminated result.
 */
import type {
  ProviderCapability,
} from "@/shared/types/integration-capability";
import type {
  IntegrationProvider,
} from "@/shared/types/integration-provider";
import type {
  MarketingPublishCapability,
} from "@/shared/types/marketing-channel-connection";
import type { MarketingDeliveryState } from "@/shared/types/marketing-delivery";
import type { CollectedMetric } from "@/shared/types/marketing-insights";
import type { MediaReadGrant } from "@/shared/types/marketing-media";

/* ------------------------------------------------------------- publishing */

/**
 * What a completed publish reports back.
 *
 * The outcome is narrowed FROM `MarketingDeliveryState` rather than spelled
 * again as `"posted" | "draft"`. The delivery row's CHECK constraint
 * (migration 143) and this union are then the same two literals by
 * construction, so a settlement built from a `PublishOutcome` cannot name a
 * state the column will reject — and `in_flight` / `failed`, which are the
 * caller's to write and never the adapter's, are excluded here structurally.
 */
export type PublishOutcome = {
  readonly outcome: Extract<MarketingDeliveryState, "posted" | "draft">;
  /** The provider's own id for what was created. Never synthesised locally. */
  readonly providerPostId: string;
  /**
   * The provider-side object created BEFORE publishing, where the flow has
   * one — a Facebook Reel video id, an Instagram container id, a TikTok
   * publish id. Reported through `onMediaCreated` the moment it exists; also
   * returned here so a caller that never registered the callback still ends
   * up with it. See `marketing-delivery.ts` on why the two ids are distinct.
   */
  readonly providerMediaId?: string;
  readonly providerPermalink?: string;
  /**
   * Provider-reported facts about the object that now exists, destined for
   * `marketing_channel_deliveries.provider_result` (migration 186).
   *
   * ============ WHY IDS ARE NOT ENOUGH ============
   * An id records THAT something was created. For a YouTube canary the
   * load-bearing fact is its VISIBILITY, and a video uploaded privately and
   * one uploaded publicly produce identical ids. A reconciliation that
   * cannot answer "was it private?" cannot check the one property the
   * canary was authorized on — so the adapter reports what it verified,
   * and the ledger keeps it.
   *
   * Primitives only: the column is capped at 2 KB and constrained to an
   * object, so this cannot become somewhere to put a response body.
   */
  readonly providerResult?: Readonly<
    Record<string, string | number | boolean | null>
  >;
};

/**
 * Called the instant a provider-side object exists and BEFORE anything is
 * published. The caller persists it; a throw here aborts the publish.
 *
 * Structurally identical to `OnReelMediaCreated` in `facebook/reels.ts`, so
 * the existing Reel implementations already satisfy this port without being
 * touched. The trade it encodes is written out there: an unpublished orphan
 * at the provider is recoverable, an unrecorded published post is not.
 */
export type OnMediaCreated = (providerMediaId: string) => Promise<void>;

/**
 * The content, projected into the shape a transport needs.
 *
 * Media arrives as `MediaReadGrant`s — short-lived signed URLs minted by the
 * caller immediately before the call — and not as object keys or paths. An
 * adapter therefore cannot reach into storage on its own, and the grant
 * carries its own `expiresAt` so a transport can tell whether it still has
 * time to hand the URL to a provider that fetches asynchronously.
 */
export type PublishPackage = {
  /** Null for providers whose capability declares `titleMaxChars: null`. */
  readonly title: string | null;
  readonly body: string;
  readonly hashtags: readonly string[];
  readonly link: string | null;
  readonly media: readonly MediaReadGrant[];
};

/** Which connected identity this publish is aimed at. */
export type PublishTarget = {
  readonly connectedAccountId: string;
  readonly companyId: string;
  /** The Page / channel / username / account the token belongs to. */
  readonly providerAccountId: string | null;
  /**
   * The addressable resource within that account: a Facebook Page id, a
   * Google Business `accounts/{a}/locations/{l}` resource name, an Instagram
   * Business account id. Null where the account IS the destination.
   */
  readonly providerResourceId: string | null;
};

export type PublishInput = {
  readonly post: PublishTarget;
  readonly package: PublishPackage;
  /**
   * Two capabilities, deliberately both present, because they answer
   * different questions and `marketing-channel-connection.ts` explains at
   * length why collapsing them produces a UI that lies:
   *
   *   `capability`        what the PLATFORM can do — the static matrix row.
   *   `publishCapability` what THIS connection may do right now — `direct`
   *                       publishes, `draft_only` leaves an unpublished
   *                       draft for a human to finish.
   *
   * An adapter reads the second to choose its endpoint (TikTok's publish vs
   * inbox init is exactly this decision) and the first for limits and
   * defaults. Neither is a licence to publish on its own: the gate is
   * `canAcceptContent`, and the caller has already passed it.
   */
  readonly capability: ProviderCapability;
  readonly publishCapability: MarketingPublishCapability;
  /**
   * `granted_scopes` from the connected-account row (migration 181) — what
   * the provider actually granted at consent, not what we asked for.
   *
   * ============ WHY THE CAPABILITY IS NOT ENOUGH ============
   * `publishCapability` is a CONCLUSION drawn at connect time and stored. A
   * user can narrow a grant afterwards from the provider's own account
   * settings without touching this app, so a capability written weeks ago is
   * evidence about the past. An adapter that is about to perform an
   * irreversible write gets the underlying evidence too and can refuse on
   * it — which is what makes "connected" stop being a proxy for "allowed".
   *
   * Empty is a real answer and must fail closed: a row we cannot prove
   * anything about is not a row to publish through.
   */
  readonly grantedScopes: readonly string[];
  /**
   * Decrypted at the credential seam and passed in. An adapter must never
   * read a token from the environment or the database — the same rule
   * `channel-publish-requests.ts` states for its builders, for the same
   * reason: a module that can obtain a credential on its own cannot be
   * tested without one.
   */
  readonly accessToken: string;
  readonly onMediaCreated?: OnMediaCreated;
};

/* -------------------------------------------------------------- connecting */

/**
 * One identity the authorization produced. A single consent commonly yields
 * several — Facebook returns every Page the user manages — so the connect
 * path is defined as returning a list even for providers that always return
 * exactly one.
 */
export type ConnectedAccountSummary = {
  readonly providerAccountId: string;
  readonly providerAccountName: string;
  readonly providerResourceId: string | null;
  readonly providerResourceName: string | null;
  /** Provider-specific extras destined for the row's `metadata` jsonb. */
  readonly metadata?: Readonly<Record<string, unknown>>;
};

export type ConnectResult = {
  readonly accounts: readonly ConnectedAccountSummary[];
  /**
   * Plaintext, in memory, for the length of the connect call only. The
   * caller hands it straight to the credential seam, which encrypts it with
   * the one cipher in `./crypto`. It is never logged, never returned to a
   * browser, and never written anywhere but the secrets table.
   */
  readonly accessTokenPlaintext: string;
  readonly refreshTokenPlaintext?: string;
  readonly tokenExpiresAt: string | null;
  /**
   * When the REFRESH token itself expires, where the provider says so.
   * TikTok does. Migration 181 added the column precisely because a
   * connection would otherwise start failing with nothing on the row able to
   * say it was foreseeable. Null means "no known expiry", not "never".
   */
  readonly refreshExpiresAt: string | null;
  /**
   * What the provider actually GRANTED, read back after consent — not the
   * constant we asked for. The difference between the two is the diagnosis
   * when a publish later fails with an opaque permission error, which is why
   * migration 181 stores this separately from `scopes`.
   */
  readonly grantedScopes: readonly string[];
};

export type BuildAuthorizeUrlInput = {
  readonly companyId: string;
  /** Opaque CSRF state minted by `lib/integrations/oauth-state.ts`. */
  readonly state: string;
  readonly redirectUri: string;
  /** PKCE verifier for `authKind: "oauth2_pkce"` providers (TikTok). */
  readonly codeVerifier?: string;
};

export type CompleteConnectInput = {
  readonly companyId: string;
  readonly authorizationCode: string;
  readonly redirectUri: string;
  readonly codeVerifier?: string;
};

/* ----------------------------------------------------------- refreshing */

export type RefreshCredentialInput = {
  readonly connectedAccountId: string;
  /**
   * Decrypted by the credential seam and handed over for this one call. An
   * adapter never reads or writes the secrets table itself, which is what
   * keeps "who may decrypt a token" answerable by reading one module.
   */
  readonly refreshTokenPlaintext: string;
  readonly nowIso: string;
};

/**
 * Why a refresh did not produce a credential.
 *
 * The split is the whole value of the union: `REAUTH_REQUIRED` means the
 * grant is gone and only a human reconnecting will fix it, `TRANSIENT` means
 * try again later, and treating the two the same is how a five-minute
 * provider outage turns into every connection being marked dead.
 */
export type RefreshFailureReason =
  | "REAUTH_REQUIRED"
  | "TRANSIENT"
  | "PROVIDER_ERROR";

export type RefreshCredentialResult =
  | {
      readonly ok: true;
      readonly accessTokenPlaintext: string;
      /**
       * Present only when the provider ROTATED the refresh token. Google and
       * TikTok commonly return an access token alone; the caller must then
       * keep the refresh token it already holds rather than storing null and
       * making the connection unrefreshable next time.
       */
      readonly refreshTokenPlaintext?: string;
      readonly tokenExpiresAt: string | null;
      readonly refreshExpiresAt?: string | null;
      readonly grantedScopes?: readonly string[];
    }
  | {
      readonly ok: false;
      readonly reason: RefreshFailureReason;
      /**
       * Operator-facing, and length-bounded by the caller before it reaches
       * `capability_probe_error` (500 chars, migration 181). An adapter must
       * not put a token in here; the credential seam scrubs it anyway,
       * because "must not" is not a mechanism.
       */
      readonly detail: string;
    };

/* ------------------------------------------------------------- probing */

/**
 * The answer to "can this connection publish, right now, according to the
 * provider?" — the third of the three independent facts in
 * `marketing-channel-connection.ts`, and the only one no token can be
 * inspected to learn. TikTok's Direct Post needs an app review; Google
 * Business needs per-project quota. Both are ordinary states, neither is an
 * error, and both are discovered by asking.
 */
export type CapabilityProbeResult = {
  readonly capability: MarketingPublishCapability;
  /** Why, in words an operator can act on. Bounded at 500 by migration 143. */
  readonly detail: string;
  readonly grantedScopes: readonly string[];
};

export type ProbeCapabilityInput = {
  readonly connectedAccountId: string;
  readonly accessToken: string;
  readonly providerResourceId: string | null;
};

/* ------------------------------------------------------------ insights */

export type FetchInsightsInput = {
  readonly accessToken: string;
  /** The published object to read numbers for — the delivery's post id. */
  readonly providerPostId: string;
};

export type FetchInsightsResult =
  | { readonly ok: true; readonly metrics: readonly CollectedMetric[] }
  | {
      readonly ok: false;
      /** `not_ready` is not a failure to alarm on — see the insights types. */
      readonly kind: "not_ready" | "unauthorized" | "unsupported" | "unknown";
      readonly detail: string;
    };

/* -------------------------------------------------------------- the port */

/**
 * What every adapter has regardless of kind.
 *
 * All five capability methods are OPTIONAL because they are genuinely
 * optional: `altair_site` has no authorize hop at all (`authKind: "none"`),
 * Facebook's long-lived Page tokens do not refresh, and Google Business
 * reports no analytics. An adapter declares what it can do by defining the
 * method; the registry and the credential seam check for its presence rather
 * than assuming a provider implements a hop it has no concept of.
 */
type IntegrationAdapterBase = {
  readonly provider: IntegrationProvider;
  buildAuthorizeUrl?(input: BuildAuthorizeUrlInput): string;
  completeConnect?(input: CompleteConnectInput): Promise<ConnectResult>;
  refreshCredential?(
    input: RefreshCredentialInput,
  ): Promise<RefreshCredentialResult>;
  probeCapability?(
    input: ProbeCapabilityInput,
  ): Promise<CapabilityProbeResult>;
  fetchInsights?(input: FetchInsightsInput): Promise<FetchInsightsResult>;
};

/**
 * The only kind of adapter that can receive content.
 *
 * `publish` is REQUIRED here and absent everywhere else, which is the point
 * of the whole union below.
 *
 * Throws on failure. See the error contract at the top of this file.
 */
export type PublisherAdapter = IntegrationAdapterBase & {
  readonly kind: "publisher";
  publish(input: PublishInput): Promise<PublishOutcome>;
};

/**
 * ============ WHY THIS IS A UNION AND NOT `publish?: ...` ============
 * The obvious modelling is one interface with an optional `publish`. It
 * compiles, it is shorter, and it is wrong: under one flat interface ANY
 * adapter may define a `publish`, so a Higgsfield adapter that grew one by
 * copy-paste is a shape this codebase can be written into and still build.
 * The capability matrix rules that out in prose — "it PRODUCES creative and
 * can never receive a post. It has no publish path at all — not a disabled
 * one, an absent one" — and migration 181 rules it out in SQL, where the
 * publish gate reads `integration_kind`.
 *
 * Discriminating on `kind` makes the type system say PART of it, and the part
 * is worth stating exactly rather than generously:
 *
 *   IT GUARANTEES  `publish?: never` below is uninhabitable, so a non-
 *   publisher adapter that DEFINES a publish method fails to compile. The
 *   capability cannot be acquired by an adapter whose provider does not have
 *   it — not accidentally, not by copy-paste from a publisher.
 *
 *   IT DOES NOT GUARANTEE that reaching `publish` requires narrowing.
 *   `adapter.publish?.(input)` type checks on an un-narrowed
 *   `IntegrationAdapter`, because optional-chaining a `never`-typed optional
 *   member is legal; it simply evaluates to `undefined`. A caller can
 *   therefore still ASK an asset source to publish, and read the silent
 *   `undefined` as a publish that succeeded.
 *
 * That gap is why the refusal that matters is a runtime one:
 * `lib/publishing/gate.ts` checks `integration_kind` against the matrix and
 * says no in words, rather than trusting this union to have made the call
 * unwritable.
 */
export type AssetSourceAdapter = IntegrationAdapterBase & {
  readonly kind: "asset_source";
  /** Not optional-and-unused. Uninhabitable: no value can be assigned. */
  publish?: never;
};

/**
 * An Altair-owned surface. No delegated credential exists, which is why
 * migration 181 forbids a `token_expires_at` on a first-party row.
 *
 * Also has no `publish`, for a different reason than Higgsfield: writing to
 * our own site is an ordinary internal database write, not a delegated
 * publish through somebody else's API. If first-party publishing lands it
 * gets its own named method — widening `publish` to cover it would put an
 * internal write and an irreversible third-party post behind one name.
 */
/**
 * What a first-party publish reports back. Same shape as `PublishOutcome`
 * so one settlement path serves both, but produced by a different method for
 * the reason written on the adapter below.
 */
export type FirstPartyPublishOutcome = PublishOutcome & {
  /** True when this created the page; false when it revised an existing one. */
  readonly created: boolean;
  /** The revision now live. 1 on creation, incrementing on each update. */
  readonly revision: number;
};

export type FirstPartyPublishInput = {
  readonly post: PublishTarget;
  readonly package: PublishPackage;
  readonly capability: ProviderCapability;
  /**
   * The person publishing. Required, and not optional the way a token is
   * absent: an internal write still has an author, and the audit trail on a
   * live public URL is worth more than the convenience of omitting it.
   */
  readonly publishedBy: string;
  /** SEO fields, which no external provider carries. */
  readonly seo: {
    readonly slug: string | null;
    readonly metaTitle: string | null;
    readonly metaDescription: string | null;
    readonly canonicalUrl: string | null;
    readonly keywords: readonly string[];
  };
  readonly internalLinks: readonly string[];
  readonly changeNote: string | null;
  readonly nowIso: string;
};

export type FirstPartyAdapter = IntegrationAdapterBase & {
  readonly kind: "first_party";
  /**
   * `publish` stays uninhabitable. See the union's note: widening it to cover
   * an internal write would put an ordinary database row and an irreversible
   * third-party post behind one name, and the two need different arguments,
   * different failure handling and different reviews.
   */
  publish?: never;
  /**
   * The named method that note promised.
   *
   * THROWS on failure, matching `publish`'s contract, so the caller's catch
   * settles the delivery and releases the claim exactly as it does for an
   * external provider. The ledger does not care which kind of destination it
   * was; the adapter interface does.
   */
  publishFirstParty(
    input: FirstPartyPublishInput,
  ): Promise<FirstPartyPublishOutcome>;
};

export type IntegrationAdapter =
  | PublisherAdapter
  | AssetSourceAdapter
  | FirstPartyAdapter;
