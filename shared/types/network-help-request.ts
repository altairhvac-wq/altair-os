/**
 * Types for Help Requests / Opportunities — structured "I need a hand"
 * posts, per the original Community vision (NOT a social feed). A post is
 * a lifecycle object: open -> filled | expired | cancelled.
 *
 * Maps to `network_help_requests` + `network_help_offers` (migration 140).
 * Accepting an offer creates a real `network_referrals` row and follows the
 * exact same Lead -> Job -> Invoice pipeline as a direct referral — see
 * `acceptHelpOfferAction` in `app/actions/network-help-requests.ts`.
 */

import type {
  NetworkHelpOfferStatus,
  NetworkHelpRequestStatus,
  NetworkReferralUrgency,
} from "@/lib/database/types/enums";
import type { TradeType } from "@/shared/types/network";
import {
  formatNetworkReferralUrgency,
  NETWORK_REFERRAL_URGENCY_OPTIONS,
} from "@/shared/types/network-referral";

export type NetworkHelpRequest = {
  id: string;
  companyId: string;
  createdBy: string;
  tradeType: TradeType;
  title: string;
  details: string;
  city: string;
  state: string;
  postalCode: string;
  urgency: NetworkReferralUrgency;
  status: NetworkHelpRequestStatus;
  expiresAt: string;
  filledReferralId?: string;
  createdAt: string;
  updatedAt: string;
  companyName?: string;
  /** Populated only when the viewer is browsing (not the poster). */
  offerCount?: number;
  /** Populated only for the poster's own requests. */
  myOfferStatus?: NetworkHelpOfferStatus;
  /** The viewing company's own offer id, if any (for withdraw). */
  myOfferId?: string;
};

export type NetworkHelpOffer = {
  id: string;
  helpRequestId: string;
  companyId: string;
  offeredBy: string;
  message?: string;
  status: NetworkHelpOfferStatus;
  createdAt: string;
  updatedAt: string;
  companyName?: string;
  offeredByName?: string;
};

export type NetworkHelpRequestFormData = {
  tradeType: TradeType;
  title: string;
  details: string;
  city: string;
  state: string;
  postalCode: string;
  urgency: NetworkReferralUrgency;
};

export function normalizeNetworkHelpRequestFormData(
  data: NetworkHelpRequestFormData,
): NetworkHelpRequestFormData {
  return {
    tradeType: data.tradeType,
    title: data.title.trim(),
    details: data.details.trim(),
    city: data.city.trim(),
    state: data.state.trim(),
    postalCode: data.postalCode.trim(),
    urgency: data.urgency,
  };
}

export function validateNetworkHelpRequestFormData(
  data: NetworkHelpRequestFormData,
): string | null {
  if (!data.title) {
    return "Give this request a short title, e.g. \"Need an electrician\".";
  }
  if (data.title.length > 120) {
    return "Title must be 120 characters or fewer.";
  }
  if (!data.city && !data.state) {
    return "Add a city or state so nearby companies can find this.";
  }
  return null;
}

/** Fields the posting company fills in only when accepting a specific offer —
 * this is where customer PII first appears, deliberately never broadcast
 * with the open post itself. */
export type NetworkHelpOfferAcceptFormData = {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  serviceAddress: string;
  notes: string;
  incentiveNote: string;
};

export function validateNetworkHelpOfferAcceptFormData(
  data: NetworkHelpOfferAcceptFormData,
): string | null {
  if (!data.customerName.trim()) {
    return "Customer name is required.";
  }
  if (!data.customerPhone.trim() && !data.customerEmail.trim()) {
    return "Add a phone number or email so they can reach the customer.";
  }
  return null;
}

export const NETWORK_HELP_REQUEST_STATUS_OPTIONS: {
  value: NetworkHelpRequestStatus;
  label: string;
}[] = [
  { value: "open", label: "Open" },
  { value: "filled", label: "Filled" },
  { value: "expired", label: "Expired" },
  { value: "cancelled", label: "Cancelled" },
];

export function formatNetworkHelpRequestStatus(
  status: NetworkHelpRequestStatus,
): string {
  return (
    NETWORK_HELP_REQUEST_STATUS_OPTIONS.find((option) => option.value === status)
      ?.label ?? status
  );
}

export { formatNetworkReferralUrgency, NETWORK_REFERRAL_URGENCY_OPTIONS };

export function isHelpRequestOpen(request: NetworkHelpRequest): boolean {
  return (
    request.status === "open" && new Date(request.expiresAt).getTime() > Date.now()
  );
}
