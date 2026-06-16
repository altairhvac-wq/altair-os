/** Shared spacing and control sizing for admin / field workflows (Master Shell V2 density). */

import {
  adminFormInputClass,
  masterSectionSurfaceClass,
} from "@/shared/design-system/shell/tokens";

export { adminFormInputClass };

export const adminPageStackClass = "space-y-2.5";

/** Section/card grouping — uses shared 3-tier surface system (section tier). */
export const adminCardSectionClass = masterSectionSurfaceClass;

export const adminPanelBodyClass = "min-h-0 flex-1 overflow-y-auto px-3 py-2";

export const adminFormStackClass = "space-y-2";

export const adminFormGridClass = "grid gap-2 sm:grid-cols-2";

export const adminFormLabelClass =
  "mb-0.5 block text-[11px] font-semibold leading-tight text-slate-600";

export const adminFormActionsClass =
  "flex gap-2 border-t border-slate-100 pt-2";

/** Collapsible low-priority blocks (native details, 44px summary touch target) */
export const adminDetailsClass =
  "group rounded-lg border border-slate-200 bg-white overflow-hidden";

export const adminDetailsSummaryClass =
  "flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-2.5 py-2 text-xs font-semibold text-slate-600 marker:content-none [&::-webkit-details-marker]:hidden";

export const adminDetailsBodyClass = "border-t border-slate-100 px-2.5 py-2";

/** Inline metadata rows (icon + label + value on one line when possible) */
export const adminMetaRowClass =
  "flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-700";

export const adminMetaLabelClass =
  "text-[10px] font-semibold uppercase tracking-wide text-slate-400";

/** Compact line-item card shell */
export const adminLineItemShellClass =
  "rounded-lg border border-slate-200 bg-white p-2";

export const adminLineItemGridClass = "grid gap-2 sm:grid-cols-12";

/** Empty state outer wrapper */
export const adminEmptyWrapClass = "admin-empty-wrap";

/** Interactive list rows — compact padding with 44px min touch height */
export const adminListRowClass =
  "flex w-full min-w-0 items-start gap-2.5 admin-list-row text-left";

/** Selected/bulk-selected list row tint (mobile card wrappers and row buttons). */
export const adminListRowSelectedClass = "admin-list-row-selected";

/** Selected row wrapper for mobile list rows with adjacent checkboxes. */
export const adminListRowWrapSelectedClass = "admin-list-row-wrap-selected";

/** Interactive table row — hover/focus without changing click behavior. */
export const adminTableRowClass = "admin-table-row";

/** Selected/bulk-selected table row tint. */
export const adminTableRowSelectedClass = "admin-table-row-selected";

/** Table cell padding (pair with text-left text-sm on table) */
export const adminTableHeadClass = "admin-table-head";
export const adminTableCellClass = "admin-table-cell";

/** Compact one-row summary strip for list pages on mobile */
export const adminCompactSummaryStripClass =
  "shrink-0 overflow-x-auto rounded-xl border border-slate-200/60 bg-white/95 px-2.5 py-2 shadow-[var(--shadow-card)] sm:hidden";

export const adminCompactSummaryStripInnerClass =
  "flex w-max min-w-full items-center gap-3";

export const adminCompactSummaryMetricClass =
  "flex shrink-0 items-baseline gap-1";

export const adminCompactSummaryLabelClass =
  "text-[11px] font-semibold uppercase tracking-wide text-slate-500";

export const adminCompactSummaryValueClass =
  "text-sm font-bold tabular-nums tracking-tight text-slate-900";
