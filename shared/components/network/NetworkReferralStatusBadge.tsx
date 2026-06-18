import type { NetworkReferralStatus } from "@/lib/database/types/enums";
import { formatNetworkReferralStatus } from "@/shared/types/network-referral";
import type { NetworkSurface } from "./north-star-m11/network-north-star-styles";

const legacyStatusStyles: Record<NetworkReferralStatus, string> = {
  sent: "bg-blue-50 text-blue-700 ring-blue-600/20",
  accepted: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  declined: "bg-rose-50 text-rose-700 ring-rose-600/20",
  converted: "bg-violet-50 text-violet-700 ring-violet-600/20",
  won: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  lost: "bg-slate-100 text-slate-600 ring-slate-500/20",
  cancelled: "bg-slate-100 text-slate-500 ring-slate-500/20",
};

const northStarStatusStyles: Record<NetworkReferralStatus, string> = {
  sent: "bg-[rgba(201,164,77,0.14)] text-[#8A6324] ring-[rgba(201,164,77,0.28)]",
  accepted: "bg-[rgba(22,101,52,0.10)] text-[#166534] ring-[rgba(22,101,52,0.22)]",
  declined: "bg-[rgba(185,28,28,0.08)] text-[#991B1B] ring-[rgba(185,28,28,0.20)]",
  converted: "bg-[rgba(138,99,36,0.10)] text-[#6B6255] ring-[rgba(138,99,36,0.18)]",
  won: "bg-[rgba(22,101,52,0.12)] text-[#166534] ring-[rgba(22,101,52,0.24)]",
  lost: "bg-[rgba(138,99,36,0.08)] text-[#6B6255] ring-[rgba(138,99,36,0.14)]",
  cancelled: "bg-[rgba(138,99,36,0.08)] text-[#6B6255] ring-[rgba(138,99,36,0.14)]",
};

type NetworkReferralStatusBadgeProps = {
  status: NetworkReferralStatus;
  surface?: NetworkSurface;
};

export function NetworkReferralStatusBadge({
  status,
  surface = "legacy",
}: NetworkReferralStatusBadgeProps) {
  const statusStyles =
    surface === "north-star" ? northStarStatusStyles : legacyStatusStyles;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${statusStyles[status]}`}
    >
      {formatNetworkReferralStatus(status)}
    </span>
  );
}
