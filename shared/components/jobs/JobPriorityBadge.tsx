import {
  OPERATIONAL_PRIORITY_STYLES,
  OPERATIONAL_STATUS_BADGE_BASE,
} from "@/shared/lib/operational-status-styles";
import type { JobPriority } from "@/shared/types/job";

type JobPriorityBadgeProps = {
  priority: JobPriority;
  className?: string;
};

export function JobPriorityBadge({
  priority,
  className = "",
}: JobPriorityBadgeProps) {
  return (
    <span
      className={`${OPERATIONAL_STATUS_BADGE_BASE} capitalize ${OPERATIONAL_PRIORITY_STYLES[priority]} ${className}`}
    >
      {priority}
    </span>
  );
}
