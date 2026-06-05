import { LEAD_STATUS_BADGE_STYLES } from "@/shared/lib/leads/lead-status";
import { formatLeadStatus, type LeadStatus } from "@/shared/types/lead";

type LeadStatusBadgeProps = {
  status: LeadStatus;
};

export function LeadStatusBadge({ status }: LeadStatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${LEAD_STATUS_BADGE_STYLES[status]}`}
    >
      {formatLeadStatus(status)}
    </span>
  );
}
