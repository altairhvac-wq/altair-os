import type { NetworkReferral } from "@/shared/types/network-referral";

export type NetworkReferralSummaryMetrics = {
  pending: number;
  accepted: number;
  converted: number;
  won: number;
  lost: number;
};

export const EMPTY_NETWORK_REFERRAL_SUMMARY_METRICS: NetworkReferralSummaryMetrics =
  {
    pending: 0,
    accepted: 0,
    converted: 0,
    won: 0,
    lost: 0,
  };

export function buildNetworkReferralSummaryMetrics(
  referrals: NetworkReferral[],
): NetworkReferralSummaryMetrics {
  return referrals.reduce<NetworkReferralSummaryMetrics>(
    (metrics, referral) => {
      switch (referral.status) {
        case "sent":
          metrics.pending += 1;
          break;
        case "accepted":
          metrics.accepted += 1;
          break;
        case "converted":
          metrics.converted += 1;
          break;
        case "won":
          metrics.won += 1;
          break;
        case "lost":
          metrics.lost += 1;
          break;
        case "declined":
        case "cancelled":
          break;
        default:
          break;
      }

      return metrics;
    },
    { ...EMPTY_NETWORK_REFERRAL_SUMMARY_METRICS },
  );
}

/** Referrals that cleared acceptance (excludes pending, declined, and cancelled). */
export function getNetworkReferralAcceptedDenominator(
  metrics: NetworkReferralSummaryMetrics,
): number {
  return metrics.accepted + metrics.converted + metrics.won + metrics.lost;
}

export function getNetworkReferralWinRate(
  metrics: NetworkReferralSummaryMetrics,
): number | null {
  const denominator = getNetworkReferralAcceptedDenominator(metrics);
  if (denominator === 0) {
    return null;
  }

  return metrics.won / denominator;
}

export function getNetworkReferralConversionRate(
  metrics: NetworkReferralSummaryMetrics,
): number | null {
  const denominator = getNetworkReferralAcceptedDenominator(metrics);
  if (denominator === 0) {
    return null;
  }

  return (metrics.converted + metrics.won) / denominator;
}
