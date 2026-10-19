/**
 * Cloudflare Turnstile for the public auth forms.
 *
 * ============ WHO CHECKS THE TOKEN ============
 * Supabase does. The browser solves Turnstile and gets a single-use token;
 * the form posts it; the Server Action hands it to Supabase Auth as
 * `captchaToken`; Supabase verifies it with Cloudflare using the SECRET key,
 * which lives only in the Supabase dashboard (Authentication → Attack
 * Protection). The application never holds the secret and never calls
 * Cloudflare itself.
 *
 * ============ WHY THE ORDER OF ROLLOUT MATTERS ============
 * Supabase ignores a token while CAPTCHA protection is off, and refuses every
 * signup, password sign-in and reset WITHOUT one once it is on. So:
 *   1. deploy with NEXT_PUBLIC_TURNSTILE_SITE_KEY set (forms now send tokens),
 *   2. then switch protection on in Supabase with the matching secret.
 * Reversing the order locks everyone out until the deploy lands.
 *
 * With no site key configured the widget does not render and no token is
 * sent, which is exactly the pre-Turnstile behaviour.
 *
 * Pure module: safe in client components, server actions and node verifiers.
 */

/** The form field the widget writes its token into. */
export const CAPTCHA_FORM_FIELD = "captchaToken";

/** Inlined at build time. Public by design: a site key is not a secret. */
export const TURNSTILE_SITE_KEY: string | null =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || null;

export const isCaptchaConfigured = Boolean(TURNSTILE_SITE_KEY);

/** Origin of the Turnstile script and challenge iframe (CSP needs both). */
export const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com";

/**
 * Turnstile tokens are opaque and currently under ~2 KB. Anything far larger
 * is not a token; dropping it means Supabase sees "no token" and refuses with
 * its own captcha error rather than receiving junk.
 */
const MAX_TOKEN_LENGTH = 4096;

export function readCaptchaToken(formData: FormData): string | undefined {
  const raw = formData.get(CAPTCHA_FORM_FIELD);
  if (typeof raw !== "string") return undefined;
  const token = raw.trim();
  if (!token || token.length > MAX_TOKEN_LENGTH) return undefined;
  return token;
}

/** Supabase Auth's refusal when the token is missing, expired, reused or invalid. */
export function isCaptchaError(error: {
  code?: string | null;
  message?: string | null;
}): boolean {
  if (error.code === "captcha_failed") return true;
  return /captcha/i.test(error.message ?? "");
}

export const CAPTCHA_FAILED_MESSAGE =
  "We couldn't confirm the security check. Please wait for it to finish (or tick the box if one appears) and try again.";
