/**
 * Reports dark elevated surface chrome tokens.
 *
 * Distinct from Mission Control v2's light `mc-surface` paper register.
 * Same Altair brand materials (Graphite, Border, Brass, Ink) — different
 * surface register for the Reports operating brief.
 *
 * Background: Graphite (`--altair-graphite` / `#1A2029`) is the existing
 * dark elevated chrome tone — one shade lighter than the North Star deep
 * canvas — matching the moon-graphite "Surface 2/3 — Card/Tile" lift used
 * across Dispatch/list frames. Do not invent a parallel hex.
 *
 * Radius/padding mirror `mc-surface` denser rhythm (`rounded-lg`, `p-3.5`).
 */

/** Surface 2 — dark elevated card shell (no padding). */
export const altairReportCardClass =
  "rounded-lg border border-altair-border bg-altair-graphite";

/** Standard inner padding for report cards and control bars. */
export const altairReportCardPadClass = "p-3.5";

/** Tier 1 — primary stat / chart card padding. */
export const altairReportCardPadTier1Class = "p-3.5 sm:p-4";

/** Tier 2 — secondary card padding (tighter). */
export const altairReportCardPadTier2Class = "p-3";

/** Tier 3 — quietest card padding. */
export const altairReportCardPadTier3Class = "p-2.5";

/** Surface 3 — dark tile / inset well on Graphite. */
export const altairReportTileClass =
  "rounded-lg border border-altair-border bg-white/[0.04]";

/** Reports dark sparkline well — compact trend under comparison text. */
export const altairReportSparklineWellClass =
  "mt-2 h-7 w-full rounded-md border border-altair-border bg-white/[0.04]";

/** Header secondary action — dark outline control (Filters / Export chrome). */
export const altairReportSecondaryActionClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-altair-border bg-white/[0.04] px-3 text-sm font-medium text-altair-paper transition hover:border-altair-border-strong hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-altair-brass/40 disabled:cursor-not-allowed disabled:opacity-60";

/** Date-range segmented track inset on a dark report card. */
export const altairReportRangeTrackClass =
  "grid w-full grid-cols-4 gap-0.5 rounded-md bg-white/[0.04] p-0.5 sm:flex sm:w-auto";

export const altairReportRangeItemClass =
  "min-h-9 min-w-0 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-altair-brass/40 sm:min-w-[3.25rem] sm:px-3";

/** Inactive range pill — muted ink on dark Graphite. */
export const altairReportRangeItemIdleClass =
  "text-altair-ink-muted hover:bg-white/[0.06] hover:text-altair-paper";

/** Active range pill — brass-interactive (same treatment as sidebar active). */
export const altairReportRangeItemActiveClass =
  "bg-altair-brass-interactive/15 font-semibold text-altair-brass-interactive";

/** Compact uppercase label on a dark report card. */
export const altairReportMetricLabelClass =
  "text-[10px] font-semibold uppercase tracking-[0.12em] text-altair-ink-muted";

/** Large tabular value on a dark report card. */
export const altairReportMetricValueClass =
  "truncate text-xl font-extrabold tracking-tight tabular-nums text-altair-paper sm:text-2xl sm:leading-none";

/** Secondary / comparison line on a dark report card (neutral, not trend-colored). */
export const altairReportMetricMetaClass =
  "text-xs text-altair-ink-muted";
