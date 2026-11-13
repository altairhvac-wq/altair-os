/**
 * Words and paths for the Resource Center email list. Pure (no imports), so
 * the form, the server and the verifier all read the same sentence.
 *
 * The consent sentence is stored with each subscriber row exactly as it was
 * shown, so "what did this person agree to" has an answer later. Change the
 * sentence here and new rows carry the new wording; old rows keep theirs.
 */

export const RESOURCE_LIST_CONSENT_TEXT =
  "Also email me when a new calculator or guide comes out. About one email a month. Unsubscribe any time.";

export const RESOURCE_EMAIL_API_PATH = "/api/resources/email-results";
export const RESOURCE_EMAIL_CONFIRM_PATH = "/resources/email/confirm";
export const RESOURCE_EMAIL_UNSUBSCRIBE_PATH = "/resources/email/unsubscribe";

/** One address, lower-cased and trimmed; null when it is not shaped like one. */
export function normalizeListEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length < 6 || email.length > 254) return null;
  if (!/^[^@\s<>"',;]+@[^@\s<>"',;]+\.[a-z0-9-]{2,}$/.test(email)) return null;
  return email;
}
