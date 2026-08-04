/**
 * Mission Control v2 surface chrome tokens.
 *
 * Canonical spacing/radius/border treatment for MC-aligned light paper pages
 * (dashboard, hubs, settings, detail surfaces). Reports uses the dark
 * `report-surface` register instead. Prefer these over ad-hoc card classes
 * so section chrome stays consistent.
 *
 * Radius: sharp (`rounded-none`) — MC v2 identity is squared paper plates on
 * the olive-graphite canvas, not pill cards. Padding ~14px (`p-3.5`).
 * Borders use the warm olive hairline (`--north-star-border`).
 */

/** Warm olive hairline used between MC structural zones and around plates. */
export const altairMcBorderClass = "border-[var(--north-star-border)]";

/**
 * Grid / stack gap between MC plates. Zero gap so adjacent `border` edges
 * meet as a visible hairline grid (warm `--north-star-border`), not whitespace.
 */
export const altairMcGridGapClass = "gap-0";

/**
 * Hairline grid wrapper — 1px painted channels between borderless cells.
 * Prefer bordered plates + `altairMcGridGapClass` for most surfaces; use this
 * when children are fill-only (no own border).
 */
export const altairMcHairlineGridClass =
  "grid gap-px bg-[var(--north-star-border)]";

/** Surface 1 section card shell (no padding). */
export const altairMcCardClass =
  "rounded-none border border-[var(--north-star-border)] bg-[var(--surface-section)]";

/** Standard inner padding for MC cards and callouts. */
export const altairMcCardPadClass = "p-3.5";

/** Surface 3 tile — KPI / metric blocks with padding included. */
export const altairMcTileClass =
  "rounded-none border border-[var(--north-star-border)] bg-[var(--surface-tile)] p-3.5";

/** Surface 2 list container. */
export const altairMcListClass =
  "overflow-hidden rounded-none border border-[var(--north-star-border)] bg-[var(--surface-card)]";

/** Surface 4 list row. */
export const altairMcListRowClass =
  "min-h-11 px-3.5 py-2.5 transition-colors hover:bg-[rgb(241_245_249_/_0.55)]";

/** Compact uppercase metric / eyebrow label. */
export const altairMcMetricLabelClass =
  "text-[10px] font-semibold uppercase tracking-[0.14em] text-altair-ink-on-paper-muted";

/** Large tabular metric value. */
export const altairMcMetricValueClass =
  "mt-0.5 text-[1.75rem] font-black leading-none tracking-tight tabular-nums text-altair-ink-on-paper sm:text-3xl";
