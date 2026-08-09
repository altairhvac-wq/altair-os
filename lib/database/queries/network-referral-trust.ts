/**
 * Computed trust metrics for Community directory profiles.
 *
 * Wraps the SECURITY DEFINER RPC `get_network_referral_trust_stats`
 * (migration 137), which exposes ONLY per-company aggregates over referrals
 * they RECEIVED, and only for profiles currently visible in the directory.
 * Everything here is real recorded behavior — no self-reported numbers.
 */

import { createClient } from "@/lib/supabase/server";
import type { NetworkReferralTrustStats } from "@/shared/lib/network/trust-metrics";

type TrustStatsRpcRow = {
  profile_id: string;
  referrals_handled: number;
  accepted_count: number;
  declined_count: number;
  won_count: number;
  median_response_seconds: number | null;
  response_samples: number;
};

/**
 * Fetch trust stats for the given directory profile IDs.
 * Returns a map keyed by profile ID; profiles with zero received referrals
 * (or that are not visible) simply have no entry.
 */
export async function getNetworkReferralTrustStatsByProfileId(
  profileIds: string[],
): Promise<Record<string, NetworkReferralTrustStats>> {
  const uniqueIds = Array.from(new Set(profileIds.filter(Boolean)));
  if (uniqueIds.length === 0) {
    return {};
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "get_network_referral_trust_stats",
    { p_profile_ids: uniqueIds },
  );

  if (error) {
    console.error(
      "[getNetworkReferralTrustStatsByProfileId] RPC failed:",
      error,
    );
    return {};
  }

  const stats: Record<string, NetworkReferralTrustStats> = {};

  for (const row of (data ?? []) as TrustStatsRpcRow[]) {
    if (!row || typeof row.profile_id !== "string") {
      continue;
    }

    stats[row.profile_id] = {
      profileId: row.profile_id,
      referralsHandled: row.referrals_handled ?? 0,
      acceptedCount: row.accepted_count ?? 0,
      declinedCount: row.declined_count ?? 0,
      wonCount: row.won_count ?? 0,
      medianResponseSeconds:
        typeof row.median_response_seconds === "number"
          ? row.median_response_seconds
          : null,
      responseSamples: row.response_samples ?? 0,
    };
  }

  return stats;
}
