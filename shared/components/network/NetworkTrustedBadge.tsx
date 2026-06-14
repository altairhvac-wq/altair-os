import { BadgeCheck } from "lucide-react";

type NetworkTrustedBadgeProps = {
  className?: string;
};

export function NetworkTrustedBadge({ className = "" }: NetworkTrustedBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200 ${className}`}
    >
      <BadgeCheck className="h-3 w-3" />
      Trusted Partner
    </span>
  );
}
