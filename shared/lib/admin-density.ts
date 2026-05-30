/** Shared spacing and control sizing for admin / field workflows (density pass V2). */

export const adminPageStackClass = "space-y-3";

export const adminCardSectionClass =
  "rounded-lg border border-slate-200 bg-white p-3 shadow-sm";

export const adminPanelBodyClass = "min-h-0 flex-1 overflow-y-auto px-3 py-2.5";

export const adminFormStackClass = "space-y-2.5";

export const adminFormGridClass = "grid gap-2 sm:grid-cols-2";

export const adminFormLabelClass =
  "mb-0.5 block text-[11px] font-semibold leading-tight text-slate-600";

/** min-h-11 preserves ~44px touch targets on mobile */
export const adminFormInputClass =
  "w-full min-h-11 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20";

export const adminFormActionsClass =
  "flex gap-2 border-t border-slate-100 pt-2.5";

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
