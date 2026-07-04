import type {
  PlatformAdminCompanyRow,
  PlatformAdminUserRow,
  PlatformOpenBugBrief,
  PlatformPrioritySignal,
  PlatformPrioritySignalKind,
  PlatformPrioritySeverity,
} from "@/shared/types/platform-admin";
import type { PlatformReliabilityData } from "@/shared/types/platform-reliability";
import type {
  CompanyActivationStage,
  CompanyHealthRiskReason,
  CompanyHealthStatus,
  CompanyHealthSummary,
  PlatformCustomerHealthSnapshot,
} from "@/shared/types/platform-customer-health";

const MS_PER_DAY = 86_400_000;

const NO_CUSTOMER_AFTER_DAYS = 3;
const CUSTOMER_NO_JOB_DAYS = 7;
const ONBOARDING_STUCK_DAYS = 7;
const INVOICE_NO_PAYMENT_DAYS = 5;
const DORMANT_ACTIVITY_DAYS = 7;
const DORMANT_SIGNIN_DAYS = 14;

const ACTIVATION_STAGE_ORDER: CompanyActivationStage[] = [
  "signed_up",
  "first_customer",
  "first_job",
  "first_estimate",
  "first_invoice",
  "first_payment",
  "activated",
];

const ACTIVATION_STAGE_LABELS: Record<CompanyActivationStage, string> = {
  signed_up: "Signed up",
  first_customer: "First customer",
  first_job: "First job",
  first_estimate: "First estimate",
  first_invoice: "First invoice",
  first_payment: "First payment",
  activated: "Activated",
};

export const COMPANY_ACTIVATION_STAGE_LABELS = ACTIVATION_STAGE_LABELS;

const BASE_HEALTH_SCORES: Record<
  Exclude<
    PlatformPrioritySignalKind,
    | "blocking_bug"
    | "high_bug"
    | "diagnostic_warning"
    | "onboarding_stuck"
    | "inactive_company"
    | "recent_signup_no_customer"
    | "recent_signup_no_job"
    | "workflow_cron_failed"
    | "workflow_cron_stale"
    | "payment_webhook_failed"
    | "payment_event_stuck"
    | "stripe_connect_incomplete"
    | "stripe_connect_restricted"
    | "platform_system_warning"
  >,
  number
> = {
  company_blocking_feedback: 95,
  company_stripe_blocking_billing: 90,
  company_invoice_no_payment: 85,
  company_stuck_before_billing: 80,
  company_no_first_customer: 75,
  company_dormant: 70,
  company_no_first_job: 60,
  company_healthy_milestone: 40,
};

const HEALTH_SEVERITY_BY_KIND: Record<
  keyof typeof BASE_HEALTH_SCORES,
  PlatformPrioritySeverity
> = {
  company_blocking_feedback: "critical",
  company_stripe_blocking_billing: "critical",
  company_invoice_no_payment: "high",
  company_stuck_before_billing: "high",
  company_no_first_customer: "medium",
  company_dormant: "medium",
  company_no_first_job: "medium",
  company_healthy_milestone: "low",
};

export type CompanyHealthInput = {
  company: PlatformAdminCompanyRow;
  realCounts: {
    customers: number;
    jobs: number;
    estimates: number;
    invoices: number;
  };
  hasDemoData: boolean;
  lastSignInAt: string | null;
  openBugs: number;
  blockingBugs: number;
  hasStripeConnected: boolean;
  stripeBlocksBilling: boolean;
  firstInvoiceAt: string | null;
  paymentsQueryable: boolean;
};

function daysSince(isoDate: string, nowMs: number): number {
  const parsed = Date.parse(isoDate);
  if (Number.isNaN(parsed)) {
    return 0;
  }

  return Math.max(0, Math.floor((nowMs - parsed) / MS_PER_DAY));
}

function formatRelativeDays(days: number): string {
  if (days === 0) {
    return "today";
  }

  if (days === 1) {
    return "1 day ago";
  }

  return `${days} days ago`;
}

function computeActivationStage(
  counts: CompanyHealthInput["realCounts"],
  paymentCount: number,
  paymentsQueryable: boolean,
): CompanyActivationStage {
  if (
    counts.customers > 0 &&
    counts.jobs > 0 &&
    counts.estimates > 0 &&
    counts.invoices > 0 &&
    (!paymentsQueryable || paymentCount > 0)
  ) {
    return "activated";
  }

  if (counts.invoices > 0) {
    return paymentsQueryable && paymentCount > 0 ? "activated" : "first_invoice";
  }

  if (counts.estimates > 0) {
    return "first_estimate";
  }

  if (counts.jobs > 0) {
    return "first_job";
  }

  if (counts.customers > 0) {
    return "first_customer";
  }

  return "signed_up";
}

function activationPercent(stage: CompanyActivationStage): number {
  const index = ACTIVATION_STAGE_ORDER.indexOf(stage);
  if (index <= 0) {
    return 0;
  }

  return Math.round((index / (ACTIVATION_STAGE_ORDER.length - 1)) * 100);
}

function isDemoOnlyUsage(
  hasDemoData: boolean,
  realCounts: CompanyHealthInput["realCounts"],
): boolean {
  if (!hasDemoData) {
    return false;
  }

  return (
    realCounts.customers === 0 &&
    realCounts.jobs === 0 &&
    realCounts.estimates === 0 &&
    realCounts.invoices === 0
  );
}

function buildRiskReasons(
  input: CompanyHealthInput,
  nowMs: number,
): CompanyHealthRiskReason[] {
  const reasons: CompanyHealthRiskReason[] = [];
  const { company, realCounts, hasDemoData, lastSignInAt, blockingBugs } = input;
  const ageDays = daysSince(company.createdAt, nowMs);

  if (blockingBugs > 0) {
    reasons.push({
      code: "blocking_feedback",
      label:
        blockingBugs === 1
          ? "Open blocking beta feedback"
          : `${blockingBugs} open blocking feedback reports`,
      severity: "high",
    });
  }

  if (input.stripeBlocksBilling) {
    reasons.push({
      code: "stripe_blocking",
      label: "Stripe Connect blocks online billing",
      severity: "high",
    });
  }

  if (
    realCounts.invoices > 0 &&
    company.paymentCount === 0 &&
    input.paymentsQueryable &&
    input.firstInvoiceAt &&
    daysSince(input.firstInvoiceAt, nowMs) >= INVOICE_NO_PAYMENT_DAYS
  ) {
    reasons.push({
      code: "invoice_no_payment",
      label: `Invoice created ${formatRelativeDays(daysSince(input.firstInvoiceAt, nowMs))} with no payment recorded`,
      severity: "high",
    });
  }

  if (
    realCounts.jobs > 0 &&
    realCounts.estimates === 0 &&
    realCounts.invoices === 0 &&
    ageDays >= ONBOARDING_STUCK_DAYS
  ) {
    reasons.push({
      code: "stuck_before_billing",
      label: "Jobs exist but no estimate or invoice yet",
      severity: "high",
    });
  }

  if (realCounts.customers === 0 && ageDays >= NO_CUSTOMER_AFTER_DAYS && !hasDemoData) {
    reasons.push({
      code: "no_first_customer",
      label: `Signed up ${ageDays} days ago with no real customer`,
      severity: "medium",
    });
  }

  if (
    realCounts.customers > 0 &&
    realCounts.jobs === 0 &&
    ageDays >= CUSTOMER_NO_JOB_DAYS
  ) {
    reasons.push({
      code: "no_first_job",
      label: "Has customers but no jobs scheduled yet",
      severity: "medium",
    });
  }

  const hasRealUsage =
    realCounts.jobs > 0 ||
    realCounts.customers > 0 ||
    realCounts.estimates > 0 ||
    realCounts.invoices > 0;

  const activityStale =
    company.lastActivityAt != null &&
    daysSince(company.lastActivityAt, nowMs) >= DORMANT_ACTIVITY_DAYS;

  const signInStale =
    lastSignInAt != null && daysSince(lastSignInAt, nowMs) >= DORMANT_SIGNIN_DAYS;

  const noSignInEver = lastSignInAt == null && ageDays >= DORMANT_SIGNIN_DAYS;

  if (hasRealUsage && (activityStale || signInStale)) {
    reasons.push({
      code: "dormant",
      label: activityStale
        ? `No operational activity for ${daysSince(company.lastActivityAt!, nowMs)} days`
        : `No owner sign-in for ${daysSince(lastSignInAt!, nowMs)} days`,
      severity: "medium",
    });
  } else if (!hasRealUsage && (noSignInEver || signInStale)) {
    reasons.push({
      code: "dormant",
      label: noSignInEver
        ? "Signed up but no sign-in or real work recorded"
        : `No sign-in for ${daysSince(lastSignInAt!, nowMs)} days`,
      severity: "medium",
    });
  }

  if (isDemoOnlyUsage(hasDemoData, realCounts)) {
    reasons.push({
      code: "demo_only",
      label: "Demo data only — no real activation yet",
      severity: "low",
    });
  }

  return reasons;
}

function computeHealthScore(reasons: CompanyHealthRiskReason[]): number {
  if (reasons.length === 0) {
    return 0;
  }

  const severityWeight = { high: 30, medium: 20, low: 5 };
  return reasons.reduce((sum, reason) => sum + severityWeight[reason.severity], 0);
}

function deriveHealthStatus(
  score: number,
  reasons: CompanyHealthRiskReason[],
  stage: CompanyActivationStage,
): CompanyHealthStatus {
  if (reasons.some((reason) => reason.severity === "high")) {
    return "needs_help";
  }

  if (score >= 20 || reasons.length > 0) {
    return "watch";
  }

  if (stage === "activated") {
    return "healthy";
  }

  if (stage === "first_payment" || stage === "first_invoice") {
    return "healthy";
  }

  return reasons.length === 0 ? "healthy" : "watch";
}

function nextBestActionForSummary(
  reasons: CompanyHealthRiskReason[],
  companyName: string,
  stage: CompanyActivationStage,
): { label: string; href: string } {
  const top = reasons[0];

  if (top?.code === "blocking_feedback") {
    return {
      label: "Review blocking feedback",
      href: "/platform/bugs",
    };
  }

  if (top?.code === "stripe_blocking") {
    return {
      label: "Help finish Stripe Connect",
      href: "/platform#platform-companies",
    };
  }

  if (top?.code === "invoice_no_payment") {
    return {
      label: "Check billing progress",
      href: "/platform#platform-companies",
    };
  }

  if (top?.code === "stuck_before_billing") {
    return {
      label: "Nudge toward estimate or invoice",
      href: "/platform#platform-companies",
    };
  }

  if (top?.code === "no_first_customer") {
    return {
      label: "Help add first customer",
      href: "/platform#platform-companies",
    };
  }

  if (top?.code === "no_first_job") {
    return {
      label: "Help schedule first job",
      href: "/platform#platform-companies",
    };
  }

  if (top?.code === "dormant") {
    return {
      label: "Reach out — workspace is quiet",
      href: "/platform#platform-companies",
    };
  }

  if (stage === "activated") {
    return {
      label: "Celebrate activation milestone",
      href: "/platform#platform-customer-health",
    };
  }

  return {
    label: `Support ${companyName} at ${ACTIVATION_STAGE_LABELS[stage]}`,
    href: "/platform#platform-companies",
  };
}

export function buildCompanyHealthSummary(
  input: CompanyHealthInput,
  now: Date = new Date(),
): CompanyHealthSummary {
  const nowMs = now.getTime();
  const { company, realCounts } = input;
  const stage = computeActivationStage(
    realCounts,
    company.paymentCount,
    input.paymentsQueryable,
  );
  const riskReasons = buildRiskReasons(input, nowMs);
  const healthScore = computeHealthScore(riskReasons);
  const healthStatus = deriveHealthStatus(healthScore, riskReasons, stage);
  const { label: nextBestAction, href: actionHref } = nextBestActionForSummary(
    riskReasons,
    company.name,
    stage,
  );

  const isStuck =
    riskReasons.some((reason) =>
      ["stuck_before_billing", "no_first_customer", "no_first_job"].includes(
        reason.code,
      ),
    ) ||
    (daysSince(company.createdAt, nowMs) >= ONBOARDING_STUCK_DAYS &&
      (realCounts.customers === 0 || realCounts.jobs === 0));

  const isDormant = riskReasons.some((reason) => reason.code === "dormant");

  return {
    companyId: company.id,
    companyName: company.name,
    createdAt: company.createdAt,
    lastActivityAt: company.lastActivityAt,
    lastSignInAt: input.lastSignInAt,
    healthStatus,
    healthScore,
    activationStage: stage,
    activationPercent: activationPercent(stage),
    riskReasons,
    nextBestAction,
    actionHref,
    counts: {
      members: company.memberCount,
      customers: realCounts.customers,
      jobs: realCounts.jobs,
      estimates: realCounts.estimates,
      invoices: realCounts.invoices,
      payments: company.paymentCount,
      openBugs: input.openBugs,
      blockingBugs: input.blockingBugs,
    },
    flags: {
      hasFirstCustomer: realCounts.customers > 0,
      hasFirstJob: realCounts.jobs > 0,
      hasFirstEstimate: realCounts.estimates > 0,
      hasFirstInvoice: realCounts.invoices > 0,
      hasFirstPayment: company.paymentCount > 0,
      hasStripeConnected: input.hasStripeConnected,
      isDemoOnlyUsage: isDemoOnlyUsage(input.hasDemoData, realCounts),
      isDormant,
      isStuck,
      hasBlockingFeedback: input.blockingBugs > 0,
    },
  };
}

export type BuildCustomerHealthSnapshotInput = {
  companies: PlatformAdminCompanyRow[];
  users: PlatformAdminUserRow[];
  openBlockingBugs: PlatformOpenBugBrief[];
  openHighBugs: PlatformOpenBugBrief[];
  reliabilityData: PlatformReliabilityData;
  companyDemoFlags: Map<string, boolean>;
  realCountsByCompany: Map<
    string,
    { customers: number; jobs: number; estimates: number; invoices: number }
  >;
  firstInvoiceAtByCompany: Map<string, string>;
  stripeConnectedCompanyIds: Set<string>;
  paymentsQueryable: boolean;
};

function maxLastSignInByCompany(users: PlatformAdminUserRow[]): Map<string, string> {
  const byCompany = new Map<string, number>();

  for (const user of users) {
    if (user.membershipStatus !== "active" || !user.lastSignInAt) {
      continue;
    }

    const parsed = Date.parse(user.lastSignInAt);
    if (Number.isNaN(parsed)) {
      continue;
    }

    const current = byCompany.get(user.companyId) ?? 0;
    if (parsed > current) {
      byCompany.set(user.companyId, parsed);
    }
  }

  const result = new Map<string, string>();
  for (const [companyId, timestamp] of byCompany) {
    result.set(companyId, new Date(timestamp).toISOString());
  }

  return result;
}

function bugCountsByCompany(
  blocking: PlatformOpenBugBrief[],
  high: PlatformOpenBugBrief[],
): Map<string, { open: number; blocking: number }> {
  const counts = new Map<string, { open: number; blocking: number }>();

  for (const bug of [...blocking, ...high]) {
    if (!bug.companyId) {
      continue;
    }

    const current = counts.get(bug.companyId) ?? { open: 0, blocking: 0 };
    current.open += 1;
    if (bug.severity === "blocking") {
      current.blocking += 1;
    }
    counts.set(bug.companyId, current);
  }

  return counts;
}

function stripeRiskCompanyIds(reliability: PlatformReliabilityData): Set<string> {
  const ids = new Set<string>();

  for (const risk of reliability.stripeConnect.restricted) {
    ids.add(risk.companyId);
  }

  for (const risk of reliability.stripeConnect.incompleteWithInvoices) {
    ids.add(risk.companyId);
  }

  return ids;
}

export function buildCustomerHealthSnapshot(
  input: BuildCustomerHealthSnapshotInput,
  now: Date = new Date(),
): PlatformCustomerHealthSnapshot {
  const lastSignInByCompany = maxLastSignInByCompany(input.users);
  const bugsByCompany = bugCountsByCompany(
    input.openBlockingBugs,
    input.openHighBugs,
  );
  const stripeBlockedIds = stripeRiskCompanyIds(input.reliabilityData);

  const companies = input.companies.map((company) => {
    const realCounts = input.realCountsByCompany.get(company.id) ?? {
      customers: company.customerCount,
      jobs: company.jobCount,
      estimates: company.estimateCount,
      invoices: company.invoiceCount,
    };
    const bugCounts = bugsByCompany.get(company.id) ?? { open: 0, blocking: 0 };

    return buildCompanyHealthSummary(
      {
        company,
        realCounts,
        hasDemoData: input.companyDemoFlags.get(company.id) ?? false,
        lastSignInAt: lastSignInByCompany.get(company.id) ?? null,
        openBugs: bugCounts.open,
        blockingBugs: bugCounts.blocking,
        hasStripeConnected: input.stripeConnectedCompanyIds.has(company.id),
        stripeBlocksBilling: stripeBlockedIds.has(company.id),
        firstInvoiceAt: input.firstInvoiceAtByCompany.get(company.id) ?? null,
        paymentsQueryable: input.paymentsQueryable,
      },
      now,
    );
  });

  const operationalCompanies = companies.filter(
    (company) => !company.flags.isDemoOnlyUsage,
  );

  const healthyCount = operationalCompanies.filter(
    (company) => company.healthStatus === "healthy",
  ).length;
  const watchCount = operationalCompanies.filter(
    (company) => company.healthStatus === "watch",
  ).length;
  const needsHelpCount = operationalCompanies.filter(
    (company) => company.healthStatus === "needs_help",
  ).length;
  const demoOnlyCount = companies.filter(
    (company) => company.flags.isDemoOnlyUsage,
  ).length;

  const topNeedsAttention = [...operationalCompanies]
    .filter((company) => company.healthStatus !== "healthy")
    .sort((left, right) => {
      if (right.healthScore !== left.healthScore) {
        return right.healthScore - left.healthScore;
      }

      return Date.parse(left.createdAt) - Date.parse(right.createdAt);
    })
    .slice(0, 6);

  return {
    healthyCount,
    watchCount,
    needsHelpCount,
    demoOnlyCount,
    companies,
    topNeedsAttention,
  };
}

function primarySignalKindForSummary(
  summary: CompanyHealthSummary,
): keyof typeof BASE_HEALTH_SCORES | null {
  if (summary.flags.hasBlockingFeedback) {
    return "company_blocking_feedback";
  }

  if (summary.flags.hasFirstInvoice && summary.counts.payments === 0) {
    const invoiceReason = summary.riskReasons.find(
      (reason) => reason.code === "invoice_no_payment",
    );
    if (invoiceReason) {
      return "company_invoice_no_payment";
    }
  }

  if (
    summary.riskReasons.some((reason) => reason.code === "stripe_blocking")
  ) {
    return "company_stripe_blocking_billing";
  }

  if (summary.riskReasons.some((reason) => reason.code === "stuck_before_billing")) {
    return "company_stuck_before_billing";
  }

  if (summary.riskReasons.some((reason) => reason.code === "no_first_customer")) {
    return "company_no_first_customer";
  }

  if (summary.flags.isDormant) {
    return "company_dormant";
  }

  if (summary.riskReasons.some((reason) => reason.code === "no_first_job")) {
    return "company_no_first_job";
  }

  return null;
}

function signalTitleForKind(
  kind: keyof typeof BASE_HEALTH_SCORES,
  summary: CompanyHealthSummary,
): string {
  switch (kind) {
    case "company_blocking_feedback":
      return `${summary.companyName} has blocking beta feedback`;
    case "company_stripe_blocking_billing":
      return `${summary.companyName} is blocked before online billing`;
    case "company_invoice_no_payment":
      return `${summary.companyName} has invoices with no payment recorded`;
    case "company_stuck_before_billing":
      return `${summary.companyName} is stuck before billing`;
    case "company_no_first_customer":
      return `${summary.companyName} needs a first customer`;
    case "company_dormant":
      return `${summary.companyName} has gone quiet`;
    case "company_no_first_job":
      return `${summary.companyName} needs a first job`;
    case "company_healthy_milestone":
      return `${summary.companyName} reached ${ACTIVATION_STAGE_LABELS[summary.activationStage]}`;
    default:
      return summary.nextBestAction;
  }
}

function signalDescriptionForSummary(summary: CompanyHealthSummary): string {
  return summary.riskReasons[0]?.label ?? summary.nextBestAction;
}

export function buildCustomerHealthPrioritySignals(
  snapshot: PlatformCustomerHealthSnapshot,
): PlatformPrioritySignal[] {
  const signals: PlatformPrioritySignal[] = [];

  for (const summary of snapshot.topNeedsAttention) {
    const kind = primarySignalKindForSummary(summary);
    if (!kind) {
      continue;
    }

    signals.push({
      id: `${kind}-${summary.companyId}`,
      kind,
      severity: HEALTH_SEVERITY_BY_KIND[kind],
      title: signalTitleForKind(kind, summary),
      description: signalDescriptionForSummary(summary),
      reason: summary.riskReasons[0]?.label ?? "Beta company needs founder outreach.",
      actionLabel: summary.nextBestAction,
      href: summary.actionHref,
      score: BASE_HEALTH_SCORES[kind],
      companyId: summary.companyId,
      companyName: summary.companyName,
      createdAt: summary.createdAt,
      lastActivityAt: summary.lastActivityAt ?? undefined,
    });
  }

  return signals.sort((left, right) => right.score - left.score);
}
