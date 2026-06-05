export type OnboardingSnapshot = {
  teamMemberCount: number;
  hasInvitedOrActiveTeam: boolean;
  customerCount: number;
  leadCount: number;
  jobCount: number;
  serviceItemCount: number;
  hasBillingDefaultsConfigured: boolean;
};

export type OnboardingChecklistItemId =
  | "invite-team"
  | "add-customer"
  | "add-lead"
  | "create-job"
  | "setup-price-book"
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
