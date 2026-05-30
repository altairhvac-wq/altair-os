/** Shared spacing and control sizing for admin / field workflows (density pass). */

export const adminPageStackClass = "space-y-4";

export const adminCardSectionClass =
  "rounded-xl border border-slate-200 bg-white p-4 shadow-sm";

export const adminPanelBodyClass = "min-h-0 flex-1 overflow-y-auto px-4 py-3.5";

export const adminFormStackClass = "space-y-4";

export const adminFormGridClass = "grid gap-3 sm:grid-cols-2";

export const adminFormLabelClass = "mb-1 block text-xs font-semibold text-slate-600";

/** min-h-11 preserves ~44px touch targets on mobile while reducing vertical padding */
export const adminFormInputClass =
  "w-full min-h-11 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20";

export const adminFormActionsClass = "flex gap-2 border-t border-slate-100 pt-3";
