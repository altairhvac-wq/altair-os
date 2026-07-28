import {
  hasNetworkProfileLocationData,
  type NetworkProfile,
} from "@/shared/types/network-referral";

export type CommunityProfileReadinessReason =
  | "missing"
  | "hidden"
  | "incomplete";

export type CommunityProfileReadiness = {
  reason: CommunityProfileReadinessReason;
  title: string;
  description: string;
  ctaLabel: string;
};

/**
 * Honest profile-readiness prompt from existing network_profiles fields.
 * Returns null when the profile is sufficiently complete for discovery,
 * or when the user cannot manage Community identity.
 */
export function getCommunityProfileReadiness(
  profile: NetworkProfile | null,
  canManageProfile: boolean,
): CommunityProfileReadiness | null {
  if (!canManageProfile) {
    return null;
  }

  if (!profile) {
    return {
      reason: "missing",
      title: "Finish your Community profile",
      description:
        "Set up how your business appears so nearby owners can tell what you do, where you work, and whether they can confidently refer a customer to you.",
      ctaLabel: "Set up profile",
    };
  }

  if (!profile.isVisible) {
    return {
      reason: "hidden",
      title: "Make your business visible to the Community",
      description:
        "Your profile is hidden from the directory. Visible profiles are easier to find and more likely to receive relevant referrals.",
      ctaLabel: "Update profile",
    };
  }

  const hasBio = Boolean(profile.bio?.trim());
  const hasLocation = hasNetworkProfileLocationData(profile);

  if (!hasBio || !hasLocation) {
    return {
      reason: "incomplete",
      title: "Finish your Community profile",
      description:
        "Add a short business description and where you serve so another owner can decide whether to refer a customer to you.",
      ctaLabel: "Complete profile",
    };
  }

  return null;
}
