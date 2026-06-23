import type { DesignLabColors } from "@/shared/components/platform-admin/design-lab/design-lab-defaults";

export type DashboardSurfaceStyle = {
  background: string;
  text: string;
  border: string;
};

export type DashboardSurfaceId =
  | "operating-center"
  | "ops-score-card"
  | "priority-card"
  | "insight-card"
  | "then-handle-row"
  | "metric-card-jobs"
  | "metric-card-attention"
  | "metric-card-health"
  | "metric-card-overdue"
  | "operating-board"
  | "action-column"
  | "work-column"
  | "money-column"
  | "blocker-card"
  | "field-work-card"
  | "billing-pressure-card"
  | "dispatch-pressure-card"
  | "work-job-row"
  | "business-pulse"
  | "field-activity-card"
  | "momentum-card"
  | "system-health-dock"
  | "expense-inset-card"
  | "lead-opportunity-inset-card"
  | "connection-chip"
  | `queue-row-${string}`
  | `money-row-${string}`
  | `work-metric-${string}`
  | `pulse-metric-${string}`
  | `metric-card-${string}`;

export type DashboardSurfaceOverrides = Partial<
  Record<DashboardSurfaceId, DashboardSurfaceStyle>
>;

const STATIC_SURFACE_LABELS: Partial<Record<DashboardSurfaceId, string>> = {
  "operating-center": "Operating Center panel",
  "ops-score-card": "Ops score card",
  "priority-card": "Priority recommendation card",
  "insight-card": "Insight card",
  "then-handle-row": "Then handle row",
  "metric-card-jobs": "Jobs metric card",
  "metric-card-attention": "Attention metric card",
  "metric-card-health": "Health metric card",
  "metric-card-overdue": "Overdue metric card",
  "operating-board": "Operating Board panel",
  "action-column": "Action column",
  "work-column": "Work column",
  "money-column": "Money column",
  "blocker-card": "Blockers and follow-ups card",
  "field-work-card": "Today's field work card",
  "billing-pressure-card": "Billing pressure card",
  "dispatch-pressure-card": "Dispatch pressure card",
  "work-job-row": "Field work job row",
  "business-pulse": "Business pulse band",
  "field-activity-card": "Field activity card",
  "momentum-card": "Today's momentum card",
  "system-health-dock": "System health dock",
  "expense-inset-card": "Expense inset card",
  "lead-opportunity-inset-card": "Lead opportunity inset card",
  "connection-chip": "Connection chip",
};

const METRIC_CHIP_SURFACE_BY_LABEL: Record<string, DashboardSurfaceId> = {
  "Jobs today": "metric-card-jobs",
  "Needs attention": "metric-card-attention",
  "Health score": "metric-card-health",
  "Overdue": "metric-card-overdue",
};

export function defaultSurfaceStyle(colors: DesignLabColors): DashboardSurfaceStyle {
  return {
    background: colors.cardBackground,
    text: colors.bodyText,
    border: colors.cardBorder,
  };
}

export function resolveSurfaceStyle(
  surfaceId: DashboardSurfaceId,
  colors: DesignLabColors,
  overrides: DashboardSurfaceOverrides,
): DashboardSurfaceStyle {
  return overrides[surfaceId] ?? defaultSurfaceStyle(colors);
}

export function surfaceStyleToCss(
  style: DashboardSurfaceStyle,
): React.CSSProperties {
  return {
    backgroundColor: style.background,
    borderColor: style.border,
    color: style.text,
    backgroundImage: "none",
    "--dl-surface-bg": style.background,
    "--dl-surface-text": style.text,
    "--dl-surface-border": style.border,
  } as React.CSSProperties;
}

export function getDashboardSurfaceLabel(surfaceId: DashboardSurfaceId): string {
  const staticLabel = STATIC_SURFACE_LABELS[surfaceId];
  if (staticLabel) {
    return staticLabel;
  }

  if (surfaceId.startsWith("queue-row-")) {
    const slug = surfaceId.slice("queue-row-".length).replace(/-/g, " ");
    return `${titleCase(slug)} row`;
  }

  if (surfaceId.startsWith("money-row-")) {
    const slug = surfaceId.slice("money-row-".length).replace(/-/g, " ");
    return `${titleCase(slug)} row`;
  }

  if (surfaceId.startsWith("work-metric-")) {
    const slug = surfaceId.slice("work-metric-".length).replace(/-/g, " ");
    return `${titleCase(slug)} metric card`;
  }

  if (surfaceId.startsWith("pulse-metric-")) {
    const slug = surfaceId.slice("pulse-metric-".length).replace(/-/g, " ");
    return `${titleCase(slug)} pulse metric`;
  }

  if (surfaceId.startsWith("metric-card-")) {
    const slug = surfaceId.slice("metric-card-".length).replace(/-/g, " ");
    return `${titleCase(slug)} metric card`;
  }

  return titleCase(surfaceId.replace(/-/g, " "));
}

export function queueRowSurfaceId(rowId: string): DashboardSurfaceId {
  return `queue-row-${rowId}`;
}

export function moneyRowSurfaceId(rowId: string): DashboardSurfaceId {
  return `money-row-${rowId}`;
}

export function metricChipSurfaceId(label: string, index: number): DashboardSurfaceId {
  return METRIC_CHIP_SURFACE_BY_LABEL[label] ?? `metric-card-${index}` as DashboardSurfaceId;
}

export function workMetricSurfaceId(label: string): DashboardSurfaceId {
  return `work-metric-${label.toLowerCase().replace(/\s+/g, "-")}` as DashboardSurfaceId;
}

export function pulseMetricSurfaceId(metricId: string): DashboardSurfaceId {
  return `pulse-metric-${metricId}` as DashboardSurfaceId;
}

export function hasSurfaceOverrides(overrides: DashboardSurfaceOverrides): boolean {
  return Object.keys(overrides).length > 0;
}

function titleCase(value: string): string {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function buildSurfaceOverridesExportSection(
  overrides: DashboardSurfaceOverrides,
): string | null {
  const entries = Object.entries(overrides) as [DashboardSurfaceId, DashboardSurfaceStyle][];

  if (entries.length === 0) {
    return null;
  }

  const lines = entries.map(([surfaceId, style]) => {
    return [
      `${surfaceId}:`,
      `  background: ${style.background}`,
      `  text: ${style.text}`,
      `  border: ${style.border}`,
    ].join("\n");
  });

  return ["Dashboard surface overrides:", ...lines].join("\n");
}
