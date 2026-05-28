import {
  OPERATIONAL_EXPENSE_STATUS_STYLES,
  OPERATIONAL_STATUS_BADGE_BASE,
} from "@/shared/lib/operational-status-styles";
import { formatExpenseStatus, type ExpenseStatus } from "@/shared/types/expense";

type ExpenseStatusBadgeProps = {
  status: ExpenseStatus;
  className?: string;
};

export function ExpenseStatusBadge({
  status,
  className = "",
}: ExpenseStatusBadgeProps) {
  return (
    <span
      className={`${OPERATIONAL_STATUS_BADGE_BASE} ${OPERATIONAL_EXPENSE_STATUS_STYLES[status]} ${className}`}
    >
      {formatExpenseStatus(status)}
    </span>
  );
}
