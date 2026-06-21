import "server-only";

import {
  MARKETING_POST_CONTEXT_MAX_CHARS,
  MARKETING_POST_TEXT_MAX_CHARS,
  trimAiContextText,
  trimAiText,
} from "@/lib/ai/limits";
import type { GenerateDraftTextRequest } from "@/lib/ai/types";
import type {
  MarketingPostRewriteContext,
  MarketingPostRewriteInput,
} from "@/shared/types/marketing-ai";
import { formatMarketingChannel } from "@/shared/types/marketing-post";

export const MARKETING_POST_REWRITE_AI_FEATURE = "marketing-post-rewrite";

export const INSUFFICIENT_MARKETING_POST_CONTEXT_MESSAGE =
  "Add more post text before rewriting.";

const MIN_POST_TEXT_CHARS = 10;

const MARKETING_POST_REWRITE_PROMPT = `You rewrite marketing post body text for a local field service company (HVAC, electrical, plumbing, or general trades).

Your job is to REWRITE only the post body text into polished copy suitable for manual posting by office staff. You are not posting, scheduling, or publishing anything.

Output requirements:
- Output ONLY the rewritten post body text — no headings, labels, preamble, or closing commentary
- Plain text only — no markdown, bullets, or hashtags unless they already appear in the draft body
- Do not include a separate call to action line — the user adds that separately
- Do not expand or rewrite suggested hashtags
- Tone and style should match the target channel guidance below

Channel guidance:
- Facebook: conversational, community-focused, local business feel
- Instagram: concise caption style; do not force extra hashtags
- Google Business: professional, local, trustworthy; no hashtag spam
- Website / General: clear, professional, easy to read

Rules:
- Rewrite only the post body — use title, call to action, and hashtags as context hints only
- Use only facts supported by the context below
- Do not invent customer names, street addresses, pricing, discounts, guarantees, reviews, ratings, licenses, certifications, emergency/24-7 availability, or completed-work claims not in context
- If the draft mentions customer names or street addresses, generalize or remove them (e.g. "a local homeowner", "in the area")
- Do not include ZIP codes or postal codes
- Do not mention AI, automation, or that this was generated
- Do not say the post was posted, scheduled, or published
- Do not use phrases like "Here's your post" or similar meta commentary
- You may reference the company name when provided
- When completed-job context is provided, you may reference job type and general area (city/state) only — never customer-identifying details`;

function hasMeaningfulPostText(postText: string | undefined): boolean {
  const trimmed = postText?.trim() ?? "";
  return trimmed.length >= MIN_POST_TEXT_CHARS;
}

export function hasUsefulMarketingPostRewriteContext(
  input: MarketingPostRewriteInput,
): boolean {
  return hasMeaningfulPostText(input.postText);
}

function applyMarketingPostRewriteInputLimits(
  input: MarketingPostRewriteInput,
): MarketingPostRewriteInput {
  const postText = input.postText?.trim();
  const title = input.title?.trim();
  const callToAction = input.callToAction?.trim();

  const limitedPostText = postText
    ? trimAiText(postText, MARKETING_POST_TEXT_MAX_CHARS)
    : input.postText;
  const limitedTitle = title
    ? trimAiText(title, 200)
    : input.title;
  const limitedCallToAction = callToAction
    ? trimAiText(callToAction, 300)
    : input.callToAction;

  const limitedHashtags = input.suggestedHashtags
    ?.map((tag) => tag.trim().replace(/^#+/, ""))
    .filter((tag) => tag.length > 0)
    .slice(0, 12);

  if (
    limitedPostText === input.postText &&
    limitedTitle === input.title &&
    limitedCallToAction === input.callToAction &&
    limitedHashtags === input.suggestedHashtags
  ) {
    return input;
  }

  return {
    ...input,
    postText: limitedPostText ?? input.postText,
    title: limitedTitle || undefined,
    callToAction: limitedCallToAction || undefined,
    suggestedHashtags: limitedHashtags,
  };
}

function formatCompletedJobContext(
  context: MarketingPostRewriteContext["completedJob"],
): string | null {
  if (!context) {
    return null;
  }

  const parts: string[] = [`Job type: ${context.jobType}`];

  const city = context.city?.trim();
  const state = context.state?.trim();
  if (city || state) {
    parts.push(`Service area: ${[city, state].filter(Boolean).join(", ")}`);
  }

  const completedAt = context.completedAt?.trim();
  if (completedAt) {
    parts.push(`Completed: ${completedAt.slice(0, 10)}`);
  }

  return parts.join("\n");
}

export function formatMarketingPostRewriteContext(
  input: MarketingPostRewriteInput,
  context: MarketingPostRewriteContext,
): string {
  const sections: string[] = [];

  const companyName = context.companyName?.trim();
  if (companyName) {
    sections.push(`Company: ${companyName}`);
  }

  sections.push(
    `Target channel: ${formatMarketingChannel(input.channelTarget)}`,
  );

  const title = input.title?.trim();
  if (title) {
    sections.push(`Post topic (hint only — do not output as a title line): ${title}`);
  }

  const callToAction = input.callToAction?.trim();
  if (callToAction) {
    sections.push(
      `Call to action (context only — do not include in output): ${callToAction}`,
    );
  }

  const hashtags = input.suggestedHashtags?.filter((tag) => tag.trim());
  if (hashtags && hashtags.length > 0) {
    sections.push(
      `Suggested hashtags (context only — do not rewrite or expand): ${hashtags.map((tag) => `#${tag.replace(/^#+/, "")}`).join(", ")}`,
    );
  }

  const completedJobContext = formatCompletedJobContext(context.completedJob);
  if (completedJobContext) {
    sections.push(`Completed job context (sanitized):\n${completedJobContext}`);
  }

  const postText = input.postText?.trim();
  if (postText) {
    sections.push(
      `Current post body (rewrite this — output only the improved body text):\n${postText}`,
    );
  }

  const assembled =
    sections.join("\n\n") || "No marketing post context provided.";
  return trimAiContextText(assembled, MARKETING_POST_CONTEXT_MAX_CHARS);
}

export type MarketingPostRewritePreparation =
  | { kind: "static"; draftText: string }
  | { kind: "request"; request: GenerateDraftTextRequest };

export function prepareMarketingPostRewrite(
  input: MarketingPostRewriteInput,
  companyId: string,
  userId: string,
  context: MarketingPostRewriteContext,
): MarketingPostRewritePreparation {
  const limitedInput = applyMarketingPostRewriteInputLimits(input);

  if (!hasUsefulMarketingPostRewriteContext(limitedInput)) {
    return {
      kind: "static",
      draftText: INSUFFICIENT_MARKETING_POST_CONTEXT_MESSAGE,
    };
  }

  return {
    kind: "request",
    request: buildMarketingPostRewriteRequest(
      limitedInput,
      companyId,
      userId,
      context,
    ),
  };
}

export function buildMarketingPostRewriteRequest(
  input: MarketingPostRewriteInput,
  companyId: string,
  userId: string,
  context: MarketingPostRewriteContext,
): GenerateDraftTextRequest {
  return {
    feature: MARKETING_POST_REWRITE_AI_FEATURE,
    prompt: MARKETING_POST_REWRITE_PROMPT,
    inputText: formatMarketingPostRewriteContext(input, context),
    companyId,
    userId,
  };
}
