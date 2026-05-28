import {
  OPERATIONAL_TIME_ENTRY_STATUS_STYLES,
  OPERATIONAL_STATUS_BADGE_BASE,
} from "@/shared/lib/operational-status-styles";
import {
  formatMockTimeEntryStatus,
  type MockTimeEntryStatus,
} from "@/shared/types/time-entry-mock";

type TimeEntryStatusBadgeProps = {
  status: MockTimeEntryStatus;
  className?: string;
};

export function TimeEntryStatusBadge({
  status,
  className = "",
}: TimeEntryStatusBadgeProps) {
  return (
    <span
      className={`${OPERATIONAL_STATUS_BADGE_BASE} ${OPERATIONAL_TIME_ENTRY_STATUS_STYLES[status]} ${className}`}
    >
      {formatMockTimeEntryStatus(status)}
    </span>
  );
}
