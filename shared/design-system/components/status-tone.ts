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

/**
 * The same five tones for badges sitting on a dark surface — the dispatch board
 * and the expense detail hero.
 *
 * These existed already, but only inside `ExpenseStatusBadge`, so the dispatch
 * board wrote its own from raw literals and drifted three ways: `dispatched`,
 * `arrived` and `in_progress` were all brass at 14%/18%/22% — the brand accent
 * doing status duty, with `dispatched` and `in_progress` sharing one text
 * colour and separated only by eight percent of background alpha, which is not
 * a distinction anyone can see. `completed` meanwhile used raw Tailwind emerald
 * (`#10b981`), the one cool green left on an otherwise warm board.
 *
 * The wash carries the tone and the light surface colour carries the text, so
 * contrast comes from the foreground rather than from the wash's opacity.
 */
export const STATUS_TONE_CLASS_ON_DARK: Record<StatusTone, string> = {
  neutral: "bg-altair-paper/10 text-altair-paper-subtle ring-altair-paper/15",
  success:
    "bg-altair-success/20 text-altair-success-surface ring-altair-success/30",
  warning:
    "bg-altair-warning/20 text-altair-warning-surface ring-altair-warning/30",
  danger: "bg-altair-danger/20 text-altair-danger-surface ring-altair-danger/30",
  info: "bg-altair-information/25 text-altair-information-surface ring-altair-information/35",
};

/**
 * Text colour for a tone on a DARK surface.
 *
 * This is a surface contract, not an inference. A component does not get these
 * because it happens to sit somewhere dark — it gets them because it declares
 * that it renders on chrome. The distinction matters: `[data-theme="dark"]` is
 * never set in this product, so the ambient `--altair-success` / `-danger` /
 * `-ink-secondary` tokens resolve to their light-surface Prestige values, which
 * are dark. Painting those on chrome reads as correct in the source and
 * measures 1.77-3.02:1 in the browser.
 *
 * Every value is an existing 300-step of its own ramp, so the hue is unchanged
 * and nothing new was invented — only the lightness the surface requires.
 * Measured against `--chrome` (#1c211a):
 *
 *   success  emerald-300  7.39      danger   rose-300   7.40
 *   warning  amber-300    8.83      info     sky-300    7.60
 *   neutral  ink-on-graphite-muted  8.03
 *
 * For non-text — sparkline strokes, swatches, icon fills — the 500 steps are
 * fine at the 3.0 bar and should keep their saturation. Only text needs these.
 */
export const TONE_TEXT_ON_DARK: Record<StatusTone, string> = {
  neutral: "text-altair-ink-on-graphite-muted",
  success: "text-emerald-300",
  warning: "text-amber-300",
  danger: "text-rose-300",
  info: "text-sky-300",
};
