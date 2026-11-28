/**
 * The setup call and support contacts, as shown inside the app.
 *
 * The public site promises every customer "a free one-on-one setup call on
 * Zoom, booked at a time that suits you ... You book it from your workspace
 * after you sign up." This is where they book it.
 *
 * It was first written for fixed group sessions twice a week. The owner
 * changed that on 2026-11-12, before any customer existed to attend one: a
 * customer now books their own call from a booking page. The field names
 * kept their original spelling; `joinUrl` is the booking link.
 *
 * The values come from server configuration (lib/onboarding/live-onboarding.ts);
 * when the link is not configured the app says how to book by email instead
 * of showing a dead button.
 */
export type LiveOnboardingInfo = {
  /** Booking page for the setup call (https only), when configured. */
  joinUrl: string | null;
  /** Plain-language hours calls can be booked in, e.g. "Weekdays, 5 to 7 PM Mountain". */
  schedule: string | null;
  /** Where a customer writes for help. */
  supportEmail: string;
};
