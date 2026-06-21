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
