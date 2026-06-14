import { formatDateInTimeZone } from "@/shared/lib/datetime";

export type LeadStatus =
  | "new"
  | "contacted"
  | "scheduled"
  | "estimate_sent"
  | "won"
  | "lost";

export type LeadSource =
  | "website"
  | "google"
  | "facebook"
  | "referral"
  | "network_referral"
  | "door_hanger"
  | "yard_sign"
  | "truck_wrap"
  | "other";

export type LeadLifecycleState = "active" | "archived" | "deleted";

export type Lead = {
  id: string;
  firstName: string;
  lastName: string;
  companyName?: string;
  email: string;
  phone: string;
  source: LeadSource;
  status: LeadStatus;
  notes?: string;
  lastContactedAt?: string;
  nextFollowUpAt?: string;
  convertedCustomerId?: string;
  wonAt?: string;
  lostAt?: string;
  lostReason?: string;
  assignedUserId?: string;
  assignedUserName?: string;
  createdBy?: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
  deletedAt?: string;
  deleteAfter?: string;
  lastActivityAt?: string;
  lastActivityLabel?: string;
  networkReferral?: LeadNetworkReferralSummary;
};

export type LeadNetworkReferralSummary = {
  referralId: string;
  sourceCompanyId: string;
  sourceCompanyName: string;
  sourceUserName?: string;
  sourceNetworkProfileId?: string;
};

export type LeadFormData = {
  firstName: string;
  lastName: string;
  companyName: string;
  email: string;
  phone: string;
  source: LeadSource;
  status: LeadStatus;
  notes: string;
  assignedUserId: string;
  nextFollowUpAt: string;
};

export type LeadSortField = "status" | "createdAt" | "nextFollowUpAt";

export const LEAD_STATUS_OPTIONS: { value: LeadStatus | "all"; label: string }[] =
  [
    { value: "all", label: "All statuses" },
    { value: "new", label: "New" },
    { value: "contacted", label: "Contacted" },
    { value: "scheduled", label: "Scheduled" },
    { value: "estimate_sent", label: "Estimate sent" },
    { value: "won", label: "Won" },
    { value: "lost", label: "Lost" },
  ];

export const LEAD_SOURCE_OPTIONS: { value: LeadSource; label: string }[] = [
  { value: "website", label: "Website" },
  { value: "google", label: "Google" },
  { value: "facebook", label: "Facebook" },
  { value: "referral", label: "Referral" },
  { value: "network_referral", label: "Network Referral" },
  { value: "door_hanger", label: "Door hanger" },
  { value: "yard_sign", label: "Yard sign" },
  { value: "truck_wrap", label: "Truck wrap" },
  { value: "other", label: "Other" },
];

export const LEAD_LOST_REASON_OPTIONS = [
  "Price",
  "No Response",
  "Competitor",
  "Not Interested",
  "Other",
] as const;

export type LeadLostReason = (typeof LEAD_LOST_REASON_OPTIONS)[number];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function formatLeadName(lead: Pick<Lead, "firstName" | "lastName" | "companyName">): string {
  const personName = `${lead.firstName} ${lead.lastName}`.trim();

  if (lead.companyName?.trim()) {
    return personName ? `${personName} — ${lead.companyName.trim()}` : lead.companyName.trim();
  }

  return personName || "Unnamed lead";
}

export function getLeadInitials(lead: Pick<Lead, "firstName" | "lastName" | "companyName">): string {
  const name = formatLeadName(lead);
  const parts = name.split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }

  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

export function formatLeadStatus(status: LeadStatus): string {
  return LEAD_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

export function formatLeadSource(source: LeadSource): string {
  return LEAD_SOURCE_OPTIONS.find((option) => option.value === source)?.label ?? source;
}

export function formatLeadDate(
  value: string | undefined,
  timeZone?: string,
): string {
  if (!value) {
    return "—";
  }

  return formatDateInTimeZone(value, timeZone, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatLeadDateTime(
  value: string | undefined,
  timeZone?: string,
): string {
  if (!value) {
    return "—";
  }

  return formatDateInTimeZone(value, timeZone, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function normalizeLeadFormData(data: LeadFormData): LeadFormData {
  return {
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    companyName: data.companyName.trim(),
    email: data.email.trim(),
    phone: data.phone.trim(),
    source: data.source,
    status: data.status,
    notes: data.notes.trim(),
    assignedUserId: data.assignedUserId.trim(),
    nextFollowUpAt: data.nextFollowUpAt.trim(),
  };
}

export function validateLeadFormData(data: LeadFormData): string | null {
  const normalized = normalizeLeadFormData(data);

  if (!normalized.firstName && !normalized.companyName) {
    return "Add a name or company name.";
  }

  if (!normalized.source) {
    return "Choose how this lead came in.";
  }

  if (normalized.email && !EMAIL_PATTERN.test(normalized.email)) {
    return "Enter a valid email address.";
  }

  if (!normalized.email && !normalized.phone) {
    return "Add a phone number or email.";
  }

  return null;
}

export function mapLeadToFormData(lead: Lead): LeadFormData {
  return {
    firstName: lead.firstName,
    lastName: lead.lastName,
    companyName: lead.companyName ?? "",
    email: lead.email,
    phone: lead.phone,
    source: lead.source,
    status: lead.status,
    notes: lead.notes ?? "",
    assignedUserId: lead.assignedUserId ?? "",
    nextFollowUpAt: lead.nextFollowUpAt?.slice(0, 10) ?? "",
  };
}

export function getLeadLifecycleState(
  lead: Pick<Lead, "archivedAt" | "deletedAt">,
): LeadLifecycleState {
  if (lead.deletedAt) {
    return "deleted";
  }

  if (lead.archivedAt) {
    return "archived";
  }

  return "active";
}

export function isLeadClosed(status: LeadStatus): boolean {
  return status === "won" || status === "lost";
}
