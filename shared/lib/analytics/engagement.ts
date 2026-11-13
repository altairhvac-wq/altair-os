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

/** Plain words for the Platform analytics table. */
export const ENGAGEMENT_EVENT_LABELS: Record<EngagementEventName, string> = {
  cta_click: "Trial button pressed",
  video_play: "Video played",
  calculator_used: "Calculator used",
  template_download: "Template downloaded",
  results_email_requested: "Results emailed",
  boss_share: "Sent to the boss",
};
