import "server-only";

import {
  MARKETING_POST_CONTEXT_MAX_CHARS,
  MARKETING_POST_TEXT_MAX_CHARS,
  trimAiContextText,
  trimAiText,
} from "@/lib/ai/limits";
import type { GenerateDraftTextRequest } from "@/lib/ai/types";
import type {
  MarketingCompletedJobDraftFields,
  MarketingCompletedJobRewriteContext,
  MarketingFounderDraftGenerateInput,
  MarketingFounderMilestoneType,
  MarketingPostRewriteContext,
  MarketingPostRewriteInput,
  MarketingPostRewriteMode,
} from "@/shared/types/marketing-ai";
import { MARKETING_FOUNDER_MILESTONE_TYPE_OPTIONS } from "@/shared/types/marketing-ai";
import {
  formatMarketingChannel,
  type MarketingChannel,
} from "@/shared/types/marketing-post";

export const MARKETING_POST_REWRITE_AI_FEATURE = "marketing-post-rewrite";
export const MARKETING_COMPLETED_JOB_DRAFT_AI_FEATURE =
  "marketing-completed-job-draft";
export const MARKETING_FOUNDER_DRAFT_AI_FEATURE = "marketing-founder-draft";

export const INSUFFICIENT_MARKETING_POST_CONTEXT_MESSAGE =
  "Add more post text before rewriting.";

const MIN_POST_TEXT_CHARS = 10;

const MARKETING_POST_REWRITE_PROMPT_BASE = `You rewrite marketing post body text for a local field service company (HVAC, electrical, plumbing, or general trades).

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

const MARKETING_POST_REWRITE_MODE_GUIDANCE: Record<
  MarketingPostRewriteMode,
  string
> = {
  polish:
    "Rewrite mode: Polish — improve clarity and flow without changing meaning.",
  shorter:
    "Rewrite mode: Shorter — make the post more concise while preserving key facts and CTA intent.",
  professional:
    "Rewrite mode: Professional — make the post clear, trustworthy, and polished for a business audience.",
  local:
    "Rewrite mode: Local — make the post friendly and community-oriented without inventing specific local facts.",
};

export function getMarketingPostRewritePrompt(
  mode: MarketingPostRewriteMode = "polish",
): string {
  const modeGuidance =
    MARKETING_POST_REWRITE_MODE_GUIDANCE[mode] ??
    MARKETING_POST_REWRITE_MODE_GUIDANCE.polish;

  return `${MARKETING_POST_REWRITE_PROMPT_BASE}\n\n${modeGuidance}`;
}

function resolveMarketingPostRewriteMode(
  mode: MarketingPostRewriteMode | undefined,
): MarketingPostRewriteMode {
  if (mode && mode in MARKETING_POST_REWRITE_MODE_GUIDANCE) {
    return mode;
  }

  return "polish";
}

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
  const mode = resolveMarketingPostRewriteMode(input.mode);

  return {
    feature: MARKETING_POST_REWRITE_AI_FEATURE,
    prompt: getMarketingPostRewritePrompt(mode),
    inputText: formatMarketingPostRewriteContext(input, context),
    companyId,
    userId,
  };
}

const MARKETING_COMPLETED_JOB_DRAFT_PROMPT = `You write marketing post drafts for a local field service company (HVAC, electrical, plumbing, or general trades).

Your job is to generate an initial draft post from sanitized completed-job context. The user will review and edit before saving. You are not posting, scheduling, or publishing anything.

Output requirements:
- Output ONLY a single valid JSON object — no markdown code fences, headings, labels, preamble, or closing commentary
- Use exactly these keys: title, post_text, suggested_hashtags, call_to_action, channel_target
- title: short internal label for the draft (not the social post headline)
- post_text: the main post body copy, plain text, suitable for manual copy/paste
- suggested_hashtags: JSON array of hashtag strings without the # prefix (0–6 tags)
- call_to_action: a clear, concise CTA line the user can append or edit separately
- channel_target: one of facebook, instagram, google_business, website, general — match the target channel in context when sensible

Channel guidance:
- Facebook: conversational, community-focused, local business feel
- Instagram: concise caption style; keep hashtags minimal
- Google Business: professional, local, trustworthy; usually no hashtags
- Website / General: clear, professional, easy to read

Rules:
- Use ONLY facts from the context below: job type, city, state, completion date, company name, and target channel
- Do NOT mention customer names, street addresses, phone numbers, emails, or private notes
- Do NOT invent review quotes, before/after photos, discounts, guarantees, certifications, licenses, or emergency/24-7 availability
- Do NOT claim the post was published, scheduled, or posted
- Do NOT mention AI, automation, or that this was generated
- Do NOT use phrases like "Here's your post" or similar meta commentary
- Reference the company name when provided
- You may reference job type and general area (city/state) only
- Keep copy editable, professional, and useful for a local HVAC/trades Facebook-style post
- Include a clear call to action in call_to_action`;

export type MarketingCompletedJobDraftContext = {
  companyName: string;
  channelTarget: MarketingChannel;
  completedJob: MarketingCompletedJobRewriteContext;
};

export function formatMarketingCompletedJobDraftContext(
  context: MarketingCompletedJobDraftContext,
): string {
  const sections: string[] = [];

  const companyName = context.companyName?.trim();
  if (companyName) {
    sections.push(`Company: ${companyName}`);
  }

  sections.push(
    `Target channel: ${formatMarketingChannel(context.channelTarget)}`,
  );

  const completedJobContext = formatCompletedJobContext(context.completedJob);
  if (completedJobContext) {
    sections.push(`Completed job context (sanitized):\n${completedJobContext}`);
  }

  const assembled =
    sections.join("\n\n") || "No completed job context provided.";
  return trimAiContextText(assembled, MARKETING_POST_CONTEXT_MAX_CHARS);
}

export type MarketingCompletedJobDraftPreparation =
  | { kind: "static"; message: string }
  | { kind: "request"; request: GenerateDraftTextRequest };

export function prepareMarketingCompletedJobDraft(
  context: MarketingCompletedJobDraftContext,
  companyId: string,
  userId: string,
): MarketingCompletedJobDraftPreparation {
  const jobType = context.completedJob.jobType?.trim();
  if (!jobType) {
    return {
      kind: "static",
      message: "The completed job is no longer available for draft generation.",
    };
  }

  return {
    kind: "request",
    request: buildMarketingCompletedJobDraftRequest(
      context,
      companyId,
      userId,
    ),
  };
}

export function buildMarketingCompletedJobDraftRequest(
  context: MarketingCompletedJobDraftContext,
  companyId: string,
  userId: string,
): GenerateDraftTextRequest {
  return {
    feature: MARKETING_COMPLETED_JOB_DRAFT_AI_FEATURE,
    prompt: MARKETING_COMPLETED_JOB_DRAFT_PROMPT,
    inputText: formatMarketingCompletedJobDraftContext(context),
    companyId,
    userId,
  };
}

const VALID_MARKETING_CHANNELS = new Set<MarketingChannel>([
  "facebook",
  "instagram",
  "google_business",
  "website",
  "general",
]);

function stripJsonCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }
  return trimmed;
}

function normalizeGeneratedHashtags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((tag) => tag.trim().replace(/^#+/, ""))
    .filter((tag) => tag.length > 0)
    .slice(0, 12);
}

function resolveGeneratedChannelTarget(
  value: unknown,
  fallback: MarketingChannel,
): MarketingChannel {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toLowerCase().replace(/\s+/g, "_");
  if (VALID_MARKETING_CHANNELS.has(normalized as MarketingChannel)) {
    return normalized as MarketingChannel;
  }

  return fallback;
}

export function parseMarketingCompletedJobDraftResponse(
  draftText: string,
  fallbackChannel: MarketingChannel,
): MarketingCompletedJobDraftFields | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(stripJsonCodeFence(draftText));
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  const record = parsed as Record<string, unknown>;
  const title = typeof record.title === "string" ? record.title.trim() : "";
  const postText =
    typeof record.post_text === "string" ? record.post_text.trim() : "";
  const callToAction =
    typeof record.call_to_action === "string"
      ? record.call_to_action.trim()
      : "";

  if (!title || !postText) {
    return null;
  }

  const limitedPostText = trimAiText(postText, MARKETING_POST_TEXT_MAX_CHARS);
  const limitedTitle = trimAiText(title, 200);
  const limitedCallToAction = callToAction
    ? trimAiText(callToAction, 300)
    : "";

  return {
    title: limitedTitle,
    postText: limitedPostText,
    suggestedHashtags: normalizeGeneratedHashtags(record.suggested_hashtags),
    callToAction: limitedCallToAction,
    channelTarget: resolveGeneratedChannelTarget(
      record.channel_target,
      fallbackChannel,
    ),
  };
}

const MARKETING_FOUNDER_DRAFT_PROMPT = `You write founder-led marketing post drafts for Altair OS — field-service software built for HVAC and trades contractors.

Your job is to generate an initial draft post from structured founder inputs. The user will review and edit before saving. You are not posting, scheduling, or publishing anything.

Output requirements:
- Output ONLY a single valid JSON object — no markdown code fences, headings, labels, preamble, or closing commentary
- Use exactly these keys: title, post_text, suggested_hashtags, call_to_action, channel_target
- title: short internal label for the draft (not the social post headline)
- post_text: the main post body copy, plain text, suitable for manual copy/paste as a Facebook business page post
- suggested_hashtags: JSON array of hashtag strings without the # prefix (0–6 tags)
- call_to_action: a clear, concise CTA line the user can append or edit separately
- channel_target: one of facebook, instagram, google_business, website, general — match the target channel in context when sensible

Voice and style:
- Honest, founder-led, practical — not hypey or salesy
- Readable for small HVAC and trades business owners
- Translate technical progress into business-owner benefits
- Good angles include: "I just shipped another piece of Altair OS…", "Small contractors should not need five different tools…", "This week's build moved Altair closer to helping businesses market themselves…", "I'm looking for a few business owners willing to test this…"
- Include a clear CTA in call_to_action

Rules:
- Use ONLY facts from the structured inputs below
- Do NOT invent customers, revenue, testimonials, or user counts
- Do NOT claim beta users unless explicitly provided in the inputs
- Do NOT claim integrations are live unless explicitly provided
- Do NOT claim Facebook, Instagram, or Google publishing is live unless explicitly provided
- Do NOT exaggerate capabilities or market position
- Do NOT mention private repo details, internal codenames, or unreleased roadmap items not in the inputs
- Do NOT mention AI, automation, or that this was generated
- Do NOT claim the post was published, scheduled, or posted
- Do NOT use phrases like "Here's your post" or similar meta commentary
- Keep copy editable, clear, and useful for a Facebook-style founder update`;

const VALID_FOUNDER_MILESTONE_TYPES = new Set<MarketingFounderMilestoneType>(
  MARKETING_FOUNDER_MILESTONE_TYPE_OPTIONS.map((option) => option.value),
);

function formatFounderMilestoneTypeLabel(
  milestoneType: MarketingFounderMilestoneType,
): string {
  return (
    MARKETING_FOUNDER_MILESTONE_TYPE_OPTIONS.find(
      (option) => option.value === milestoneType,
    )?.label ?? milestoneType
  );
}

function applyMarketingFounderDraftInputLimits(
  input: MarketingFounderDraftGenerateInput,
): MarketingFounderDraftGenerateInput {
  return {
    ...input,
    milestoneTitle: input.milestoneTitle?.trim()
      ? trimAiText(input.milestoneTitle.trim(), 200)
      : "",
    whatChanged: input.whatChanged?.trim()
      ? trimAiText(input.whatChanged.trim(), 1500)
      : "",
    whyItMatters: input.whyItMatters?.trim()
      ? trimAiText(input.whyItMatters.trim(), 1500)
      : "",
    targetAudience: input.targetAudience?.trim()
      ? trimAiText(input.targetAudience.trim(), 300)
      : input.targetAudience,
    callToAction: input.callToAction?.trim()
      ? trimAiText(input.callToAction.trim(), 300)
      : input.callToAction,
    tone: input.tone?.trim()
      ? trimAiText(input.tone.trim(), 300)
      : input.tone,
  };
}

export function formatMarketingFounderDraftContext(
  input: MarketingFounderDraftGenerateInput,
): string {
  const limited = applyMarketingFounderDraftInputLimits(input);
  const sections: string[] = [];

  sections.push(`Post source: ${limited.sourceType.replace(/_/g, " ")}`);
  sections.push(`Milestone title: ${limited.milestoneTitle}`);
  sections.push(
    `Milestone type: ${formatFounderMilestoneTypeLabel(limited.milestoneType)}`,
  );
  sections.push(`What changed:\n${limited.whatChanged}`);
  sections.push(`Why it matters:\n${limited.whyItMatters}`);

  const audience =
    limited.targetAudience?.trim() ||
    "small HVAC and trades business owners";
  sections.push(`Target audience: ${audience}`);

  const cta =
    limited.callToAction?.trim() ||
    "looking for a few founding companies / beta testers";
  sections.push(`Desired call to action: ${cta}`);

  const tone =
    limited.tone?.trim() ||
    "honest founder update, practical, not hypey";
  sections.push(`Tone: ${tone}`);

  sections.push(
    `Target channel: ${formatMarketingChannel(limited.channelTarget)}`,
  );

  const assembled = sections.join("\n\n");
  return trimAiContextText(assembled, MARKETING_POST_CONTEXT_MAX_CHARS);
}

export type MarketingFounderDraftPreparation =
  | { kind: "static"; message: string }
  | { kind: "request"; request: GenerateDraftTextRequest };

export function prepareMarketingFounderDraft(
  input: MarketingFounderDraftGenerateInput,
  companyId: string,
  userId: string,
): MarketingFounderDraftPreparation {
  const limited = applyMarketingFounderDraftInputLimits(input);

  if (!limited.milestoneTitle) {
    return {
      kind: "static",
      message: "Add a milestone title before generating a draft.",
    };
  }

  if (!VALID_FOUNDER_MILESTONE_TYPES.has(limited.milestoneType)) {
    return {
      kind: "static",
      message: "Choose a valid milestone type.",
    };
  }

  if (!limited.whatChanged?.trim()) {
    return {
      kind: "static",
      message: "Describe what changed before generating a draft.",
    };
  }

  if (!limited.whyItMatters?.trim()) {
    return {
      kind: "static",
      message: "Explain why it matters before generating a draft.",
    };
  }

  return {
    kind: "request",
    request: buildMarketingFounderDraftRequest(limited, companyId, userId),
  };
}

export function buildMarketingFounderDraftRequest(
  input: MarketingFounderDraftGenerateInput,
  companyId: string,
  userId: string,
): GenerateDraftTextRequest {
  return {
    feature: MARKETING_FOUNDER_DRAFT_AI_FEATURE,
    prompt: MARKETING_FOUNDER_DRAFT_PROMPT,
    inputText: formatMarketingFounderDraftContext(input),
    companyId,
    userId,
  };
}

export function parseMarketingFounderDraftResponse(
  draftText: string,
  fallbackChannel: MarketingChannel,
): MarketingCompletedJobDraftFields | null {
  return parseMarketingCompletedJobDraftResponse(draftText, fallbackChannel);
}
