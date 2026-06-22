/**
 * SMS compliance helpers — stubs only until live sending is implemented.
 *
 * Live SMS requires:
 * - Documented customer consent before transactional/promotional texts
 * - STOP/HELP keyword handling and opt-out persistence
 * - Registered sender IDs (10DLC, toll-free verification, etc.)
 * - Delivery logging without storing unnecessary message content
 * - Rate limits and per-company quotas
 */

/** Basic E.164-ish normalization for future validation; not a full libphonenumber pass. */
export function normalizePhoneNumber(raw: string): string | null {
  const trimmed = raw.trim();

  if (!trimmed) {
    return null;
  }

  const digits = trimmed.replace(/[^\d+]/g, "");

  if (!digits) {
    return null;
  }

  if (digits.startsWith("+")) {
    const normalized = `+${digits.slice(1).replace(/\D/g, "")}`;
    return normalized.length >= 8 ? normalized : null;
  }

  const numeric = digits.replace(/\D/g, "");

  if (numeric.length === 10) {
    return `+1${numeric}`;
  }

  if (numeric.length === 11 && numeric.startsWith("1")) {
    return `+${numeric}`;
  }

  return numeric.length >= 8 ? `+${numeric}` : null;
}

/** Placeholder — always false until opt-out storage is implemented. */
export function isSmsOptedOut(_phone: string, _companyId: string): boolean {
  return false;
}

/** Placeholder footer for future compliant outbound messages. */
export function buildOptOutFooter(_companyName: string): string {
  return "Reply STOP to opt out.";
}
