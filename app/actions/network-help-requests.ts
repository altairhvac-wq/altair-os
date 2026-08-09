"use server";

import { revalidatePath } from "next/cache";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import {
  acceptNetworkHelpOfferRpc,
  cancelNetworkHelpRequest,
  getNetworkHelpOfferById,
  getNetworkHelpRequestById,
  insertNetworkHelpOffer,
  insertNetworkHelpRequest,
  listMyNetworkHelpRequests,
  listOffersForHelpRequest,
  listOpenNetworkHelpRequests,
  withdrawNetworkHelpOffer,
} from "@/lib/database/queries/network-help-requests";
import { ensureCompanyNetworkProfile } from "@/lib/database/queries/network-profiles";
import { insertNetworkReferral } from "@/lib/database/queries/network-referrals";
import {
  cancelNetworkReferralHandoff,
  createReferralTargetLead,
  linkNetworkReferralTargetLead,
} from "@/lib/database/services/network-referral-lead";
import { notifyTargetCompanyOfNetworkReferral } from "@/lib/database/services/network-referral-notification";
import type {
  NetworkHelpOffer,
  NetworkHelpOfferAcceptFormData,
  NetworkHelpRequest,
  NetworkHelpRequestFormData,
} from "@/shared/types/network-help-request";
import {
  normalizeNetworkHelpRequestFormData,
  validateNetworkHelpOfferAcceptFormData,
  validateNetworkHelpRequestFormData,
} from "@/shared/types/network-help-request";

function revalidateCommunityPaths() {
  revalidatePath("/community");
  revalidatePath("/customers");
  revalidatePath("/leads");
}

async function assertHelpRequestManager() {
  const context = await getActiveCompanyContext();
  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE } as const;
  }
  if (!context.permissions.manageCompany) {
    return {
      error: "Only company owners and admins can manage Help Requests.",
    } as const;
  }
  return { context } as const;
}

export async function listOpenNetworkHelpRequestsAction(): Promise<{
  requests: NetworkHelpRequest[];
  error?: string;
}> {
  const permission = await assertHelpRequestManager();
  if (permission.error || !permission.context) {
    return { requests: [], error: permission.error };
  }

  return {
    requests: await listOpenNetworkHelpRequests(permission.context.company.id),
  };
}

export async function listMyNetworkHelpRequestsAction(): Promise<{
  requests: NetworkHelpRequest[];
  error?: string;
}> {
  const permission = await assertHelpRequestManager();
  if (permission.error || !permission.context) {
    return { requests: [], error: permission.error };
  }

  return {
    requests: await listMyNetworkHelpRequests(permission.context.company.id),
  };
}

export async function listOffersForHelpRequestAction(
  helpRequestId: string,
): Promise<{ offers: NetworkHelpOffer[]; error?: string }> {
  const permission = await assertHelpRequestManager();
  if (permission.error || !permission.context) {
    return { offers: [], error: permission.error };
  }

  const request = await getNetworkHelpRequestById(helpRequestId);
  if (!request || request.companyId !== permission.context.company.id) {
    return { offers: [], error: "Help request not found." };
  }

  return { offers: await listOffersForHelpRequest(helpRequestId) };
}

export async function createHelpRequestAction(
  data: NetworkHelpRequestFormData,
): Promise<{ request?: NetworkHelpRequest; error?: string }> {
  const permission = await assertHelpRequestManager();
  if (permission.error || !permission.context) {
    return { error: permission.error };
  }

  const normalized = normalizeNetworkHelpRequestFormData(data);
  const validationError = validateNetworkHelpRequestFormData(normalized);
  if (validationError) {
    return { error: validationError };
  }

  const result = await insertNetworkHelpRequest({
    company_id: permission.context.company.id,
    created_by: permission.context.user.id,
    trade_type: normalized.tradeType,
    title: normalized.title,
    details: normalized.details,
    city: normalized.city,
    state: normalized.state,
    postal_code: normalized.postalCode,
    urgency: normalized.urgency,
  });

  if (result.error || !result.request) {
    return { error: result.error ?? "We couldn't post this request." };
  }

  revalidateCommunityPaths();
  return { request: result.request };
}

export async function cancelHelpRequestAction(
  helpRequestId: string,
): Promise<{ request?: NetworkHelpRequest; error?: string }> {
  const permission = await assertHelpRequestManager();
  if (permission.error || !permission.context) {
    return { error: permission.error };
  }

  const result = await cancelNetworkHelpRequest(
    helpRequestId,
    permission.context.company.id,
  );

  if (result.error || !result.request) {
    return { error: result.error ?? "We couldn't cancel this request." };
  }

  revalidateCommunityPaths();
  return { request: result.request };
}

export async function offerHelpAction(
  helpRequestId: string,
  message?: string,
): Promise<{ offer?: NetworkHelpOffer; error?: string }> {
  const permission = await assertHelpRequestManager();
  if (permission.error || !permission.context) {
    return { error: permission.error };
  }

  const request = await getNetworkHelpRequestById(helpRequestId);
  if (!request || request.status !== "open") {
    return { error: "This request is no longer open." };
  }

  if (request.companyId === permission.context.company.id) {
    return { error: "You cannot offer to help on your own request." };
  }

  const result = await insertNetworkHelpOffer({
    help_request_id: helpRequestId,
    company_id: permission.context.company.id,
    offered_by: permission.context.user.id,
    message: message?.trim() || null,
  });

  if (result.error || !result.offer) {
    return {
      error:
        result.error ??
        "We couldn't send that offer. You may have already offered on this request.",
    };
  }

  revalidateCommunityPaths();
  return { offer: result.offer };
}

export async function withdrawHelpOfferAction(
  offerId: string,
): Promise<{ error?: string }> {
  const permission = await assertHelpRequestManager();
  if (permission.error || !permission.context) {
    return { error: permission.error };
  }

  const result = await withdrawNetworkHelpOffer(
    offerId,
    permission.context.company.id,
  );

  if (result.error) {
    return { error: result.error };
  }

  revalidateCommunityPaths();
  return {};
}

/**
 * Accepting an offer is where customer PII first enters the system — the
 * poster supplies it here, targeted at exactly the company they chose.
 * Creates a real network_referrals + lead handoff (same pipeline as a
 * direct referral, including the two-phase PII reveal on accept), then
 * atomically marks the offer accepted / request filled / other offers
 * declined via the accept_network_help_offer RPC.
 */
export async function acceptHelpOfferAction(input: {
  helpRequestId: string;
  offerId: string;
  customer: NetworkHelpOfferAcceptFormData;
}): Promise<{ request?: NetworkHelpRequest; error?: string }> {
  const permission = await assertHelpRequestManager();
  if (permission.error || !permission.context) {
    return { error: permission.error };
  }

  const customerValidationError = validateNetworkHelpOfferAcceptFormData(
    input.customer,
  );
  if (customerValidationError) {
    return { error: customerValidationError };
  }

  const request = await getNetworkHelpRequestById(input.helpRequestId);
  if (!request || request.companyId !== permission.context.company.id) {
    return { error: "Help request not found." };
  }
  if (request.status !== "open") {
    return { error: "This request is no longer open." };
  }

  const offer = await getNetworkHelpOfferById(input.offerId);
  if (
    !offer ||
    offer.helpRequestId !== input.helpRequestId ||
    offer.status !== "pending"
  ) {
    return { error: "This offer is no longer available." };
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
    target_company_id: offer.companyId,
    source_user_id: permission.context.user.id,
    source_network_profile_id: sourceProfileResult.profile?.id ?? null,
    customer_name: input.customer.customerName.trim(),
    customer_phone: input.customer.customerPhone.trim(),
    customer_email: input.customer.customerEmail.trim(),
    service_address: input.customer.serviceAddress.trim(),
    city: request.city,
    state: request.state,
    zip: request.postalCode,
    requested_service: request.title,
    urgency: request.urgency,
    notes: input.customer.notes.trim() || null,
    incentive_note: input.customer.incentiveNote.trim() || null,
    status: "sent",
  });

  if (referralInsert.error || !referralInsert.referral) {
    return {
      error:
        referralInsert.error ??
        "We couldn't create the referral for this offer.",
    };
  }

  const { lead, error: leadError } = await createReferralTargetLead({
    targetCompanyId: offer.companyId,
    referralId: referralInsert.referral.id,
    sourceCompanyId: permission.context.company.id,
    sourceCompanyName: permission.context.company.name,
    sourceUserName,
    sourceNetworkProfileId: sourceProfileResult.profile?.id,
    customerName: input.customer.customerName.trim(),
    customerPhone: input.customer.customerPhone.trim(),
    customerEmail: input.customer.customerEmail.trim(),
    serviceAddress: input.customer.serviceAddress.trim(),
    city: request.city,
    state: request.state,
    zip: request.postalCode,
    requestedService: request.title,
    urgency: request.urgency,
    notes: input.customer.notes.trim() || undefined,
    incentiveNote: input.customer.incentiveNote.trim() || undefined,
  });

  if (leadError || !lead) {
    await cancelNetworkReferralHandoff({
      referralId: referralInsert.referral.id,
      sourceCompanyId: permission.context.company.id,
      declineReason: "Lead creation failed during Help Request handoff.",
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
    targetCompanyId: offer.companyId,
    targetLeadId: lead.id,
  });

  if (linkError.error) {
    return {
      error:
        linkError.error ??
        "The lead was created but could not be linked to this referral.",
    };
  }

  await notifyTargetCompanyOfNetworkReferral({
    targetCompanyId: offer.companyId,
    targetCompanyName: offer.companyName ?? "Your company",
    sourceCompanyName: permission.context.company.name,
    requestedService: request.title,
    urgency: request.urgency,
    city: request.city,
    state: request.state,
  });

  const acceptResult = await acceptNetworkHelpOfferRpc({
    helpRequestId: input.helpRequestId,
    offerId: input.offerId,
    actingCompanyId: permission.context.company.id,
    referralId: referralInsert.referral.id,
  });

  if (acceptResult.error) {
    // The referral + lead already exist and are real regardless — log and
    // surface the request as-is rather than pretending nothing happened.
    console.error(
      "[acceptHelpOfferAction] accept_network_help_offer RPC failed:",
      acceptResult.error,
    );
  }

  revalidateCommunityPaths();
  return { request: acceptResult.request ?? request };
}
