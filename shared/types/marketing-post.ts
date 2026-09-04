export type MarketingPostStatus =
  | "draft"
  | "ready"
  | "scheduled"
  | "posted"
  | "failed"
  | "archived";

/**
 * Mirrors the `public.marketing_channel` SQL enum (087 + 180).
 *
 * Kept in step deliberately: this union was three labels behind the enum
 * once already — the same drift `shared/types/integration-provider.ts`
 * documents, where the database accepted a value the TypeScript refused to
 * name. `scripts/verify-integration-registry.mjs` now compares the two
 * label-for-label, so a future migration that adds a channel without
 * widening this fails a check rather than surfacing as a row nothing can
 * read.
 *
 * `higgsfield` is deliberately absent and must stay absent: it is an asset
 * source, and a channel label for it would make "publish to Higgsfield"
 * representable. `website` is the Altair-owned surface — 180 adds no
 * `altair_site` label because a second name for the same destination would
 * split every historical row's meaning.
 */
export type MarketingChannel =
  | "facebook"
  | "instagram"
  | "google_business"
  | "youtube"
  | "tiktok"
  | "linkedin"
  | "reddit"
  | "website"
  | "general";

export type MarketingPostSource =
  | "manual"
  | "completed_job"
  | "seasonal"
  | "service_area"
  | "project_gallery"
  | "founder_milestone"
  | "product_update"
  /**
   * Proposed by the Agent Platform's daily reel pilot, not by a person.
   *
   * Mirrors the database label added in migration 146. It is deliberately NOT
   * offered anywhere a human picks a source: nobody hand-authors a post and
   * calls it agent-proposed, and migration 147's duplicate guard is scoped to
   * exactly this label — widening who can write it would put that guard over
   * rows it was never meant to police.
   */
  | "agent_daily_reel"
  | "other";

export type MarketingPost = {
  id: string;
  companyId: string;
  title: string;
  channelTarget: MarketingChannel;
  postText: string;
  suggestedHashtags: string[];
  callToAction?: string;
  status: MarketingPostStatus;
  sourceType: MarketingPostSource;
  sourceId?: string;
  scheduledAt?: string;
  postedAt?: string;
  archivedAt?: string;
  deletedAt: string | null;
  /** Platform-admin founder drafts only — product screenshot path or URL. */
  founderScreenshotReference?: string;
  /**
   * The rendered video this post publishes, as a `marketing_media_assets` id.
   *
   * ================= AN ID, NOT A LOCATION =================
   * Deliberately not a path and not a URL. A path is meaningless off the
   * machine that rendered it; a signed URL is a fifteen-minute capability that
   * would become permanent the moment it were stored here. This is a stable
   * identity that grants nothing on its own — the bytes are reached only
   * through a grant minted at publish time and discarded.
   *
   * Migration 145 enforces the same-company rule as a composite foreign key on
   * (video_media_asset_id, company_id), so a post can never name another
   * company's video regardless of which code path writes it.
   */
  videoMediaAssetId?: string;
  /**
   * The creative brief this post was fanned out from (migration 182), when
   * there is one. Null for a hand-authored post.
   *
   * For a `website` post this is also the join to its published page:
   * `marketing_site_pages.content_package_id`. It is the ONLY link between
   * the two, deliberately — a page and a post share no title or slug that
   * could be matched on without guessing.
   */
  contentPackageId?: string;
  /**
   * Migration 195, agent-rendered posts only. Estimated USD cost of the
   * render, agent-platform's own render-quality verdict, and the Director's
   * stated rationale for this content's format/treatment — all three
   * written once, at draft-creation time, by /api/agent/draft-posts, and
   * never updated afterward. Undefined for a hand-authored post, a post
   * created before this column existed, or an agent-rendered post whose
   * value this platform never had — never fabricated for those.
   */
  costUsd?: number;
  /**
   * NOT the same vocabulary as `creative_generation_candidates.quality_state`
   * (migration 185, a human's review of a generated image). This is
   * agent-platform's own STUB / REVIEWABLE_CREATIVE / PRODUCTION_READY
   * verdict for the rendered video (src/video/quality-classification.ts in
   * that repository).
   */
  qualityState?: string;
  directorRationale?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
};

export type MarketingPostCreateInput = {
  title: string;
  channelTarget?: MarketingChannel;
  postText?: string;
  suggestedHashtags?: string[];
  callToAction?: string | null;
  status?: MarketingPostStatus;
  sourceType?: MarketingPostSource;
  sourceId?: string | null;
  scheduledAt?: string | null;
  founderScreenshotReference?: string | null;
  videoMediaAssetId?: string | null;
};

export type MarketingPostUpdateInput = {
  title?: string;
  channelTarget?: MarketingChannel;
  postText?: string;
  suggestedHashtags?: string[];
  callToAction?: string | null;
  status?: MarketingPostStatus;
  sourceType?: MarketingPostSource;
  sourceId?: string | null;
  scheduledAt?: string | null;
  founderScreenshotReference?: string | null;
  videoMediaAssetId?: string | null;
};

export const MARKETING_POST_STATUS_OPTIONS: {
  value: MarketingPostStatus;
  label: string;
}[] = [
  { value: "draft", label: "Draft" },
  { value: "ready", label: "Ready" },
  { value: "scheduled", label: "Scheduled" },
  { value: "posted", label: "Posted" },
  { value: "failed", label: "Failed" },
  { value: "archived", label: "Archived" },
];

/**
 * Every channel a post may be filed under, in picker order.
 *
 * ============ THIS IS ALSO A VALIDATION ALLOWLIST ============
 * `app/actions/marketing-posts.ts` builds its accepted-channel Set from this
 * array, so a label missing here is not merely absent from a dropdown — the
 * Server Action REJECTS it. That coupling is why the four channels migration
 * 180 added appear here rather than only in the type: a post the database
 * can store but the action refuses to accept is the same drift in a second
 * costume.
 *
 * (The comparable coupling in `lib/integrations/oauth-state.ts` — where a
 * card list was serving as the OAuth provider allowlist — was severed
 * instead, because there the two really were different questions. Here they
 * are the same question: which channels may a post name?)
 */
export const MARKETING_CHANNEL_OPTIONS: {
  value: MarketingChannel;
  label: string;
}[] = [
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "youtube", label: "YouTube" },
  { value: "tiktok", label: "TikTok" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "reddit", label: "Reddit" },
  { value: "google_business", label: "Google Business" },
  { value: "website", label: "Website" },
  { value: "general", label: "General" },
];

export const MARKETING_POST_SOURCE_OPTIONS: {
  value: MarketingPostSource;
  label: string;
}[] = [
  { value: "manual", label: "Manual" },
  { value: "completed_job", label: "Completed job" },
  { value: "seasonal", label: "Seasonal" },
  { value: "service_area", label: "Service area" },
  { value: "project_gallery", label: "Project gallery" },
  { value: "founder_milestone", label: "Founder milestone" },
  { value: "product_update", label: "Product update" },
  { value: "other", label: "Other" },
];

export function formatMarketingPostStatus(status: MarketingPostStatus): string {
  return (
    MARKETING_POST_STATUS_OPTIONS.find((option) => option.value === status)
      ?.label ?? status
  );
}

export function formatMarketingChannel(channel: MarketingChannel): string {
  return (
    MARKETING_CHANNEL_OPTIONS.find((option) => option.value === channel)
      ?.label ?? channel
  );
}

export function formatMarketingPostSource(source: MarketingPostSource): string {
  return (
    MARKETING_POST_SOURCE_OPTIONS.find((option) => option.value === source)
      ?.label ?? source
  );
}

export type MarketingPostListTab = "active" | "scheduled" | "posted" | "archived";

const ACTIVE_MARKETING_POST_STATUSES = new Set<MarketingPostStatus>([
  "draft",
  "ready",
  "failed",
]);

export function isActiveMarketingPostStatus(
  status: MarketingPostStatus,
): boolean {
  return ACTIVE_MARKETING_POST_STATUSES.has(status);
}

export function isScheduledMarketingPost(post: MarketingPost): boolean {
  return post.status === "scheduled" && Boolean(post.scheduledAt);
}

/**
 * Statuses a post may be in when it enters an external publish path.
 *
 * ================= WHY THIS IS AN ALLOW-LIST =================
 * The publish guard used to be a deny-list that rejected only `archived`,
 * which meant a post already in `posted` sailed straight back into the Graph
 * API and produced a SECOND real Facebook or Instagram post. Double-clicking
 * Publish, a browser retry on a slow response, or a back-button resubmit were
 * all enough. An allow-list fails closed instead: a status added to
 * `MarketingPostStatus` later is unpublishable until someone deliberately
 * lists it here.
 *
 * `failed` is publishable on purpose — retrying a publish that genuinely
 * failed is the whole point of that state.
 */
export const PUBLISHABLE_MARKETING_POST_STATUSES = new Set<MarketingPostStatus>(
  ["draft", "ready", "scheduled", "failed"],
);

export function isPublishableMarketingPostStatus(
  status: MarketingPostStatus,
): boolean {
  return PUBLISHABLE_MARKETING_POST_STATUSES.has(status);
}

/**
 * Why a post cannot be published, phrased for the operator. Returns null when
 * the status is publishable, so a caller reads as a plain guard.
 *
 * The `posted` message deliberately says the post already went out rather
 * than something vague: the operator's next question is always "did it
 * actually publish?", and answering it here prevents the manual re-check that
 * itself tends to end in a duplicate.
 */
export function describeUnpublishableMarketingPostStatus(
  status: MarketingPostStatus,
): string | null {
  if (isPublishableMarketingPostStatus(status)) return null;
  if (status === "posted") {
    return "This post has already been published. Duplicate it to publish again.";
  }
  if (status === "archived") {
    return "Archived posts cannot be published.";
  }
  return `Posts with status "${status}" cannot be published.`;
}

function sortMarketingPostsForTab(
  posts: MarketingPost[],
  tab: MarketingPostListTab,
): MarketingPost[] {
  if (tab === "scheduled") {
    return [...posts].sort(
      (left, right) =>
        new Date(left.scheduledAt!).getTime() -
        new Date(right.scheduledAt!).getTime(),
    );
  }

  return posts;
}

export function filterMarketingPostsByTab(
  posts: MarketingPost[],
  tab: MarketingPostListTab,
): MarketingPost[] {
  const visiblePosts = posts.filter((post) => post.deletedAt === null);
  let filtered: MarketingPost[];

  switch (tab) {
    case "active":
      filtered = visiblePosts.filter((post) =>
        isActiveMarketingPostStatus(post.status),
      );
      break;
    case "scheduled":
      filtered = visiblePosts.filter(isScheduledMarketingPost);
      break;
    case "posted":
      filtered = visiblePosts.filter((post) => post.status === "posted");
      break;
    case "archived":
      filtered = visiblePosts.filter((post) => post.status === "archived");
      break;
  }

  return sortMarketingPostsForTab(filtered, tab);
}

export function countMarketingPostsByTab(
  posts: MarketingPost[],
  tab: MarketingPostListTab,
): number {
  return filterMarketingPostsByTab(posts, tab).length;
}

export type MarketingRecurringFrequency = "weekly" | "biweekly" | "monthly";

export type MarketingRecurringOccurrences = 2 | 4 | 8 | 12;

export const MARKETING_RECURRING_FREQUENCY_OPTIONS = [
  "weekly",
  "biweekly",
  "monthly",
] as const;

export const MARKETING_RECURRING_OCCURRENCE_OPTIONS = [2, 4, 8, 12] as const;

export const MARKETING_RECURRING_FREQUENCY_LABEL_OPTIONS: {
  value: MarketingRecurringFrequency;
  label: string;
}[] = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly" },
];

export function formatMarketingRecurringFrequency(
  frequency: MarketingRecurringFrequency,
): string {
  return (
    MARKETING_RECURRING_FREQUENCY_LABEL_OPTIONS.find(
      (option) => option.value === frequency,
    )?.label ?? frequency
  );
}
