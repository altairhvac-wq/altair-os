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
  PlatformOpenBugBrief,
} from "@/shared/types/platform-admin";
import { buildPlatformBrainSnapshot } from "@/shared/lib/platform-priority-engine";
import { fetchPlatformReliabilitySnapshot } from "@/lib/database/services/platform-reliability";
import { fetchPlatformFounderSignalActions } from "@/lib/database/services/platform-founder-signal-actions";
import { parseCompanyDemoDataSettings } from "@/shared/lib/demo-data-settings";
import type { Json } from "@/lib/database/types/enums";

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

type CompanySettingsRow = { id: string; settings: Json | null };

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
  company_id?: string | null;
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

async function fetchOpenPriorityBugReports(
  diagnostics: string[],
): Promise<{ blocking: PlatformOpenBugBrief[]; high: PlatformOpenBugBrief[] }> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("beta_feedback_reports")
    .select(
      "id, created_at, severity, message, status, company_id, company:companies(name)",
    )
    .in("status", ["open", "reviewing"])
    .in("severity", ["blocking", "high"])
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    const message = formatQueryError("open priority bug reports query failed", error);
    console.error(`[platform-admin] ${message}`);
    pushDiagnostic(diagnostics, message);
    return { blocking: [], high: [] };
  }

  const blocking: PlatformOpenBugBrief[] = [];
  const high: PlatformOpenBugBrief[] = [];

  for (const row of (data ?? []) as BetaFeedbackReportQueryRow[]) {
    const severity = normalizeBugReportSeverity(row.severity);
    const brief: PlatformOpenBugBrief = {
      id: row.id,
      createdAt: row.created_at,
      companyId: row.company_id ?? null,
      companyName: row.company?.name ?? null,
      messagePreview: truncateMessagePreview(row.message),
      severity,
      status: normalizeBugReportStatus(row.status),
    };

    if (severity === "blocking") {
      blocking.push(brief);
    } else if (severity === "high") {
      high.push(brief);
    }
  }

  return { blocking, high };
}

/**
 * Per-company usage, counted in the database (migration 164).
 *
 * ============================== WHAT THIS REPLACED ==============================
 * Eleven cross-tenant selects, counted into Maps in JavaScript:
 *
 *     jobs / customers / estimates / invoices          -> company_id, counted
 *     the same four again with is_demo                 -> "real" counts
 *     job_activities.created_at, jobs.updated_at       -> last activity
 *     invoice_payments                                 -> payment counts
 *     invoices.created_at                              -> first invoice
 *
 * PostgREST caps each of those at 1,000 rows -- not per company, in total across
 * the platform. So once the platform held more than a thousand jobs, this
 * screen's per-company counts came from an arbitrary thousand of them and every
 * company below the cut read as zero. On a page whose purpose is judging which
 * tenants are active, that is not a slow query; it is a wrong answer that looks
 * like a finding.
 *
 * bigint comes back from PostgREST as a string. Every count is coerced here
 * rather than at each use, because a string that reaches a comparison sorts
 * lexicographically and "9" > "10".
 */
type PlatformCompanyRollup = {
  companyId: string;
  jobCount: number;
  customerCount: number;
  estimateCount: number;
  invoiceCount: number;
  realJobCount: number;
  realCustomerCount: number;
  realEstimateCount: number;
  realInvoiceCount: number;
  paymentCount: number;
  maxJobUpdatedAt: string | null;
  maxJobActivityAt: string | null;
  firstInvoiceAt: string | null;
};

type PlatformCompanyRollupRow = {
  company_id: string;
  job_count: number | string;
  customer_count: number | string;
  estimate_count: number | string;
  invoice_count: number | string;
  real_job_count: number | string;
  real_customer_count: number | string;
  real_estimate_count: number | string;
  real_invoice_count: number | string;
  payment_count: number | string;
  max_job_updated_at: string | null;
  max_job_activity_at: string | null;
  first_invoice_at: string | null;
};

function toCount(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function fetchPlatformCompanyRollups(
  diagnostics: string[],
): Promise<{ rollups: PlatformCompanyRollup[]; queryable: boolean }> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase.rpc("get_platform_company_rollups");

  if (error) {
    const message = formatQueryError("company rollups query failed", error);
    console.error(`[platform-admin] ${message}`);
    pushDiagnostic(diagnostics, message);
    return { rollups: [], queryable: false };
  }

  const rows = (data ?? []) as PlatformCompanyRollupRow[];

  return {
    queryable: true,
    rollups: rows.map((row) => ({
      companyId: row.company_id,
      jobCount: toCount(row.job_count),
      customerCount: toCount(row.customer_count),
      estimateCount: toCount(row.estimate_count),
      invoiceCount: toCount(row.invoice_count),
      realJobCount: toCount(row.real_job_count),
      realCustomerCount: toCount(row.real_customer_count),
      realEstimateCount: toCount(row.real_estimate_count),
      realInvoiceCount: toCount(row.real_invoice_count),
      paymentCount: toCount(row.payment_count),
      maxJobUpdatedAt: row.max_job_updated_at,
      maxJobActivityAt: row.max_job_activity_at,
      firstInvoiceAt: row.first_invoice_at,
    })),
  };
}

/** company_id -> count, for one field of the rollup. */
function rollupCounts(
  rollups: PlatformCompanyRollup[],
  pick: (entry: PlatformCompanyRollup) => number,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const entry of rollups) counts.set(entry.companyId, pick(entry));
  return counts;
}

/** company_id -> epoch millis, skipping companies with no such timestamp. */
function rollupTimestamps(
  rollups: PlatformCompanyRollup[],
  pick: (entry: PlatformCompanyRollup) => string | null,
): Map<string, number> {
  const stamps = new Map<string, number>();
  for (const entry of rollups) {
    const raw = pick(entry);
    if (!raw) continue;
    const parsed = Date.parse(raw);
    if (!Number.isNaN(parsed)) stamps.set(entry.companyId, parsed);
  }
  return stamps;
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

function buildCompanyDemoFlags(
  companies: CompanySettingsRow[],
): Map<string, boolean> {
  const flags = new Map<string, boolean>();

  for (const company of companies) {
    flags.set(company.id, parseCompanyDemoDataSettings(company.settings) !== null);
  }

  return flags;
}

async function fetchStripeConnectedCompanyIds(
  diagnostics: string[],
): Promise<Set<string>> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("company_payment_accounts")
    .select("company_id")
    .eq("provider", "stripe")
    .eq("status", "active");

  if (error) {
    const message = formatQueryError("company_payment_accounts active query failed", error);
    console.error(`[platform-admin] ${message}`);
    pushDiagnostic(diagnostics, message);
    return new Set();
  }

  return new Set((data ?? []).map((row) => row.company_id));
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
    openPriorityBugs,
    rollupResult,
    companiesCount,
    profilesCount,
    activeMembersCount,
    jobsCount,
    customersCount,
    estimatesCount,
    invoicesCount,
    stripeConnectedCompanyIds,
  ] = await Promise.all([
    authUsersPromise,
    supabase
      .from("companies")
      .select("id, name, created_at, updated_at, settings")
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, email, full_name, created_at")
      .order("created_at", { ascending: false }),
    fetchMembershipRows(diagnostics),
    fetchRecentBugReports(diagnostics),
    fetchOpenPriorityBugReports(diagnostics),
    fetchPlatformCompanyRollups(diagnostics),
    countAll("companies"),
    countAll("profiles"),
    countAll("company_memberships", { column: "status", value: "active" }),
    countAll("jobs"),
    countAll("customers"),
    countAll("estimates"),
    countAll("invoices"),
    fetchStripeConnectedCompanyIds(diagnostics),
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

  const rollups = rollupResult.rollups;

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

  const usageCompanyIds = new Set(
    rollups
      .filter(
        (entry) =>
          entry.jobCount > 0 ||
          entry.customerCount > 0 ||
          entry.estimateCount > 0 ||
          entry.invoiceCount > 0,
      )
      .map((entry) => entry.companyId),
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

  const jobCounts = rollupCounts(rollups, (entry) => entry.jobCount);
  const customerCounts = rollupCounts(rollups, (entry) => entry.customerCount);
  const estimateCounts = rollupCounts(rollups, (entry) => entry.estimateCount);
  const invoiceCounts = rollupCounts(rollups, (entry) => entry.invoiceCount);
  const paymentCounts = rollupCounts(rollups, (entry) => entry.paymentCount);
  const paymentsQueryable = rollupResult.queryable;

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
    rollupTimestamps(rollups, (entry) => entry.maxJobUpdatedAt),
    rollupTimestamps(rollups, (entry) => entry.maxJobActivityAt),
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
    paymentCount: paymentCounts.get(company.id) ?? 0,
    lastActivityAt: lastActivityByCompany.get(company.id) ?? company.updated_at,
  }));

  const reliabilityData = await fetchPlatformReliabilitySnapshot({
    companies: platformCompanies.map((company) => ({
      companyId: company.id,
      companyName: company.name,
      invoiceCount: company.invoiceCount,
    })),
    diagnostics,
  });

  const founderSignalActions = await fetchPlatformFounderSignalActions();

  const companyDemoFlags = buildCompanyDemoFlags(
    companies.map((company) => ({
      id: company.id,
      settings: company.settings ?? null,
    })),
  );

  const realCountsByCompany = new Map(
    rollups.map((entry) => [
      entry.companyId,
      {
        customers: entry.realCustomerCount,
        jobs: entry.realJobCount,
        estimates: entry.realEstimateCount,
        invoices: entry.realInvoiceCount,
      },
    ]),
  );

  // The "no payments yet" rule stays here rather than in SQL: it is about what
  // the figure is FOR (a company that has invoiced but never been paid), not
  // about which rows exist.
  const firstInvoiceAtByCompany = new Map<string, string>();
  for (const entry of rollups) {
    if (!entry.firstInvoiceAt) continue;
    if (entry.paymentCount > 0) continue;
    firstInvoiceAtByCompany.set(entry.companyId, entry.firstInvoiceAt);
  }

  const totalAuthUsers = authUsersError ? 0 : authUsers.length;

  const overviewWithoutBrain: Omit<PlatformAdminOverview, "brain"> = {
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
    openBlockingBugs: openPriorityBugs.blocking,
    openHighBugs: openPriorityBugs.high,
    users,
    companies: platformCompanies,
    diagnostics,
    paymentsQueryable,
    reliabilityData,
  };

  return {
    ...overviewWithoutBrain,
    brain: buildPlatformBrainSnapshot(
      {
        ...overviewWithoutBrain,
        companyDemoFlags,
        realCountsByCompany,
        firstInvoiceAtByCompany,
        stripeConnectedCompanyIds,
        founderSignalActions,
      },
      paymentsQueryable,
    ),
  };
}
