"use server";

import { revalidatePath } from "next/cache";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import {
  ensureCompanyNetworkProfile,
  getVisibleNetworkProfileById,
  listVisibleNetworkProfiles,
  updateCompanyNetworkProfile,
} from "@/lib/database/queries/network-profiles";
import {
  getNetworkReferralById,
  insertNetworkReferral,
  listReceivedNetworkReferrals,
  listSentNetworkReferrals,
  updateNetworkReferral,
} from "@/lib/database/queries/network-referrals";
import {
  cancelNetworkReferralHandoff,
  createReferralTargetLead,
  linkNetworkReferralTargetLead,
  revealReferralLeadContact,
} from "@/lib/database/services/network-referral-lead";
import { getLeadById, updateLead } from "@/lib/database/queries/leads";
import { recordLeadLostActivity } from "@/lib/database/services/lead-activity";
import { notifyTargetCompanyOfNetworkReferral } from "@/lib/database/services/network-referral-notification";
import type { NetworkProfile, NetworkReferral } from "@/shared/types/network-referral";
import {
  normalizeNetworkProfileFormData,
  validateNetworkProfileFormData,
  type NetworkProfileFormData,
  normalizeNetworkReferralFormData,
  validateNetworkReferralFormData,
  type NetworkReferralFormData,
} from "@/shared/types/network-referral";

export type NetworkReferralActionResult = {
  error?: string;
  referral?: NetworkReferral;
};

function revalidateNetworkPaths() {
  // /community is the live route; /network is only a redirect stub.
  revalidatePath("/community");
  revalidatePath("/customers");
  revalidatePath("/leads");
}

async function assertReferralSender() {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE } as const;
  }

  if (!context.permissions.manageCompany) {
    return {
      error: "Only company owners and admins can send network referrals.",
    } as const;
  }

  return { context } as const;
}

async function assertReferralReceiver() {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE } as const;
  }

  if (!context.permissions.manageCustomers) {
    return {
      error: "You do not have permission to manage received referrals.",
    } as const;
  }

  return { context } as const;
}

export async function getNetworkDirectoryAction(): Promise<{
  profiles: NetworkProfile[];
  ownProfile: NetworkProfile | null;
  error?: string;
}> {
  const permission = await assertReferralSender();
  if (permission.error || !permission.context) {
    return { profiles: [], ownProfile: null, error: permission.error };
  }

  const companyId = permission.context.company.id;
  const [profiles, ensured] = await Promise.all([
    listVisibleNetworkProfiles(companyId),
    ensureCompanyNetworkProfile(companyId, permission.context.company.name),
  ]);

  return {
    profiles,
    ownProfile: ensured.profile,
    error: ensured.error ?? undefined,
  };
}

export async function sendNetworkReferralAction(
  data: NetworkReferralFormData,
): Promise<NetworkReferralActionResult> {
  const permission = await assertReferralSender();
  if (permission.error || !permission.context) {
    return { error: permission.error };
  }

  const normalized = normalizeNetworkReferralFormData(data);
  const validationError = validateNetworkReferralFormData(normalized);
  if (validationError) {
    return { error: validationError };
  }

  const targetProfile = await getVisibleNetworkProfileById(
    normalized.targetNetworkProfileId,
  );

  if (!targetProfile) {
    return {
      error: "This network profile is not available for referrals.",
    };
  }

  if (targetProfile.companyId === permission.context.company.id) {
    return { error: "You cannot send a referral to your own company." };
  }

  const sourceProfileResult = await ensureCompanyNetworkProfile(
    permission.context.company.id,
    permission.context.company.name,
  );

  const sourceUserName =
    permission.context.profile.full_name?.trim() ||
    permission.context.user.email?.trim() ||
    undefined;

  const referralInsert = await insertNetworkReferral({
    source_company_id: permission.context.company.id,
    target_company_id: targetProfile.companyId,
    source_user_id: permission.context.user.id,
    source_network_profile_id: sourceProfileResult.profile?.id ?? null,
    target_network_profile_id: targetProfile.id,
    customer_name: normalized.customerName,
    customer_phone: normalized.customerPhone,
    customer_email: normalized.customerEmail,
    service_address: normalized.serviceAddress,
    city: normalized.city,
    state: normalized.state,
    zip: normalized.zip,
    requested_service: normalized.requestedService,
    urgency: normalized.urgency,
    notes: normalized.notes || null,
    incentive_note: normalized.incentiveNote || null,
    status: "sent",
  });

  if (referralInsert.error || !referralInsert.referral) {
    return {
      error:
        referralInsert.error ??
        "We couldn't save this referral. Check the details and try again.",
    };
  }

  const { lead, error: leadError } = await createReferralTargetLead({
    targetCompanyId: targetProfile.companyId,
    referralId: referralInsert.referral.id,
    sourceCompanyId: permission.context.company.id,
    sourceCompanyName: permission.context.company.name,
    sourceUserName,
    sourceNetworkProfileId: sourceProfileResult.profile?.id,
    customerName: normalized.customerName,
    customerPhone: normalized.customerPhone,
    customerEmail: normalized.customerEmail,
    serviceAddress: normalized.serviceAddress,
    city: normalized.city,
    state: normalized.state,
    zip: normalized.zip,
    requestedService: normalized.requestedService,
    urgency: normalized.urgency,
    notes: normalized.notes || undefined,
    incentiveNote: normalized.incentiveNote || undefined,
  });

  if (leadError || !lead) {
    await cancelNetworkReferralHandoff({
      referralId: referralInsert.referral.id,
      sourceCompanyId: permission.context.company.id,
      declineReason: "Lead creation failed during referral handoff.",
    });
    return {
      error:
        leadError ??
        "The referral was recorded but the target lead could not be created.",
    };
  }

  const linkError = await linkNetworkReferralTargetLead({
    referralId: referralInsert.referral.id,
    sourceCompanyId: permission.context.company.id,
    targetCompanyId: targetProfile.companyId,
    targetLeadId: lead.id,
  });

  if (linkError.error) {
    return {
      error:
        linkError.error ??
        "The lead was created but could not be linked to this referral.",
    };
  }

  // Best-effort email heads-up to the receiving company's owners/admins —
  // the referral and lead already exist regardless of delivery.
  await notifyTargetCompanyOfNetworkReferral({
    targetCompanyId: targetProfile.companyId,
    targetCompanyName: targetProfile.displayName,
    sourceCompanyName: permission.context.company.name,
    requestedService: normalized.requestedService,
    urgency: normalized.urgency,
    city: normalized.city,
    state: normalized.state,
  });

  revalidateNetworkPaths();

  return {
    referral: {
      ...referralInsert.referral,
      targetLeadId: lead.id,
    },
  };
}

export async function acceptNetworkReferralAction(
  referralId: string,
): Promise<NetworkReferralActionResult> {
  const permission = await assertReferralReceiver();
  if (permission.error || !permission.context) {
    return { error: permission.error };
  }

  const referral = await getNetworkReferralById(referralId);
  if (!referral || referral.targetCompanyId !== permission.context.company.id) {
    return { error: "Referral not found." };
  }

  if (referral.status !== "sent") {
    return { error: "This referral has already been handled." };
  }

  const { referral: updated, error } = await updateNetworkReferral(
    referralId,
    {
      status: "accepted",
    },
    permission.context.company.id,
  );

  if (error || !updated) {
    return { error: error ?? "We couldn't accept this referral." };
  }

  // Reveal the customer's full contact PII on the lead now that this company
  // has accepted. Best-effort — acceptance already succeeded regardless.
  const revealResult = await revealReferralLeadContact({
    referralId,
    targetCompanyId: permission.context.company.id,
  });

  if (revealResult.error) {
    console.error(
      "[acceptNetworkReferralAction] failed to reveal lead contact details:",
      revealResult.error,
    );
  }

  revalidateNetworkPaths();
  return { referral: updated };
}

export async function declineNetworkReferralAction(input: {
  referralId: string;
  declineReason?: string;
}): Promise<NetworkReferralActionResult> {
  const permission = await assertReferralReceiver();
  if (permission.error || !permission.context) {
    return { error: permission.error };
  }

  const referral = await getNetworkReferralById(input.referralId);
  if (!referral || referral.targetCompanyId !== permission.context.company.id) {
    return { error: "Referral not found." };
  }

  if (referral.status !== "sent" && referral.status !== "accepted") {
    return { error: "This referral can no longer be declined." };
  }

  const { referral: updated, error } = await updateNetworkReferral(
    input.referralId,
    {
      status: "declined",
      decline_reason: input.declineReason?.trim() || "Declined by receiving company.",
    },
    permission.context.company.id,
  );

  if (error || !updated) {
    return { error: error ?? "We couldn't decline this referral." };
  }

  // Close out the auto-created referral lead so it doesn't sit in the active
  // pipeline forever. Only touch it if this company hasn't independently
  // progressed it to a terminal state already. Best-effort: a failure here
  // never blocks the decline itself (the referral is already terminal, so the
  // lead's "lost" status won't re-sync any referral outcome).
  await closeDeclinedReferralLead(
    permission.context.company.id,
    permission.context.user.id,
    updated.targetLeadId,
  );

  revalidateNetworkPaths();
  return { referral: updated };
}

async function closeDeclinedReferralLead(
  companyId: string,
  actorUserId: string,
  targetLeadId: string | undefined,
) {
  if (!targetLeadId) {
    return;
  }

  try {
    const lead = await getLeadById(companyId, targetLeadId);
    if (!lead || lead.status === "won" || lead.status === "lost") {
      return;
    }

    const lostReason = "Network referral declined.";
    const { lead: closedLead, error: closeError } = await updateLead(
      companyId,
      targetLeadId,
      {
        status: "lost",
        lostAt: new Date().toISOString(),
        lostReason,
        wonAt: null,
      },
    );

    if (closeError || !closedLead) {
      console.error(
        "[declineNetworkReferralAction] failed to close referral lead:",
        closeError,
      );
      return;
    }

    await recordLeadLostActivity({
      companyId,
      leadId: targetLeadId,
      actorId: actorUserId,
      lostReason,
    });
  } catch (error) {
    console.error(
      "[declineNetworkReferralAction] failed to close referral lead:",
      error,
    );
  }
}

export async function listSentNetworkReferralsAction(): Promise<{
  referrals: NetworkReferral[];
  error?: string;
}> {
  const permission = await assertReferralSender();
  if (permission.error || !permission.context) {
    return { referrals: [], error: permission.error };
  }

  return {
    referrals: await listSentNetworkReferrals(permission.context.company.id),
  };
}

export async function listReceivedNetworkReferralsAction(): Promise<{
  referrals: NetworkReferral[];
  error?: string;
}> {
  const permission = await assertReferralReceiver();
  if (permission.error || !permission.context) {
    return { referrals: [], error: permission.error };
  }

  return {
    referrals: await listReceivedNetworkReferrals(permission.context.company.id),
  };
}

export async function toggleOwnNetworkProfileVisibilityAction(
  isVisible: boolean,
): Promise<{ ownProfile: NetworkProfile | null; error?: string }> {
  const permission = await assertReferralSender();
  if (permission.error || !permission.context) {
    return { ownProfile: null, error: permission.error };
  }

  const ensured = await ensureCompanyNetworkProfile(
    permission.context.company.id,
    permission.context.company.name,
  );

  if (!ensured.profile) {
    return { ownProfile: null, error: ensured.error ?? "Network profile not found." };
  }

  const { updateCompanyNetworkProfileVisibility } = await import(
    "@/lib/database/queries/network-profiles"
  );

  const updated = await updateCompanyNetworkProfileVisibility(
    permission.context.company.id,
    isVisible,
  );

  revalidateNetworkPaths();

  return {
    ownProfile: updated.profile,
    error: updated.error ?? undefined,
  };
}

export async function updateOwnNetworkProfileAction(
  data: NetworkProfileFormData,
): Promise<{ ownProfile: NetworkProfile | null; error?: string }> {
  const permission = await assertReferralSender();
  if (permission.error || !permission.context) {
    return { ownProfile: null, error: permission.error };
  }

  const normalized = normalizeNetworkProfileFormData(data);
  const validationError = validateNetworkProfileFormData(normalized);
  if (validationError) {
    return { ownProfile: null, error: validationError };
  }

  const ensured = await ensureCompanyNetworkProfile(
    permission.context.company.id,
    permission.context.company.name,
  );

  if (!ensured.profile) {
    return { ownProfile: null, error: ensured.error ?? "Network profile not found." };
  }

  const updated = await updateCompanyNetworkProfile(
    permission.context.company.id,
    normalized,
  );

  revalidateNetworkPaths();

  return {
    ownProfile: updated.profile,
    error: updated.error ?? undefined,
  };
}
