import type { DispatchJobPriority } from "@/shared/types/dispatch";

type DispatchPriorityBadgeProps = {
  priority: DispatchJobPriority;
  className?: string;
};

const priorityStyles: Record<DispatchJobPriority, string> = {
  low: "bg-slate-100 text-slate-600 ring-slate-500/20",
  normal: "bg-cyan-50 text-cyan-700 ring-cyan-600/20",
  high: "bg-orange-50 text-orange-700 ring-orange-600/20",
  urgent: "bg-red-50 text-red-700 ring-red-600/20",
};

export function DispatchPriorityBadge({
  priority,
  className = "",
}: DispatchPriorityBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${priorityStyles[priority]} ${className}`}
    >
      {priority}
    </span>
  );
}
