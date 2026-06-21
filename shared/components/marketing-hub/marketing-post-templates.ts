import type { MarketingChannel } from "@/shared/types/marketing-post";
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
