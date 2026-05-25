export type TradeType =
  | "HVAC"
  | "Plumbing"
  | "Electrical"
  | "Roofing"
  | "General Contracting"
  | "Landscaping"
  | "Painting";

export type RelationshipStatus =
  | "preferred"
  | "active"
  | "pending"
  | "paused";

export type SubcontractJobStatus =
  | "open"
  | "pending"
  | "accepted"
  | "in_progress"
  | "completed"
  | "declined";

export type SubcontractJobDirection = "open" | "sent" | "received";

export type NetworkTab =
  | "my-network"
  | "open-jobs"
  | "sent-work"
  | "received-work"
  | "revenue-tracker";

export type PartnerCompany = {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  tradeType: TradeType;
  serviceArea: string;
  city: string;
  state: string;
  relationshipStatus: RelationshipStatus;
  jobsCompletedTogether: number;
  revenueGeneratedTogether: number;
  lastWorkedDate?: string;
  rating: number;
  trustScore: number;
  licenseNumber?: string;
  insured: boolean;
  notes?: string;
  addedAt: string;
};

export type PartnerFormData = {
  companyName: string;
  tradeType: TradeType;
  contactName: string;
  phone: string;
  email: string;
  serviceArea: string;
  notes: string;
  relationshipStatus: RelationshipStatus;
};

export type SubcontractJob = {
  id: string;
  jobNumber: string;
  title: string;
  tradeType: TradeType;
  description: string;
  serviceAddress: string;
  city: string;
  state: string;
  status: SubcontractJobStatus;
  direction: SubcontractJobDirection;
  partnerCompanyId?: string;
  partnerCompanyName?: string;
  postedBy?: string;
  budget?: number;
  payoutAmount?: number;
  earnedAmount?: number;
  scheduledDate?: string;
  completedDate?: string;
  createdAt: string;
};

export type PartnerRevenueStat = {
  partnerId: string;
  partnerCompanyName: string;
  tradeType: TradeType;
  jobsSent: number;
  jobsReceived: number;
  totalPaidOut: number;
  totalEarned: number;
  totalRevenue: number;
};

export type NetworkRevenueSummary = {
  totalPaidOut: number;
  totalEarned: number;
  jobsSent: number;
  jobsReceived: number;
  revenueByPartner: PartnerRevenueStat[];
};

export const NETWORK_TAB_OPTIONS: { value: NetworkTab; label: string }[] = [
  { value: "my-network", label: "My Network" },
  { value: "open-jobs", label: "Open Jobs" },
  { value: "sent-work", label: "Sent Work" },
  { value: "received-work", label: "Received Work" },
  { value: "revenue-tracker", label: "Revenue Tracker" },
];

export const TRADE_TYPE_OPTIONS: { value: TradeType | "all"; label: string }[] = [
  { value: "all", label: "All trades" },
  { value: "HVAC", label: "HVAC" },
  { value: "Plumbing", label: "Plumbing" },
  { value: "Electrical", label: "Electrical" },
  { value: "Roofing", label: "Roofing" },
  { value: "General Contracting", label: "General Contracting" },
  { value: "Landscaping", label: "Landscaping" },
  { value: "Painting", label: "Painting" },
];

export const PARTNER_FORM_TRADE_OPTIONS = TRADE_TYPE_OPTIONS.filter(
  (option) => option.value !== "all",
) as { value: TradeType; label: string }[];

export const PARTNER_FORM_STATUS_OPTIONS: {
  value: RelationshipStatus;
  label: string;
}[] = [
  { value: "preferred", label: "Preferred" },
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "paused", label: "Paused" },
];

export const RELATIONSHIP_STATUS_OPTIONS: {
  value: RelationshipStatus | "all";
  label: string;
}[] = [
  { value: "all", label: "All partners" },
  { value: "preferred", label: "Preferred" },
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "paused", label: "Paused" },
];

export const SUBCONTRACT_JOB_STATUS_OPTIONS: {
  value: SubcontractJobStatus | "all";
  label: string;
}[] = [
  { value: "all", label: "All statuses" },
  { value: "open", label: "Open" },
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "declined", label: "Declined" },
];

export function getPartnerInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function formatRelationshipStatus(status: RelationshipStatus): string {
  const labels: Record<RelationshipStatus, string> = {
    preferred: "Preferred",
    active: "Active",
    pending: "Pending",
    paused: "Paused",
  };
  return labels[status];
}

export function formatSubcontractJobStatus(status: SubcontractJobStatus): string {
  const labels: Record<SubcontractJobStatus, string> = {
    open: "Open",
    pending: "Pending",
    accepted: "Accepted",
    in_progress: "In progress",
    completed: "Completed",
    declined: "Declined",
  };
  return labels[status];
}
