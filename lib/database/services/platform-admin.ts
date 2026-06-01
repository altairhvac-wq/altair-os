import { createServiceRoleClient } from "@/lib/supabase/service";
import type { CompanyRole, MembershipStatus } from "@/lib/database/types/enums";
import { normalizeCompanyRole } from "@/lib/database/types/roles";
import type {
  PlatformAdminCompanyRow,
  PlatformAdminOverview,
  PlatformAdminRecentCompany,
  PlatformAdminRecentUser,
  PlatformAdminUserRow,
} from "@/shared/types/platform-admin";

const RECENT_LIMIT = 8;

type CompanyIdRow = { company_id: string };
type CompanyActivityRow = { company_id: string; updated_at?: string | null; created_at?: string | null };

function countByCompanyId(rows: CompanyIdRow[] | null): Map<string, number> {
  const counts = new Map<string, number>();

  for (const row of rows ?? []) {
    counts.set(row.company_id, (counts.get(row.company_id) ?? 0) + 1);
  }

  return counts;
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

async function fetchAuthLastSignInByUserId(): Promise<Map<string, string | null>> {
  const supabase = createServiceRoleClient();
  const signInByUserId = new Map<string, string | null>();
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });

    if (error) {
      console.error("[platform-admin] auth.admin.listUsers failed:", {
        page,
        message: error.message,
      });
      break;
    }

    for (const authUser of data.users) {
      signInByUserId.set(authUser.id, authUser.last_sign_in_at ?? null);
    }

    if (data.users.length < perPage) {
      break;
    }

    page += 1;
  }

  return signInByUserId;
}

async function countAll(
  table: "companies" | "profiles" | "company_memberships" | "jobs" | "customers" | "estimates" | "invoices",
  filters?: { column: string; value: string },
): Promise<number> {
  const supabase = createServiceRoleClient();
  let query = supabase.from(table).select("id", { count: "exact", head: true });

  if (filters) {
    query = query.eq(filters.column, filters.value);
  }

  const { count, error } = await query;

  if (error) {
    console.error(`[platform-admin] count ${table} failed:`, {
      message: error.message,
      code: error.code,
    });
    return 0;
  }

  return count ?? 0;
}

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

export async function getPlatformAdminOverview(): Promise<PlatformAdminOverview> {
  const supabase = createServiceRoleClient();

  const [
    companiesResult,
    profilesResult,
    membershipsResult,
    jobsCompanyIdsResult,
    customersCompanyIdsResult,
    estimatesCompanyIdsResult,
    invoicesCompanyIdsResult,
    jobActivityTimestampsResult,
    jobUpdatedTimestampsResult,
    summaryCounts,
    lastSignInByUserId,
  ] = await Promise.all([
    supabase
      .from("companies")
      .select("id, name, created_at, updated_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, email, full_name, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("company_memberships")
      .select(
        "id, company_id, user_id, role, status, invite_email, created_at, company:companies(name), profile:profiles!company_memberships_user_id_fkey(full_name, email, created_at)",
      )
      .order("created_at", { ascending: false }),
    supabase.from("jobs").select("company_id"),
    supabase.from("customers").select("company_id"),
    supabase.from("estimates").select("company_id"),
    supabase.from("invoices").select("company_id"),
    supabase.from("job_activities").select("company_id, created_at"),
    supabase.from("jobs").select("company_id, updated_at"),
    Promise.all([
      countAll("companies"),
      countAll("profiles"),
      countAll("company_memberships", { column: "status", value: "active" }),
      countAll("jobs"),
      countAll("customers"),
      countAll("estimates"),
      countAll("invoices"),
    ]),
    fetchAuthLastSignInByUserId(),
  ]);

  if (companiesResult.error) {
    console.error("[platform-admin] companies query failed:", companiesResult.error);
  }

  if (profilesResult.error) {
    console.error("[platform-admin] profiles query failed:", profilesResult.error);
  }

  if (membershipsResult.error) {
    console.error("[platform-admin] memberships query failed:", membershipsResult.error);
  }

  const companies = companiesResult.data ?? [];
  const profiles = profilesResult.data ?? [];
  const memberships = (membershipsResult.data ?? []) as MembershipQueryRow[];

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

  const recentUsers: PlatformAdminRecentUser[] = profiles
    .slice(0, RECENT_LIMIT)
    .map((profile) => ({
      id: profile.id,
      email: profile.email,
      fullName: profile.full_name,
      createdAt: profile.created_at,
    }));

  const users: PlatformAdminUserRow[] = memberships.map((membership) => {
    const role = normalizeCompanyRole(membership.role) ?? ("technician" as CompanyRole);
    const profile = membership.profile;
    const email =
      profile?.email?.trim() ||
      membership.invite_email?.trim() ||
      "—";
    const userId = membership.user_id;

    return {
      membershipId: membership.id,
      userId,
      companyId: membership.company_id,
      name: profile?.full_name ?? null,
      email,
      companyName: membership.company?.name ?? "Unknown company",
      role,
      membershipStatus: membership.status,
      userCreatedAt: profile?.created_at ?? null,
      lastSignInAt: userId ? (lastSignInByUserId.get(userId) ?? null) : null,
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

  const [
    totalCompanies,
    totalUsers,
    totalActiveMembers,
    totalJobs,
    totalCustomers,
    totalEstimates,
    totalInvoices,
  ] = summaryCounts;

  return {
    summary: {
      totalCompanies,
      totalUsers,
      totalActiveMembers,
      totalJobs,
      totalCustomers,
      totalEstimates,
      totalInvoices,
    },
    recentCompanies,
    recentUsers,
    users,
    companies: platformCompanies,
  };
}
