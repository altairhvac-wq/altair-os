import type { MembershipStatus } from "@/lib/database/types/enums";
import { formatMembershipStatus } from "@/shared/types/team-member";

type MembershipStatusBadgeProps = {
  status: MembershipStatus;
  className?: string;
};

const statusStyles: Record<MembershipStatus, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  invited: "bg-amber-50 text-amber-700 ring-amber-600/20",
  suspended: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

export function MembershipStatusBadge({
  status,
  className = "",
}: MembershipStatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${statusStyles[status]} ${className}`}
    >
      {formatMembershipStatus(status)}
    </span>
  );
}
