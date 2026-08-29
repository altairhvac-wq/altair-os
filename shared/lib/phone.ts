export function normalizePhoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Display formatting for a stored phone number.
 *
 * Numbers arrive from imports, manual entry, and third-party exports, so the
 * stored value may be anything from "7075902564" to "+1 (707) 590-2564".
 * Renders NANP numbers as "(707) 590-2564" (or "+1 (707) 590-2564" when a
 * leading country code is present) and returns anything else unchanged —
 * international and partial numbers are shown as entered rather than being
 * mangled into a US shape.
 */
export function formatPhoneForDisplay(value: string | null | undefined): string {
  const raw = value?.trim() ?? "";
  if (!raw) {
    return "";
  }

  const digits = normalizePhoneDigits(raw);

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    const national = digits.slice(1);
    return `+1 (${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}`;
  }

  return raw;
}

export function phonesMatch(left: string, right: string): boolean {
  const leftDigits = normalizePhoneDigits(left);
  const rightDigits = normalizePhoneDigits(right);

  if (!leftDigits || !rightDigits) {
    return false;
  }

  if (leftDigits === rightDigits) {
    return true;
  }

  const minLength = 10;
  if (leftDigits.length >= minLength && rightDigits.length >= minLength) {
    return leftDigits.slice(-minLength) === rightDigits.slice(-minLength);
  }

  return false;
}
