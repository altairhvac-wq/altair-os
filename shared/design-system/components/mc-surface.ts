/**
 * Mission Control v2 surface chrome tokens.
 *
 * Canonical spacing/radius/border treatment for MC-aligned light paper pages
 * (dashboard and future workspace surfaces). Reports uses the dark
 * `report-surface` register instead. Prefer these over ad-hoc card classes
 * so section chrome stays consistent.
 *
 * Radius: local `rounded-lg` (0.5rem) is denser than `--radius-section` (0.75rem);
 * no new global radius token. Padding ~14px (`p-3.5`). Borders use `altair-border`.
 */

/** Grid / stack gap between MC sections and tiles. */
export const altairMcGridGapClass = "gap-3";

/** Surface 1 section card shell (no padding). */
export const altairMcCardClass =
  "rounded-lg border border-altair-border bg-[var(--surface-section)]";

/** Standard inner padding for MC cards and callouts. */
export const altairMcCardPadClass = "p-3.5";

/** Surface 3 tile — KPI / metric blocks with padding included. */
export const altairMcTileClass =
  "rounded-lg border border-altair-border bg-[var(--surface-tile)] p-3.5";

/** Surface 2 list container. */
export const altairMcListClass =
  "overflow-hidden rounded-lg border border-altair-border bg-[var(--surface-card)]";

/** Surface 4 list row. */
export const altairMcListRowClass =
  "min-h-11 px-3.5 py-2.5 transition-colors hover:bg-[rgb(241_245_249_/_0.55)]";

/** Compact uppercase metric / eyebrow label. */
export const altairMcMetricLabelClass =
  "text-[10px] font-semibold uppercase tracking-[0.14em] text-altair-ink-on-paper-muted";

/** Large tabular metric value. */
export const altairMcMetricValueClass =
  "mt-0.5 text-[1.75rem] font-black leading-none tracking-tight tabular-nums text-altair-ink-on-paper sm:text-3xl";
