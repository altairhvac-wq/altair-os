import "server-only";

import { SUPPORT_EMAIL } from "@/shared/lib/site/faq";
import type { LiveOnboardingInfo } from "@/shared/types/live-onboarding";

/**
 * Days after a company is created during which the dashboard shows the live
 * onboarding invitation. The Help page shows it at any time.
 */
export const LIVE_ONBOARDING_DASHBOARD_DAYS = 30;

const SCHEDULE_MAX_LENGTH = 160;

function readJoinUrl(raw: string | undefined): string | null {
  const value = raw?.trim();
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    // A meeting link is only ever opened in a browser; anything that is not
    // https is a configuration mistake, not a link to show customers.
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Reads the setup-call settings:
 *
 *   ALTAIR_LIVE_ONBOARDING_URL       the booking page for a setup call, https only
 *   ALTAIR_LIVE_ONBOARDING_SCHEDULE  plain-language hours shown next to it
 *
 * Both are optional. Without them the app still invites people to onboarding,
 * and tells them to email to set up a time.
 */
export function getLiveOnboardingInfo(): LiveOnboardingInfo {
  const schedule = process.env.ALTAIR_LIVE_ONBOARDING_SCHEDULE?.trim() ?? "";

  return {
    joinUrl: readJoinUrl(process.env.ALTAIR_LIVE_ONBOARDING_URL),
    schedule: schedule ? schedule.slice(0, SCHEDULE_MAX_LENGTH) : null,
    supportEmail: SUPPORT_EMAIL,
  };
}

/** True during a company's first LIVE_ONBOARDING_DASHBOARD_DAYS days. */
export function isWithinLiveOnboardingWindow(
  companyCreatedAt: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!companyCreatedAt) {
    return false;
  }

  const created = new Date(companyCreatedAt).getTime();
  if (Number.isNaN(created)) {
    return false;
  }

  const ageMs = now.getTime() - created;
  return ageMs >= 0 && ageMs <= LIVE_ONBOARDING_DASHBOARD_DAYS * 86_400_000;
}
