/**
 * Computed trust-metric display for Community directory profiles.
 *
 * Two renderings of the same real data (see shared/lib/network/trust-metrics):
 * - `NetworkTrustMetricsLine` — one compact line for directory cards.
 * - `NetworkTrustMetricsSection` — labeled rows for the profile detail panel.
 *
 * Below the minimum-volume threshold both render a neutral
 * "Building referral history" state instead of a harsh-looking rate.
 */

import { Activity } from "lucide-react";
import {
  MIN_HANDLED_FOR_TRUST_RATES,
  TRUST_BUILDING_HISTORY_LABEL,
  formatMedianResponseTime,
  getAcceptanceRatePercent,
  hasTrustRates,
  type NetworkReferralTrustStats,
} from "@/shared/lib/network/trust-metrics";
import { st, type NetworkSurface } from "./north-star-m11/network-north-star-styles";

type TrustMetricsProps = {
  stats?: NetworkReferralTrustStats;
  surface?: NetworkSurface;
};

function buildCompactSummary(stats: NetworkReferralTrustStats): string {
  const parts: string[] = [];

  const acceptanceRate = getAcceptanceRatePercent(stats);
  if (acceptanceRate !== null) {
    parts.push(`Accepts ${acceptanceRate}%`);
  }

  parts.push(`${stats.wonCount} won`);

  const responseTime = formatMedianResponseTime(stats);
  if (responseTime) {
    parts.push(`responds ~${responseTime}`);
  }

  return parts.join(" · ");
}

export function NetworkTrustMetricsLine({
  stats,
  surface = "legacy",
}: TrustMetricsProps) {
  const isNorthStar = surface === "north-star";
  const mutedClass = isNorthStar ? st.cardMuted : "text-xs text-slate-400";

  if (!hasTrustRates(stats)) {
    return (
      <p className={`mt-0.5 ${mutedClass}`}>{TRUST_BUILDING_HISTORY_LABEL}</p>
    );
  }

  const summaryClass = isNorthStar
    ? "mt-0.5 flex items-center gap-1 text-xs font-medium text-[#4F4638]"
    : "mt-1 flex items-center gap-1 text-xs font-medium text-slate-600";
  const iconClass = isNorthStar
    ? "h-3 w-3 shrink-0 text-[#8A6324]"
    : "h-3 w-3 shrink-0 text-slate-400";

  return (
    <p className={summaryClass}>
      <Activity className={iconClass} aria-hidden="true" />
      <span className="truncate">{buildCompactSummary(stats)}</span>
    </p>
  );
}

export function NetworkTrustMetricsSection({
  stats,
  surface = "legacy",
}: TrustMetricsProps) {
  const isNorthStar = surface === "north-star";
  const headingClass = isNorthStar
    ? "text-xs font-bold uppercase tracking-wide text-[#8A6324]"
    : "text-xs font-bold uppercase tracking-wide text-slate-500";
  const mutedClass = isNorthStar ? "text-sm text-[#6B6255]" : "text-sm text-slate-500";
  const labelClass = isNorthStar ? "text-xs text-[#6B6255]" : "text-xs text-slate-500";
  const valueClass = isNorthStar
    ? "text-sm font-semibold text-[#17130E]"
    : "text-sm font-semibold text-slate-900";

  if (!hasTrustRates(stats)) {
    return (
      <section className="space-y-1.5">
        <h3 className={headingClass}>Referral track record</h3>
        <p className={mutedClass}>
          {TRUST_BUILDING_HISTORY_LABEL} — metrics appear after{" "}
          {MIN_HANDLED_FOR_TRUST_RATES} handled referrals. All numbers come from
          real referral activity, never self-reported.
        </p>
      </section>
    );
  }

  const acceptanceRate = getAcceptanceRatePercent(stats);
  const responseTime = formatMedianResponseTime(stats);

  const rows: { label: string; value: string }[] = [
    { label: "Referrals handled", value: String(stats.referralsHandled) },
    ...(acceptanceRate !== null
      ? [{ label: "Acceptance rate", value: `${acceptanceRate}%` }]
      : []),
    { label: "Referred jobs won", value: String(stats.wonCount) },
    ...(responseTime
      ? [{ label: "Median response time", value: `~${responseTime}` }]
      : []),
  ];

  return (
    <section className="space-y-1.5">
      <h3 className={headingClass}>Referral track record</h3>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className={labelClass}>{row.label}</dt>
            <dd className={valueClass}>{row.value}</dd>
          </div>
        ))}
      </dl>
      <p className={labelClass}>
        Computed from real referral activity on Altair — never self-reported.
      </p>
    </section>
  );
}
