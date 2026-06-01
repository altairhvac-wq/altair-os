/** Shared operational status badge styling — calmer tones, consistent scan rhythm. */
export const OPERATIONAL_STATUS_BADGE_BASE =
  "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold leading-tight ring-1 ring-inset sm:text-xs print:!bg-white print:!text-slate-900 print:!ring-slate-400";

export const OPERATIONAL_JOB_STATUS_STYLES = {
  scheduled: "bg-sky-50/95 text-sky-800 ring-sky-500/15",
  dispatched: "bg-indigo-50/95 text-indigo-800 ring-indigo-500/15",
  arrived: "bg-cyan-50/95 text-cyan-800 ring-cyan-500/15",
  in_progress: "bg-amber-50/95 text-amber-800 ring-amber-500/15",
  completed: "bg-emerald-50/95 text-emerald-800 ring-emerald-500/15",
  cancelled: "bg-slate-100/95 text-slate-600 ring-slate-400/15",
} as const;

export const OPERATIONAL_INVOICE_STATUS_STYLES = {
  draft: "bg-slate-100/95 text-slate-700 ring-slate-400/15",
  sent: "bg-sky-50/95 text-sky-800 ring-sky-500/15",
  partially_paid: "bg-amber-50/95 text-amber-800 ring-amber-500/15",
  paid: "bg-emerald-50/95 text-emerald-800 ring-emerald-500/15",
  overdue: "bg-rose-50/95 text-rose-800 ring-rose-500/15",
  void: "bg-slate-100/95 text-slate-500 ring-slate-400/15 line-through",
  cancelled: "bg-slate-100/95 text-slate-500 ring-slate-400/15",
} as const;

export const OPERATIONAL_EXPENSE_STATUS_STYLES = {
  draft: "bg-slate-100/95 text-slate-700 ring-slate-400/15",
  submitted: "bg-sky-50/95 text-sky-800 ring-sky-500/15",
  approved: "bg-emerald-50/95 text-emerald-800 ring-emerald-500/15",
  rejected: "bg-rose-50/95 text-rose-800 ring-rose-500/15",
  reimbursed: "bg-cyan-50/95 text-cyan-800 ring-cyan-500/15",
} as const;

export const OPERATIONAL_ESTIMATE_STATUS_STYLES = {
  draft: "bg-slate-100/95 text-slate-700 ring-slate-400/15",
  sent: "bg-amber-50/95 text-amber-800 ring-amber-500/15",
  approved: "bg-emerald-50/95 text-emerald-800 ring-emerald-500/15",
  declined: "bg-rose-50/95 text-rose-800 ring-rose-500/15",
  converted: "bg-cyan-50/95 text-cyan-800 ring-cyan-500/15",
  cancelled: "bg-slate-100/95 text-slate-600 ring-slate-400/15",
} as const;

export const OPERATIONAL_PRIORITY_STYLES = {
  low: "bg-slate-100/95 text-slate-600 ring-slate-400/15",
  normal: "bg-slate-100/95 text-slate-700 ring-slate-400/15",
  high: "bg-amber-50/95 text-amber-800 ring-amber-500/15",
  urgent: "bg-rose-50/95 text-rose-800 ring-rose-500/15",
} as const;

export const OPERATIONAL_TIME_ENTRY_STATUS_STYLES = {
  active: "bg-cyan-50/95 text-cyan-800 ring-cyan-500/15",
  pending: "bg-amber-50/95 text-amber-800 ring-amber-500/15",
  approved: "bg-emerald-50/95 text-emerald-800 ring-emerald-500/15",
  rejected: "bg-rose-50/95 text-rose-800 ring-rose-500/15",
} as const;

export const OPERATIONAL_MEMBERSHIP_STATUS_STYLES = {
  active: "bg-emerald-50/95 text-emerald-800 ring-emerald-500/15",
  invited: "bg-amber-50/95 text-amber-800 ring-amber-500/15",
  suspended: "bg-slate-100/95 text-slate-600 ring-slate-400/15",
} as const;
