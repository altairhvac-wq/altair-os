import type {
  MarketingChannel,
  MarketingPostSource,
} from "@/shared/types/marketing-post";

export type MarketingPostRewriteInput = {
  title?: string;
  postText: string;
  channelTarget: MarketingChannel;
  callToAction?: string;
  suggestedHashtags?: string[];
  sourceType?: MarketingPostSource;
  sourceId?: string | null;
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
