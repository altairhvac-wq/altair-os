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

function getNetworkPartnerDedupeKey(partner: NetworkPartner): string {
  return partner.linkedCompanyId ?? partner.id;
}

/** Upsert an active linked partner without duplicating by linked company or id. */
export function upsertActiveNetworkPartner(
  partners: NetworkPartner[],
  partner: NetworkPartner,
): NetworkPartner[] {
  const dedupeKey = getNetworkPartnerDedupeKey(partner);
  const next = partners.filter(
    (existing) => getNetworkPartnerDedupeKey(existing) !== dedupeKey,
  );

  if (partner.relationshipStatus !== "active" || !partner.linkedCompanyId) {
    return next;
  }

  return [...next, partner].sort((left, right) =>
    left.partnerCompanyName.localeCompare(right.partnerCompanyName),
  );
}

/** Remove a linked partner from local My Network state after a successful remove. */
export function removeNetworkPartnerByLinkedCompanyId(
  partners: NetworkPartner[],
  linkedCompanyId: string,
): NetworkPartner[] {
  return partners.filter(
    (partner) => partner.linkedCompanyId !== linkedCompanyId,
  );
}

/** Tracks local add/remove mutations until server props confirm the same state. */
export type NetworkPartnerMutations = {
  pendingAdds: Map<string, NetworkPartner>;
  pendingRemoves: Set<string>;
};

export function createEmptyNetworkPartnerMutations(): NetworkPartnerMutations {
  return { pendingAdds: new Map(), pendingRemoves: new Set() };
}

export function registerNetworkPartnerAdd(
  mutations: NetworkPartnerMutations,
  partner: NetworkPartner,
): NetworkPartnerMutations {
  if (!partner.linkedCompanyId) {
    return mutations;
  }

  const pendingAdds = new Map(mutations.pendingAdds);
  pendingAdds.set(partner.linkedCompanyId, partner);

  const pendingRemoves = new Set(mutations.pendingRemoves);
  pendingRemoves.delete(partner.linkedCompanyId);

  return { pendingAdds, pendingRemoves };
}

export function registerNetworkPartnerRemove(
  mutations: NetworkPartnerMutations,
  linkedCompanyId: string,
): NetworkPartnerMutations {
  const pendingAdds = new Map(mutations.pendingAdds);
  pendingAdds.delete(linkedCompanyId);

  const pendingRemoves = new Set(mutations.pendingRemoves);
  pendingRemoves.add(linkedCompanyId);

  return { pendingAdds, pendingRemoves };
}

/** Clear pending flags once server props reflect the same add/remove outcome. */
export function reconcileNetworkPartnerMutations(
  mutations: NetworkPartnerMutations,
  serverPartners: NetworkPartner[],
): NetworkPartnerMutations {
  const serverLinkedIds = new Set(
    serverPartners
      .map((partner) => partner.linkedCompanyId)
      .filter((linkedCompanyId): linkedCompanyId is string =>
        Boolean(linkedCompanyId),
      ),
  );

  const pendingAdds = new Map(mutations.pendingAdds);
  for (const linkedCompanyId of serverLinkedIds) {
    pendingAdds.delete(linkedCompanyId);
  }

  const pendingRemoves = new Set(mutations.pendingRemoves);
  for (const linkedCompanyId of pendingRemoves) {
    if (!serverLinkedIds.has(linkedCompanyId)) {
      pendingRemoves.delete(linkedCompanyId);
    }
  }

  return { pendingAdds, pendingRemoves };
}

/**
 * Merge server My Network props with local mutation tracking so stale empty
 * server data from router.refresh() cannot wipe a successful add/remove.
 */
export function mergeMyNetworkPartnersFromServer(
  serverPartners: NetworkPartner[],
  mutations: NetworkPartnerMutations,
): NetworkPartner[] {
  let merged = serverPartners.filter(
    (partner) =>
      !partner.linkedCompanyId ||
      !mutations.pendingRemoves.has(partner.linkedCompanyId),
  );

  for (const partner of mutations.pendingAdds.values()) {
    merged = upsertActiveNetworkPartner(merged, partner);
  }

  return merged;
}

export const MY_NETWORK_EMPTY_MESSAGE =
  "Add companies from Discover so you can quickly send overflow work and referrals.";

export type DirectoryFilter = "all" | "my-network";

export const DIRECTORY_FILTER_OPTIONS: {
  value: DirectoryFilter;
  label: string;
}[] = [
  { value: "all", label: "All companies" },
  { value: "my-network", label: "My Network" },
];
