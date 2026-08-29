/**
 * North Star report chart presentation tokens — visual only.
 * Consumed when ReportSurfaceVariant is "northStar"; legacy paths stay unchanged.
 *
 * Chart cards sit on dark Graphite report-surface chrome. Tokens below are
 * tuned for readability on that surface (not the former ivory North Star paper).
 */

/** Sky/blue revenue categorical tint — matches report icon chip `bg-sky-500/25`. */
const REVENUE_SKY = "#38BDF8";

export const nsReportChart = {
  gridLine: "border-t border-white/[0.06]",
  track: "overflow-hidden rounded-md bg-white/[0.06]",
  trackSegmented: "flex gap-0.5 overflow-hidden rounded-md bg-white/[0.06] p-0.5",
  axisLabel: "text-[10px] font-medium tabular-nums leading-none text-altair-ink-on-graphite-muted",
  chartFrame: "relative overflow-hidden",
  chartPlot: "absolute inset-x-0 inset-y-1 sm:inset-y-2",

  revenue: {
    line: REVENUE_SKY,
    lineWidth: 0.7,
    /** Soft fill under the line — ~25% opacity fading to transparent. */
    areaColor: REVENUE_SKY,
    areaTopOpacity: 0.28,
    areaBottomOpacity: 0,
    point: REVENUE_SKY,
    pointPeak: "#7DD3FC",
    pointRadius: 0.85,
    pointPeakRadius: 1.15,
  },

  cashHealth: {
    paid: {
      stroke: "var(--altair-success)",
      swatch: "bg-altair-success",
      text: "text-altair-success",
    },
    outstanding: {
      stroke: "var(--altair-warning)",
      swatch: "bg-altair-warning",
      text: "text-altair-warning",
    },
    overdue: {
      stroke: "var(--altair-danger)",
      swatch: "bg-altair-danger",
      text: "text-altair-danger",
    },
  },

  /**
   * Receivables aging risk gradient — Current = healthy success, then
   * overdue tiers escalate neutral → warning → rose → danger.
   * Index order matches buildInvoiceAging:
   * Current → 1-30 → 31-60 → 61-90 → 90+.
   */
  agingPalette: [
    {
      stroke: "var(--altair-success)",
      swatch: "bg-altair-success",
      text: "text-altair-success",
    },
    {
      stroke: "rgba(232, 228, 220, 0.55)",
      swatch: "bg-altair-paper/55",
      text: "text-altair-paper/80",
    },
    {
      stroke: "var(--altair-warning)",
      swatch: "bg-altair-warning",
      text: "text-altair-warning",
    },
    {
      stroke: "#F43F5E",
      swatch: "bg-rose-500",
      text: "text-rose-400",
    },
    {
      stroke: "var(--altair-danger)",
      swatch: "bg-altair-danger",
      text: "text-altair-danger",
    },
  ] as const,

  funnelStages: [
    "bg-sky-400",
    "bg-altair-success",
    "bg-altair-brass",
    "bg-altair-ink-muted",
  ] as const,

  funnelBar: "h-2.5 rounded-sm",
  funnelBarFill:
    "h-full rounded-sm transition-[width] duration-300 ease-out",

  techBar: "h-2 rounded-sm",
  techBarFill:
    "h-full rounded-sm transition-[width] duration-300 ease-out",
  techProfitBar: "bg-altair-success",
  techRevenueBar: "bg-sky-400/85",

  /**
   * Fixed categorical palette for donut/legend segments (service categories).
   * Hues align with report icon-chip tints; expand beyond 6 only if needed.
   */
  categoryPalette: [
    { stroke: REVENUE_SKY, swatch: "bg-sky-400", text: "text-sky-300" },
    { stroke: "#34D399", swatch: "bg-emerald-400", text: "text-emerald-300" },
    { stroke: "#A78BFA", swatch: "bg-violet-400", text: "text-violet-300" },
    { stroke: "#FBBF24", swatch: "bg-amber-400", text: "text-amber-300" },
    { stroke: "#2DD4BF", swatch: "bg-teal-400", text: "text-teal-300" },
    { stroke: "#FB7185", swatch: "bg-rose-400", text: "text-rose-300" },
  ] as const,

  table: {
    row: "px-3 py-3 transition-colors hover:bg-white/[0.03] sm:px-4",
    header:
      "text-[10px] font-bold uppercase tracking-[0.14em] text-altair-ink-on-graphite-muted",
  },
} as const;
