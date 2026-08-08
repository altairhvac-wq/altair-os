// Marketing AI HQ domain types (client-safe).
// Architecture: docs/product/MARKETING_AI_HQ.md

export type MarketingDirectiveKind =
  | "hq_config"
  | "brand_kit"
  | "creative_direction"
  | "strategy_note";

export type MarketingItemKind =
  | "social_post"
  | "email_draft"
  | "seo_page"
  | "blog_article"
  | "video_brief"
  | "intel_digest"
  | "reply_draft"
  | "ad_proposal"
  | "strategy_report";

export type MarketingItemStatus =
  | "draft"
  | "approved"
  | "rejected"
  | "converted";

export type MarketingRunStatus = "started" | "succeeded" | "failed";

export type MarketingRunTrigger = "manual" | "cron";

/** Closed role registry — UI and engine must agree on this set. */
export const MARKETING_AI_ROLES = [
  "strategist",
  "copywriter",
  "brand_manager",
  "seo_specialist",
  "video_producer",
  "competitor_intel",
  "creative_director",
  "analytics",
  "reputation",
  "advertising",
] as const;

export type MarketingAiRole = (typeof MARKETING_AI_ROLES)[number];

export const MARKETING_RUN_KEYS = [
  "copywriter_batch",
  "strategist_weekly",
  "seo_batch",
  "video_brief",
] as const;

export type MarketingRunKey = (typeof MARKETING_RUN_KEYS)[number];

/**
 * Content objectives from the Marketing AI Foundation. Every generated item
 * carries exactly one — content never exists just to fill a calendar.
 */
export const MARKETING_CONTENT_OBJECTIVES = [
  "build_trust",
  "educate_customers",
  "generate_leads",
  "increase_reviews",
  "improve_seo",
  "increase_referrals",
  "promote_seasonal",
  "strengthen_reputation",
  "increase_retention",
  "build_authority",
] as const;

export type MarketingContentObjective =
  (typeof MARKETING_CONTENT_OBJECTIVES)[number];

export function formatMarketingObjective(value: string): string {
  return value.replace(/_/g, " ");
}

/**
 * Industry Profile from the Marketing AI Foundation. Every AI task loads
 * this before running — never assume every contractor is the same.
 * V1 storage: nested inside the hq_config directive content; graduates to
 * its own directive kind when this productizes to tenants.
 */
export type MarketingIndustryProfile = {
  /** The trade/industry (for the founder account: software for the trades). */
  industry: string;
  /** Residential / commercial / both. */
  focus: string;
  /** Business size in plain language. */
  businessSize: string;
  /** Geographic market. */
  location: string;
  /** Services offered. */
  services: string[];
  /** Ideal customer in plain language. */
  idealCustomer: string;
  /** Seasonality notes for this trade/market. */
  seasonalityNotes: string;
  /** Common customer objections. */
  commonObjections: string[];
  /** Typical job values in plain language. */
  typicalJobValues: string;
  /** Preferred marketing channels for this business. */
  preferredChannels: string[];
  /** Competitor landscape notes. */
  competitorNotes: string;
};

/** HQ config directive content — the command-center record. */
export type MarketingHqConfig = {
  /** What we are marketing and why (Altair OS itself in V1). */
  mission: string;
  /** Ideal customer profile in plain language. */
  audience: string;
  /** Positioning one-liner plus differentiators. */
  positioning: string;
  /** Current goals in plain language (signups, demos, list growth...). */
  goals: string;
  /** Channel focus labels (free-form: facebook, instagram, x, linkedin...). */
  channels: string[];
  /** How many drafts a copywriter batch should produce (1-10). */
  weeklyPostTarget: number;
  /** Industry Profile — loaded before every AI task. */
  industryProfile: MarketingIndustryProfile;
};

/** Brand kit directive content — voice every role inherits. */
export type MarketingBrandKit = {
  /** Voice and tone description. */
  voice: string;
  /** Writing style rules. */
  style: string;
  /** Claims the copy must never make (honesty rules). */
  bannedClaims: string[];
  /** Approved example hooks/angles. */
  sampleHooks: string[];
  /** Visual guidance used by briefs (colors, imagery rules). */
  visualNotes: string;
};

/** social_post item content. */
export type MarketingSocialPostContent = {
  channel: string;
  /** Foundation objective this post exists to accomplish. */
  objective: string;
  /**
   * Platform-ready upload fields keyed by the channel's registry spec
   * (see shared/types/marketing-channels.ts). Clamped to platform limits in
   * code; upload adapters read these directly.
   */
  fields: Record<string, string>;
  /** The primary field's text, denormalized for previews and hub conversion. */
  postText: string;
  hashtags: string[];
  callToAction: string;
  /** Model's one-line reason this post serves the current goals. */
  rationale: string;
};

/** seo_page / blog_article item content. */
export type MarketingSeoArticleContent = {
  pageType: "comparison" | "guide";
  /** Foundation objective this content exists to accomplish. */
  objective: string;
  targetKeyword: string;
  metaDescription: string;
  outline: string[];
  bodyMarkdown: string;
  internalLinkIdeas: string[];
};

/** video_brief item content — feeds the AltairDemoTool render pipeline. */
export type MarketingVideoBriefContent = {
  /** Target platform (youtube, tiktok, instagram, facebook). */
  platform: string;
  /** Foundation objective this video exists to accomplish. */
  objective: string;
  /** The opening hook (first 3 seconds). */
  hook: string;
  /** Ordered scenes: narration + which product screen is on camera. */
  beats: {
    narration: string;
    route: string;
    caption: string;
  }[];
  /** Closing call to action. */
  cta: string;
  thumbnailIdea: string;
  /** Platform-ready upload fields (registry-packaged: title/description/tags or caption). */
  fields: Record<string, string>;
};

/** strategy_report item content. */
export type MarketingStrategyReportContent = {
  headline: string;
  summary: string;
  /** Narrative over the computed stats it was given (never self-computed). */
  metricsNarrative: string;
  recommendations: { text: string; role: string }[];
  nextWeekFocus: string[];
};

export type MarketingItem = {
  id: string;
  companyId: string;
  kind: MarketingItemKind;
  status: MarketingItemStatus;
  role: string;
  title: string;
  bodyText: string;
  content: Record<string, unknown>;
  channelHint: string | null;
  runId: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  convertedPostId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MarketingRun = {
  id: string;
  companyId: string;
  runKey: string;
  status: MarketingRunStatus;
  trigger: MarketingRunTrigger;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  totals: Record<string, number>;
  report: Record<string, unknown> | null;
  errorSummary: string | null;
};

export type MarketingDirective = {
  id: string;
  companyId: string;
  kind: MarketingDirectiveKind;
  content: Record<string, unknown>;
  createdAt: string;
};

export const MARKETING_ITEM_KIND_OPTIONS: {
  value: MarketingItemKind;
  label: string;
}[] = [
  { value: "social_post", label: "Social post" },
  { value: "email_draft", label: "Email draft" },
  { value: "seo_page", label: "SEO page" },
  { value: "blog_article", label: "Blog article" },
  { value: "video_brief", label: "Video brief" },
  { value: "intel_digest", label: "Intel digest" },
  { value: "reply_draft", label: "Reply draft" },
  { value: "ad_proposal", label: "Ad proposal" },
  { value: "strategy_report", label: "Strategy report" },
];

export const MARKETING_ITEM_STATUS_OPTIONS: {
  value: MarketingItemStatus;
  label: string;
}[] = [
  { value: "draft", label: "Needs review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "converted", label: "Sent to Marketing Hub" },
];

export function formatMarketingItemKind(kind: MarketingItemKind): string {
  return (
    MARKETING_ITEM_KIND_OPTIONS.find((option) => option.value === kind)?.label ??
    kind
  );
}

export function formatMarketingItemStatus(status: MarketingItemStatus): string {
  return (
    MARKETING_ITEM_STATUS_OPTIONS.find((option) => option.value === status)
      ?.label ?? status
  );
}

const HQ_TEXT_MAX = 2_000;
const HQ_LIST_MAX = 12;
const HQ_LIST_ENTRY_MAX = 200;

function normalizeHqText(value: unknown, maxChars = HQ_TEXT_MAX): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().slice(0, maxChars);
}

function normalizeHqList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim().slice(0, HQ_LIST_ENTRY_MAX))
    .filter((entry) => entry.length > 0)
    .slice(0, HQ_LIST_MAX);
}

export function normalizeMarketingIndustryProfile(
  value: unknown,
): MarketingIndustryProfile {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  return {
    industry: normalizeHqText(record.industry, HQ_LIST_ENTRY_MAX),
    focus: normalizeHqText(record.focus, HQ_LIST_ENTRY_MAX),
    businessSize: normalizeHqText(record.businessSize, HQ_LIST_ENTRY_MAX),
    location: normalizeHqText(record.location, HQ_LIST_ENTRY_MAX),
    services: normalizeHqList(record.services),
    idealCustomer: normalizeHqText(record.idealCustomer),
    seasonalityNotes: normalizeHqText(record.seasonalityNotes),
    commonObjections: normalizeHqList(record.commonObjections),
    typicalJobValues: normalizeHqText(record.typicalJobValues, HQ_LIST_ENTRY_MAX),
    preferredChannels: normalizeHqList(record.preferredChannels),
    competitorNotes: normalizeHqText(record.competitorNotes),
  };
}

export function normalizeMarketingHqConfig(
  value: Record<string, unknown> | null | undefined,
): MarketingHqConfig {
  const record = value ?? {};
  const rawTarget = Number(record.weeklyPostTarget);
  const weeklyPostTarget =
    Number.isFinite(rawTarget) && rawTarget >= 1 && rawTarget <= 10
      ? Math.round(rawTarget)
      : 5;

  return {
    mission: normalizeHqText(record.mission),
    audience: normalizeHqText(record.audience),
    positioning: normalizeHqText(record.positioning),
    goals: normalizeHqText(record.goals),
    channels: normalizeHqList(record.channels),
    weeklyPostTarget,
    industryProfile: normalizeMarketingIndustryProfile(record.industryProfile),
  };
}

export function normalizeMarketingBrandKit(
  value: Record<string, unknown> | null | undefined,
): MarketingBrandKit {
  const record = value ?? {};

  return {
    voice: normalizeHqText(record.voice),
    style: normalizeHqText(record.style),
    bannedClaims: normalizeHqList(record.bannedClaims),
    sampleHooks: normalizeHqList(record.sampleHooks),
    visualNotes: normalizeHqText(record.visualNotes),
  };
}

export function isMarketingHqConfigComplete(
  config: MarketingHqConfig,
): boolean {
  return Boolean(
    config.mission.trim() &&
      config.audience.trim() &&
      config.goals.trim(),
  );
}
