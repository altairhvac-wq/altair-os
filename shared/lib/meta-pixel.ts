/**
 * Meta Pixel helpers for Altair OS.
 *
 * Future Lead events must fire only after a demo-request or contact/signup
 * submission has been successfully accepted by the server — never on form
 * open, button click, submit start, or failed submission.
 *
 * Example (do not include PII):
 *   metaPixel.event("Lead", { content_name: "Demo Request" })
 */

export type MetaStandardEvent =
  | "PageView"
  | "Lead"
  | "ViewContent"
  | "CompleteRegistration"
  | "Schedule"
  | "Contact";

function getFbq(): FacebookPixel | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  return window.fbq;
}

/** Track a standard PageView. No-ops when the Pixel is unavailable. */
export function pageview(): void {
  try {
    getFbq()?.("track", "PageView");
  } catch {
    // Pixel failures must never break the app.
  }
}

/**
 * Track a standard Meta event. No-ops when the Pixel is unavailable.
 * Do not pass personally identifiable information in parameters.
 */
export function event(
  name: MetaStandardEvent,
  parameters?: Record<string, unknown>,
): void {
  try {
    const fbq = getFbq();
    if (!fbq) {
      return;
    }

    if (parameters && Object.keys(parameters).length > 0) {
      fbq("track", name, parameters);
      return;
    }

    fbq("track", name);
  } catch {
    // Pixel failures must never break the app.
  }
}

export const metaPixel = {
  pageview,
  event,
};
