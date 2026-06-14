/**
 * Keeps `network_referrals.status` aligned with referral-created lead outcomes.
 * Only target-company lead lifecycle changes should call this helper.
 */

import { syncNetworkReferralOutcomeForLeadRpc } from "@/lib/database/queries/network-referrals";
import type { NetworkReferralStatus } from "@/lib/database/types/enums";
import type { Lead } from "@/shared/types/lead";

export type ReferralOutcomeStatus = Extract<
  NetworkReferralStatus,
  "converted" | "won" | "lost"
>;

export function resolveReferralOutcomeFromLead(
  lead: Pick<Lead, "status" | "convertedCustomerId">,
): ReferralOutcomeStatus | null {
  if (lead.status === "lost") {
    return "lost";
  }

  if (lead.status === "won") {
    return "won";
  }

  if (lead.convertedCustomerId) {
    return "converted";
  }

  return null;
}

export async function syncNetworkReferralOutcomeForLead(input: {
  leadId: string;
  companyId: string;
  statusOrOutcome: ReferralOutcomeStatus;
  actorUserId?: string;
  /** When provided, outcome is re-checked against lead state before RPC. */
  lead?: Pick<Lead, "status" | "convertedCustomerId">;
}): Promise<{ synced: boolean; error?: string }> {
  void input.actorUserId;

  if (input.lead) {
    const resolvedOutcome = resolveReferralOutcomeFromLead(input.lead);
    if (resolvedOutcome !== input.statusOrOutcome) {
      return { synced: false };
    }
  }

  const result = await syncNetworkReferralOutcomeForLeadRpc(
    input.leadId,
    input.companyId,
    input.statusOrOutcome,
  );

  if (result.error) {
    console.error("[syncNetworkReferralOutcomeForLead] failed:", {
      leadId: input.leadId,
      companyId: input.companyId,
      statusOrOutcome: input.statusOrOutcome,
      error: result.error,
    });
    return { synced: false, error: result.error };
  }

  return { synced: result.updated };
}

export async function syncNetworkReferralOutcomeFromLeadState(input: {
  lead: Pick<Lead, "id" | "status" | "convertedCustomerId">;
  companyId: string;
  actorUserId?: string;
}): Promise<{ synced: boolean; error?: string }> {
  const outcome = resolveReferralOutcomeFromLead(input.lead);
  if (!outcome) {
    return { synced: false };
  }

  return syncNetworkReferralOutcomeForLead({
    leadId: input.lead.id,
    companyId: input.companyId,
    statusOrOutcome: outcome,
    actorUserId: input.actorUserId,
  });
}
