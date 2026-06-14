import { Network } from "lucide-react";
import type { LeadNetworkReferralSummary } from "@/shared/types/lead";

type NetworkReferralBadgeProps = {
  referral?: LeadNetworkReferralSummary;
  compact?: boolean;
};

export function NetworkReferralBadge({
  referral,
  compact = false,
}: NetworkReferralBadgeProps) {
  if (!referral) {
    return null;
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-800 ring-1 ring-sky-200 ${
        compact ? "" : "mt-1"
      }`}
    >
      <Network className="h-3 w-3" aria-hidden="true" />
      <span>Network Referral</span>
    </div>
  );
}

export function NetworkReferralAttribution({
  referral,
}: {
  referral?: LeadNetworkReferralSummary;
}) {
  if (!referral) {
    return null;
  }

  return (
    <div className="rounded-xl border border-sky-100 bg-gradient-to-br from-white to-sky-50/60 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-600 text-white">
          <Network className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
            Network Referral
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            Referred by {referral.sourceCompanyName}
          </p>
          {referral.sourceUserName ? (
            <p className="mt-0.5 text-xs text-slate-600">
              Contact: {referral.sourceUserName}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
