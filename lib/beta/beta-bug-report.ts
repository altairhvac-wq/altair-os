/**
 * In-app beta bug reporter (floating button + insert-only reports).
 * Disable after beta: set NEXT_PUBLIC_SHOW_BETA_BUG_REPORT_BUTTON=false in Vercel,
 * or flip SHOW_BETA_BUG_REPORT_BUTTON to false below.
 */
export const SHOW_BETA_BUG_REPORT_BUTTON =
  process.env.NEXT_PUBLIC_SHOW_BETA_BUG_REPORT_BUTTON !== "false";

export function isBetaBugReportEnabled(): boolean {
  return SHOW_BETA_BUG_REPORT_BUTTON;
}
