/**
 * Reports categorical icon-chip tints.
 *
 * Fixed metric-type → background color for the small chip behind each
 * stat-card icon. Scoped ONLY to that chip fill — never text, trends,
 * borders, or status meaning. Trend up/down still uses success/danger.
 *
 * Hues are tuned for readability on Graphite (`altairReportCardClass`).
 */

export type ReportIconTintCategory =
  | "revenue"
  | "profit"
  | "outstanding"
  | "jobs"
  | "avgTicket"
  | "conversion";

/** Chip shell — size/radius only; pair with a tint background class. */
export const reportIconChipClass =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-altair-paper";

/**
 * Categorical chip backgrounds. Assign by metric type, not by trend or
 * severity — Outstanding/Overdue share red even when the period is healthy.
 */
export const reportIconTintClass: Record<ReportIconTintCategory, string> = {
  /** Revenue / Collected */
  revenue: "bg-sky-500/25",
  /** Profit / Net income */
  profit: "bg-emerald-500/25",
  /** Outstanding / Overdue balances */
  outstanding: "bg-rose-500/25",
  /** Jobs / workload volume */
  jobs: "bg-violet-500/25",
  /** Average ticket */
  avgTicket: "bg-amber-500/25",
  /** Conversion / close rate */
  conversion: "bg-teal-500/25",
};

export function reportIconChipClassName(
  category: ReportIconTintCategory,
): string {
  return `${reportIconChipClass} ${reportIconTintClass[category]}`;
}
