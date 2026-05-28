import {
  OPERATIONAL_JOB_STATUS_STYLES,
  OPERATIONAL_STATUS_BADGE_BASE,
} from "@/shared/lib/operational-status-styles";
import {
  formatDispatchStatus,
  type DispatchJobStatus,
} from "@/shared/types/dispatch";

type DispatchStatusBadgeProps = {
  status: DispatchJobStatus;
  className?: string;
};

export function DispatchStatusBadge({
  status,
  className = "",
}: DispatchStatusBadgeProps) {
  return (
    <span
      className={`${OPERATIONAL_STATUS_BADGE_BASE} ${OPERATIONAL_JOB_STATUS_STYLES[status]} ${className}`}
    >
      {formatDispatchStatus(status)}
    </span>
  );
}
