import type { CompanyRole, MembershipStatus } from "@/lib/database/types/enums";

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
  lastActivityAt: string | null;
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
  users: PlatformAdminUserRow[];
  companies: PlatformAdminCompanyRow[];
  diagnostics: string[];
};
