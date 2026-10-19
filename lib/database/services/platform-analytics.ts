import "server-only";

import type { User } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { fetchAllAuthUsers } from "@/lib/database/services/auth-users";
import { fetchLatestPlatformAutomationRun } from "@/lib/database/services/platform-automation-runs";
import { getPlatformAdminEmails } from "@/lib/database/platform-admin-emails";
import { parseCompanyDemoDataSettings } from "@/shared/lib/demo-data-settings";
import { resolveEffectiveSubscriptionStatus } from "@/lib/saas-billing/trial-policy";
import { SAAS_SUBSCRIPTION_CATALOG, isSaasPlanKey } from "@/lib/saas-billing/catalog";
import {
  classifyChannel,
  sanitizeAttribution,
} from "@/shared/lib/analytics/attribution";
import {
  buildFunnel,
  churnRate,
  countByUtcDay,
  metricUnavailable,
  metricValue,
  monthlyAmountFromStripeItems,
  rate,
  resolveAnalyticsRange,
  utcDayKeys,
} from "@/shared/lib/analytics/platform-metrics";
import type {
  CampaignRow,
  ChannelRow,
  ExpiringTrialRow,
  HealthIndicator,
  InactiveTrialRow,
  NamedCount,
  PlatformAnalytics,
  PlatformAnalyticsTraffic,
} from "@/shared/types/platform-analytics";

/**
 * Platform analytics (platform admins only; callers must have run
 * requirePlatformAdmin). Reads with the service role because every figure
 * here crosses tenants by design.
 *
 * ============ SOURCES ============
 *   traffic, funnel top, campaigns' visitors, DAU/WAU/MAU, feature use
 *        → web_analytics_events via platform_web_analytics_summary (202)
 *   signups → auth users (created_at); attribution → user metadata
 *   companies, trials, conversion → companies + company_subscriptions
 *        (card-free trial expiry derived exactly as the app gate derives it)
 *   activity → jobs / estimates / invoices / customers created_at
 *   MRR → latest Stripe subscription object per subscription in the webhook
 *        ledger (verified events), falling back to the catalog list price
 *        (flagged as estimated); collected revenue → invoice.paid amounts.
 *        MRR and collected revenue are different numbers and shown apart.
 *
 * ============ INTERNAL ACTIVITY ============
 * Demo-flagged companies and companies owned by a platform admin are left out
 * of every business figure; the count left out is shown on the page.
 *
 * PostgREST returns at most 1,000 rows, so every multi-row read pages with
 * .range() to completion (capped at MAX_PAGES, reported if hit).
 */

const PAGE_SIZE = 1000;
const MAX_PAGES = 40;
const DAY_MS = 86_400_000;
const ACTIVE_TRIAL_WINDOW_DAYS = 7;
const EXPIRING_WITHIN_DAYS = 4;

type QueryError = { message: string; code?: string } | null;
type PageResult = { data: unknown[] | null; error: QueryError };

async function readAllPages<T>(
  label: string,
  page: (from: number, to: number) => PromiseLike<PageResult>,
  diagnostics: string[],
): Promise<T[]> {
  const rows: T[] = [];
  for (let index = 0; index < MAX_PAGES; index += 1) {
    const from = index * PAGE_SIZE;
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) {
      diagnostics.push(`${label}: ${error.message}${error.code ? ` (${error.code})` : ""}`);
      return rows;
    }
    const batch = (data ?? []) as T[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) return rows;
  }
  diagnostics.push(`${label}: stopped after ${MAX_PAGES * PAGE_SIZE} rows; figures may be incomplete`);
  return rows;
}

type CompanyRow = { id: string; name: string; created_at: string; settings: unknown };
type SubscriptionRow = {
  company_id: string;
  status: string;
  access_grant: string;
  plan_key: string;
  trial_starts_at: string | null;
  trial_ends_at: string | null;
  stripe_subscription_id: string | null;
  canceled_at: string | null;
  created_at: string;
};
type MembershipRow = { company_id: string; user_id: string | null; role: string; status: string };
type CreatedRow = { company_id: string; created_at: string };
type LedgerRow = {
  event_type: string;
  created_at: string;
  company_id: string | null;
  object_id: string | null;
  amount_paid: number | string | null;
  invoice_subscription: string | null;
  items: unknown;
};

type SummaryJson = {
  tracking_since?: string | null;
  last_event_at?: string | null;
  totals?: { pageviews?: number; visitors?: number; sessions?: number };
  windows?: { today?: number; last_7_days?: number; last_30_days?: number };
  daily?: { day: string; pageviews: number; visitors: number }[];
  top_pages?: { path: string; pageviews: number; visitors: number }[];
  referrers?: { host: string; visitors: number }[];
  channels?: { channel: string; visitors: number }[];
  devices?: { device: string; visitors: number }[];
  returning?: { returning_visitors?: number; new_visitors?: number; unknown_visitors?: number };
  campaigns?: { source: string | null; medium: string | null; campaign: string | null; visitors: number; signups: number }[];
  funnel?: {
    visitors?: number;
    pricing_visitors?: number;
    signup_page_visitors?: number;
    signup_started_visitors?: number;
    signup_completed_visitors?: number;
  };
  channel_signups?: { channel: string; visitors: number; signups: number }[];
  app?: {
    dau?: number;
    wau?: number;
    mau?: number;
    active_user_ids?: string[];
    daily_active_users?: { day: string; users: number }[];
    features?: { area: string; users: number; views: number }[];
  };
};

const num = (value: unknown): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const TRACKING_MISSING_REASON =
  "Website tracking starts once migration 202 is applied and the site redeployed.";


const AREA_LABELS: Record<string, string> = {
  home: "Dashboard",
  jobs: "Jobs",
  work: "Work",
  dispatch: "Dispatch",
  schedule: "Schedule",
  customers: "Customers",
  leads: "Leads",
  sales: "Sales",
  estimates: "Estimates",
  invoices: "Invoices",
  payments: "Payments",
  "price-book": "Price book",
  expenses: "Expenses",
  "time-clock": "Time clock",
  time: "Time",
  payroll: "Payroll",
  team: "Team",
  technician: "Technician app",
  reports: "Reports",
  marketing: "Marketing",
  community: "Community",
  network: "Network",
  settings: "Settings",
  setup: "Setup",
  "activate-subscription": "Billing activation",
};

function areaLabel(area: string): string {
  return AREA_LABELS[area] ?? area.replace(/-/g, " ");
}

function daysBetween(fromMs: number, toMs: number): number {
  return Math.ceil((toMs - fromMs) / DAY_MS);
}

export async function getPlatformAnalytics(rangeKey: string | null | undefined): Promise<PlatformAnalytics> {
  const nowMs = Date.now();
  const range = resolveAnalyticsRange(rangeKey, nowMs);
  const fromMs = Date.parse(range.fromIso);
  const previousFromMs = Date.parse(range.previousFromIso);
  const diagnostics: string[] = [];
  const supabase = createServiceRoleClient();

  const [
    summaryResult,
    companies,
    subscriptions,
    memberships,
    authUsersResult,
    jobs,
    estimates,
    invoices,
    customers,
    ledger,
    customerPayments,
    billingRun,
    rollupResult,
  ] = await Promise.all([
    supabase.rpc("platform_web_analytics_summary", { p_from: range.fromIso, p_to: range.toIso }),
    readAllPages<CompanyRow>(
      "companies",
      (from, to) =>
        supabase
          .from("companies")
          .select("id, name, created_at, settings")
          .order("created_at", { ascending: true })
          .range(from, to),
      diagnostics,
    ),
    readAllPages<SubscriptionRow>(
      "company_subscriptions",
      (from, to) =>
        supabase
          .from("company_subscriptions")
          .select(
            "company_id, status, access_grant, plan_key, trial_starts_at, trial_ends_at, stripe_subscription_id, canceled_at, created_at",
          )
          .order("created_at", { ascending: true })
          .range(from, to),
      diagnostics,
    ),
    readAllPages<MembershipRow>(
      "company_memberships",
      (from, to) =>
        supabase
          .from("company_memberships")
          .select("company_id, user_id, role, status")
          .eq("status", "active")
          .order("company_id", { ascending: true })
          .range(from, to),
      diagnostics,
    ),
    fetchAllAuthUsers(diagnostics),
    readAllPages<CreatedRow>(
      "jobs",
      (from, to) =>
        supabase
          .from("jobs")
          .select("company_id, created_at")
          .gte("created_at", range.previousFromIso)
          .order("created_at", { ascending: true })
          .range(from, to),
      diagnostics,
    ),
    readAllPages<CreatedRow>(
      "estimates",
      (from, to) =>
        supabase
          .from("estimates")
          .select("company_id, created_at")
          .gte("created_at", range.previousFromIso)
          .order("created_at", { ascending: true })
          .range(from, to),
      diagnostics,
    ),
    readAllPages<CreatedRow>(
      "invoices",
      (from, to) =>
        supabase
          .from("invoices")
          .select("company_id, created_at")
          .gte("created_at", range.previousFromIso)
          .order("created_at", { ascending: true })
          .range(from, to),
      diagnostics,
    ),
    readAllPages<CreatedRow>(
      "customers",
      (from, to) =>
        supabase
          .from("customers")
          .select("company_id, created_at")
          .gte("created_at", range.previousFromIso)
          .order("created_at", { ascending: true })
          .range(from, to),
      diagnostics,
    ),
    readAllPages<LedgerRow>(
      "subscription_event_ledger",
      (from, to) =>
        supabase
          .from("subscription_event_ledger")
          .select(
            "event_type, created_at, company_id, object_id:payload->data->object->>id, amount_paid:payload->data->object->>amount_paid, invoice_subscription:payload->data->object->>subscription, items:payload->data->object->items",
          )
          .eq("processing_status", "processed")
          .in("event_type", [
            "invoice.paid",
            "invoice.payment_failed",
            "customer.subscription.created",
            "customer.subscription.updated",
            "customer.subscription.deleted",
          ])
          .order("created_at", { ascending: false })
          .range(from, to),
      diagnostics,
    ),
    supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .gte("created_at", range.fromIso),
    fetchLatestPlatformAutomationRun("billing_maintenance"),
    // All-time per-company record counts (migration 164): onboarding and
    // "first meaningful action" must not depend on the selected range.
    supabase.rpc("get_platform_company_rollups"),
  ]);

  type RollupRow = {
    company_id: string;
    real_job_count: number | string;
    real_customer_count: number | string;
    real_estimate_count: number | string;
    real_invoice_count: number | string;
  };
  if (rollupResult.error) diagnostics.push(`get_platform_company_rollups: ${rollupResult.error.message}`);
  const rollupByCompany = new Map(
    ((rollupResult.data ?? []) as RollupRow[]).map((row) => [row.company_id, row]),
  );
  /** Has the company ever created a real job, estimate or invoice? */
  const hasMeaningfulAction = (companyId: string) => {
    const row = rollupByCompany.get(companyId);
    if (!row) return false;
    return num(row.real_job_count) + num(row.real_estimate_count) + num(row.real_invoice_count) > 0;
  };

  // ---------------------------------------------------------------- tracking
  const summaryError = summaryResult.error;
  const summary = (summaryError ? null : (summaryResult.data as SummaryJson | null)) ?? null;
  const trackingAvailable = Boolean(summary);
  // Tracked steps mean nothing before the first event: "0 visits" next to real
  // signups would be a false zero. No events yet → not measured.
  const trackingSince = summary?.tracking_since ?? null;
  const trackingMeasured = trackingAvailable && trackingSince != null;
  const trackingCoversRange = trackingMeasured && Date.parse(trackingSince as string) <= fromMs;
  const trackingReason = summaryError
    ? summaryError.code === "PGRST202" || summaryError.code === "42883" || /function|does not exist/i.test(summaryError.message)
      ? TRACKING_MISSING_REASON
      : `Tracking data could not be read (${summaryError.code ?? "error"}).`
    : null;
  if (summaryError && trackingReason !== TRACKING_MISSING_REASON) {
    diagnostics.push(`platform_web_analytics_summary: ${summaryError.message}`);
  }

  // ---------------------------------------------------------------- internal exclusion
  const adminEmails = getPlatformAdminEmails();
  const authUsers: User[] = authUsersResult.users;
  const userById = new Map(authUsers.map((user) => [user.id, user]));
  const ownerByCompany = new Map<string, string>();
  const userIdsByCompany = new Map<string, Set<string>>();
  for (const membership of memberships) {
    if (!membership.user_id) continue;
    if (!userIdsByCompany.has(membership.company_id)) userIdsByCompany.set(membership.company_id, new Set());
    userIdsByCompany.get(membership.company_id)!.add(membership.user_id);
    if (membership.role === "owner" && !ownerByCompany.has(membership.company_id)) {
      ownerByCompany.set(membership.company_id, membership.user_id);
    }
  }
  const internalCompanyIds = new Set<string>();
  for (const company of companies) {
    const demo = parseCompanyDemoDataSettings(company.settings as never) !== null;
    const ownerEmail = userById.get(ownerByCompany.get(company.id) ?? "")?.email?.toLowerCase();
    if (demo || (ownerEmail && adminEmails.has(ownerEmail))) internalCompanyIds.add(company.id);
  }
  const realCompanies = companies.filter((company) => !internalCompanyIds.has(company.id));
  const isReal = (companyId: string | null | undefined) => Boolean(companyId) && !internalCompanyIds.has(companyId as string);
  const internalUserIds = new Set<string>();
  for (const user of authUsers) {
    if (user.email && adminEmails.has(user.email.toLowerCase())) internalUserIds.add(user.id);
  }
  for (const companyId of internalCompanyIds) {
    for (const userId of userIdsByCompany.get(companyId) ?? []) internalUserIds.add(userId);
  }
  const companyByUser = new Map<string, string>();
  for (const membership of memberships) {
    if (membership.user_id && !companyByUser.has(membership.user_id)) {
      companyByUser.set(membership.user_id, membership.company_id);
    }
  }

  // ---------------------------------------------------------------- subscriptions
  const subscriptionByCompany = new Map(subscriptions.map((row) => [row.company_id, row]));
  const effective = (row: SubscriptionRow | undefined) =>
    row
      ? resolveEffectiveSubscriptionStatus(
          {
            status: row.status as never,
            trialEndsAt: row.trial_ends_at,
            stripeSubscriptionId: row.stripe_subscription_id,
          },
          nowMs,
        )
      : null;
  const isComped = (row: SubscriptionRow | undefined) => row?.access_grant === "beta_comped";
  const isPaying = (row: SubscriptionRow | undefined) =>
    Boolean(row && !isComped(row) && row.stripe_subscription_id && (row.status === "active" || row.status === "past_due"));
  const isTrialing = (row: SubscriptionRow | undefined) =>
    Boolean(row && !isComped(row) && effective(row) === "trialing");

  const realSubs = realCompanies
    .map((company) => ({ company, sub: subscriptionByCompany.get(company.id) }))
    .filter((entry): entry is { company: CompanyRow; sub: SubscriptionRow } => Boolean(entry.sub));

  const paying = realSubs.filter((entry) => isPaying(entry.sub));
  const trialing = realSubs.filter((entry) => isTrialing(entry.sub));

  // ---------------------------------------------------------------- activity
  const inRange = (stamp: string) => Date.parse(stamp) >= fromMs;
  const inPrevious = (stamp: string) => {
    const ms = Date.parse(stamp);
    return ms >= previousFromMs && ms < fromMs;
  };
  const realRows = (rows: CreatedRow[]) => rows.filter((row) => isReal(row.company_id));
  const realJobs = realRows(jobs);
  const realEstimates = realRows(estimates);
  const realInvoices = realRows(invoices);
  const realCustomers = realRows(customers);

  const trackedActiveUserIds = new Set(
    (summary?.app?.active_user_ids ?? []).filter((id) => !internalUserIds.has(id)),
  );

  const lastActivityByCompany = new Map<string, number>();
  const activeNow = new Set<string>();
  const activePrevious = new Set<string>();
  for (const rows of [realJobs, realEstimates, realInvoices, realCustomers]) {
    for (const row of rows) {
      const ms = Date.parse(row.created_at);
      if (ms > (lastActivityByCompany.get(row.company_id) ?? 0)) lastActivityByCompany.set(row.company_id, ms);
      if (ms >= fromMs) activeNow.add(row.company_id);
      else if (ms >= previousFromMs) activePrevious.add(row.company_id);
    }
  }
  for (const userId of trackedActiveUserIds) {
    const companyId = companyByUser.get(userId);
    if (companyId && isReal(companyId)) activeNow.add(companyId);
  }
  const returningCompanies = [...activePrevious].filter((id) => activeNow.has(id)).length;

  // ---------------------------------------------------------------- signups + attribution
  const realUsers = authUsers.filter((user) => !internalUserIds.has(user.id) && !(user.email && adminEmails.has(user.email.toLowerCase())));
  const signupsInRange = realUsers.filter((user) => user.created_at && inRange(user.created_at));
  const signupsPrevious = realUsers.filter((user) => user.created_at && inPrevious(user.created_at));

  type Outcome = { activated: boolean; paid: boolean };
  const outcomeForUser = (user: User): Outcome => {
    const companyId = companyByUser.get(user.id);
    const sub = companyId ? subscriptionByCompany.get(companyId) : undefined;
    return { activated: Boolean(companyId && hasMeaningfulAction(companyId)), paid: isPaying(sub) };
  };

  const channelAgg = new Map<string, ChannelRow>();
  const campaignAgg = new Map<string, CampaignRow>();
  let attributedSignups = 0;
  for (const user of signupsInRange) {
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const attribution = sanitizeAttribution(meta.signup_attribution);
    const outcome = outcomeForUser(user);
    const channel = attribution
      ? classifyChannel({
          referrerHost: attribution.referrerHost,
          utmSource: attribution.source,
          utmMedium: attribution.medium,
        })
      : "unknown";
    if (attribution) attributedSignups += 1;
    const channelRow = channelAgg.get(channel) ?? { channel, visitors: null, signups: 0, activated: 0, paid: 0 };
    channelRow.signups += 1;
    if (outcome.activated) channelRow.activated += 1;
    if (outcome.paid) channelRow.paid += 1;
    channelAgg.set(channel, channelRow);
    if (attribution && (attribution.source || attribution.campaign)) {
      const key = `${attribution.source ?? ""}|${attribution.medium ?? ""}|${attribution.campaign ?? ""}`;
      const row = campaignAgg.get(key) ?? {
        source: attribution.source,
        medium: attribution.medium,
        campaign: attribution.campaign,
        visitors: null,
        signups: 0,
        activated: 0,
        paid: 0,
      };
      row.signups += 1;
      if (outcome.activated) row.activated += 1;
      if (outcome.paid) row.paid += 1;
      campaignAgg.set(key, row);
    }
  }
  if (summary) {
    for (const tracked of summary.channel_signups ?? []) {
      const row = channelAgg.get(tracked.channel) ?? { channel: tracked.channel, visitors: 0, signups: 0, activated: 0, paid: 0 };
      row.visitors = num(tracked.visitors);
      channelAgg.set(tracked.channel, row);
    }
    for (const tracked of summary.campaigns ?? []) {
      const key = `${tracked.source ?? ""}|${tracked.medium ?? ""}|${tracked.campaign ?? ""}`;
      const row = campaignAgg.get(key) ?? {
        source: tracked.source,
        medium: tracked.medium,
        campaign: tracked.campaign,
        visitors: 0,
        signups: 0,
        activated: 0,
        paid: 0,
      };
      row.visitors = num(tracked.visitors);
      campaignAgg.set(key, row);
    }
  }
  const channels = [...channelAgg.values()].sort((a, b) => b.signups - a.signups || (b.visitors ?? 0) - (a.visitors ?? 0));
  const campaigns = [...campaignAgg.values()].sort((a, b) => b.signups - a.signups || (b.visitors ?? 0) - (a.visitors ?? 0)).slice(0, 25);

  // ---------------------------------------------------------------- funnel
  const companiesCreatedInRange = realCompanies.filter((company) => inRange(company.created_at));
  const trialsActivatedInRange = companiesCreatedInRange.filter((company) => {
    const sub = subscriptionByCompany.get(company.id);
    return Boolean(sub?.trial_starts_at || sub?.stripe_subscription_id || isComped(sub));
  });
  const meaningfulInRange = trialsActivatedInRange.filter((company) => hasMeaningfulAction(company.id));
  const paidInRange = companiesCreatedInRange.filter((company) => isPaying(subscriptionByCompany.get(company.id)));
  const funnelSummary = summary?.funnel;
  const funnel = buildFunnel([
    { key: "visit", label: "Website visit", count: trackingMeasured ? num(funnelSummary?.visitors) : null, source: "tracking" },
    { key: "pricing", label: "Viewed pricing", count: trackingMeasured ? num(funnelSummary?.pricing_visitors) : null, source: "tracking" },
    { key: "signup_started", label: "Started signup", count: trackingMeasured ? num(funnelSummary?.signup_started_visitors) : null, source: "tracking" },
    { key: "signup_completed", label: "Completed signup", count: signupsInRange.length, source: "accounts" },
    { key: "trial", label: "Trial activated", count: trialsActivatedInRange.length, source: "companies" },
    { key: "meaningful", label: "First job, estimate or invoice", count: meaningfulInRange.length, source: "records" },
    { key: "paid", label: "Paid subscriber", count: paidInRange.length, source: "subscriptions" },
  ]);

  // ---------------------------------------------------------------- traffic
  let traffic: PlatformAnalyticsTraffic | null = null;
  if (summary) {
    const toNamed = <T,>(rows: T[] | undefined, label: (row: T) => string, value: (row: T) => number, secondary?: (row: T) => number): NamedCount[] =>
      (rows ?? []).map((row) => ({ label: label(row), value: value(row), ...(secondary ? { secondary: secondary(row) } : {}) }));
    traffic = {
      windows: {
        today: metricValue(num(summary.windows?.today)),
        last7Days: metricValue(num(summary.windows?.last_7_days)),
        last30Days: metricValue(num(summary.windows?.last_30_days)),
      },
      visitors: metricValue(num(summary.totals?.visitors)),
      pageviews: metricValue(num(summary.totals?.pageviews)),
      sessions: metricValue(num(summary.totals?.sessions)),
      daily: (summary.daily ?? []).map((point) => ({ day: point.day, visitors: num(point.visitors), pageviews: num(point.pageviews) })),
      topPages: toNamed(summary.top_pages, (row) => row.path, (row) => num(row.pageviews), (row) => num(row.visitors)),
      referrers: toNamed(summary.referrers, (row) => row.host, (row) => num(row.visitors)),
      channels: toNamed(summary.channels, (row) => row.channel, (row) => num(row.visitors)),
      devices: toNamed(summary.devices, (row) => row.device, (row) => num(row.visitors)),
      returning: summary.returning
        ? {
            newVisitors: num(summary.returning.new_visitors),
            returningVisitors: num(summary.returning.returning_visitors),
            unknownVisitors: num(summary.returning.unknown_visitors),
          }
        : null,
    };
  }

  // ---------------------------------------------------------------- product usage
  const signedInWithin = (days: number) =>
    realUsers.filter((user) => user.last_sign_in_at && nowMs - Date.parse(user.last_sign_in_at) <= days * DAY_MS).length;
  const activeUserBasis = trackingAvailable && (summary?.app?.mau ?? 0) > 0 ? "tracking" : "sign_in";
  const dayKeys = utcDayKeys(range.fromIso, range.toIso);
  const createdDailyJobs = countByUtcDay(realJobs.filter((r) => inRange(r.created_at)).map((r) => r.created_at), dayKeys);
  const createdDailyEstimates = countByUtcDay(realEstimates.filter((r) => inRange(r.created_at)).map((r) => r.created_at), dayKeys);
  const createdDailyInvoices = countByUtcDay(realInvoices.filter((r) => inRange(r.created_at)).map((r) => r.created_at), dayKeys);

  const onboardingBase = realCompanies.length;
  const companiesWith = (pick: (row: RollupRow) => number | string) =>
    realCompanies.filter((company) => {
      const row = rollupByCompany.get(company.id);
      return row ? num(pick(row)) > 0 : false;
    }).length;
  const onboarding = [
    { label: "Companies", companies: onboardingBase },
    { label: "Added a customer", companies: companiesWith((row) => row.real_customer_count) },
    { label: "Created a job", companies: companiesWith((row) => row.real_job_count) },
    { label: "Created an estimate", companies: companiesWith((row) => row.real_estimate_count) },
    { label: "Created an invoice", companies: companiesWith((row) => row.real_invoice_count) },
  ].map((step) => ({ ...step, share: rate(step.companies, onboardingBase) }));

  const trialEngagedIds = new Set(
    trialing
      .filter((entry) => {
        const last = lastActivityByCompany.get(entry.company.id);
        return last != null && nowMs - last <= ACTIVE_TRIAL_WINDOW_DAYS * DAY_MS;
      })
      .map((entry) => entry.company.id),
  );
  for (const userId of trackedActiveUserIds) {
    const companyId = companyByUser.get(userId);
    if (companyId && trialing.some((entry) => entry.company.id === companyId)) trialEngagedIds.add(companyId);
  }
  const inactiveTrials: InactiveTrialRow[] = trialing
    .filter((entry) => !trialEngagedIds.has(entry.company.id))
    .map((entry) => {
      const ends = entry.sub.trial_ends_at ? Date.parse(entry.sub.trial_ends_at) : null;
      const last = lastActivityByCompany.get(entry.company.id);
      return {
        companyId: entry.company.id,
        companyName: entry.company.name,
        trialEndsAt: entry.sub.trial_ends_at,
        daysLeft: ends != null ? Math.max(0, daysBetween(nowMs, ends)) : null,
        lastActivityAt: last ? new Date(last).toISOString() : null,
      };
    })
    .sort((a, b) => (a.daysLeft ?? 99) - (b.daysLeft ?? 99))
    .slice(0, 25);

  const modules: NamedCount[] = [
    { label: "Customers added", value: realCustomers.filter((r) => inRange(r.created_at)).length },
    { label: "Jobs created", value: realJobs.filter((r) => inRange(r.created_at)).length },
    { label: "Estimates created", value: realEstimates.filter((r) => inRange(r.created_at)).length },
    { label: "Invoices created", value: realInvoices.filter((r) => inRange(r.created_at)).length },
  ];

  // ---------------------------------------------------------------- revenue
  const latestSubscriptionItems = new Map<string, unknown>();
  let collectedCents = 0;
  const failedInvoices = new Set<string>();
  const collectedByMonth = new Map<string, number>();
  for (const row of ledger) {
    if (row.event_type.startsWith("customer.subscription.") && row.object_id && !latestSubscriptionItems.has(row.object_id)) {
      latestSubscriptionItems.set(row.object_id, row.items);
    }
    if (row.company_id && !isReal(row.company_id)) continue;
    if (row.event_type === "invoice.paid") {
      const amount = num(row.amount_paid);
      const month = row.created_at.slice(0, 7);
      collectedByMonth.set(month, (collectedByMonth.get(month) ?? 0) + amount);
      if (inRange(row.created_at)) collectedCents += amount;
    }
    if (row.event_type === "invoice.payment_failed" && inRange(row.created_at) && row.object_id) {
      failedInvoices.add(row.object_id);
    }
  }

  let mrrCents = 0;
  let mrrEstimated = false;
  for (const entry of paying) {
    const items = entry.sub.stripe_subscription_id ? latestSubscriptionItems.get(entry.sub.stripe_subscription_id) : undefined;
    const fromStripe = items ? monthlyAmountFromStripeItems(items) : { cents: 0, unpriced: 1 };
    if (fromStripe.cents > 0 && fromStripe.unpriced === 0) {
      mrrCents += fromStripe.cents;
      continue;
    }
    const plan = isSaasPlanKey(entry.sub.plan_key) ? SAAS_SUBSCRIPTION_CATALOG[entry.sub.plan_key] : null;
    if (plan?.monthlyPriceUsd) {
      mrrCents += plan.monthlyPriceUsd * 100;
      mrrEstimated = true;
    }
  }
  const mrr = metricValue(mrrCents);
  const arr = metricValue(mrrCents * 12);

  const ledgerReadable = !diagnostics.some((line) => line.startsWith("subscription_event_ledger"));
  const collected = ledgerReadable ? metricValue(collectedCents) : metricUnavailable("Stripe webhook ledger could not be read.");

  const months: string[] = [];
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(nowMs);
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() - i);
    months.push(d.toISOString().slice(0, 7));
  }
  const collectedMonthly = months.map((month) => ({ day: month, value: collectedByMonth.get(month) ?? 0 }));

  const cancellations = realSubs.filter((entry) => entry.sub.canceled_at && inRange(entry.sub.canceled_at)).length;
  const trialEligible = realSubs.filter((entry) => {
    if (!entry.sub.trial_starts_at && !entry.sub.trial_ends_at) return false;
    const ended = entry.sub.trial_ends_at ? Date.parse(entry.sub.trial_ends_at) <= nowMs : false;
    return ended || isPaying(entry.sub);
  });
  const trialConverted = trialEligible.filter((entry) => isPaying(entry.sub)).length;
  const expiringTrials: ExpiringTrialRow[] = trialing
    .filter((entry) => {
      if (!entry.sub.trial_ends_at) return false;
      const left = Date.parse(entry.sub.trial_ends_at) - nowMs;
      // Only trials that still have time left. A Stripe-backed row past its
      // end date but still "trialing" is a sync problem, reported in health.
      return left > 0 && left <= EXPIRING_WITHIN_DAYS * DAY_MS;
    })
    .map((entry) => ({
      companyId: entry.company.id,
      companyName: entry.company.name,
      trialEndsAt: entry.sub.trial_ends_at as string,
      daysLeft: Math.max(0, daysBetween(nowMs, Date.parse(entry.sub.trial_ends_at as string))),
      hasCard: Boolean(entry.sub.stripe_subscription_id),
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft);

  // ---------------------------------------------------------------- health
  const health: HealthIndicator[] = [];
  const lastEventMs = summary?.last_event_at ? Date.parse(summary.last_event_at) : null;
  health.push(
    !trackingAvailable
      ? { label: "Website tracking", status: "warning", detail: trackingReason ?? TRACKING_MISSING_REASON }
      : lastEventMs == null
        ? { label: "Website tracking", status: "warning", detail: "Ready, but no events recorded yet." }
        : nowMs - lastEventMs > 2 * DAY_MS
          ? { label: "Website tracking", status: "warning", detail: `No events for ${Math.floor((nowMs - lastEventMs) / DAY_MS)} days.` }
          : { label: "Website tracking", status: "healthy", detail: "Recording." },
  );
  const lastLedger = ledger[0]?.created_at ?? null;
  health.push(
    lastLedger
      ? { label: "Stripe billing webhooks", status: "healthy", detail: `Last processed event ${lastLedger.slice(0, 10)}.` }
      : { label: "Stripe billing webhooks", status: "unknown", detail: "No processed billing events on record yet." },
  );
  const run = billingRun.run;
  health.push(
    !billingRun.queryable
      ? { label: "Billing maintenance cron", status: "unknown", detail: "Run history could not be read." }
      : !run
        ? { label: "Billing maintenance cron", status: "warning", detail: "No completed run on record." }
        : run.status === "failed"
          ? { label: "Billing maintenance cron", status: "critical", detail: `Last run failed ${run.startedAt.slice(0, 10)}.` }
          : nowMs - Date.parse(run.startedAt) > 2 * DAY_MS
            ? { label: "Billing maintenance cron", status: "warning", detail: `Last run ${run.startedAt.slice(0, 10)} — older than two days.` }
            : { label: "Billing maintenance cron", status: "healthy", detail: `Last run ${run.startedAt.slice(0, 10)} (${run.status}).` },
  );
  // The app trusts Stripe's status for card-backed trials, so a row whose
  // trial ended but is still "trialing" means a Stripe update never arrived.
  const staleStripeTrials = trialing.filter(
    (entry) =>
      entry.sub.stripe_subscription_id &&
      entry.sub.trial_ends_at &&
      Date.parse(entry.sub.trial_ends_at) <= nowMs,
  ).length;
  if (staleStripeTrials > 0) {
    health.push({
      label: "Trial status sync",
      status: "warning",
      detail: `${staleStripeTrials} card-backed trial(s) are past their end date but still marked trialing. Check Stripe webhook delivery for those subscriptions.`,
    });
  }
  if (diagnostics.length) {
    health.push({ label: "Data reads", status: "warning", detail: `${diagnostics.length} source(s) could not be fully read.` });
  }

  // ---------------------------------------------------------------- insights
  const insights: string[] = [];
  if (funnel.bottleneck && funnel.bottleneck.fromPrevious != null) {
    insights.push(
      `Biggest drop-off: only ${Math.round(funnel.bottleneck.fromPrevious * 100)}% reach “${funnel.bottleneck.label}” from the step before.`,
    );
  }
  if (expiringTrials.filter((t) => !t.hasCard).length > 0) {
    insights.push(`${expiringTrials.filter((t) => !t.hasCard).length} trial(s) end within ${EXPIRING_WITHIN_DAYS} days with no card on file.`);
  }
  if (inactiveTrials.length > 0) {
    insights.push(`${inactiveTrials.length} trialing compan${inactiveTrials.length === 1 ? "y has" : "ies have"} no activity in the last ${ACTIVE_TRIAL_WINDOW_DAYS} days.`);
  }
  if (!trackingAvailable) insights.push(TRACKING_MISSING_REASON);
  if (signupsInRange.length > 0 && attributedSignups < signupsInRange.length) {
    insights.push(`${signupsInRange.length - attributedSignups} of ${signupsInRange.length} signups have no recorded source (signed up before tracking, or with tracking blocked).`);
  }

  const newCompaniesDaily = countByUtcDay(companiesCreatedInRange.map((company) => company.created_at), dayKeys);
  const engagementRate = rate(trialEngagedIds.size, trialing.length);

  return {
    generatedAt: new Date(nowMs).toISOString(),
    range: { key: range.key, label: range.label, fromIso: range.fromIso, toIso: range.toIso },
    tracking: {
      available: trackingAvailable,
      reason: trackingReason,
      trackingSince,
      lastEventAt: summary?.last_event_at ?? null,
      coversRange: trackingCoversRange,
    },
    excludedInternalCompanies: internalCompanyIds.size,
    diagnostics,
    overview: {
      newCompanies: {
        current: companiesCreatedInRange.length,
        previous: realCompanies.filter((company) => inPrevious(company.created_at)).length,
      },
      activeCompanies: activeNow.size,
      payingCompanies: paying.length,
      activeTrials: trialing.length,
      mrrCents: mrr,
      trialEngagement: engagementRate,
      retention: rate(returningCompanies, activePrevious.size),
      signups: { current: signupsInRange.length, previous: signupsPrevious.length },
      bottleneck: funnel.bottleneck ? { label: funnel.bottleneck.label, fromPrevious: funnel.bottleneck.fromPrevious } : null,
      insights,
      health,
      newCompaniesDaily,
    },
    traffic,
    acquisition: {
      funnel: funnel.steps,
      bottleneck: funnel.bottleneck,
      signupsDaily: countByUtcDay(signupsInRange.map((user) => user.created_at), dayKeys),
      campaigns,
    },
    product: {
      dau: activeUserBasis === "tracking" ? metricValue(num(summary?.app?.dau)) : metricValue(signedInWithin(1)),
      wau: activeUserBasis === "tracking" ? metricValue(num(summary?.app?.wau)) : metricValue(signedInWithin(7)),
      mau: activeUserBasis === "tracking" ? metricValue(num(summary?.app?.mau)) : metricValue(signedInWithin(30)),
      activeUserBasis,
      dailyActiveUsers: activeUserBasis === "tracking"
        ? (summary?.app?.daily_active_users ?? []).map((point) => ({ day: point.day, value: num(point.users) }))
        : null,
      activeCompanies: activeNow.size,
      activeCompaniesPrevious: activePrevious.size,
      returningCompanies,
      created: {
        jobs: { current: realJobs.filter((r) => inRange(r.created_at)).length, previous: realJobs.filter((r) => inPrevious(r.created_at)).length },
        estimates: { current: realEstimates.filter((r) => inRange(r.created_at)).length, previous: realEstimates.filter((r) => inPrevious(r.created_at)).length },
        invoices: { current: realInvoices.filter((r) => inRange(r.created_at)).length, previous: realInvoices.filter((r) => inPrevious(r.created_at)).length },
        customers: { current: realCustomers.filter((r) => inRange(r.created_at)).length, previous: realCustomers.filter((r) => inPrevious(r.created_at)).length },
      },
      createdDaily: dayKeys.map((day, index) => ({
        day,
        jobs: createdDailyJobs[index]?.value ?? 0,
        estimates: createdDailyEstimates[index]?.value ?? 0,
        invoices: createdDailyInvoices[index]?.value ?? 0,
      })),
      features: trackingAvailable && (summary?.app?.features?.length ?? 0) > 0
        ? (summary?.app?.features ?? []).map((row) => ({ label: areaLabel(row.area), value: num(row.users), secondary: num(row.views) }))
        : null,
      modules,
      onboarding,
      trials: { active: trialing.length, engaged: trialEngagedIds.size, inactive: inactiveTrials },
    },
    revenue: {
      payingCompanies: paying.length,
      activeTrials: trialing.length,
      trialsWithCard: trialing.filter((entry) => Boolean(entry.sub.stripe_subscription_id)).length,
      expiringTrials,
      trialToPaid: { converted: trialConverted, eligible: trialEligible.length, rate: rate(trialConverted, trialEligible.length) },
      mrrCents: mrr,
      mrrEstimated,
      arrCents: arr,
      cancellations,
      failedPayments: failedInvoices.size,
      churnRate: churnRate(cancellations, paying.length + cancellations),
      collectedCents: collected,
      collectedMonthly,
      customerPaymentsProcessed: customerPayments.error ? 0 : (customerPayments.count ?? 0),
    },
    marketing: {
      channels,
      campaigns,
      attributedSignups,
      totalSignups: signupsInRange.length,
    },
  };
}
