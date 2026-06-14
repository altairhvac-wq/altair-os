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
import type { TradeType } from "@/shared/types/network";

/** Maps to `network_profiles` — public/internal directory profile, not partner CRM. */
export type NetworkProfile = {
  id: string;
  companyId: string;
  displayName: string;
  tradeType: TradeType;
  serviceArea: string;
  city: string;
  state: string;
  bio?: string;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
};

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
  { value: "directory", label: "Directory" },
  { value: "my-network", label: "My Network" },
  { value: "invitations", label: "Invitations" },
  { value: "sent-referrals", label: "Sent Referrals" },
  { value: "received-referrals", label: "Received Referrals" },
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
    `Source company ID: ${input.sourceCompanyId}`,
    input.sourceNetworkProfileId
      ? `Source network profile ID: ${input.sourceNetworkProfileId}`
      : null,
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
