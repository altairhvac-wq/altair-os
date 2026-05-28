import {
  OPERATIONAL_ESTIMATE_STATUS_STYLES,
  OPERATIONAL_STATUS_BADGE_BASE,
} from "@/shared/lib/operational-status-styles";
import { formatEstimateStatus, type EstimateStatus } from "@/shared/types/estimate";

type EstimateStatusBadgeProps = {
  status: EstimateStatus;
  className?: string;
};

export function EstimateStatusBadge({
  status,
  className = "",
}: EstimateStatusBadgeProps) {
  return (
    <span
      className={`${OPERATIONAL_STATUS_BADGE_BASE} ${OPERATIONAL_ESTIMATE_STATUS_STYLES[status]} ${className}`}
    >
      {formatEstimateStatus(status)}
    </span>
  );
}
