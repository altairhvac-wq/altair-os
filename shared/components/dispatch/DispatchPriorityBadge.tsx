import {
  OPERATIONAL_PRIORITY_STYLES,
  OPERATIONAL_STATUS_BADGE_BASE,
} from "@/shared/lib/operational-status-styles";
import type { DispatchJobPriority } from "@/shared/types/dispatch";

const NORTH_STAR_DISPATCH_PRIORITY_STYLES: Record<DispatchJobPriority, string> = {
  low: "bg-[rgba(174,182,194,0.12)] text-[#AEB6C2] ring-[rgba(174,182,194,0.18)]",
  normal: "bg-[rgba(174,182,194,0.14)] text-[#D7CDBD] ring-[rgba(174,182,194,0.22)]",
  high: "bg-[rgba(201,164,77,0.18)] text-[#E6D092] ring-[rgba(201,164,77,0.28)]",
  urgent: "bg-[rgba(248,113,113,0.16)] text-rose-300 ring-[rgba(248,113,113,0.28)]",
};

type DispatchPriorityBadgeProps = {
  priority: DispatchJobPriority;
  className?: string;
  northStar?: boolean;
};

export function DispatchPriorityBadge({
  priority,
  className = "",
  northStar = false,
}: DispatchPriorityBadgeProps) {
  const styles = northStar
    ? NORTH_STAR_DISPATCH_PRIORITY_STYLES[priority]
    : OPERATIONAL_PRIORITY_STYLES[priority];

  return (
    <span
      className={`${OPERATIONAL_STATUS_BADGE_BASE} capitalize ${styles} ${className}`}
    >
      {priority}
    </span>
  );
}
