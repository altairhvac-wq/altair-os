import { BadgeCheck } from "lucide-react";
import type { NetworkSurface } from "./north-star-m11/network-north-star-styles";

type NetworkTrustedBadgeProps = {
  className?: string;
  surface?: NetworkSurface;
};

export function NetworkTrustedBadge({
  className = "",
  surface = "legacy",
}: NetworkTrustedBadgeProps) {
  const badgeClass =
    surface === "north-star"
      ? "inline-flex items-center gap-1 rounded-full bg-[rgba(201,164,77,0.12)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#8A6324] ring-1 ring-[rgba(201,164,77,0.22)]"
      : "inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200";

  return (
    <span className={`${badgeClass} ${className}`}>
      <BadgeCheck className="h-3 w-3" />
      Trusted Partner
    </span>
  );
}
