import type { MembershipStatus } from "@/lib/database/types/enums";
import {
  OPERATIONAL_MEMBERSHIP_STATUS_STYLES,
  OPERATIONAL_STATUS_BADGE_BASE,
} from "@/shared/lib/operational-status-styles";
import { formatMembershipStatus } from "@/shared/types/team-member";

type MembershipStatusBadgeProps = {
  status: MembershipStatus;
  className?: string;
};

export function MembershipStatusBadge({
  status,
  className = "",
}: MembershipStatusBadgeProps) {
  return (
    <span
      className={`${OPERATIONAL_STATUS_BADGE_BASE} ${OPERATIONAL_MEMBERSHIP_STATUS_STYLES[status]} ${className}`}
    >
      {formatMembershipStatus(status)}
    </span>
  );
}
