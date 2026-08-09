/**
 * Trust-metric types, thresholds, and formatting for the Community directory.
 *
 * Philosophy (locked in with the founder): trust is COMPUTED from real
 * referral behavior, never self-reported — no star ratings, no endorsements.
 * Rates only render once a company has handled at least
 * MIN_HANDLED_FOR_TRUST_RATES referrals, so one early decline can't brand a
 * new company with "0% acceptance"; below that they get a neutral
 * "building history" state. No opt-out: metrics are uniform for everyone,
 * which is exactly what makes them credible.
 */

export type NetworkReferralTrustStats = {
  profileId: string;
  /** Received referrals responded to (everything except still-sent / cancelled). */
  referralsHandled: number;
  /** Handled referrals that were accepted (incl. converted/won/lost afterwards). */
  acceptedCount: number;
  declinedCount: number;
  /** Referred jobs whose lead outcome reached "won". */
  wonCount: number;
  /** Median seconds from referral sent to first accept/decline; null if no samples. */
  medianResponseSeconds: number | null;
  responseSamples: number;
};

/** Minimum handled referrals before acceptance/response rates are shown. */
export const MIN_HANDLED_FOR_TRUST_RATES = 3;

export function hasTrustRates(
  stats: NetworkReferralTrustStats | undefined,
): stats is NetworkReferralTrustStats {
  return (stats?.referralsHandled ?? 0) >= MIN_HANDLED_FOR_TRUST_RATES;
}

export function getAcceptanceRatePercent(
  stats: NetworkReferralTrustStats,
): number | null {
  if (stats.referralsHandled <= 0) {
    return null;
  }
  return Math.round((stats.acceptedCount / stats.referralsHandled) * 100);
}

/** "45m" / "3h" / "2d" — coarse on purpose; precision would imply more than we know. */
export function formatMedianResponseTime(
  stats: NetworkReferralTrustStats,
): string | null {
  if (
    stats.medianResponseSeconds === null ||
    stats.responseSamples < MIN_HANDLED_FOR_TRUST_RATES
  ) {
    return null;
  }

  const seconds = stats.medianResponseSeconds;
  if (seconds < 60 * 60) {
    return `${Math.max(1, Math.round(seconds / 60))}m`;
  }
  if (seconds < 48 * 60 * 60) {
    return `${Math.round(seconds / (60 * 60))}h`;
  }
  return `${Math.round(seconds / (24 * 60 * 60))}d`;
}

export const TRUST_BUILDING_HISTORY_LABEL = "Building referral history";
