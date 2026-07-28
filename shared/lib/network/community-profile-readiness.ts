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
        "Add how your business presents itself so nearby companies understand what you do, find you in the directory, and send useful referrals.",
      ctaLabel: "Set up profile",
    };
  }

  if (!profile.isVisible) {
    return {
      reason: "hidden",
      title: "Make your business visible to the Community",
      description:
        "Your profile is currently hidden from the directory. Making it visible helps nearby businesses discover what you do and improves relevant referrals.",
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
        "Add a short description and service area so nearby businesses understand what you do and can refer work more confidently.",
      ctaLabel: "Complete profile",
    };
  }

  return null;
}
