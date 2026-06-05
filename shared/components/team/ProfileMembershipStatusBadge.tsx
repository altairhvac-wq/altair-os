import type { MembershipStatus } from "@/lib/database/types/enums";
import {
  OPERATIONAL_STATUS_BADGE_BASE,
} from "@/shared/lib/operational-status-styles";
import { formatProfileMembershipStatus } from "@/shared/types/team-member-profile";

const PROFILE_MEMBERSHIP_STATUS_STYLES: Record<MembershipStatus, string> = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-800",
  invited: "border-amber-200 bg-amber-50 text-amber-800",
  suspended: "border-slate-200 bg-slate-100 text-slate-600",
};

type ProfileMembershipStatusBadgeProps = {
  status: MembershipStatus;
  className?: string;
};

export function ProfileMembershipStatusBadge({
  status,
  className = "",
}: ProfileMembershipStatusBadgeProps) {
  return (
    <span
      className={`${OPERATIONAL_STATUS_BADGE_BASE} ${PROFILE_MEMBERSHIP_STATUS_STYLES[status]} ${className}`}
    >
      {formatProfileMembershipStatus(status)}
    </span>
  );
}
