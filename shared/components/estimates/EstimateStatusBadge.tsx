import { formatEstimateStatus, type EstimateStatus } from "@/shared/types/estimate";

type EstimateStatusBadgeProps = {
  status: EstimateStatus;
  className?: string;
};

const statusStyles: Record<EstimateStatus, string> = {
  draft: "bg-slate-100 text-slate-700 ring-slate-500/20",
  sent: "bg-blue-50 text-blue-700 ring-blue-600/20",
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  declined: "bg-red-50 text-red-700 ring-red-600/20",
  converted: "bg-violet-50 text-violet-700 ring-violet-600/20",
  cancelled: "bg-amber-50 text-amber-700 ring-amber-600/20",
};

export function EstimateStatusBadge({
  status,
  className = "",
}: EstimateStatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${statusStyles[status]} ${className}`}
    >
      {formatEstimateStatus(status)}
    </span>
  );
}
