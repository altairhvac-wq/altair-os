import "server-only";

import type { AiFeatureName, GenerateDraftTextErrorCode } from "@/lib/ai/types";
import { JOB_SUMMARY_AI_FEATURE } from "@/lib/ai/job-summary";

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

  return DEFAULT_MESSAGES[code];
}

/** @deprecated Use mapAiErrorToMessage — kept for call sites migrating from actions. */
export function mapGenerateDraftTextError(
  code: GenerateDraftTextErrorCode,
  feature?: AiFeatureName,
): string {
  return mapAiErrorToMessage(code, feature);
}
