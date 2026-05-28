import {
  OPERATIONAL_JOB_STATUS_STYLES,
  OPERATIONAL_STATUS_BADGE_BASE,
} from "@/shared/lib/operational-status-styles";
import {
  formatDispatchStatus,
  type DispatchJobStatus,
} from "@/shared/types/dispatch";

type TechnicianJobStatusBadgeProps = {
  status: DispatchJobStatus;
  className?: string;
};

export function TechnicianJobStatusBadge({
  status,
  className = "",
}: TechnicianJobStatusBadgeProps) {
  return (
    <span
      className={`${OPERATIONAL_STATUS_BADGE_BASE} py-1 ${OPERATIONAL_JOB_STATUS_STYLES[status]} ${className}`}
    >
      {formatDispatchStatus(status)}
    </span>
  );
}
