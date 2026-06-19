import {
  OPERATIONAL_JOB_STATUS_STYLES,
  OPERATIONAL_STATUS_BADGE_BASE,
} from "@/shared/lib/operational-status-styles";
import {
  formatDispatchStatus,
  type DispatchJobStatus,
} from "@/shared/types/dispatch";

const NORTH_STAR_DISPATCH_STATUS_STYLES: Record<DispatchJobStatus, string> = {
  scheduled:
    "bg-[#EFE4CB] text-[#4F4638] ring-[rgba(138,99,36,0.18)]",
  dispatched:
    "bg-[#F1E7D2] text-[#6B6255] ring-[rgba(138,99,36,0.16)]",
  arrived:
    "bg-[#F5EBD4] text-[#8A6324] ring-[rgba(201,164,77,0.22)]",
  in_progress:
    "bg-[rgba(201,164,77,0.14)] text-[#6B5A2E] ring-[rgba(201,164,77,0.24)]",
  completed:
    "bg-[rgba(16,185,129,0.12)] text-[#065F46] ring-[rgba(16,185,129,0.22)]",
  cancelled:
    "bg-[#F1E7D2] text-[#6B6255] ring-[rgba(138,99,36,0.12)]",
};

type DispatchStatusBadgeProps = {
  status: DispatchJobStatus;
  className?: string;
  northStar?: boolean;
};

export function DispatchStatusBadge({
  status,
  className = "",
  northStar = false,
}: DispatchStatusBadgeProps) {
  const styles = northStar
    ? NORTH_STAR_DISPATCH_STATUS_STYLES[status]
    : OPERATIONAL_JOB_STATUS_STYLES[status];

  return (
    <span
      className={`${OPERATIONAL_STATUS_BADGE_BASE} ${styles} ${className}`}
    >
      {formatDispatchStatus(status)}
    </span>
  );
}
