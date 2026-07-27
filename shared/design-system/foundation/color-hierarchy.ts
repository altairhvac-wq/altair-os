/**
 * Altair Color Hierarchy System (Phase 2)
 *
 * Color directs attention — it is never decoration.
 * Target mix: ~90% neutral surfaces · ~8% semantic · ~2% Altair brass.
 *
 * Consume these class tokens instead of hardcoding rose/amber/emerald/cyan.
 * All hues resolve through existing `--altair-*` semantic roles in globals.css.
 *
 * Caution maps to the Warning token — do not invent a separate caution hue.
 */

export type AltairColorHierarchyTone =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info";

/**
 * Needs Attention uses `.altair-surface-attention` (shell/surface-hierarchy.ts).
 * Section titles use `.altair-section-title-accent` via MasterPageSection.
 */

/** Thin left brass rule for spacious section titles. */
export const altairSectionTitleAccentClass = "altair-section-title-accent";

/** Compact semantic indicator (dot) beside Needs Attention counts / activity state. */
export const altairSemanticIndicatorClass: Record<
  Exclude<AltairColorHierarchyTone, "neutral" | "info">,
  string
> = {
  danger: "bg-altair-danger",
  warning: "bg-altair-warning",
  success: "bg-altair-success",
};

/** Status-safe text for counts, KPI values, and activity event labels. */
export const altairSemanticValueClass: Record<AltairColorHierarchyTone, string> = {
  neutral: "text-altair-ink-on-paper",
  success: "text-altair-success-foreground",
  warning: "text-altair-warning-foreground",
  danger: "text-altair-danger-foreground",
  info: "text-altair-ink-on-paper",
};

/** Quiet tinted chip / clear-state panels. */
export const altairSemanticSurfaceClass: Record<
  Exclude<AltairColorHierarchyTone, "neutral">,
  string
> = {
  success:
    "border-altair-success/20 bg-altair-success-surface text-altair-success-foreground",
  warning:
    "border-altair-warning/20 bg-altair-warning-surface text-altair-warning-foreground",
  danger:
    "border-altair-danger/20 bg-altair-danger-surface text-altair-danger-foreground",
  info: "border-altair-information/20 bg-altair-information-surface text-altair-information-foreground",
};

/** KPI value emphasis — weight/contrast first; semantic hue only when tone ≠ neutral/info. */
export function altairMetricValueClass(
  tone: AltairColorHierarchyTone = "neutral",
): string {
  const color =
    tone === "success" || tone === "warning" || tone === "danger"
      ? altairSemanticValueClass[tone]
      : "text-altair-ink-on-paper";

  return `mt-1 text-2xl font-black leading-none tracking-tight tabular-nums transition-colors sm:text-[1.75rem] ${color}`;
}

/**
 * Map Mission Briefing attention rows by meaning, not raw severity count.
 * Past Due / Overdue Jobs → danger; Estimates / Jobs Waiting (caution) /
 * Technicians Behind → warning token. Caution does not invent a new hue.
 */
export function resolveNeedsAttentionTone(input: {
  id: string;
  severity: "critical" | "warning" | "healthy";
}): Exclude<AltairColorHierarchyTone, "neutral" | "info" | "success"> {
  switch (input.id) {
    case "invoices-past-due":
    case "overdue-jobs":
      return "danger";
    case "estimates-waiting":
    case "jobs-waiting-customer":
    case "technicians-behind":
      return "warning";
    default:
      return input.severity === "critical" ? "danger" : "warning";
  }
}
