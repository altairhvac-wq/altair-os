import type {
  MarketingChannel,
  MarketingPostSource,
} from "@/shared/types/marketing-post";

export type MarketingPostRewriteMode =
  | "polish"
  | "shorter"
  | "professional"
  | "local";

export const MARKETING_POST_REWRITE_MODES: MarketingPostRewriteMode[] = [
  "polish",
  "shorter",
  "professional",
  "local",
];

export type MarketingPostRewriteInput = {
  title?: string;
  postText: string;
  channelTarget: MarketingChannel;
  callToAction?: string;
  suggestedHashtags?: string[];
  sourceType?: MarketingPostSource;
  sourceId?: string | null;
  mode?: MarketingPostRewriteMode;
};

export type MarketingPostRewriteResult = {
  error?: string;
  draftText?: string;
};

export type MarketingCompletedJobRewriteContext = {
  jobType: string;
  city: string | null;
  state: string | null;
  completedAt: string | null;
};

export type MarketingPostRewriteContext = {
  companyName: string;
  completedJob?: MarketingCompletedJobRewriteContext | null;
};

export type MarketingCompletedJobDraftGenerateInput = {
  sourceId: string;
  channelTarget: MarketingChannel;
};

export type MarketingCompletedJobDraftFields = {
  title: string;
  postText: string;
  suggestedHashtags: string[];
  callToAction: string;
  channelTarget: MarketingChannel;
};

export type MarketingCompletedJobDraftGenerateResult = {
  error?: string;
  draft?: MarketingCompletedJobDraftFields;
};

export type MarketingFounderMilestoneType =
  | "feature_launch"
  | "product_milestone"
  | "beta_update"
  | "before_after_improvement"
  | "founder_story"
  | "competitor_comparison";

export const MARKETING_FOUNDER_MILESTONE_TYPE_OPTIONS: {
  value: MarketingFounderMilestoneType;
  label: string;
}[] = [
  { value: "feature_launch", label: "Feature launch" },
  { value: "product_milestone", label: "Product milestone" },
  { value: "beta_update", label: "Beta update" },
  { value: "before_after_improvement", label: "Before/after improvement" },
  { value: "founder_story", label: "Founder story" },
  { value: "competitor_comparison", label: "Competitor comparison" },
];

export type MarketingFounderDraftGenerateInput = {
  sourceType: Extract<
    MarketingPostSource,
    "founder_milestone" | "product_update"
  >;
  milestoneTitle: string;
  milestoneType: MarketingFounderMilestoneType;
  whatChanged: string;
  whyItMatters: string;
  targetAudience?: string;
  callToAction?: string;
  tone?: string;
  channelTarget: MarketingChannel;
};

export type MarketingFounderDraftFields = MarketingCompletedJobDraftFields;

export type MarketingFounderDraftGenerateResult = {
  error?: string;
  draft?: MarketingFounderDraftFields;
};
