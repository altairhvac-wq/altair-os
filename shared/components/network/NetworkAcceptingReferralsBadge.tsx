import { Handshake, PauseCircle } from "lucide-react";
import type { NetworkSurface } from "./north-star-m11/network-north-star-styles";

type NetworkAcceptingReferralsBadgeProps = {
  /** When false, shows an explicit not-accepting state for trust clarity. */
  accepting?: boolean;
  className?: string;
  surface?: NetworkSurface;
};

export function NetworkAcceptingReferralsBadge({
  accepting = true,
  className = "",
  surface = "legacy",
}: NetworkAcceptingReferralsBadgeProps) {
  if (accepting) {
    const badgeClass =
      surface === "north-star"
        ? "inline-flex items-center gap-1 rounded-full bg-[rgba(59,130,246,0.08)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#635A45] ring-1 ring-[rgba(59,130,246,0.18)]"
        : "inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-700 ring-1 ring-sky-200";

    return (
      <span className={`${badgeClass} ${className}`}>
        <Handshake className="h-3 w-3" />
        Accepting referrals
      </span>
    );
  }

  const badgeClass =
    surface === "north-star"
      ? "inline-flex items-center gap-1 rounded-full bg-[rgba(107,98,85,0.10)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#6B6255] ring-1 ring-[rgba(107,98,85,0.18)]"
      : "inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 ring-1 ring-slate-200";

  return (
    <span className={`${badgeClass} ${className}`}>
      <PauseCircle className="h-3 w-3" />
      Not accepting referrals
    </span>
  );
}
