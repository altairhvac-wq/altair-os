import { formatExpenseStatus, type ExpenseStatus } from "@/shared/types/expense";

type ExpenseStatusBadgeProps = {
  status: ExpenseStatus;
  className?: string;
};

const statusStyles: Record<ExpenseStatus, string> = {
  draft: "bg-slate-100 text-slate-700 ring-slate-500/20",
  submitted: "bg-blue-50 text-blue-700 ring-blue-600/20",
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  rejected: "bg-red-50 text-red-700 ring-red-600/20",
  reimbursed: "bg-violet-50 text-violet-700 ring-violet-600/20",
};

export function ExpenseStatusBadge({
  status,
  className = "",
}: ExpenseStatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${statusStyles[status]} ${className}`}
    >
      {formatExpenseStatus(status)}
    </span>
  );
}
