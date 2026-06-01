import "server-only";

import type { User } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/service";
import type { CompanyRole, MembershipStatus } from "@/lib/database/types/enums";
import { normalizeCompanyRole } from "@/lib/database/types/roles";
import type { BetaFeedbackSeverity, BetaFeedbackStatus } from "@/shared/types/beta-feedback";
import type {
  PlatformAdminCompanyRow,
  PlatformAdminOverview,
  PlatformAdminRecentBugReport,
  PlatformAdminRecentCompany,
  PlatformAdminRecentUser,
  PlatformAdminUserRow,
  PlatformBugReport,
  PlatformBugReportsLoadResult,
} from "@/shared/types/platform-admin";

const RECENT_LIMIT = 8;
const BUG_REPORT_PREVIEW_LIMIT = 5;
const BUG_REPORT_LIST_LIMIT = 200;
const BUG_REPORT_MESSAGE_PREVIEW_LENGTH = 120;

const VALID_BUG_REPORT_STATUSES = new Set<BetaFeedbackStatus>([
  "open",
  "reviewing",
  "fixed",
  "ignored",
]);

type CompanyIdRow = { company_id: string };
type CompanyActivityRow = { company_id: string; updated_at?: string | null; created_at?: string | null };

type CountResult = { count: number; error: string | null };

type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
};

type MembershipQueryRow = {
  id: string;
  company_id: string;
  user_id: string | null;
  role: string;
  status: MembershipStatus;
  invite_email: string | null;
  created_at: string;
  company: { name: string } | null;
  profile: {
    full_name: string | null;
    email: string;
    created_at: string;
  } | null;
};

type MembershipBaseRow = Omit<MembershipQueryRow, "profile">;

type BetaFeedbackReportQueryRow = {
  id: string;
  created_at: string;
  user_email: string | null;
  severity: string;
  page_url: string;
  message: string;
  status: string;
  company: { name: string } | null;
};

type BetaFeedbackReportFullQueryRow = {
  id: string;
  created_at: string;
  updated_at: string;
  status: string;
  severity: string;
  message: string;
  expected_behavior: string | null;
  page_url: string;
  user_email: string | null;
  user_role: string | null;
  company_id: string | null;
  user_id: string | null;
  user_agent: string | null;
  company: { name: string } | null;
};

function normalizeBugReportStatus(status: string): BetaFeedbackStatus {
  return VALID_BUG_REPORT_STATUSES.has(status as BetaFeedbackStatus)
    ? (status as BetaFeedbackStatus)
    : "open";
}

function normalizeBugReportSeverity(severity: string): BetaFeedbackSeverity {
  const valid: BetaFeedbackSeverity[] = ["low", "medium", "high", "blocking"];
  return valid.includes(severity as BetaFeedbackSeverity)
    ? (severity as BetaFeedbackSeverity)
    : "medium";
}

function mapBugReportRow(report: BetaFeedbackReportFullQueryRow): PlatformBugReport {
  return {
    id: report.id,
    createdAt: report.created_at,
    updatedAt: report.updated_at,
    status: normalizeBugReportStatus(report.status),
    severity: normalizeBugReportSeverity(report.severity),
    message: report.message,
    expectedBehavior: report.expected_behavior,
    pageUrl: report.page_url,
    userEmail: report.user_email,
    userRole: report.user_role,
    companyId: report.company_id,
    companyName: report.company?.name ?? null,
    userId: report.user_id,
    userAgent: report.user_agent,
  };
}

function truncateMessagePreview(message: string): string {
  const trimmed = message.trim();

  if (trimmed.length <= BUG_REPORT_MESSAGE_PREVIEW_LENGTH) {
    return trimmed;
  }

  return `${trimmed.slice(0, BUG_REPORT_MESSAGE_PREVIEW_LENGTH).trimEnd()}…`;
}

async function fetchRecentBugReports(
  diagnostics: string[],
): Promise<PlatformAdminRecentBugReport[]> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("beta_feedback_reports")
    .select(
      "id, created_at, user_email, severity, page_url, message, status, company:companies(name)",
    )
    .order("created_at", { ascending: false })
    .limit(BUG_REPORT_PREVIEW_LIMIT);

  if (error) {
    const message = formatQueryError("beta_feedback_reports query failed", error);
    console.error(`[platform-admin] ${message}`);
    pushDiagnostic(diagnostics, message);
    return [];
  }

  return ((data ?? []) as BetaFeedbackReportQueryRow[]).map((report) => ({
    id: report.id,
    createdAt: report.created_at,
    companyName: report.company?.name ?? null,
    userEmail: report.user_email,
    severity: report.severity,
    pageUrl: report.page_url,
    messagePreview: truncateMessagePreview(report.message),
    status: normalizeBugReportStatus(report.status),
  }));
}

export async function getPlatformBugReports(): Promise<PlatformBugReportsLoadResult> {
  try {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from("beta_feedback_reports")
      .select(
        "id, created_at, updated_at, status, severity, message, expected_behavior, page_url, user_email, user_role, company_id, user_id, user_agent, company:companies(name)",
      )
      .order("created_at", { ascending: false })
      .limit(BUG_REPORT_LIST_LIMIT);

    if (error) {
      const message = formatQueryError("beta_feedback_reports query failed", error);
      console.error(`[platform-admin] ${message}`);
      return { reports: [], error: message };
    }

    return {
      reports: ((data ?? []) as BetaFeedbackReportFullQueryRow[]).map(mapBugReportRow),
      error: null,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load platform bug reports.";
    console.error(`[platform-admin] ${message}`);
    return { reports: [], error: message };
  }
}

export async function updatePlatformBugReportStatus(
  reportId: string,
  status: BetaFeedbackStatus,
): Promise<{ error: string | null }> {
  if (!VALID_BUG_REPORT_STATUSES.has(status)) {
    return { error: "Invalid bug report status." };
  }

  const trimmedId = reportId.trim();

  if (!trimmedId) {
    return { error: "Bug report ID is required." };
  }

  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from("beta_feedback_reports")
    .update({ status })
    .eq("id", trimmedId);

  if (error) {
    const message = formatQueryError("beta_feedback_reports status update failed", error);
    console.error(`[platform-admin] ${message}`);
    return { error: message };
  }

  return { error: null };
}

function pushDiagnostic(diagnostics: string[], message: string): void {
  if (!diagnostics.includes(message)) {
    diagnostics.push(message);
  }
}

function formatQueryError(context: string, error: { message: string; code?: string }): string {
  const code = error.code ? ` (${error.code})` : "";
  return `${context}: ${error.message}${code}`;
}

function countByCompanyId(rows: CompanyIdRow[] | null): Map<string, number> {
  const counts = new Map<string, number>();

  for (const row of rows ?? []) {
    counts.set(row.company_id, (counts.get(row.company_id) ?? 0) + 1);
  }

  return counts;
}

function collectDistinctCompanyIds(...rowSets: (CompanyIdRow[] | null)[]): Set<string> {
  const ids = new Set<string>();

  for (const rows of rowSets) {
    for (const row of rows ?? []) {
      ids.add(row.company_id);
    }
  }

  return ids;
}

function maxTimestampPerCompany(
  rows: CompanyActivityRow[] | null,
  field: "updated_at" | "created_at",
): Map<string, number> {
  const maxByCompany = new Map<string, number>();

  for (const row of rows ?? []) {
    const raw = row[field];
    if (!raw) {
      continue;
    }

    const parsed = Date.parse(raw);
    if (Number.isNaN(parsed)) {
      continue;
    }

    const current = maxByCompany.get(row.company_id) ?? 0;
    if (parsed > current) {
      maxByCompany.set(row.company_id, parsed);
    }
  }

  return maxByCompany;
}

function mergeActivityTimestamps(
  companyUpdatedAt: Map<string, number>,
  ...sources: Map<string, number>[]
): Map<string, string | null> {
  const merged = new Map<string, number>(companyUpdatedAt);

  for (const source of sources) {
    for (const [companyId, timestamp] of source) {
      const current = merged.get(companyId) ?? 0;
      if (timestamp > current) {
        merged.set(companyId, timestamp);
      }
    }
  }

  const result = new Map<string, string | null>();
  for (const [companyId, timestamp] of merged) {
    result.set(companyId, new Date(timestamp).toISOString());
  }

  return result;
}

function authUserFullName(user: User): string | null {
  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  const raw =
    (typeof metadata?.full_name === "string" && metadata.full_name) ||
    (typeof metadata?.name === "string" && metadata.name) ||
    null;

  const trimmed = raw?.trim();
  return trimmed ? trimmed : null;
}

async function fetchAllAuthUsers(
  diagnostics: string[],
): Promise<{ users: User[]; error: string | null }> {
  const supabase = createServiceRoleClient();
  const users: User[] = [];
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });

    if (error) {
      const message = formatQueryError("auth.admin.listUsers failed", error);
      console.error(`[platform-admin] ${message}`);
      return { users, error: message };
    }

    users.push(...data.users);

    if (data.users.length < perPage) {
      break;
    }

    page += 1;
  }

  if (users.length === 0) {
    pushDiagnostic(diagnostics, "auth.admin.listUsers returned 0 accounts");
  }

  return { users, error: null };
}

async function countAll(
  table: "companies" | "profiles" | "company_memberships" | "jobs" | "customers" | "estimates" | "invoices",
  filters?: { column: string; value: string },
): Promise<CountResult> {
  const supabase = createServiceRoleClient();
  let query = supabase.from(table).select("id", { count: "exact", head: true });

  if (filters) {
    query = query.eq(filters.column, filters.value);
  }

  const { count, error } = await query;

  if (error) {
    const message = formatQueryError(`${table} count query failed`, error);
    console.error(`[platform-admin] ${message}`);
    return { count: 0, error: message };
  }

  return { count: count ?? 0, error: null };
}

async function fetchMembershipRows(
  diagnostics: string[],
): Promise<MembershipQueryRow[]> {
  const supabase = createServiceRoleClient();

  const withProfile = await supabase
    .from("company_memberships")
    .select(
      "id, company_id, user_id, role, status, invite_email, created_at, company:companies(name), profile:profiles!company_memberships_user_id_fkey(full_name, email, created_at)",
    )
    .order("created_at", { ascending: false });

  if (!withProfile.error) {
    return (withProfile.data ?? []) as MembershipQueryRow[];
  }

  const profileJoinMessage = formatQueryError("membership profile join query failed", withProfile.error);
  console.error(`[platform-admin] ${profileJoinMessage}`);
  pushDiagnostic(diagnostics, profileJoinMessage);

  const withoutProfile = await supabase
    .from("company_memberships")
    .select(
      "id, company_id, user_id, role, status, invite_email, created_at, company:companies(name)",
    )
    .order("created_at", { ascending: false });

  if (withoutProfile.error) {
    const message = formatQueryError("membership query failed", withoutProfile.error);
    console.error(`[platform-admin] ${message}`);
    pushDiagnostic(diagnostics, message);
    return [];
  }

  pushDiagnostic(
    diagnostics,
    "membership rows loaded without profile join; profile names/emails may be missing",
  );

  return ((withoutProfile.data ?? []) as MembershipBaseRow[]).map((membership) => ({
    ...membership,
    profile: null,
  }));
}

export async function getPlatformAdminOverview(): Promise<PlatformAdminOverview> {
  const diagnostics: string[] = [];
  const supabase = createServiceRoleClient();

  const authUsersPromise = fetchAllAuthUsers(diagnostics);

  const [
    authUsersResult,
    companiesResult,
    profilesResult,
    memberships,
    recentBugReports,
    jobsCompanyIdsResult,
    customersCompanyIdsResult,
    estimatesCompanyIdsResult,
    invoicesCompanyIdsResult,
    jobActivityTimestampsResult,
    jobUpdatedTimestampsResult,
    companiesCount,
    profilesCount,
    activeMembersCount,
    jobsCount,
    customersCount,
    estimatesCount,
    invoicesCount,
  ] = await Promise.all([
    authUsersPromise,
    supabase
      .from("companies")
      .select("id, name, created_at, updated_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, email, full_name, created_at")
      .order("created_at", { ascending: false }),
    fetchMembershipRows(diagnostics),
    fetchRecentBugReports(diagnostics),
    supabase.from("jobs").select("company_id"),
    supabase.from("customers").select("company_id"),
    supabase.from("estimates").select("company_id"),
    supabase.from("invoices").select("company_id"),
    supabase.from("job_activities").select("company_id, created_at"),
    supabase.from("jobs").select("company_id, updated_at"),
    countAll("companies"),
    countAll("profiles"),
    countAll("company_memberships", { column: "status", value: "active" }),
    countAll("jobs"),
    countAll("customers"),
    countAll("estimates"),
    countAll("invoices"),
  ]);

  const { users: authUsers, error: authUsersError } = authUsersResult;

  if (authUsersError) {
    pushDiagnostic(diagnostics, authUsersError);
  }

  if (companiesResult.error) {
    const message = formatQueryError("companies query failed", companiesResult.error);
    console.error(`[platform-admin] ${message}`);
    pushDiagnostic(diagnostics, message);
  }

  if (profilesResult.error) {
    const message = formatQueryError("profiles query failed", profilesResult.error);
    console.error(`[platform-admin] ${message}`);
    pushDiagnostic(diagnostics, message);
  }

  for (const result of [
    companiesCount,
    profilesCount,
    activeMembersCount,
    jobsCount,
    customersCount,
    estimatesCount,
    invoicesCount,
  ]) {
    if (result.error) {
      pushDiagnostic(diagnostics, result.error);
    }
  }

  const companies = companiesResult.data ?? [];
  const profiles = profilesResult.data ?? [];

  if (profiles.length === 0 && authUsers.length > 0) {
    pushDiagnostic(
      diagnostics,
      "profiles table returned 0 rows; using Supabase Auth users as source of truth for accounts",
    );
  } else if (profiles.length > 0 && profiles.length < authUsers.length) {
    pushDiagnostic(
      diagnostics,
      `profiles (${profiles.length}) has fewer rows than auth accounts (${authUsers.length}); recent sign-ups use auth users`,
    );
  }

  const usageCompanyIds = collectDistinctCompanyIds(
    jobsCompanyIdsResult.data,
    customersCompanyIdsResult.data,
    estimatesCompanyIdsResult.data,
    invoicesCompanyIdsResult.data,
  );

  if (companies.length === 0 && usageCompanyIds.size > 0) {
    pushDiagnostic(
      diagnostics,
      "Usage data references company IDs, but no companies were returned",
    );
  }

  const profileByUserId = new Map<string, ProfileRow>();
  for (const profile of profiles as ProfileRow[]) {
    profileByUserId.set(profile.id, profile);
  }

  const authUserById = new Map<string, User>();
  for (const authUser of authUsers) {
    authUserById.set(authUser.id, authUser);
  }

  const jobCounts = countByCompanyId(jobsCompanyIdsResult.data);
  const customerCounts = countByCompanyId(customersCompanyIdsResult.data);
  const estimateCounts = countByCompanyId(estimatesCompanyIdsResult.data);
  const invoiceCounts = countByCompanyId(invoicesCompanyIdsResult.data);

  const memberCounts = new Map<string, number>();
  const ownerCounts = new Map<string, number>();

  for (const membership of memberships) {
    memberCounts.set(
      membership.company_id,
      (memberCounts.get(membership.company_id) ?? 0) + 1,
    );

    const role = normalizeCompanyRole(membership.role);
    if (role === "owner") {
      ownerCounts.set(
        membership.company_id,
        (ownerCounts.get(membership.company_id) ?? 0) + 1,
      );
    }
  }

  const companyUpdatedAt = new Map<string, number>();
  for (const company of companies) {
    const parsed = Date.parse(company.updated_at);
    if (!Number.isNaN(parsed)) {
      companyUpdatedAt.set(company.id, parsed);
    }
  }

  const lastActivityByCompany = mergeActivityTimestamps(
    companyUpdatedAt,
    maxTimestampPerCompany(jobUpdatedTimestampsResult.data, "updated_at"),
    maxTimestampPerCompany(jobActivityTimestampsResult.data, "created_at"),
  );

  const recentCompanies: PlatformAdminRecentCompany[] = companies
    .slice(0, RECENT_LIMIT)
    .map((company) => ({
      id: company.id,
      name: company.name,
      createdAt: company.created_at,
    }));

  const recentUsers: PlatformAdminRecentUser[] = [...authUsers]
    .sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at))
    .slice(0, RECENT_LIMIT)
    .map((authUser) => {
      const profile = profileByUserId.get(authUser.id);

      return {
        id: authUser.id,
        email: authUser.email?.trim() || profile?.email || "—",
        fullName: profile?.full_name ?? authUserFullName(authUser),
        createdAt: authUser.created_at,
      };
    });

  const users: PlatformAdminUserRow[] = memberships.map((membership) => {
    const role = normalizeCompanyRole(membership.role) ?? ("technician" as CompanyRole);
    const profile = membership.profile ?? (membership.user_id
      ? profileByUserId.get(membership.user_id) ?? null
      : null);
    const authUser = membership.user_id ? authUserById.get(membership.user_id) : undefined;
    const email =
      authUser?.email?.trim() ||
      profile?.email?.trim() ||
      membership.invite_email?.trim() ||
      "—";

    return {
      membershipId: membership.id,
      userId: membership.user_id,
      companyId: membership.company_id,
      name: profile?.full_name ?? (authUser ? authUserFullName(authUser) : null),
      email,
      companyName: membership.company?.name ?? "Unknown company",
      role,
      membershipStatus: membership.status,
      userCreatedAt: authUser?.created_at ?? profile?.created_at ?? null,
      lastSignInAt: authUser?.last_sign_in_at ?? null,
    };
  });

  const platformCompanies: PlatformAdminCompanyRow[] = companies.map((company) => ({
    id: company.id,
    name: company.name,
    memberCount: memberCounts.get(company.id) ?? 0,
    ownerCount: ownerCounts.get(company.id) ?? 0,
    createdAt: company.created_at,
    jobCount: jobCounts.get(company.id) ?? 0,
    customerCount: customerCounts.get(company.id) ?? 0,
    estimateCount: estimateCounts.get(company.id) ?? 0,
    invoiceCount: invoiceCounts.get(company.id) ?? 0,
    lastActivityAt: lastActivityByCompany.get(company.id) ?? company.updated_at,
  }));

  const totalAuthUsers = authUsersError ? 0 : authUsers.length;

  return {
    summary: {
      totalAuthUsers,
      totalCompanies: companiesCount.error ? companies.length : companiesCount.count,
      totalActiveMembers: activeMembersCount.count,
      totalJobs: jobsCount.count,
      totalCustomers: customersCount.count,
      totalEstimates: estimatesCount.count,
      totalInvoices: invoicesCount.count,
    },
    recentCompanies,
    recentUsers,
    recentBugReports,
    users,
    companies: platformCompanies,
    diagnostics,
  };
}
