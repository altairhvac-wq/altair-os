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

const northStarExpenseStatusStyles: Record<ExpenseStatus, string> = {
  draft: "bg-[#F5F0E4] text-[#4F4638] ring-[rgba(138,99,36,0.14)]",
  submitted: "bg-[rgba(201,164,77,0.18)] text-[#5A4A32] ring-[rgba(201,164,77,0.28)]",
  approved: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  rejected: "bg-rose-50 text-rose-800 ring-rose-600/20",
  reimbursed: "bg-[#EFE4CB] text-[#4F4638] ring-[rgba(138,99,36,0.18)]",
};

const northStarDarkSurfaceStatusStyles: Record<ExpenseStatus, string> = {
  draft: "bg-[#F5F0E4] text-[#4F4638] ring-[rgba(138,99,36,0.14)]",
  submitted: "bg-[rgba(201,164,77,0.22)] text-[#F3EBDD] ring-[rgba(201,164,77,0.32)]",
  approved: "bg-emerald-950/40 text-emerald-200 ring-emerald-500/30",
  rejected: "bg-rose-950/40 text-rose-200 ring-rose-500/30",
  reimbursed: "bg-[#EFE4CB] text-[#4F4638] ring-[rgba(138,99,36,0.18)]",
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
