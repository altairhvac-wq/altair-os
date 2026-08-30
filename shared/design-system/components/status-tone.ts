/**
 * The single tone table for every status badge in the product.
 *
 * This exists because `StatusPill` and `shared/lib/operational-status-styles.ts`
 * each declared their own copy of the same five class strings. They were
 * byte-identical, which made the duplication invisible — and meant a change to
 * StatusPill reached none of the twelve files importing the operational maps.
 * That is the structural reason the status vocabulary drifted.
 *
 * Both now read from here.
 */
export type StatusTone = "neutral" | "success" | "warning" | "danger" | "info";

/**
 * Meaning, so a future map picks a tone by what the state IS rather than by
 * what colour looks right:
 *
 * - `neutral`  — nothing has happened yet, or the record is closed without
 *                consequence. Draft, cancelled, archived.
 * - `info`     — in motion, or waiting on someone else. Not a problem.
 *                Sent, scheduled, dispatched, submitted.
 * - `success`  — the good terminal state. Paid, approved, completed.
 * - `warning`  — needs a human soon. Partially paid, high priority, invited.
 * - `danger`   — money or access at risk. Overdue, declined, suspended.
 */
export const STATUS_TONE_CLASS: Record<StatusTone, string> = {
  neutral: "bg-altair-paper-subtle text-altair-ink-secondary ring-altair-border",
  success:
    "bg-altair-success-surface text-altair-success-foreground ring-altair-success/15",
  warning:
    "bg-altair-warning-surface text-altair-warning-foreground ring-altair-warning/15",
  danger:
    "bg-altair-danger-surface text-altair-danger-foreground ring-altair-danger/15",
  info: "bg-altair-information-surface text-altair-information-foreground ring-altair-information/15",
};
