import { formatInvoiceStatus, type InvoiceStatus } from "@/shared/types/invoice";

type InvoiceStatusBadgeProps = {
  status: InvoiceStatus;
  className?: string;
};

const statusStyles: Record<InvoiceStatus, string> = {
  draft: "bg-slate-100 text-slate-700 ring-slate-500/20",
  sent: "bg-blue-50 text-blue-700 ring-blue-600/20",
  viewed: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  partially_paid: "bg-amber-50 text-amber-700 ring-amber-600/20",
  paid: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  overdue: "bg-red-50 text-red-700 ring-red-600/20",
  void: "bg-slate-100 text-slate-500 ring-slate-400/20 line-through",
};

export function InvoiceStatusBadge({
  status,
  className = "",
}: InvoiceStatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${statusStyles[status]} ${className}`}
    >
      {formatInvoiceStatus(status)}
    </span>
  );
}
