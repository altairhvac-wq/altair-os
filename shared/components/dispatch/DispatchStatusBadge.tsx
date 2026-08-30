import { STATUS_TONE_CLASS_ON_DARK } from "@/shared/design-system/components/status-tone";
import {
  OPERATIONAL_JOB_STATUS_STYLES,
  OPERATIONAL_STATUS_BADGE_BASE,
} from "@/shared/lib/operational-status-styles";
import {
  formatDispatchStatus,
  type DispatchJobStatus,
} from "@/shared/types/dispatch";

/**
 * Dispatch is a progression — scheduled, then a technician is moving on it,
 * then it is done — so the board only needs to separate those buckets. The
 * three active states (`dispatched`, `arrived`, `in_progress`) share `info`
 * because they mean the same thing to whoever is reading the board: someone is
 * on it. Their labels tell you which. Encoding them as three brass steps, as
 * this map used to, spent the brand accent on a distinction that was invisible
 * anyway.
 */
const NORTH_STAR_DISPATCH_STATUS_STYLES: Record<DispatchJobStatus, string> = {
  scheduled: STATUS_TONE_CLASS_ON_DARK.neutral,
  dispatched: STATUS_TONE_CLASS_ON_DARK.info,
  arrived: STATUS_TONE_CLASS_ON_DARK.info,
  in_progress: STATUS_TONE_CLASS_ON_DARK.info,
  completed: STATUS_TONE_CLASS_ON_DARK.success,
  cancelled: STATUS_TONE_CLASS_ON_DARK.neutral,
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
