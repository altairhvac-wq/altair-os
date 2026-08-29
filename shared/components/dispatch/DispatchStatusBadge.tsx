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
    "bg-[rgba(174,182,194,0.14)] text-[#D7CDBD] ring-[rgba(174,182,194,0.22)]",
  dispatched:
    "bg-[rgba(194,160,90,0.14)] text-[#E8D9AC] ring-[rgba(194,160,90,0.24)]",
  arrived:
    "bg-[rgba(194,160,90,0.18)] text-[#D9C188] ring-[rgba(194,160,90,0.28)]",
  in_progress:
    "bg-[rgba(194,160,90,0.22)] text-[#E8D9AC] ring-[rgba(194,160,90,0.30)]",
  completed:
    "bg-[rgba(16,185,129,0.16)] text-emerald-300 ring-[rgba(16,185,129,0.28)]",
  cancelled:
    "bg-[rgba(174,182,194,0.10)] text-[#BCB5A5] ring-[rgba(174,182,194,0.16)]",
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
