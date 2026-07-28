/**
 * Presentation helpers for Community business profiles (Phase 1 storefront).
 * Uses existing network_profiles fields only — no schema assumptions beyond NetworkProfile.
 */

import type { NetworkProfile } from "@/shared/types/network-referral";
import { hasNetworkProfileLocationData } from "@/shared/types/network-referral";
import { formatDate } from "@/shared/types/customer";

/** City, state, and ZIP as a single location line. */
export function formatNetworkProfileCityStateZip(
  profile: Pick<NetworkProfile, "city" | "state" | "postalCode">,
): string | null {
  const line = [profile.city, profile.state, profile.postalCode]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
  return line || null;
}

/**
 * Directory/card location line: city/state/ZIP, optionally combined with service area.
 */
export function formatNetworkProfileLocationLine(
  profile: Pick<
    NetworkProfile,
    "city" | "state" | "postalCode" | "serviceArea"
  >,
): string | null {
  const cityStateZip = formatNetworkProfileCityStateZip(profile);
  const serviceArea = profile.serviceArea.trim();

  if (cityStateZip && serviceArea) {
    return `${cityStateZip} · ${serviceArea}`;
  }

  return cityStateZip || serviceArea || null;
}

export function hasNetworkProfileBio(
  profile: Pick<NetworkProfile, "bio">,
): boolean {
  return Boolean(profile.bio?.trim());
}

export function hasNetworkProfileServiceArea(
  profile: Pick<NetworkProfile, "serviceArea">,
): boolean {
  return Boolean(profile.serviceArea.trim());
}

/** Month + year tenure label from profile.createdAt. */
export function formatNetworkProfileMemberSince(
  createdAt: string,
  timeZone?: string,
): string {
  return formatDate(createdAt, timeZone);
}

export type CommunityProfileEmptyHints = {
  missingAbout: boolean;
  missingServiceArea: boolean;
  missingLocation: boolean;
};

export function getCommunityProfileEmptyHints(
  profile: NetworkProfile,
): CommunityProfileEmptyHints {
  return {
    missingAbout: !hasNetworkProfileBio(profile),
    missingServiceArea: !hasNetworkProfileServiceArea(profile),
    missingLocation: !hasNetworkProfileLocationData(profile),
  };
}
