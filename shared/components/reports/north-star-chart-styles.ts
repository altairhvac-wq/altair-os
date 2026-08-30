/**
 * North Star report chart presentation tokens — visual only.
 * Consumed when ReportSurfaceVariant is "northStar"; legacy paths stay unchanged.
 *
 * Chart cards sit on dark Graphite report-surface chrome. Tokens below are
 * tuned for readability on that surface (not the former ivory North Star paper).
 */

/**
 * PRESTIGE: the primary series reads brass, not sky blue.
 *
 * Every series colour in this module used to be a raw Tailwind-400 hex
 * (#38BDF8 sky, #34D399 emerald, #A78BFA violet, …) authored here rather than
 * taken from a token, which made the report charts the loudest off-palette
 * element left in the product. Series colours now come from the canonical
 * `--chart-*` roles in globals.css.
 */
const SERIES_PRIMARY = "var(--chart-1)";

export const nsReportChart = {
  gridLine: "border-t border-white/[0.06]",
  track: "overflow-hidden rounded-md bg-white/[0.06]",
  trackSegmented: "flex gap-0.5 overflow-hidden rounded-md bg-white/[0.06] p-0.5",
  axisLabel: "text-[10px] font-medium tabular-nums leading-none text-altair-ink-on-graphite-muted",
  chartFrame: "relative overflow-hidden",
  chartPlot: "absolute inset-x-0 inset-y-1 sm:inset-y-2",

  revenue: {
    line: SERIES_PRIMARY,
    lineWidth: 0.7,
    /** Soft fill under the line — ~25% opacity fading to transparent. */
    areaColor: SERIES_PRIMARY,
    areaTopOpacity: 0.28,
    areaBottomOpacity: 0,
    point: SERIES_PRIMARY,
    pointPeak: "var(--chart-accent)",
    pointRadius: 0.85,
    pointPeakRadius: 1.15,
  },

  /**
   * Strokes and swatches keep the saturated tone — they are non-text and clear
   * the 3.0 bar. The `text` entries take the 300 step of the same hue, because
   * these labels sit on the graphite report card where the saturated tokens
   * measured 3.00 (paid) and 3.02 (overdue). The meaning is unchanged; only the
   * lightness the surface requires is. See TONE_TEXT_ON_DARK.
   */
  cashHealth: {
    paid: {
      stroke: "var(--altair-success)",
      swatch: "bg-altair-success",
      text: "text-emerald-300",
    },
    outstanding: {
      stroke: "var(--altair-warning)",
      swatch: "bg-altair-warning",
      text: "text-amber-300",
    },
    overdue: {
      stroke: "var(--altair-danger)",
      swatch: "bg-altair-danger",
      text: "text-rose-300",
    },
  },

  /**
   * Receivables aging risk gradient — Current = healthy success, then
   * overdue tiers escalate neutral → warning → rose → danger.
   * Index order matches buildInvoiceAging:
   * Current → 1-30 → 31-60 → 61-90 → 90+.
   */
  agingPalette: [
    /* Same split as cashHealth: saturated stroke/swatch, 300-step text. The
     * middle tier moves too even though it measured 4.56 and technically
     * passed — left saturated it would have been visibly the dimmest label in
     * an escalating severity ramp, which reads as "31-60 days matters least".
     * Hue carries the escalation here; contrast is not the escalation channel. */
    {
      stroke: "var(--altair-success)",
      swatch: "bg-altair-success",
      text: "text-emerald-300",
    },
    {
      stroke: "rgba(232, 228, 220, 0.55)",
      swatch: "bg-altair-paper/55",
      text: "text-altair-paper/80",
    },
    {
      stroke: "var(--altair-warning)",
      swatch: "bg-altair-warning",
      text: "text-amber-300",
    },
    {
      stroke: "var(--altair-danger)",
      swatch: "bg-rose-500",
      text: "text-rose-400",
    },
    {
      stroke: "var(--altair-danger)",
      swatch: "bg-altair-danger",
      text: "text-rose-300",
    },
  ] as const,

  /* PRESTIGE: stage 1 was `bg-sky-400` — the last raw Tailwind blue on the
   * Reports page, and the brightest thing on it. The funnel now walks the
   * canonical series ramp so it reads as one progression rather than four
   * unrelated hues. */
  funnelStages: [
    "bg-[var(--chart-1)]",
    "bg-[var(--chart-2)]",
    "bg-[var(--chart-3)]",
    "bg-altair-ink-muted",
  ] as const,

  funnelBar: "h-2.5 rounded-sm",
  funnelBarFill:
    "h-full rounded-sm transition-[width] duration-300 ease-out",

  techBar: "h-2 rounded-sm",
  techBarFill:
    "h-full rounded-sm transition-[width] duration-300 ease-out",
  techProfitBar: "bg-altair-success",
  /* Revenue pairs with profit in the same bar group, so it takes the primary
   * series role rather than a hue that appears nowhere else on the page. */
  techRevenueBar: "bg-[var(--chart-1)]/85",

  /**
   * Fixed categorical palette for donut/legend segments (service categories).
   * Hues align with report icon-chip tints; expand beyond 6 only if needed.
   *
   * Stroke and swatch only, deliberately. There used to be a `text` variant per
   * entry, and on the graphite report card two of the six failed as text —
   * chart-2 at 3.92 and chart-4 at 4.39 — while all six clear the 3.0 bar that
   * actually applies to a stroke or a swatch. The legend already names the
   * category twice, in the swatch and in the row position, so colouring the
   * value as well bought no information and cost the contrast.
   */
  categoryPalette: [
    { stroke: "var(--chart-1)", swatch: "bg-[var(--chart-1)]" },
    { stroke: "var(--chart-2)", swatch: "bg-[var(--chart-2)]" },
    { stroke: "var(--chart-3)", swatch: "bg-[var(--chart-3)]" },
    { stroke: "var(--chart-4)", swatch: "bg-[var(--chart-4)]" },
    { stroke: "var(--chart-5)", swatch: "bg-[var(--chart-5)]" },
    { stroke: "var(--chart-6)", swatch: "bg-[var(--chart-6)]" },
  ] as const,

  table: {
    row: "px-3 py-3 transition-colors hover:bg-white/[0.03] sm:px-4",
    header:
      "text-[10px] font-bold uppercase tracking-[0.14em] text-altair-ink-on-graphite-muted",
  },
} as const;
