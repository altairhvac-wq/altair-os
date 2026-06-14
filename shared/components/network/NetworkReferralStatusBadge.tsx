import type { NetworkReferralStatus } from "@/lib/database/types/enums";
import { formatNetworkReferralStatus } from "@/shared/types/network-referral";

const statusStyles: Record<NetworkReferralStatus, string> = {
  sent: "bg-blue-50 text-blue-700 ring-blue-600/20",
  accepted: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  declined: "bg-rose-50 text-rose-700 ring-rose-600/20",
  converted: "bg-violet-50 text-violet-700 ring-violet-600/20",
  won: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  lost: "bg-slate-100 text-slate-600 ring-slate-500/20",
  cancelled: "bg-slate-100 text-slate-500 ring-slate-500/20",
};

type NetworkReferralStatusBadgeProps = {
  status: NetworkReferralStatus;
};

export function NetworkReferralStatusBadge({
  status,
}: NetworkReferralStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${statusStyles[status]}`}
    >
      {formatNetworkReferralStatus(status)}
    </span>
  );
}
