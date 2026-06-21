import "server-only";

import type { AiFeatureName, GenerateDraftTextErrorCode } from "@/lib/ai/types";
import { COMPLETION_NOTES_AI_FEATURE } from "@/lib/ai/completion-notes";
import { INVOICE_MESSAGE_AI_FEATURE } from "@/lib/ai/invoice-message";
import { JOB_SUMMARY_AI_FEATURE } from "@/lib/ai/job-summary";
import { LEAD_FOLLOW_UP_AI_FEATURE } from "@/lib/ai/lead-follow-up";
import {
  MARKETING_COMPLETED_JOB_DRAFT_AI_FEATURE,
  MARKETING_POST_REWRITE_AI_FEATURE,
} from "@/lib/ai/marketing-post";

export type AiUserErrorCode =
  | GenerateDraftTextErrorCode
  | "rate_limited"
  | "insufficient_context";

const DEFAULT_MESSAGES: Record<AiUserErrorCode, string> = {
  ai_disabled: "AI drafting is not configured yet.",
  missing_api_key: "AI drafting is not configured yet.",
  rate_limited: "Please wait a moment before using AI again.",
  insufficient_context: "Add a few notes or line items before using AI.",
  provider_error: "Could not complete the AI request. Try again.",
  empty_response: "Could not complete the AI request. Try again.",
};

const FEATURE_INSUFFICIENT_CONTEXT: Partial<Record<AiFeatureName, string>> = {
  [JOB_SUMMARY_AI_FEATURE]:
    "There is not enough job information to summarize yet.",
  [INVOICE_MESSAGE_AI_FEATURE]:
    "There is not enough invoice information to draft a message yet.",
  [COMPLETION_NOTES_AI_FEATURE]:
    "Add completion notes before polishing.",
  [MARKETING_POST_REWRITE_AI_FEATURE]:
    "Add more post text before rewriting.",
  [MARKETING_COMPLETED_JOB_DRAFT_AI_FEATURE]:
    "The completed job is no longer available for draft generation.",
};

const FEATURE_CONFIG_ERROR: Partial<Record<AiFeatureName, string>> = {
  [INVOICE_MESSAGE_AI_FEATURE]:
    "AI invoice messages are not configured yet.",
  [LEAD_FOLLOW_UP_AI_FEATURE]:
    "AI follow-up drafting is not configured yet.",
  [MARKETING_POST_REWRITE_AI_FEATURE]:
    "AI post rewriting is not configured yet.",
  [MARKETING_COMPLETED_JOB_DRAFT_AI_FEATURE]:
    "AI draft generation is not configured yet.",
};

const FEATURE_PROVIDER_ERROR: Partial<Record<AiFeatureName, string>> = {
  [INVOICE_MESSAGE_AI_FEATURE]:
    "Could not draft the invoice message. Try again.",
  [COMPLETION_NOTES_AI_FEATURE]:
    "Could not polish the completion notes. Try again.",
  [LEAD_FOLLOW_UP_AI_FEATURE]:
    "Could not generate a follow-up right now. Try again in a moment.",
  [MARKETING_POST_REWRITE_AI_FEATURE]:
    "Could not rewrite the post. Try again.",
  [MARKETING_COMPLETED_JOB_DRAFT_AI_FEATURE]:
    "Could not generate the draft. Try again.",
};

/**
 * Map AI error codes to safe, user-facing messages. Never includes provider,
 * model, stack traces, or API response details.
 */
export function mapAiErrorToMessage(
  code: AiUserErrorCode,
  feature?: AiFeatureName,
): string {
  if (code === "insufficient_context" && feature) {
    return (
      FEATURE_INSUFFICIENT_CONTEXT[feature] ??
      DEFAULT_MESSAGES.insufficient_context
    );
  }

  if (
    feature &&
    (code === "ai_disabled" || code === "missing_api_key") &&
    FEATURE_CONFIG_ERROR[feature]
  ) {
    return FEATURE_CONFIG_ERROR[feature]!;
  }

  if (
    feature &&
    (code === "provider_error" || code === "empty_response") &&
    FEATURE_PROVIDER_ERROR[feature]
  ) {
    return FEATURE_PROVIDER_ERROR[feature]!;
  }

  return DEFAULT_MESSAGES[code];
}

/** @deprecated Use mapAiErrorToMessage — kept for call sites migrating from actions. */
export function mapGenerateDraftTextError(
  code: GenerateDraftTextErrorCode,
  feature?: AiFeatureName,
): string {
  return mapAiErrorToMessage(code, feature);
}
