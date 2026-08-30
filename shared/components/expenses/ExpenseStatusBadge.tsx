import {
  STATUS_TONE_CLASS,
  STATUS_TONE_CLASS_ON_DARK,
} from "@/shared/design-system/components/status-tone";
import {
  OPERATIONAL_EXPENSE_STATUS_STYLES,
  OPERATIONAL_STATUS_BADGE_BASE,
} from "@/shared/lib/operational-status-styles";
import { formatExpenseStatus, type ExpenseStatus } from "@/shared/types/expense";

type ExpenseStatusBadgeProps = {
  status: ExpenseStatus;
  className?: string;
  northStar?: boolean;
  /** Light text variants for badges sitting on the dark detail hero */
  onDarkSurface?: boolean;
};

/**
 * `submitted` used to be brass. An expense waiting on an approver is not a
 * brand moment, it is the textbook `info` case — in motion, waiting on someone
 * else — and spending the accent here is part of why brass stopped reading as
 * special. The rest already matched the shared tones; they now say so.
 */
const northStarExpenseStatusStyles: Record<ExpenseStatus, string> = {
  draft: STATUS_TONE_CLASS.neutral,
  submitted: STATUS_TONE_CLASS.info,
  approved: STATUS_TONE_CLASS.success,
  rejected: STATUS_TONE_CLASS.danger,
  reimbursed: STATUS_TONE_CLASS.success,
};

const northStarDarkSurfaceStatusStyles: Record<ExpenseStatus, string> = {
  draft: STATUS_TONE_CLASS_ON_DARK.neutral,
  submitted: STATUS_TONE_CLASS_ON_DARK.info,
  approved: STATUS_TONE_CLASS_ON_DARK.success,
  rejected: STATUS_TONE_CLASS_ON_DARK.danger,
  reimbursed: STATUS_TONE_CLASS_ON_DARK.success,
};

export function ExpenseStatusBadge({
  status,
  className = "",
  northStar = false,
  onDarkSurface = false,
}: ExpenseStatusBadgeProps) {
  const styles = northStar
    ? onDarkSurface
      ? northStarDarkSurfaceStatusStyles
      : northStarExpenseStatusStyles
    : OPERATIONAL_EXPENSE_STATUS_STYLES;

  return (
    <span
      className={`${OPERATIONAL_STATUS_BADGE_BASE} ${styles[status]} ${className}`}
    >
      {formatExpenseStatus(status)}
    </span>
  );
}
