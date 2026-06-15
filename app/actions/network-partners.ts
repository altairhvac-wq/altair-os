"use server";

import { revalidatePath } from "next/cache";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import {
  NO_ACTIVE_COMPANY_MESSAGE,
  NETWORK_PARTNER_MANAGER_MESSAGE,
} from "@/lib/database/errors";
import { hasCompanyRole } from "@/lib/database/types/roles";
import { getNetworkProfileByCompanyId } from "@/lib/database/queries/network-profiles";
import {
  addLinkedNetworkPartner,
  getNetworkPartnerByLinkedCompanyId,
  getNetworkPartnerLinkByLinkedCompanyId,
  listMyNetworkPartners,
  removeLinkedNetworkPartner,
} from "@/lib/database/queries/network-partners";
import { repairAcceptedInvitePartnerLinksForCompany } from "@/lib/database/services/network-invite-partner-repair";
import type { NetworkPartner } from "@/shared/types/network-partner";

export type NetworkPartnerActionResult = {
  error?: string;
  partner?: NetworkPartner;
  partners?: NetworkPartner[];
};

async function assertNetworkManager() {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE } as const;
  }

  if (
    !context.permissions.manageCompany ||
    !hasCompanyRole(context.role, ["owner", "admin"])
  ) {
    return { error: NETWORK_PARTNER_MANAGER_MESSAGE } as const;
  }

  return { context } as const;
}

function revalidateNetworkPath() {
  revalidatePath("/network");
}

export async function listMyNetworkPartnersAction(): Promise<NetworkPartnerActionResult> {
  const permission = await assertNetworkManager();
  if (permission.error || !permission.context) {
    return { partners: [], error: permission.error };
  }

  const companyId = permission.context.company.id;
  await repairAcceptedInvitePartnerLinksForCompany(companyId);

  return {
    partners: await listMyNetworkPartners(companyId),
  };
}

export async function addToMyNetworkAction(
  targetCompanyId: string,
): Promise<NetworkPartnerActionResult> {
  const permission = await assertNetworkManager();
  if (permission.error || !permission.context) {
    return { error: permission.error };
  }

  const profile = await getNetworkProfileByCompanyId(targetCompanyId);
  if (!profile) {
    return { error: "This company is not available in the network directory." };
  }

  if (profile.companyId === permission.context.company.id) {
    return { error: "You cannot add your own company to your network." };
  }

  const existingLink = await getNetworkPartnerLinkByLinkedCompanyId(
    permission.context.company.id,
    profile.companyId,
  );
  if (existingLink?.relationshipStatus === "active") {
    return { partner: existingLink };
  }
  if (existingLink) {
    const reactivated = await addLinkedNetworkPartner(
      permission.context.company.id,
      profile,
    );
    if (reactivated.error || !reactivated.partner) {
      return {
        error:
          reactivated.error ?? "We couldn't add this company to your network.",
      };
    }
    revalidateNetworkPath();
    return { partner: reactivated.partner };
  }

  if (!profile.isVisible) {
    return { error: "This company is not available in the network directory." };
  }

  const result = await addLinkedNetworkPartner(
    permission.context.company.id,
    profile,
  );

  if (result.error || !result.partner) {
    return { error: result.error ?? "We couldn't add this company to your network." };
  }

  revalidateNetworkPath();
  return { partner: result.partner };
}

export async function removeFromMyNetworkAction(
  linkedCompanyId: string,
): Promise<NetworkPartnerActionResult> {
  const permission = await assertNetworkManager();
  if (permission.error || !permission.context) {
    return { error: permission.error };
  }

  const companyId = permission.context.company.id;
  await repairAcceptedInvitePartnerLinksForCompany(companyId);

  const partner = await getNetworkPartnerByLinkedCompanyId(
    companyId,
    linkedCompanyId,
  );
  if (!partner?.linkedCompanyId) {
    return { error: "Network connection not found." };
  }

  const result = await removeLinkedNetworkPartner(companyId, linkedCompanyId);

  if (result.error) {
    return { error: result.error };
  }

  revalidateNetworkPath();
  return {};
}
