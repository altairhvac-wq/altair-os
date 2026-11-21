/**
 * Engagement events: the deliberate things a visitor does on the public site
 * (migration 209). Shared by the browser client, the collect route and the
 * server recorder so the three cannot disagree about what is accepted.
 *
 * Pure (no imports).
 *
 * ============ WHAT A LABEL IS, AND IS NOT ============
 * A label says WHICH video, calculator, template or button. It is always a
 * slug written in our own source code: "labor-rate", "commercial",
 * "pricing-growth". It is never something a visitor typed. The pattern below
 * is what the browser, the route and the database constraint all enforce, so
 * even a forged beacon can store nothing but a short lowercase slug.
 */

export const ENGAGEMENT_EVENT_NAMES = [
  /** A link to /signup was pressed. Label: the button's name, or "signup". */
  "cta_click",
  /** The commercial was started by the visitor (not the muted preview loop). */
  "video_play",
  /** A calculator input was changed. Label: the calculator's slug. */
  "calculator_used",
  /** A template file was downloaded. Label: the template's id. */
  "template_download",
  /** "Email me my results" was sent. Label: the calculator's slug. */
  "results_email_requested",
  /** "Send this to your boss" was used. Label: how (text, email, copy, share). */
  "boss_share",
] as const;

export type EngagementEventName = (typeof ENGAGEMENT_EVENT_NAMES)[number];

const LABEL_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;

export function isValidEngagementLabel(value: unknown): value is string {
  return typeof value === "string" && LABEL_PATTERN.test(value);
}

export function isEngagementEventName(value: unknown): value is EngagementEventName {
  return typeof value === "string" && (ENGAGEMENT_EVENT_NAMES as readonly string[]).includes(value);
}

/**
 * Steps counted on the public directory ride on `cta_click` with a label
 * that starts "dir-" (a `data-track` attribute in our markup), so measuring
 * them needed no database change. They are not trial buttons, and the
 * Platform analytics table names them as directory steps. The full list of
 * labels, in the order a visitor meets them.
 */
export const DIRECTORY_STEP_PREFIX = "dir-";

export const DIRECTORY_STEP_LABELS = {
  "dir-search": "Directory search sent",
  "dir-chip-trade": "Directory trade chip",
  "dir-chip-city": "Directory city chip",
  "dir-audience-pro": "Directory: finding a pro",
  "dir-audience-sub": "Directory: finding a sub",
  "dir-empty-list": "Directory empty state: list free",
  "dir-list-cta": "Directory: list your business",
  "dir-form-start": "Listing form started",
  "dir-form-step-details": "Listing form: details step",
  "dir-form-step-send": "Listing form: send step",
  "dir-form-submit": "Listing form sent",
  "dir-form-success": "Listing form success screen",
  "dir-listing-call": "Listing: call tapped",
  "dir-listing-website": "Listing: website tapped",
  "dir-listing-directions": "Listing: map tapped",
  "dir-listing-claim": "Listing: is this your business",
  "dir-badge-copy": "Badge code copied",
} as const;

export function isDirectoryStepLabel(label: string | null | undefined): label is keyof typeof DIRECTORY_STEP_LABELS {
  return typeof label === "string" && label in DIRECTORY_STEP_LABELS;
}

/** Plain words for the Platform analytics table. */
export const ENGAGEMENT_EVENT_LABELS: Record<EngagementEventName, string> = {
  cta_click: "Trial button pressed",
  video_play: "Video played",
  calculator_used: "Calculator used",
  template_download: "Template downloaded",
  results_email_requested: "Results emailed",
  boss_share: "Sent to the boss",
};
