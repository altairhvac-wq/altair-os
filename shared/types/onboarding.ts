export type OnboardingSnapshot = {
  teamMemberCount: number;
  hasInvitedOrActiveTeam: boolean;
  customerCount: number;
  leadCount: number;
  jobCount: number;
  serviceItemCount: number;
  estimateCount: number;
  invoiceCount: number;
  hasBillingDefaultsConfigured: boolean;
};

export type OnboardingChecklistItemId =
  | "workspace-ready"
  | "invite-team"
  | "add-customer"
  | "add-lead"
  | "create-job"
  | "setup-price-book"
  | "money-path"
  | "billing-defaults";

export type OnboardingChecklistItem = {
  id: OnboardingChecklistItemId;
  title: string;
  description: string;
  href: string;
  completed: boolean;
  optional?: boolean;
  tip?: string;
};

export type OnboardingChecklist = {
  items: OnboardingChecklistItem[];
  completedCount: number;
  totalCount: number;
  isComplete: boolean;
};
