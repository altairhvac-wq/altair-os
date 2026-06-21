import type {
  MarketingFounderMilestoneType,
} from "@/shared/types/marketing-ai";
import type { MarketingChannel, MarketingPostSource } from "@/shared/types/marketing-post";
import type { MarketingCompletedJobPickerItem } from "@/shared/types/marketing-completed-job";

export type MarketingPostTemplate = {
  id: string;
  title: string;
  description: string;
  channelTarget: MarketingChannel;
  postText: string;
  suggestedHashtags: string;
  callToAction: string;
};

export type MarketingPostDraftStarter = {
  title: string;
  channelTarget: MarketingChannel;
  postText: string;
  suggestedHashtags: string;
  callToAction: string;
};

export type MarketingCompletedJobDraftStarter = MarketingPostDraftStarter & {
  sourceType: "completed_job";
  sourceId: string;
};

export type MarketingFounderSourceType = Extract<
  MarketingPostSource,
  "founder_milestone" | "product_update"
>;

export type MarketingFounderTemplate = {
  id: string;
  title: string;
  description: string;
  sourceType: MarketingFounderSourceType;
  milestoneType: MarketingFounderMilestoneType;
  channelTarget: MarketingChannel;
  postText: string;
  suggestedHashtags: string;
  callToAction: string;
};

export type MarketingFounderDraftStarter = MarketingPostDraftStarter & {
  sourceType: MarketingFounderSourceType;
  milestoneType: MarketingFounderMilestoneType;
};

export const MARKETING_POST_TEMPLATES: MarketingPostTemplate[] = [
  {
    id: "seasonal-hvac-reminder",
    title: "Seasonal HVAC reminder",
    description: "General · seasonal maintenance",
    channelTarget: "general",
    postText:
      "Utah weather can change fast. If your AC or furnace has been struggling, now is a good time to schedule maintenance before peak season.",
    suggestedHashtags: "#hvac #homecomfort #maintenance",
    callToAction: "Message us to schedule a tune-up.",
  },
  {
    id: "service-area-post",
    title: "Local HVAC service area post",
    description: "Facebook · local service",
    channelTarget: "facebook",
    postText:
      "We're helping homeowners in your area with HVAC service, repairs, maintenance, and replacements. If your system needs attention, we're ready to help.",
    suggestedHashtags: "#hvacservice #localbusiness #homecomfort",
    callToAction: "Reach out today to schedule service.",
  },
  {
    id: "general-trust-post",
    title: "Straightforward HVAC service",
    description: "General · trust and clarity",
    channelTarget: "general",
    postText:
      "Heating and cooling problems are stressful enough. Our goal is to keep the process simple with clear communication, honest recommendations, and dependable service.",
    suggestedHashtags: "#hvac #smallbusiness #homecomfort",
    callToAction: "Contact us when your system needs attention.",
  },
  {
    id: "maintenance-reminder",
    title: "Maintenance reminder",
    description: "Google Business · maintenance",
    channelTarget: "google_business",
    postText:
      "Regular HVAC maintenance can help catch small issues before they turn into bigger problems. If your system has not been checked recently, now is a good time to get on the schedule.",
    suggestedHashtags: "#hvacmaintenance #homecomfort",
    callToAction: "Book your maintenance visit today.",
  },
];

export const FOUNDER_MARKETING_TEMPLATES: MarketingFounderTemplate[] = [
  {
    id: "founder-feature-launch",
    title: "Feature launch",
    description: "Facebook · new capability shipped",
    sourceType: "product_update",
    milestoneType: "feature_launch",
    channelTarget: "facebook",
    postText:
      "We just shipped [feature name] in Altair OS.\n\nIf you run an HVAC shop, you know how much time gets lost jumping between dispatch, estimates, invoices, and follow-ups. This update is meant to tighten that loop — [one sentence on what it does for a contractor].\n\nStill building in the open. If you want to see it, comment or DM me and I'll walk you through it.",
    suggestedHashtags: "#hvac #smallbusiness #contractorlife #fieldservice",
    callToAction: "Comment or message me if you want a look.",
  },
  {
    id: "founder-product-milestone",
    title: "Product milestone",
    description: "Facebook · build progress update",
    sourceType: "founder_milestone",
    milestoneType: "product_milestone",
    channelTarget: "facebook",
    postText:
      "Quick Altair OS milestone: [what you shipped or finished this week].\n\nI'm building this because most field-service software feels like it was designed for a desk, not for a truck. Every module we finish is one less place a contractor has to patch together with spreadsheets and group texts.\n\nMore to come. If you're curious what we're working on next, follow along — I'll keep posting updates here.",
    suggestedHashtags: "#hvac #contractors #buildinpublic #smallbusiness",
    callToAction: "Follow for the next update.",
  },
  {
    id: "founder-beta-tester-request",
    title: "Beta tester request",
    description: "Facebook · early access invite",
    sourceType: "founder_milestone",
    milestoneType: "beta_update",
    channelTarget: "facebook",
    postText:
      "I'm looking for a handful of HVAC contractors to help test Altair OS before a wider launch.\n\nYou'd get early access to [module or workflow — dispatch, estimates, invoicing, etc.]. In return, I need honest feedback: what's confusing, what's missing, what would actually save you time on a busy day.\n\nNo pitch deck. No fake urgency. Just a founder who wants to build something that works in the field.\n\nIf that sounds like you, comment or DM me with your company name and what you'd want to test first.",
    suggestedHashtags: "#hvac #beta #contractorlife #smallbusiness",
    callToAction: "Comment or DM if you want early access.",
  },
  {
    id: "founder-before-after",
    title: "Before/after improvement",
    description: "Facebook · UI or workflow upgrade",
    sourceType: "product_update",
    milestoneType: "before_after_improvement",
    channelTarget: "facebook",
    postText:
      "Before vs. after on [screen or workflow name] in Altair OS.\n\nBefore: [what was clunky — too many taps, hard to read on mobile, missing context, etc.]\nAfter: [what changed — cleaner layout, faster path, less scrolling, etc.]\n\nSmall UI changes add up when your techs are checking jobs between calls. This one was worth the extra polish.\n\n[Screenshot note: attach your before/after image when you post.]",
    suggestedHashtags: "#hvac #ux #contractors #fieldservice",
    callToAction: "Want to see the full flow? Message me.",
  },
  {
    id: "founder-story",
    title: "Founder story",
    description: "Facebook · why Altair OS exists",
    sourceType: "founder_milestone",
    milestoneType: "founder_story",
    channelTarget: "facebook",
    postText:
      "Why I'm building Altair OS.\n\nI've spent time around HVAC shops — the dispatch chaos, the estimate follow-ups that slip, the invoice that sits because everyone's already on the next job. The tools exist, but they rarely feel like they were built for how contractors actually work.\n\nAltair OS is my attempt to fix that: one system for the office and the field, without the bloat.\n\nI'm early in the journey. No big claims — just steady progress and a product I'm willing to use myself. If you run a shop and want software that respects your time, I'd love to hear what you'd need first.",
    suggestedHashtags: "#hvac #founder #smallbusiness #contractorlife",
    callToAction: "Tell me what your shop struggles with most.",
  },
  {
    id: "founder-competitor-comparison",
    title: "Competitor comparison",
    description: "Facebook · honest field-service software angle",
    sourceType: "product_update",
    milestoneType: "competitor_comparison",
    channelTarget: "facebook",
    postText:
      "If you've looked at Jobber, Housecall Pro, or ServiceTitan for your HVAC shop, you already know the tradeoffs: price, complexity, features you'll never touch, and setup that takes weeks.\n\nAltair OS is built narrower on purpose — dispatch, jobs, estimates, invoicing, and the basics a contractor needs without paying for an enterprise stack.\n\nI'm not claiming we're a full replacement for everyone. I am saying contractors deserve an option that feels modern, honest, and sized for a growing shop.\n\n[Add your founding/beta pricing or offer here if you have one.]",
    suggestedHashtags: "#hvac #contractors #fieldservice #smallbusiness",
    callToAction: "Curious how we compare for your shop? Message me.",
  },
];

export function marketingPostTemplateToDraftStarter(
  template: MarketingPostTemplate,
): MarketingPostDraftStarter {
  return {
    title: template.title,
    channelTarget: template.channelTarget,
    postText: template.postText,
    suggestedHashtags: template.suggestedHashtags,
    callToAction: template.callToAction,
  };
}

export function marketingFounderTemplateToDraftStarter(
  template: MarketingFounderTemplate,
): MarketingFounderDraftStarter {
  return {
    title: template.title,
    channelTarget: template.channelTarget,
    postText: template.postText,
    suggestedHashtags: template.suggestedHashtags,
    callToAction: template.callToAction,
    sourceType: template.sourceType,
    milestoneType: template.milestoneType,
  };
}

const MAX_SAFE_JOB_TYPE_LENGTH = 80;

function normalizeCompletedJobType(jobType: string | null | undefined): string {
  const trimmed = jobType?.trim() ?? "";
  if (!trimmed || trimmed.length > MAX_SAFE_JOB_TYPE_LENGTH) {
    return "HVAC service";
  }
  return trimmed;
}

function formatCompletedJobLocation(
  city: string | null | undefined,
  state: string | null | undefined,
): { cityLabel: string; locationLabel: string } {
  const normalizedCity = city?.trim() ?? "";
  const normalizedState = state?.trim() ?? "";

  if (normalizedCity && normalizedState) {
    return {
      cityLabel: normalizedCity,
      locationLabel: `${normalizedCity}, ${normalizedState}`,
    };
  }

  if (normalizedCity) {
    return {
      cityLabel: normalizedCity,
      locationLabel: normalizedCity,
    };
  }

  if (normalizedState) {
    return {
      cityLabel: "your area",
      locationLabel: normalizedState,
    };
  }

  return {
    cityLabel: "your area",
    locationLabel: "your area",
  };
}

export function buildCompletedJobDraftStarter({
  job,
  companyName,
  channel,
}: {
  job: MarketingCompletedJobPickerItem;
  companyName: string;
  channel: MarketingChannel;
}): MarketingCompletedJobDraftStarter {
  const jobType = normalizeCompletedJobType(job.jobType);
  const { cityLabel, locationLabel } = formatCompletedJobLocation(
    job.city,
    job.state,
  );
  const company = companyName.trim() || "our team";

  switch (channel) {
    case "facebook":
      return {
        title: `${cityLabel} ${jobType} — recent job`,
        channelTarget: "facebook",
        postText: `Another job wrapped up in ${locationLabel}. We helped a local homeowner with ${jobType}. Proud to keep homes comfortable in our community.`,
        suggestedHashtags: "#localbusiness #hvac #homecomfort",
        callToAction: "Message us to schedule your next service visit.",
        sourceType: "completed_job",
        sourceId: job.id,
      };
    case "google_business":
      return {
        title: `${jobType} completed in ${cityLabel}`,
        channelTarget: "google_business",
        postText: `Recent service call in ${locationLabel}: ${jobType}. If your system needs maintenance or repair, ${company} is here to help.`,
        suggestedHashtags: "",
        callToAction: "Call or book online today.",
        sourceType: "completed_job",
        sourceId: job.id,
      };
    default:
      return {
        title: `Completed job — ${cityLabel}`,
        channelTarget: channel,
        postText: `We recently completed ${jobType} work in ${locationLabel}. If your system needs attention, reach out to schedule service with ${company}.`,
        suggestedHashtags: "#hvac #homeservice",
        callToAction: "Contact us when you're ready to get on the schedule.",
        sourceType: "completed_job",
        sourceId: job.id,
      };
  }
}
