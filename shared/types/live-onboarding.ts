/**
 * Live onboarding and support contacts, as shown inside the app.
 *
 * The public site promises "Live onboarding, twice every week, on Zoom ... The
 * invitation is in your workspace after you sign up." This is that invitation.
 * The values come from server configuration (lib/onboarding/live-onboarding.ts);
 * when the join link is not configured the app says how to get it by email
 * instead of showing a dead button.
 */
export type LiveOnboardingInfo = {
  /** Join link for the live onboarding sessions (https only), when configured. */
  joinUrl: string | null;
  /** Plain-language session times, e.g. "Tuesdays and Thursdays, 12:00 PM Mountain". */
  schedule: string | null;
  /** Where a customer writes for help. */
  supportEmail: string;
};
