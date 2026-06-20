/**
 * Types for the live Network V1 referrals feature.
 *
 * - `NetworkProfile` ↔ `network_profiles` — directory entry (discovery, not private CRM)
 * - `NetworkReferral` ↔ `network_referrals` — cross-company lead handoff
 *
 * Private partner CRM uses `network_partners` (`shared/types/network-partner.ts`).
 * See `shared/components/network/README.md`.
 */

import type {
  NetworkReferralStatus,
  NetworkReferralUrgency,
} from "@/lib/database/types/enums";
import type { LeadStatus } from "@/shared/types/lead";
import type {
  NetworkLocationPrecision,
  TradeType,
} from "@/shared/types/network";
import type { DirectoryFilter } from "@/shared/types/network-partner";

/** Maps to `network_profiles` — public/internal directory profile, not partner CRM. */
export type NetworkProfile = {
  id: string;
  companyId: string;
  displayName: string;
  tradeType: TradeType;
  serviceArea: string;
  city: string;
  state: string;
  postalCode: string;
  latitude?: number | null;
  longitude?: number | null;
  locationPrecision: NetworkLocationPrecision;
  showOnMap: boolean;
  acceptingReferrals: boolean;
  bio?: string;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
};

export type NetworkProfileFormData = {
  displayName: string;
  tradeType: TradeType;
  city: string;
  state: string;
  postalCode: string;
  serviceArea: string;
  bio: string;
  isVisible: boolean;
  showOnMap: boolean;
  acceptingReferrals: boolean;
};

export function normalizeNetworkProfileFormData(
  data: NetworkProfileFormData,
): NetworkProfileFormData {
  return {
    displayName: data.displayName.trim(),
    tradeType: data.tradeType,
    city: data.city.trim(),
    state: data.state.trim(),
    postalCode: data.postalCode.trim(),
    serviceArea: data.serviceArea.trim(),
    bio: data.bio.trim(),
    isVisible: data.isVisible,
    showOnMap: data.showOnMap,
    acceptingReferrals: data.acceptingReferrals,
  };
}

export function deriveNetworkLocationPrecision(input: {
  city: string;
  state: string;
  postalCode: string;
}): NetworkLocationPrecision {
  if (input.postalCode.trim()) {
    return "zip";
  }
  if (input.city.trim() || input.state.trim()) {
    return "city";
  }
  return "none";
}

export function hasNetworkProfileLocationData(
  profile: Pick<
    NetworkProfile,
    "city" | "state" | "postalCode" | "serviceArea"
  >,
): boolean {
  return Boolean(
    profile.city.trim() ||
      profile.state.trim() ||
      profile.postalCode.trim() ||
      profile.serviceArea.trim(),
  );
}

export function canEnableNetworkMapVisibility(
  profile: Pick<NetworkProfile, "city" | "state" | "postalCode">,
): boolean {
  return Boolean(
    profile.postalCode.trim() ||
      (profile.city.trim() && profile.state.trim()) ||
      profile.city.trim() ||
      profile.state.trim(),
  );
}

export function networkProfileToFormData(
  profile: NetworkProfile,
): NetworkProfileFormData {
  return {
    displayName: profile.displayName,
    tradeType: profile.tradeType,
    city: profile.city,
    state: profile.state,
    postalCode: profile.postalCode,
    serviceArea: profile.serviceArea,
    bio: profile.bio ?? "",
    isVisible: profile.isVisible,
    showOnMap: profile.showOnMap,
    acceptingReferrals: profile.acceptingReferrals,
  };
}

export function validateNetworkProfileFormData(
  data: NetworkProfileFormData,
): string | null {
  if (!data.displayName) {
    return "Display name is required.";
  }

  if (data.showOnMap && !canEnableNetworkMapVisibility(data)) {
    return "Add a city, state, or ZIP before enabling map visibility.";
  }

  return null;
}

export type NetworkDirectoryFilters = {
  search: string;
  tradeFilter: TradeType | "all";
  locationFilter: string;
  directoryFilter: DirectoryFilter;
  acceptingReferralsOnly: boolean;
};

function profileSearchHaystack(profile: NetworkProfile): string {
  return [
    profile.displayName,
    profile.tradeType,
    profile.city,
    profile.state,
    profile.postalCode,
    profile.serviceArea,
  ]
    .join(" ")
    .toLowerCase();
}

export function filterNetworkDirectoryProfiles(
  profiles: NetworkProfile[],
  filters: NetworkDirectoryFilters,
  trustedCompanyIds: Set<string>,
): NetworkProfile[] {
  let nextProfiles = profiles;

  if (filters.directoryFilter === "my-network") {
    nextProfiles = nextProfiles.filter((profile) =>
      trustedCompanyIds.has(profile.companyId),
    );
  }

  if (filters.tradeFilter !== "all") {
    nextProfiles = nextProfiles.filter(
      (profile) => profile.tradeType === filters.tradeFilter,
    );
  }

  if (filters.acceptingReferralsOnly) {
    nextProfiles = nextProfiles.filter((profile) => profile.acceptingReferrals);
  }

  const locationQuery = filters.locationFilter.trim().toLowerCase();
  if (locationQuery) {
    nextProfiles = nextProfiles.filter((profile) => {
      const haystack = [
        profile.city,
        profile.state,
        profile.postalCode,
        profile.serviceArea,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(locationQuery);
    });
  }

  const searchQuery = filters.search.trim().toLowerCase();
  if (searchQuery) {
    nextProfiles = nextProfiles.filter((profile) =>
      profileSearchHaystack(profile).includes(searchQuery),
    );
  }

  return nextProfiles;
}

export function collectTradeTypesFromProfiles(
  profiles: NetworkProfile[],
): TradeType[] {
  const trades = new Set<TradeType>();
  for (const profile of profiles) {
    trades.add(profile.tradeType);
  }
  return [...trades].sort((left, right) => left.localeCompare(right));
}

export function hasNetworkProfileMapLocation(
  profile: Pick<NetworkProfile, "city" | "state" | "postalCode">,
): boolean {
  return canEnableNetworkMapVisibility(profile);
}

export function isMapReadyForPreview(profile: NetworkProfile): boolean {
  return profile.showOnMap && hasNetworkProfileMapLocation(profile);
}

export function isMapPinReady(profile: NetworkProfile): boolean {
  return (
    profile.showOnMap &&
    profile.locationPrecision !== "none" &&
    hasNetworkProfileMapLocation(profile)
  );
}

export function formatNetworkLocationPrecision(
  precision: NetworkLocationPrecision,
): string | null {
  if (precision === "city") {
    return "City-level";
  }
  if (precision === "zip") {
    return "ZIP-level";
  }
  return null;
}

export type MapPreviewReadiness = {
  mapReadyCount: number;
  pinReadyCount: number;
  cityLevelCount: number;
  zipLevelCount: number;
  sampleAreas: string[];
  ownProfileMapReady: boolean;
  ownProfilePrecisionLabel: string | null;
};

export function summarizeMapPreviewReadiness(
  profiles: NetworkProfile[],
  ownProfile: NetworkProfile | null = null,
): MapPreviewReadiness {
  const mapReadyProfiles = profiles.filter(isMapReadyForPreview);
  const pinReadyProfiles = profiles.filter(isMapPinReady);
  const areas = new Set<string>();

  for (const profile of mapReadyProfiles) {
    if (profile.postalCode.trim()) {
      areas.add(
        [profile.city, profile.state, profile.postalCode]
          .filter(Boolean)
          .join(", "),
      );
    } else if (profile.city.trim() && profile.state.trim()) {
      areas.add(`${profile.city}, ${profile.state}`);
    } else if (profile.city.trim() || profile.state.trim()) {
      areas.add([profile.city, profile.state].filter(Boolean).join(", "));
    }
  }

  const ownProfileMapReady = ownProfile ? isMapReadyForPreview(ownProfile) : false;
  const ownProfilePrecisionLabel = ownProfile
    ? formatNetworkLocationPrecision(ownProfile.locationPrecision)
    : null;

  return {
    mapReadyCount: mapReadyProfiles.length,
    pinReadyCount: pinReadyProfiles.length,
    cityLevelCount: mapReadyProfiles.filter(
      (profile) => profile.locationPrecision === "city",
    ).length,
    zipLevelCount: mapReadyProfiles.filter(
      (profile) => profile.locationPrecision === "zip",
    ).length,
    sampleAreas: [...areas]
      .sort((left, right) => left.localeCompare(right))
      .slice(0, 8),
    ownProfileMapReady,
    ownProfilePrecisionLabel,
  };
}

/** Maps to `network_referrals` — cross-company lead handoff between Altair companies. */
export type NetworkReferral = {
  id: string;
  sourceCompanyId: string;
  targetCompanyId: string;
  sourceUserId: string;
  targetLeadId?: string;
  sourceNetworkProfileId?: string;
  targetNetworkProfileId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  serviceAddress: string;
  city: string;
  state: string;
  zip: string;
  requestedService: string;
  urgency: NetworkReferralUrgency;
  notes?: string;
  incentiveNote?: string;
  status: NetworkReferralStatus;
  declineReason?: string;
  createdAt: string;
  updatedAt: string;
  sourceCompanyName?: string;
  targetCompanyName?: string;
  sourceUserName?: string;
  targetLeadStatus?: LeadStatus;
};

export type NetworkReferralFormData = {
  targetNetworkProfileId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  serviceAddress: string;
  city: string;
  state: string;
  zip: string;
  requestedService: string;
  urgency: NetworkReferralUrgency;
  notes: string;
  incentiveNote: string;
};

export const NETWORK_REFERRAL_URGENCY_OPTIONS: {
  value: NetworkReferralUrgency;
  label: string;
}[] = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "urgent", label: "Urgent" },
  { value: "emergency", label: "Emergency" },
];

export const NETWORK_REFERRAL_STATUS_OPTIONS: {
  value: NetworkReferralStatus;
  label: string;
}[] = [
  { value: "sent", label: "Sent" },
  { value: "accepted", label: "Accepted" },
  { value: "declined", label: "Declined" },
  { value: "converted", label: "Converted" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
  { value: "cancelled", label: "Cancelled" },
];

export type NetworkReferralsTab =
  | "directory"
  | "my-network"
  | "invitations"
  | "sent-referrals"
  | "received-referrals";

export const NETWORK_REFERRALS_TAB_OPTIONS: {
  value: NetworkReferralsTab;
  label: string;
}[] = [
  { value: "directory", label: "Discover" },
  { value: "my-network", label: "My Network" },
  { value: "invitations", label: "Invitations" },
  { value: "sent-referrals", label: "Sent" },
  { value: "received-referrals", label: "Received" },
];

export function formatNetworkReferralUrgency(
  urgency: NetworkReferralUrgency,
): string {
  return (
    NETWORK_REFERRAL_URGENCY_OPTIONS.find((option) => option.value === urgency)
      ?.label ?? urgency
  );
}

export function formatNetworkReferralStatus(
  status: NetworkReferralStatus,
): string {
  return (
    NETWORK_REFERRAL_STATUS_OPTIONS.find((option) => option.value === status)
      ?.label ?? status
  );
}

export function formatNetworkReferralRequest(
  referral: Pick<NetworkReferral, "customerName" | "requestedService">,
): string {
  return `${referral.customerName} — ${referral.requestedService}`;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeNetworkReferralFormData(
  data: NetworkReferralFormData,
): NetworkReferralFormData {
  return {
    targetNetworkProfileId: data.targetNetworkProfileId.trim(),
    customerName: data.customerName.trim(),
    customerPhone: data.customerPhone.trim(),
    customerEmail: data.customerEmail.trim(),
    serviceAddress: data.serviceAddress.trim(),
    city: data.city.trim(),
    state: data.state.trim(),
    zip: data.zip.trim(),
    requestedService: data.requestedService.trim(),
    urgency: data.urgency,
    notes: data.notes.trim(),
    incentiveNote: data.incentiveNote.trim(),
  };
}

export function validateNetworkReferralFormData(
  data: NetworkReferralFormData,
): string | null {
  if (!data.targetNetworkProfileId) {
    return "Select a network company to receive this referral.";
  }

  if (!data.customerName) {
    return "Customer name is required.";
  }

  if (!data.requestedService) {
    return "Requested service or issue is required.";
  }

  if (!data.customerPhone && !data.customerEmail) {
    return "Provide at least a phone number or email for the customer.";
  }

  if (data.customerEmail && !EMAIL_PATTERN.test(data.customerEmail)) {
    return "Enter a valid customer email address.";
  }

  return null;
}

export function splitCustomerName(customerName: string): {
  firstName: string;
  lastName: string;
} {
  const trimmed = customerName.trim();
  const parts = trimmed.split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return { firstName: "Referral", lastName: "Lead" };
  }

  if (parts.length === 1) {
    return { firstName: parts[0]!, lastName: "—" };
  }

  return {
    firstName: parts[0]!,
    lastName: parts.slice(1).join(" "),
  };
}

export function buildReferralLeadNotes(input: {
  referralId: string;
  sourceCompanyName: string;
  sourceUserName?: string;
  sourceCompanyId: string;
  sourceNetworkProfileId?: string;
  serviceAddress: string;
  city: string;
  state: string;
  zip: string;
  requestedService: string;
  urgency: NetworkReferralUrgency;
  notes?: string;
  incentiveNote?: string;
}): string {
  const lines = [
    "Network Referral",
    `Referred by: ${input.sourceCompanyName}`,
    input.sourceUserName ? `Referring contact: ${input.sourceUserName}` : null,
    "",
    `Service: ${input.requestedService}`,
    `Urgency: ${formatNetworkReferralUrgency(input.urgency)}`,
    `Address: ${[input.serviceAddress, input.city, input.state, input.zip]
      .filter(Boolean)
      .join(", ")}`,
    input.notes ? `Referral notes: ${input.notes}` : null,
    input.incentiveNote ? `Incentive note: ${input.incentiveNote}` : null,
    "",
    `Referral ID: ${input.referralId}`,
  ].filter((line): line is string => line !== null);

  return lines.join("\n");
}
