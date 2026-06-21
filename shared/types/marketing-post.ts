export type MarketingPostStatus =
  | "draft"
  | "ready"
  | "scheduled"
  | "posted"
  | "failed"
  | "archived";

export type MarketingChannel =
  | "facebook"
  | "instagram"
  | "google_business"
  | "website"
  | "general";

export type MarketingPostSource =
  | "manual"
  | "completed_job"
  | "seasonal"
  | "service_area"
  | "project_gallery"
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

export const MARKETING_CHANNEL_OPTIONS: {
  value: MarketingChannel;
  label: string;
}[] = [
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
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
  let filtered: MarketingPost[];

  switch (tab) {
    case "active":
      filtered = posts.filter((post) => isActiveMarketingPostStatus(post.status));
      break;
    case "scheduled":
      filtered = posts.filter(isScheduledMarketingPost);
      break;
    case "posted":
      filtered = posts.filter((post) => post.status === "posted");
      break;
    case "archived":
      filtered = posts.filter((post) => post.status === "archived");
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
