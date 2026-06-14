import type { NetworkReferral } from "@/shared/types/network-referral";

export type NetworkReferralSummaryMetrics = {
  sent: number;
  accepted: number;
  convertedOrWon: number;
  lost: number;
};

export const EMPTY_NETWORK_REFERRAL_SUMMARY_METRICS: NetworkReferralSummaryMetrics =
  {
    sent: 0,
    accepted: 0,
    convertedOrWon: 0,
    lost: 0,
  };

export function buildNetworkReferralSummaryMetrics(
  referrals: NetworkReferral[],
): NetworkReferralSummaryMetrics {
  return referrals.reduce<NetworkReferralSummaryMetrics>(
    (metrics, referral) => {
      switch (referral.status) {
        case "sent":
          metrics.sent += 1;
          break;
        case "accepted":
          metrics.accepted += 1;
          break;
        case "converted":
        case "won":
          metrics.convertedOrWon += 1;
          break;
        case "lost":
          metrics.lost += 1;
          break;
        default:
          break;
      }

      return metrics;
    },
    { ...EMPTY_NETWORK_REFERRAL_SUMMARY_METRICS },
  );
}
