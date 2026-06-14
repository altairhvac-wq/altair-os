/**
 * Types for `network_partners` — private company partner CRM.
 *
 * Network Connections V1 uses rows with `linkedCompanyId` set as the source
 * company's one-sided "My Network" / trusted partners list. Distinct from
 * `network_profiles` (directory) and `network_referrals` (lead handoff).
 *
 * See `shared/components/network/README.md`.
 */

import type { RelationshipStatus } from "@/lib/database/types/enums";
import type { NetworkProfile } from "@/shared/types/network-referral";
import type { TradeType } from "@/shared/types/network";

/** Maps to `network_partners` — private partner CRM row owned by `companyId`. */
export type NetworkPartner = {
  id: string;
  companyId: string;
  linkedCompanyId?: string;
  partnerCompanyName: string;
  contactName: string;
  email: string;
  phone: string;
  tradeType: TradeType;
  serviceArea: string;
  city: string;
  state: string;
  relationshipStatus: RelationshipStatus;
  createdAt: string;
  updatedAt: string;
};

/** Partner enriched with the live directory profile when still visible. */
export type MyNetworkPartner = NetworkPartner & {
  linkedProfile: NetworkProfile | null;
};

export function enrichMyNetworkPartners(
  partners: NetworkPartner[],
  visibleProfiles: NetworkProfile[],
): MyNetworkPartner[] {
  const profileByCompanyId = new Map(
    visibleProfiles.map((profile) => [profile.companyId, profile]),
  );

  return partners.map((partner) => ({
    ...partner,
    linkedProfile: partner.linkedCompanyId
      ? (profileByCompanyId.get(partner.linkedCompanyId) ?? null)
      : null,
  }));
}

export function getTrustedCompanyIds(partners: NetworkPartner[]): Set<string> {
  return new Set(
    partners
      .map((partner) => partner.linkedCompanyId)
      .filter((companyId): companyId is string => Boolean(companyId)),
  );
}

export const MY_NETWORK_EMPTY_MESSAGE =
  "Add trusted companies to your network so you can quickly send referrals and track partner relationships.";

export type DirectoryFilter = "all" | "my-network";

export const DIRECTORY_FILTER_OPTIONS: {
  value: DirectoryFilter;
  label: string;
}[] = [
  { value: "all", label: "All companies" },
  { value: "my-network", label: "My Network" },
];
