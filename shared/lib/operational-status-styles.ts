/** Shared operational status badge styling — calmer tones, consistent scan rhythm. */
export const OPERATIONAL_STATUS_BADGE_BASE =
  "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold leading-tight ring-1 ring-inset sm:text-xs";

export const OPERATIONAL_JOB_STATUS_STYLES = {
  scheduled: "bg-sky-50/90 text-sky-800 ring-sky-600/12",
  dispatched: "bg-indigo-50/90 text-indigo-800 ring-indigo-600/12",
  arrived: "bg-teal-50/90 text-teal-800 ring-teal-600/12",
  in_progress: "bg-amber-50/90 text-amber-800 ring-amber-600/12",
  completed: "bg-emerald-50/90 text-emerald-800 ring-emerald-600/12",
  cancelled: "bg-slate-100/90 text-slate-600 ring-slate-500/12",
} as const;

export const OPERATIONAL_INVOICE_STATUS_STYLES = {
  draft: "bg-slate-100/90 text-slate-700 ring-slate-500/12",
  sent: "bg-sky-50/90 text-sky-800 ring-sky-600/12",
  partially_paid: "bg-amber-50/90 text-amber-800 ring-amber-600/12",
  paid: "bg-emerald-50/90 text-emerald-800 ring-emerald-600/12",
  overdue: "bg-rose-50/90 text-rose-800 ring-rose-600/12",
  void: "bg-slate-100/90 text-slate-500 ring-slate-400/12 line-through",
  cancelled: "bg-slate-100/90 text-slate-500 ring-slate-400/12",
} as const;

export const OPERATIONAL_EXPENSE_STATUS_STYLES = {
  draft: "bg-slate-100/90 text-slate-700 ring-slate-500/12",
  submitted: "bg-sky-50/90 text-sky-800 ring-sky-600/12",
  approved: "bg-emerald-50/90 text-emerald-800 ring-emerald-600/12",
  rejected: "bg-rose-50/90 text-rose-800 ring-rose-600/12",
  reimbursed: "bg-indigo-50/90 text-indigo-800 ring-indigo-600/12",
} as const;

export const OPERATIONAL_ESTIMATE_STATUS_STYLES = {
  draft: "bg-slate-100/90 text-slate-700 ring-slate-500/12",
  sent: "bg-sky-50/90 text-sky-800 ring-sky-600/12",
  approved: "bg-emerald-50/90 text-emerald-800 ring-emerald-600/12",
  declined: "bg-rose-50/90 text-rose-800 ring-rose-600/12",
  converted: "bg-indigo-50/90 text-indigo-800 ring-indigo-600/12",
  cancelled: "bg-amber-50/90 text-amber-800 ring-amber-600/12",
} as const;

export const OPERATIONAL_PRIORITY_STYLES = {
  low: "bg-slate-100/90 text-slate-600 ring-slate-500/12",
  normal: "bg-slate-100/90 text-slate-700 ring-slate-500/12",
  high: "bg-orange-50/90 text-orange-800 ring-orange-600/12",
  urgent: "bg-rose-50/90 text-rose-800 ring-rose-600/12",
} as const;

export const OPERATIONAL_TIME_ENTRY_STATUS_STYLES = {
  active: "bg-sky-50/90 text-sky-800 ring-sky-600/12",
  pending: "bg-amber-50/90 text-amber-800 ring-amber-600/12",
  approved: "bg-emerald-50/90 text-emerald-800 ring-emerald-600/12",
  rejected: "bg-rose-50/90 text-rose-800 ring-rose-600/12",
} as const;

export const OPERATIONAL_MEMBERSHIP_STATUS_STYLES = {
  active: "bg-emerald-50/90 text-emerald-800 ring-emerald-600/12",
  invited: "bg-amber-50/90 text-amber-800 ring-amber-600/12",
  suspended: "bg-slate-100/90 text-slate-600 ring-slate-500/12",
} as const;
