/**
 * Shared operational status badge styling — Color Hierarchy System (Phase 2).
 * Uses Altair semantic tokens (StatusPill-aligned). No rose/amber/emerald hardcodes.
 */

export const OPERATIONAL_STATUS_BADGE_BASE =
  "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold leading-tight ring-1 ring-inset sm:text-xs print:!bg-white print:!text-slate-900 print:!ring-slate-400";

const neutral =
  "bg-altair-paper-subtle text-altair-ink-secondary ring-altair-border";
const success =
  "bg-altair-success-surface text-altair-success-foreground ring-altair-success/15";
const warning =
  "bg-altair-warning-surface text-altair-warning-foreground ring-altair-warning/15";
const danger =
  "bg-altair-danger-surface text-altair-danger-foreground ring-altair-danger/15";
const info =
  "bg-altair-information-surface text-altair-information-foreground ring-altair-information/15";

export const OPERATIONAL_JOB_STATUS_STYLES = {
  scheduled: info,
  dispatched: info,
  arrived: info,
  in_progress: warning,
  completed: success,
  cancelled: neutral,
} as const;

export const OPERATIONAL_INVOICE_STATUS_STYLES = {
  draft: neutral,
  sent: info,
  partially_paid: warning,
  paid: success,
  overdue: danger,
  void: `${neutral} line-through`,
  cancelled: neutral,
} as const;

export const OPERATIONAL_EXPENSE_STATUS_STYLES = {
  draft: neutral,
  submitted: info,
  approved: success,
  rejected: danger,
  reimbursed: success,
} as const;

export const OPERATIONAL_ESTIMATE_STATUS_STYLES = {
  draft: neutral,
  sent: warning,
  approved: success,
  declined: danger,
  converted: info,
  cancelled: neutral,
} as const;

export const OPERATIONAL_PRIORITY_STYLES = {
  low: neutral,
  normal: neutral,
  high: warning,
  urgent: danger,
} as const;

export const OPERATIONAL_TIME_ENTRY_STATUS_STYLES = {
  active: info,
  pending: warning,
  approved: success,
  rejected: danger,
} as const;

export const OPERATIONAL_MEMBERSHIP_STATUS_STYLES = {
  active: success,
  invited: warning,
  suspended: neutral,
} as const;
