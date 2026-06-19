import {
  OPERATIONAL_PRIORITY_STYLES,
  OPERATIONAL_STATUS_BADGE_BASE,
} from "@/shared/lib/operational-status-styles";
import type { DispatchJobPriority } from "@/shared/types/dispatch";

const NORTH_STAR_DISPATCH_PRIORITY_STYLES: Record<DispatchJobPriority, string> = {
  low: "bg-[#F1E7D2] text-[#6B6255] ring-[rgba(138,99,36,0.12)]",
  normal: "bg-[#EFE4CB] text-[#4F4638] ring-[rgba(138,99,36,0.16)]",
  high: "bg-[rgba(201,164,77,0.16)] text-[#8A6324] ring-[rgba(201,164,77,0.24)]",
  urgent: "bg-[rgba(185,28,28,0.10)] text-[#991B1B] ring-[rgba(185,28,28,0.22)]",
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
