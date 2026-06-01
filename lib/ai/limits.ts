import "server-only";

/** Max characters for rough technician notes in estimate AI context. */
export const ESTIMATE_NOTES_MAX_CHARS = 2_500;

/** Max characters for the full estimate AI context payload. */
export const ESTIMATE_CONTEXT_MAX_CHARS = 3_000;

/** Max characters per long text field in job summary context. */
export const JOB_SUMMARY_FIELD_MAX_CHARS = 2_000;

/** Max characters for the full job summary AI context payload. */
export const JOB_SUMMARY_CONTEXT_MAX_CHARS = 7_000;

/** Recent activities included in job summary context. */
export const JOB_SUMMARY_ACTIVITY_LIMIT = 8;

const TRUNCATION_SUFFIX = "…";

/**
 * Trim text for AI prompts. Does not throw; returns empty string for blank input.
 */
export function trimAiText(
  value: string | undefined | null,
  maxChars: number,
): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed || maxChars <= 0) {
    return "";
  }

  if (trimmed.length <= maxChars) {
    return trimmed;
  }

  const suffixLength = TRUNCATION_SUFFIX.length;
  if (maxChars <= suffixLength) {
    return trimmed.slice(0, maxChars);
  }

  return trimmed.slice(0, maxChars - suffixLength) + TRUNCATION_SUFFIX;
}

/**
 * Trim a assembled context string to a maximum length.
 */
export function trimAiContextText(context: string, maxChars: number): string {
  return trimAiText(context, maxChars);
}
