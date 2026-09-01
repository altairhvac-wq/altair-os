/**
 * The publishing package — one finished piece of content, fanned out to one
 * post per destination provider.
 *
 * ====================== WHAT A PACKAGE IS ======================
 * The Agent Platform does not produce "a Facebook post". It produces a piece
 * of content: a video, a caption, a title, a transcript, hashtags, a call to
 * action, and the provenance of how all of that came to exist. Which surfaces
 * that content reaches is a separate, later decision, and the same content
 * reaching four surfaces is four different sets of bytes with four different
 * limits.
 *
 * A package is therefore the PARENT of N posts, never a post itself.
 *
 * ============ THE RULE THIS MUST NOT BREAK ============
 * Migration 145's header states it: one `marketing_posts` row is ONE
 * publishable unit for ONE provider. Migration 143's duplicate guard —
 * `unique (company_id, marketing_post_id, provider)` — is built on that. A
 * post shared between two providers could claim only one delivery row, so
 * publishing to the second would read as a duplicate of the first and be
 * refused; a package that emitted two posts for the SAME provider would
 * produce two rows racing for one delivery claim, and exactly one of them
 * would silently never publish.
 *
 * So `buildProviderPosts` is deduplicating by construction, not by the
 * caller's good manners: it walks a Set and emits at most one plan per
 * provider. That property is asserted by
 * `scripts/verify-publishing-package.mjs` against the whole provider
 * vocabulary, repeated, in every order it is handed.
 *
 * ====================== WHY THIS FILE IS PURE ======================
 * Relative sibling imports only. No `server-only`, no `process.env`, no
 * database client, no clock. Every decision here — does this content fit that
 * platform, what would we actually send, has the whole fan-out landed — is a
 * total function of data, so the ugly cases (a partially delivered package, a
 * provider that takes no video, an asset set one over the limit) are testable
 * without a database, a provider, or a failed publish to recover from.
 */
import type {
  CapabilityGap,
  DefaultVisibility,
  MediaKind,
  ProviderCapability,
} from "./integration-capability";
import { capabilityFor } from "./integration-capability";
import type { IntegrationProvider } from "./integration-provider";
import type { MarketingDeliveryState } from "./marketing-delivery";
import type { MarketingPostSource } from "./marketing-post";

/* ------------------------------------------------------------- vocabulary */

/**
 * Mirrors the `package_state` CHECK in migration 182, character for
 * character and in order. The verifier parses the SQL and compares, because
 * the drift documented at the top of `./integration-provider` — a database
 * that accepted a value the TypeScript union refused, for eighteen months —
 * is the failure this list exists to make impossible.
 */
export const PACKAGE_STATES = [
  /** Being written. Nothing has fanned out. */
  "draft",
  /** A human said yes. Posts may be written; nothing has been attempted. */
  "approved",
  /** The fan-out has begun and has not fully landed. */
  "publishing",
  /** EVERY destination is settled and posted. Nothing is outstanding. */
  "published",
  /** Withdrawn. Kept for the record, never republished. */
  "archived",
] as const;
export type PackageState = (typeof PACKAGE_STATES)[number];

/** Mirrors the `asset_role` CHECK in migration 182, in order. */
export const ASSET_ROLES = [
  "primary_video",
  "thumbnail",
  "image",
  "link_card",
] as const;
export type PackageAssetRole = (typeof ASSET_ROLES)[number];

/** Mirrors `check (sort_order >= 0 and sort_order <= 19)` in migration 182. */
export const PACKAGE_ASSET_SORT_ORDER_MIN = 0;
export const PACKAGE_ASSET_SORT_ORDER_MAX = 19;

/**
 * The media kind is a fact about the ROLE, not a second field beside it.
 *
 * Storing both invites the one state the type should not be able to
 * represent: an asset whose role says `primary_video` and whose kind says
 * `image`. Every capability decision downstream reads the kind, so a
 * disagreement between the two would not surface as a type error — it would
 * surface as a video handed to Google Business, which accepts images only.
 *
 * This is the kind the FAN-OUT reasons about. What the referenced
 * `marketing_media_assets` row actually holds is recorded on that row, and the
 * writer that links an asset into a package is responsible for pairing a role
 * with a media object of the matching kind. The database cannot enforce the
 * pairing from here: migration 182 runs before the media table gains a kind of
 * its own, so there is nothing for a composite foreign key to reference yet.
 */
export const MEDIA_KIND_BY_ASSET_ROLE: Readonly<
  Record<PackageAssetRole, MediaKind>
> = {
  primary_video: "video",
  thumbnail: "image",
  image: "image",
  link_card: "image",
};

export function mediaKindForAssetRole(role: PackageAssetRole): MediaKind {
  return MEDIA_KIND_BY_ASSET_ROLE[role];
}

/**
 * The `public.marketing_channel` label a plan writes to
 * `marketing_posts.channel_target`.
 *
 * Derived from the provider vocabulary rather than restated, for the reason
 * `MARKETING_PUBLISH_CHANNELS` is derived from the capability matrix: a
 * hand-kept second list is how the enum gained four labels in migration 180
 * that nothing in TypeScript could name.
 *
 * Two providers are deliberately absent. `higgsfield` is an asset source and
 * has no channel at all — migration 180's header says why a label for it must
 * never exist. `altair_site` maps to `website`, which has named that surface
 * since migration 087; a second label for one surface would split the meaning
 * of every historical row.
 */
export type MarketingChannelTarget =
  | Exclude<IntegrationProvider, "higgsfield" | "altair_site">
  | "website";

export function channelTargetFor(
  provider: IntegrationProvider,
): MarketingChannelTarget | null {
  if (provider === "higgsfield") return null;
  if (provider === "altair_site") return "website";
  return provider;
}

/* ------------------------------------------------------------ the package */

export type PackageAsset = {
  readonly id: string;
  readonly companyId: string;
  readonly packageId: string;
  /** A `marketing_media_assets` id. Never a URL, never a filesystem path. */
  readonly mediaAssetId: string;
  readonly assetRole: PackageAssetRole;
  /** 0-19, matching the database CHECK. Ordering within a role. */
  readonly sortOrder: number;
};

/**
 * How the content came to exist. Carried so a human looking at a published
 * post six months later can answer "who wrote this, and did anyone check it"
 * without archaeology through agent logs that may have rotated away.
 */
export type PackageProvenance = {
  /** The system that produced the package, e.g. the agent platform. */
  readonly producedBy: string;
  /** The agent run, where there was one. Null for hand-authored packages. */
  readonly agentRunId: string | null;
  /** A model LABEL, for the record. Never a key, never a prompt. */
  readonly modelLabel: string | null;
  readonly generatedAt: string;
  /** True once a person has changed the copy. Approval alone does not set it. */
  readonly humanEdited: boolean;
};

export type PackageSeo = {
  readonly slug: string | null;
  readonly metaTitle: string | null;
  readonly metaDescription: string | null;
  readonly canonicalUrl: string | null;
  readonly keywords: readonly string[];
};

export type PackageCta = {
  readonly label: string | null;
  readonly url: string | null;
};

export type ContentPackage = {
  readonly id: string;
  readonly companyId: string;

  /**
   * What produced this, reusing the existing `marketing_post_source`
   * vocabulary rather than inventing a parallel one. Migration 182 stores it
   * as that enum for the same reason: a package and the posts it fans out to
   * must be filed under one answer to "where did this come from", or
   * migration 147's source-scoped duplicate guard is reasoning about a
   * different thing than the package is.
   */
  readonly sourceType: MarketingPostSource;
  /**
   * The artifact this package was built from, as a bare uuid.
   *
   * The platform spells its artifacts `art_<uuid>`; the prefix is stripped
   * before it reaches here, exactly as `/api/agent/draft-posts` does for
   * `marketing_posts.source_id`. Together with `sourceType` and the company
   * it is the idempotency key: migration 182's partial unique index means a
   * repeated agent cycle converges on the same package instead of producing a
   * second one that would fan out to the same providers all over again.
   */
  readonly sourceId: string | null;
  /** The content experiment this package belongs to, where there is one. */
  readonly contentExperimentId: string | null;

  /* ------------------------------------------------------------- content */
  readonly title: string;
  /** Long-form body. YouTube's description, a Reddit selftext, a site article. */
  readonly description: string;
  /** Short social copy. The single block Facebook, Instagram, TikTok render. */
  readonly caption: string;
  readonly hashtags: readonly string[];
  /** Keyword tags, distinct from hashtags: YouTube tags are not `#`-prefixed. */
  readonly tags: readonly string[];
  /**
   * Plain-text transcript and its WebVTT track, carried as TEXT.
   *
   * Not as media asset ids: migration 144's `marketing-media` bucket permits
   * `video/mp4` and nothing else, so a caption file has nowhere to live yet.
   * Text in the brief is honest about that; an id pointing at a row that
   * cannot exist would not be.
   */
  readonly transcript: string | null;
  readonly captionsVtt: string | null;
  readonly cta: PackageCta;

  /* -------------------------------------------------------------- assets */
  readonly assets: readonly PackageAsset[];

  /* --------------------------------------------------------- destination */
  readonly destinations: readonly IntegrationProvider[];
  /**
   * When the operator asked for this to go out. Null means "as soon as it is
   * approved". Distinct from a provider-side schedule — see
   * `PackageVariant.scheduleHeldBy`.
   */
  readonly requestedPublishAt: string | null;
  /**
   * Whether THIS package needs a human before anything leaves.
   *
   * Never the only word on the subject: a capability may also demand approval
   * on policy grounds (Reddit does), and the two are OR-ed in
   * `buildProviderPosts`. A package saying `false` cannot waive a provider's
   * own requirement.
   */
  readonly requiresApproval: boolean;

  readonly seo: PackageSeo;
  readonly provenance: PackageProvenance;

  readonly packageState: PackageState;
  readonly createdBy: string | null;
  readonly approvedBy: string | null;
  readonly approvedAt: string | null;
};

/** The thumbnail this package carries, or null. Derived; never a second field. */
export function thumbnailAssetFor(pkg: ContentPackage): PackageAsset | null {
  return (
    pkg.assets.find((asset) => asset.assetRole === "thumbnail") ?? null
  );
}

/* ------------------------------------------------------------- projection */

/**
 * What one provider would actually receive. The package projected through a
 * capability, with nothing invented and nothing clamped.
 *
 * Clamping is deliberately NOT done here. `lib/integrations/channel-publish-
 * requests.ts` clamps at send time because that module is what puts bytes on
 * the wire; a second clamp here would mean two places decide what a title is,
 * and the moment they disagree the operator is shown copy that is not what
 * goes out. This projection either fits or reports a gap.
 */
export type PackageVariant = {
  readonly provider: IntegrationProvider;
  readonly channelTarget: MarketingChannelTarget | null;
  /** Null where the provider has no title field at all (Facebook, LinkedIn). */
  readonly title: string | null;
  readonly body: string;
  readonly hashtags: readonly string[];
  readonly link: string | null;
  readonly assets: readonly PackageAsset[];
  readonly scheduledAt: string | null;
  /**
   * Who holds the schedule — and why `scheduledAt` is not simply dropped for
   * a provider that cannot schedule.
   *
   * Instagram, TikTok, LinkedIn, Google Business and Reddit all publish
   * immediately when called. Nulling `scheduledAt` for them would quietly
   * turn "post this at 9am" into "post this now", which is the same content
   * arriving at the wrong time on a real brand account. Instead the time is
   * kept and this says who must honour it: `altair` means our own scheduler
   * holds the post and calls the provider at that moment.
   */
  readonly scheduleHeldBy: "provider" | "altair" | null;
  readonly visibility: DefaultVisibility;
  readonly requiresApproval: boolean;
};

/**
 * The assets a provider would actually be sent, in delivery order.
 *
 * A thumbnail is dropped for a provider that has no cover-image concept. It
 * is not merely useless there — it would be delivered as an ordinary extra
 * image, so a one-video package would post a video AND a still frame of that
 * same video, which is a visible defect on the account rather than a silent
 * one in a log.
 */
export function deliverableAssetsFor(
  pkg: ContentPackage,
  capability: ProviderCapability,
): readonly PackageAsset[] {
  return pkg.assets
    .filter(
      (asset) =>
        asset.assetRole !== "thumbnail" || capability.supportsThumbnail,
    )
    .sort((a, b) => {
      const roleDelta =
        ASSET_ROLES.indexOf(a.assetRole) - ASSET_ROLES.indexOf(b.assetRole);
      return roleDelta !== 0 ? roleDelta : a.sortOrder - b.sortOrder;
    });
}

/**
 * Whether a provider has a title AND a body, or one field it happens to call
 * a title.
 *
 * Derived from the budgets rather than from the provider's name, so a new
 * platform needs no edit here. YouTube is 100 over 5000, Reddit 300 over
 * 40000, the Altair site 200 over 100000 — a headline and a body. TikTok is
 * 2200 and 2200, because its `title` IS the caption: the transport sends that
 * one field and nothing else (`buildTikTokPublishInitRequest`). Treating
 * TikTok's single field as a headline would put the package TITLE on TikTok
 * and drop the caption entirely — the copy an operator actually wrote would
 * never leave the building.
 */
function hasSeparateTitleField(capability: ProviderCapability): boolean {
  return (
    capability.titleMaxChars !== null &&
    capability.titleMaxChars < capability.bodyMaxChars
  );
}

function buildVariant(
  pkg: ContentPackage,
  capability: ProviderCapability,
  assets: readonly PackageAsset[],
): PackageVariant {
  const caption = pkg.caption.trim();
  const description = pkg.description.trim();
  const title = pkg.title.trim();

  let variantTitle: string | null;
  let variantBody: string;

  if (capability.titleMaxChars === null) {
    // One block of social copy, no headline anywhere in the payload.
    variantTitle = null;
    variantBody = caption || description;
  } else if (hasSeparateTitleField(capability)) {
    variantTitle = title;
    variantBody = description || caption;
  } else {
    // One field, named `title` by the provider. The caption belongs in it,
    // and there is no second field for a body to go missing in.
    variantTitle = caption || title;
    variantBody = "";
  }

  return {
    provider: capability.provider,
    channelTarget: channelTargetFor(capability.provider),
    title: variantTitle,
    body: variantBody,
    // Reddit reads hashtags as spam; the matrix already records that, so the
    // decision is read rather than re-litigated per call site.
    hashtags: capability.supportsHashtags ? pkg.hashtags : [],
    link: capability.supportsLink ? pkg.cta.url : null,
    assets,
    scheduledAt: pkg.requestedPublishAt,
    scheduleHeldBy:
      pkg.requestedPublishAt === null
        ? null
        : capability.supportsScheduling
          ? "provider"
          : "altair",
    visibility: capability.defaultVisibility,
    requiresApproval: pkg.requiresApproval || capability.requiresManualApproval,
  };
}

/**
 * One evaluation, used by both the public validator and the fan-out, so a
 * plan's variant and its gap can never be computed from different inputs.
 */
function assessPackage(
  pkg: ContentPackage,
  capability: ProviderCapability,
): { readonly variant: PackageVariant; readonly gap: CapabilityGap | null } {
  const assets = deliverableAssetsFor(pkg, capability);
  const variant = buildVariant(pkg, capability, assets);

  if (capability.kind !== "publisher") {
    return { variant, gap: { reason: "not_a_publisher" } };
  }

  // Kind before quantity, and both before text. A package of video handed to
  // an image-only surface is not "one asset too many" and telling the
  // operator so would send them to delete an asset that was never the
  // problem.
  for (const asset of assets) {
    const kind = mediaKindForAssetRole(asset.assetRole);
    if (!capability.acceptsMediaKinds.includes(kind)) {
      return { variant, gap: { reason: "media_kind_unsupported", kind } };
    }
  }

  if (capability.requiresMedia && assets.length === 0) {
    return { variant, gap: { reason: "media_required" } };
  }

  if (assets.length > capability.maxAssets) {
    return {
      variant,
      gap: { reason: "too_many_assets", count: assets.length },
    };
  }

  if (capability.titleMaxChars !== null) {
    const text = variant.title ?? "";
    // A provider that HAS a title field renders it. The matrix carries no
    // separate "title is optional" flag, and the safe reading of that silence
    // is to refuse rather than to publish an untitled artefact onto a surface
    // that will display an empty headline.
    if (text.length === 0) {
      return { variant, gap: { reason: "title_required" } };
    }
    if (text.length > capability.titleMaxChars) {
      return {
        variant,
        gap: { reason: "title_too_long", length: text.length },
      };
    }
  }

  if (variant.body.length > capability.bodyMaxChars) {
    return {
      variant,
      gap: { reason: "body_too_long", length: variant.body.length },
    };
  }

  return { variant, gap: null };
}

export type PackageValidation =
  | { readonly ok: true; readonly variant: PackageVariant }
  | { readonly ok: false; readonly gap: CapabilityGap };

/**
 * Can this package go to this provider, and if not, what specifically stops
 * it?
 *
 * The gap is the existing `CapabilityGap` union from
 * `./integration-capability`, not a second vocabulary — `describeCapabilityGap`
 * already turns every one of these into operator-facing words, and a parallel
 * reason list would mean two places deciding what a human is told.
 */
export function validatePackageForProvider(
  pkg: ContentPackage,
  capability: ProviderCapability,
): PackageValidation {
  const { variant, gap } = assessPackage(pkg, capability);
  if (gap !== null) return { ok: false, gap };
  return { ok: true, variant };
}

/* --------------------------------------------------------------- fan-out */

/**
 * One intended `marketing_posts` row.
 *
 * A plan with a non-null `gap` must NOT be written. It is returned rather
 * than dropped because a destination that silently disappears between "the
 * operator picked five platforms" and "three posts exist" is a bug nobody can
 * see; `describeCapabilityGap` turns the gap into the sentence that explains
 * the missing two.
 */
export type ProviderPostPlan = {
  readonly companyId: string;
  readonly packageId: string;
  readonly provider: IntegrationProvider;
  readonly channelTarget: MarketingChannelTarget | null;
  readonly sourceType: MarketingPostSource;
  readonly sourceId: string | null;
  readonly variant: PackageVariant;
  readonly requiresApproval: boolean;
  /** Null when this plan may be written. */
  readonly gap: CapabilityGap | null;
};

/**
 * The fan-out: at most ONE post per provider, always.
 *
 * The Set is the guarantee, not a caller convention. A duplicated provider in
 * the input list — trivially produced by concatenating a saved destination
 * list with a freshly picked one — would otherwise become two
 * `marketing_posts` rows for one provider, and migration 143's
 * `unique (company_id, marketing_post_id, provider)` would let exactly one of
 * them claim a delivery. The other would sit forever looking publishable and
 * never publish.
 *
 * First occurrence wins, so the caller's ordering is preserved and the result
 * is stable across repeated cycles.
 */
export function buildProviderPosts(
  pkg: ContentPackage,
  providers: readonly IntegrationProvider[] = pkg.destinations,
): readonly ProviderPostPlan[] {
  const seen = new Set<IntegrationProvider>();
  const plans: ProviderPostPlan[] = [];

  for (const provider of providers) {
    if (seen.has(provider)) continue;
    seen.add(provider);

    const capability = capabilityFor(provider);
    const { variant, gap } = assessPackage(pkg, capability);

    plans.push({
      companyId: pkg.companyId,
      packageId: pkg.id,
      provider,
      channelTarget: variant.channelTarget,
      sourceType: pkg.sourceType,
      sourceId: pkg.sourceId,
      variant,
      requiresApproval: variant.requiresApproval,
      gap,
    });
  }

  return plans;
}

/** The plans that may actually be written as posts. */
export function publishablePosts(
  plans: readonly ProviderPostPlan[],
): readonly ProviderPostPlan[] {
  return plans.filter((plan) => plan.gap === null);
}

/* ------------------------------------------------------- state derivation */

/** The subset of a fanned-out post this derivation needs. */
export type PackagePostFact = {
  readonly marketingPostId: string;
  readonly provider: IntegrationProvider;
};

/** The subset of a delivery row this derivation needs. */
export type PackageDeliveryFact = {
  readonly marketingPostId: string;
  readonly provider: IntegrationProvider;
  readonly deliveryState: MarketingDeliveryState;
};

/**
 * Destinations that have NOT reached `posted`.
 *
 * Deliberately counts a post with no delivery row at all as unsettled. The
 * absence of a claim is not evidence of success — it is the state a fan-out
 * is in before anything was attempted, and treating "nothing happened" as
 * "nothing left to do" is precisely how a package would report published with
 * half of it never sent.
 */
export function unsettledDestinations(
  posts: readonly PackagePostFact[],
  deliveries: readonly PackageDeliveryFact[],
): readonly IntegrationProvider[] {
  return posts
    .filter(
      (post) =>
        !deliveries.some(
          (delivery) =>
            delivery.marketingPostId === post.marketingPostId &&
            delivery.deliveryState === "posted",
        ),
    )
    .map((post) => post.provider);
}

/**
 * What state the package is in, according to what actually happened.
 *
 * ================= THE ONE PROPERTY THAT MATTERS =================
 * `published` is returned only when EVERY post has a delivery that says
 * `posted`. Not "most", not "the ones we tried". A package that reports
 * published while a destination is in flight, failed, or sitting as an
 * unpublished draft at the provider tells the operator the work is done, so
 * nobody goes and finishes it — and the delivery ledger, which knows better,
 * is not what anybody looks at.
 *
 * The delivery vocabulary is `MarketingDeliveryState` from
 * `./marketing-delivery`, not a copy of it. `in_flight` there means an
 * external write was claimed and may or may not have completed; `draft` means
 * the bytes arrived but nothing is public. Neither is `posted`, and this
 * function does not get to soften that.
 *
 * ==================== WHAT IT DOES NOT DECIDE ====================
 * `archived` is never returned. It is a human withdrawing a package, and no
 * amount of post or delivery evidence implies it — a caller holding an
 * archived package must not overwrite that with a derivation.
 */
export function derivePackageState(
  posts: readonly PackagePostFact[],
  deliveries: readonly PackageDeliveryFact[],
): PackageState {
  if (posts.length === 0) return "draft";

  const unsettled = unsettledDestinations(posts, deliveries);
  if (unsettled.length === 0) return "published";

  // Posts exist and nothing has been attempted against any of them: the
  // fan-out is written and waiting, which is what `approved` means. Once a
  // single claim exists the package is on its way, whether that claim is
  // running, stuck, or failed — `publishing` covers all three, and the
  // per-destination truth lives in the delivery ledger rather than being
  // flattened into one word here.
  return deliveries.length === 0 ? "approved" : "publishing";
}

/** True only when nothing is outstanding anywhere. */
export function packageIsFullyDelivered(
  posts: readonly PackagePostFact[],
  deliveries: readonly PackageDeliveryFact[],
): boolean {
  return posts.length > 0 && unsettledDestinations(posts, deliveries).length === 0;
}

/**
 * One line of operator-facing copy per state, exhaustive over the union so a
 * new state cannot be added without someone deciding what it says.
 */
export function describePackageState(state: PackageState): string {
  switch (state) {
    case "draft":
      return "Still being written. Nothing has been sent anywhere.";
    case "approved":
      return "Approved and queued. No destination has been attempted yet.";
    case "publishing":
      return "Publishing. At least one destination has not landed yet.";
    case "published":
      return "Published to every destination.";
    case "archived":
      return "Withdrawn. This package will not be published again.";
  }
}
