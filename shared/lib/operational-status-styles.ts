/**
 * Shared operational status badge styling.
 *
 * Tone classes come from the design system's single table
 * (shared/design-system/components/status-tone.ts). They used to be re-declared
 * here as local consts — byte-identical to StatusPill's, so the duplication was
 * invisible and a change to one reached none of the twelve files importing the
 * other. That fork is why the status vocabulary drifted.
 */

import { STATUS_TONE_CLASS } from "@/shared/design-system/components/status-tone";

export const OPERATIONAL_STATUS_BADGE_BASE =
  "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold leading-tight ring-1 ring-inset sm:text-xs print:!bg-white print:!text-slate-900 print:!ring-slate-400";

const { neutral, success, warning, danger, info } = STATUS_TONE_CLASS;

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

/*
 * 'sent' is deliberately the SAME tone as an invoice's 'sent'. Both mean the
 * document has gone out and the ball is with the customer, which is a normal
 * waiting state rather than a problem — the escalation is 'overdue' and
 * 'expired'. These two maps sat eleven lines apart rendering the identical word
 * in two different colours, so a customer's billing tab showed 'Sent' in steel
 * on one row and gold on the next.
 */
export const OPERATIONAL_ESTIMATE_STATUS_STYLES = {
  draft: neutral,
  sent: info,
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

/*
 * 'suspended' is danger, not neutral. It means access has been revoked; at
 * neutral it rendered at the same weight as a draft invoice or a low-priority
 * job — the quietest tone in the system for a security-relevant state.
 */
export const OPERATIONAL_MEMBERSHIP_STATUS_STYLES = {
  active: success,
  invited: warning,
  suspended: danger,
} as const;
