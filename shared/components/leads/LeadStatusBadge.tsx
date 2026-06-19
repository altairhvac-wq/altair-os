import { LEAD_STATUS_BADGE_STYLES } from "@/shared/lib/leads/lead-status";
import { LEAD_STATUS_NORTH_STAR_BADGE_STYLES } from "@/shared/components/leads/north-star-m14/lead-north-star-styles";
import { formatLeadStatus, type LeadStatus } from "@/shared/types/lead";

type LeadStatusBadgeProps = {
  status: LeadStatus;
  northStar?: boolean;
};

export function LeadStatusBadge({ status, northStar = false }: LeadStatusBadgeProps) {
  const styles = northStar
    ? LEAD_STATUS_NORTH_STAR_BADGE_STYLES[status]
    : LEAD_STATUS_BADGE_STYLES[status];

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${styles}`}
    >
      {formatLeadStatus(status)}
    </span>
  );
}
