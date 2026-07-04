import type { CompanyRole, MembershipStatus } from "@/lib/database/types/enums";
import type { BetaFeedbackSeverity, BetaFeedbackStatus } from "@/shared/types/beta-feedback";

export type PlatformAdminSummary = {
  totalAuthUsers: number;
  totalCompanies: number;
  totalActiveMembers: number;
  totalJobs: number;
  totalCustomers: number;
  totalEstimates: number;
  totalInvoices: number;
};

export type PlatformAdminRecentCompany = {
  id: string;
  name: string;
  createdAt: string;
};

export type PlatformAdminRecentUser = {
  id: string;
  email: string;
  fullName: string | null;
  createdAt: string;
};

export type PlatformAdminUserRow = {
  membershipId: string;
  userId: string | null;
  companyId: string;
  name: string | null;
  email: string;
  companyName: string;
  role: CompanyRole;
  membershipStatus: MembershipStatus;
  userCreatedAt: string | null;
  lastSignInAt: string | null;
};

export type PlatformAdminCompanyRow = {
  id: string;
  name: string;
  memberCount: number;
  ownerCount: number;
  createdAt: string;
  jobCount: number;
  customerCount: number;
  estimateCount: number;
  invoiceCount: number;
  paymentCount: number;
  lastActivityAt: string | null;
};

export type PlatformOpenBugBrief = {
  id: string;
  createdAt: string;
  companyId: string | null;
  companyName: string | null;
  messagePreview: string;
  severity: BetaFeedbackSeverity;
  status: BetaFeedbackStatus;
};

export type PlatformPrioritySignalKind =
  | "blocking_bug"
  | "high_bug"
  | "diagnostic_warning"
  | "onboarding_stuck"
  | "inactive_company"
  | "recent_signup_no_customer"
  | "recent_signup_no_job";

export type PlatformPrioritySeverity = "critical" | "high" | "medium" | "low";

export type PlatformPrioritySignal = {
  id: string;
  kind: PlatformPrioritySignalKind;
  severity: PlatformPrioritySeverity;
  title: string;
  description: string;
  reason: string;
  actionLabel: string;
  href: string;
  score: number;
  companyId?: string;
  companyName?: string;
  createdAt?: string;
  lastActivityAt?: string;
};

export type PlatformActivationFunnel = {
  totalCompanies: number;
  withFirstCustomer: number;
  withFirstJob: number;
  withFirstEstimate: number;
  withFirstInvoice: number;
  withFirstPayment: number | null;
  fullyActivated: number;
};

export type PlatformMissionHeroContent = {
  title: string;
  operatingMessage: string;
  primarySignal: PlatformPrioritySignal | null;
  secondarySignals: PlatformPrioritySignal[];
  isPlatformClear: boolean;
  signalChips: { label: string; value: string }[];
};

export type PlatformBrainSnapshot = {
  signals: PlatformPrioritySignal[];
  topSignals: PlatformPrioritySignal[];
  missionHero: PlatformMissionHeroContent;
  activationFunnel: PlatformActivationFunnel;
};

export type PlatformAdminRecentBugReport = {
  id: string;
  createdAt: string;
  companyName: string | null;
  userEmail: string | null;
  severity: string;
  pageUrl: string;
  messagePreview: string;
  status: string;
};

export type PlatformAdminOverview = {
  summary: PlatformAdminSummary;
  recentCompanies: PlatformAdminRecentCompany[];
  recentUsers: PlatformAdminRecentUser[];
  recentBugReports: PlatformAdminRecentBugReport[];
  openBlockingBugs: PlatformOpenBugBrief[];
  openHighBugs: PlatformOpenBugBrief[];
  users: PlatformAdminUserRow[];
  companies: PlatformAdminCompanyRow[];
  diagnostics: string[];
  paymentsQueryable: boolean;
  brain: PlatformBrainSnapshot;
};

export type PlatformBugReport = {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: BetaFeedbackStatus;
  severity: BetaFeedbackSeverity;
  message: string;
  expectedBehavior: string | null;
  pageUrl: string;
  userEmail: string | null;
  userRole: string | null;
  companyId: string | null;
  companyName: string | null;
  userId: string | null;
  userAgent: string | null;
};

export type PlatformBugReportSummary = {
  open: number;
  blockingOrHigh: number;
  reviewing: number;
  fixed: number;
  total: number;
};

export type PlatformBugReportsLoadResult = {
  reports: PlatformBugReport[];
  error: string | null;
};
