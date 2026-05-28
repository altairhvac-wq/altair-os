import {
  OPERATIONAL_PRIORITY_STYLES,
  OPERATIONAL_STATUS_BADGE_BASE,
} from "@/shared/lib/operational-status-styles";
import type { DispatchJobPriority } from "@/shared/types/dispatch";

type DispatchPriorityBadgeProps = {
  priority: DispatchJobPriority;
  className?: string;
};

export function DispatchPriorityBadge({
  priority,
  className = "",
}: DispatchPriorityBadgeProps) {
  return (
    <span
      className={`${OPERATIONAL_STATUS_BADGE_BASE} capitalize ${OPERATIONAL_PRIORITY_STYLES[priority]} ${className}`}
    >
      {priority}
    </span>
  );
}
