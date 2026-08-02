import type { MarketingPost } from "@/shared/types/marketing-post";

/** Compose the caption/body used for copy and Meta publish. */
export function buildMarketingPostBodyText(input: {
  postText?: string | null;
  callToAction?: string | null;
  suggestedHashtags?: string[] | null;
}): string {
  const parts: string[] = [];

  const postText = input.postText?.trim() ?? "";
  if (postText) {
    parts.push(postText);
  }

  const callToAction = input.callToAction?.trim() ?? "";
  if (callToAction) {
    parts.push(callToAction);
  }

  const hashtags = (input.suggestedHashtags ?? [])
    .map((tag) => tag.trim().replace(/^#+/, ""))
    .filter(Boolean)
    .map((tag) => `#${tag}`);

  if (hashtags.length > 0) {
    parts.push(hashtags.join(" "));
  }

  return parts.join("\n\n");
}

export function buildMarketingPostBodyFromPost(post: MarketingPost): string {
  return buildMarketingPostBodyText({
    postText: post.postText,
    callToAction: post.callToAction,
    suggestedHashtags: post.suggestedHashtags,
  });
}
