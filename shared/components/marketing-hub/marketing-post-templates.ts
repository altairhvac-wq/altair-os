import type { MarketingChannel } from "@/shared/types/marketing-post";

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
