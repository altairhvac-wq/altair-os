/**
 * Helpers for Facebook Page connection metadata persisted at Connect time.
 * Tokens never live here — only non-secret Graph identifiers.
 */

export function getFacebookPageInstagramBusinessAccountId(
  metadata: Record<string, unknown> | null | undefined,
): string | null {
  if (!metadata) {
    return null;
  }

  const direct = metadata.instagramBusinessAccountId;
  if (typeof direct === "string" && direct.trim()) {
    return direct.trim();
  }

  const nested = metadata.instagram_business_account;
  if (
    nested &&
    typeof nested === "object" &&
    "id" in nested &&
    typeof (nested as { id?: unknown }).id === "string"
  ) {
    const id = (nested as { id: string }).id.trim();
    return id || null;
  }

  return null;
}
