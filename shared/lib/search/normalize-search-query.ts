import { normalizePhoneDigits } from "@/shared/lib/phone";

/**
 * Normalize a user search query for comparison.
 * Preserves email local/domain shape; collapses punctuation in identifiers.
 */
export function normalizeSearchQuery(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return "";

  // Keep emails mostly intact (only lowercase + trim already applied).
  if (trimmed.includes("@") && !trimmed.includes(" ")) {
    return trimmed.replace(/\s+/g, "");
  }

  return trimmed
    .replace(/[_\u2013\u2014]/g, "-")
    .replace(/[^a-z0-9@.+-\s]/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Compact alphanumeric form for identifier comparisons (job1001, inv100101). */
export function compactSearchIdentifier(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function normalizeSearchPhone(raw: string): string {
  return normalizePhoneDigits(raw);
}

export function normalizeSearchField(raw: string | null | undefined): string {
  return normalizeSearchQuery(raw ?? "");
}
