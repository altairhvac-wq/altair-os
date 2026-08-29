/**
 * Mission Control v2 surface chrome tokens.
 *
 * Canonical spacing/radius/border treatment for MC-aligned light paper pages
 * (dashboard, hubs, settings, detail surfaces). Reports uses the dark
 * `report-surface` register instead. Prefer these over ad-hoc card classes
 * so section chrome stays consistent.
 *
 * Radius: `--radius-section` (Design Lab editable). Defaults keep plates soft
 * enough to read as cards, not a spreadsheet grid. Padding ~14px (`p-3.5`).
 * Plate borders use `--north-star-plate-border` (independent from chrome
 * structural hairlines and MC section dividers).
 */

/** Warm olive hairline around MC plates / cards / tiles / lists. */
export const altairMcBorderClass = "border-[var(--north-star-plate-border)]";

/**
 * Grid / stack gap between MC plates. Zero gap so adjacent `border` edges
 * meet as a visible hairline grid (warm `--north-star-plate-border`), not whitespace.
 */
export const altairMcGridGapClass = "gap-0";

/**
 * Hairline grid wrapper — 1px painted channels between borderless cells.
 * Prefer bordered plates + `altairMcGridGapClass` for most surfaces; use this
 * when children are fill-only (no own border).
 */
export const altairMcHairlineGridClass =
  "grid gap-px bg-[var(--north-star-plate-border)]";

/**
 * Surface 1 section card shell (no padding).
 *
 * PRESTIGE: carries the canonical elevation ramp. Before, an MC card was a fill
 * plus a hairline and nothing else, which is why the dashboard read flat next
 * to the quality reference — the computed box-shadow was literally transparent.
 * `--elev-hairline` is the inset top highlight (lit from above); `--elev-1` is
 * the contact + ambient pair.
 */
export const altairMcCardClass =
  "rounded-[var(--radius-card)] border border-[var(--north-star-plate-border)] bg-[var(--surface-section)] shadow-[var(--elev-hairline),var(--elev-1)]";

/** Standard inner padding for MC cards and callouts. */
export const altairMcCardPadClass = "p-3.5";

/** Surface 3 tile — KPI / metric blocks with padding included. A tile sits
 * INSIDE a card, so it is recessed rather than elevated: no drop shadow, just
 * the quiet inset that reads as a well. */
export const altairMcTileClass =
  "rounded-[var(--radius-control)] border border-[var(--north-star-plate-border)] bg-[var(--surface-tile)] p-3.5";

/** Surface 2 list container. */
export const altairMcListClass =
  "overflow-hidden rounded-[var(--radius-card)] border border-[var(--north-star-plate-border)] bg-[var(--surface-card)] shadow-[var(--elev-hairline),var(--elev-1)]";

/** Surface 4 list row. PRESTIGE: the hover was a raw slate-100 at 55% — the one
 * hardcoded colour left in this otherwise fully tokenised primitive, and a cool
 * one. Now a warm ink wash that works on any surface tone. */
export const altairMcListRowClass =
  "min-h-11 px-3.5 py-2.5 transition-colors hover:bg-[rgb(28_25_19_/_0.04)]";

/** Compact uppercase metric / eyebrow label. */
export const altairMcMetricLabelClass =
  "text-[10px] font-semibold uppercase tracking-[0.14em] text-altair-ink-on-paper-muted";

/** Large tabular metric value. */
export const altairMcMetricValueClass =
  "mt-0.5 text-[1.75rem] font-black leading-none tracking-tight tabular-nums text-altair-ink-on-paper sm:text-3xl";
