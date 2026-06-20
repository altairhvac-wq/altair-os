import { Handshake } from "lucide-react";
import type { NetworkSurface } from "./north-star-m11/network-north-star-styles";

type NetworkAcceptingReferralsBadgeProps = {
  className?: string;
  surface?: NetworkSurface;
};

export function NetworkAcceptingReferralsBadge({
  className = "",
  surface = "legacy",
}: NetworkAcceptingReferralsBadgeProps) {
  const badgeClass =
    surface === "north-star"
      ? "inline-flex items-center gap-1 rounded-full bg-[rgba(59,130,246,0.08)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#3B5998] ring-1 ring-[rgba(59,130,246,0.18)]"
      : "inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-700 ring-1 ring-sky-200";

  return (
    <span className={`${badgeClass} ${className}`}>
      <Handshake className="h-3 w-3" />
      Accepting referrals
    </span>
  );
}
