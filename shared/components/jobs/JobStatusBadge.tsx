import {
  OPERATIONAL_JOB_STATUS_STYLES,
  OPERATIONAL_STATUS_BADGE_BASE,
} from "@/shared/lib/operational-status-styles";
import { formatJobStatus, type JobStatus } from "@/shared/types/job";

type JobStatusBadgeProps = {
  status: JobStatus;
  className?: string;
};

export function JobStatusBadge({ status, className = "" }: JobStatusBadgeProps) {
  return (
    <span
      className={`${OPERATIONAL_STATUS_BADGE_BASE} ${OPERATIONAL_JOB_STATUS_STYLES[status]} ${className}`}
    >
      {formatJobStatus(status)}
    </span>
  );
}
