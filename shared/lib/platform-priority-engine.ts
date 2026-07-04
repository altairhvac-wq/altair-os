import type {
  PlatformActivationFunnel,
  PlatformAdminCompanyRow,
  PlatformAdminOverview,
  PlatformBrainSnapshot,
  PlatformMissionHeroContent,
  PlatformOpenBugBrief,
  PlatformPrioritySignal,
  PlatformPrioritySignalKind,
  PlatformPrioritySeverity,
  PlatformReliabilityPulseItem,
  PlatformReliabilitySnapshot,
} from "@/shared/types/platform-admin";
import type { PlatformReliabilityData } from "@/shared/types/platform-reliability";

/** Hourly cron — treat as stale after 3 hours without a successful run. */
const WORKFLOW_CRON_STALE_MS = 3 * 60 * 60 * 1000;

const MS_PER_DAY = 86_400_000;

const RECENT_SIGNUP_DAYS = 7;
const ONBOARDING_STUCK_DAYS = 7;
const INACTIVE_AFTER_SIGNUP_DAYS = 14;

const BASE_SCORES: Record<PlatformPrioritySignalKind, number> = {
  blocking_bug: 100,
  high_bug: 85,
  payment_webhook_failed: 100,
  workflow_cron_failed: 95,
  payment_event_stuck: 90,
  workflow_cron_stale: 85,
  diagnostic_warning: 80,
  platform_system_warning: 80,
  stripe_connect_restricted: 75,
  onboarding_stuck: 70,
  stripe_connect_incomplete: 65,
  inactive_company: 65,
  recent_signup_no_customer: 60,
  recent_signup_no_job: 55,
};

const SEVERITY_BY_KIND: Record<PlatformPrioritySignalKind, PlatformPrioritySeverity> = {
  blocking_bug: "critical",
  high_bug: "high",
  payment_webhook_failed: "critical",
  workflow_cron_failed: "critical",
  payment_event_stuck: "critical",
  workflow_cron_stale: "high",
  diagnostic_warning: "high",
  platform_system_warning: "high",
  stripe_connect_restricted: "high",
  onboarding_stuck: "medium",
  stripe_connect_incomplete: "medium",
  inactive_company: "medium",
  recent_signup_no_customer: "medium",
  recent_signup_no_job: "low",
};

const TOP_SIGNAL_LIMIT = 8;
const HERO_SECONDARY_LIMIT = 2;

function daysSince(isoDate: string, nowMs: number): number {
  const parsed = Date.parse(isoDate);
  if (Number.isNaN(parsed)) {
    return 0;
  }

  return Math.max(0, Math.floor((nowMs - parsed) / MS_PER_DAY));
}

function pluralize(
  count: number,
  singular: string,
  plural = `${singular}s`,
): string {
  return count === 1 ? singular : plural;
}

function formatRelativeHours(hours: number): string {
  if (hours < 1) {
    return "less than 1 hour ago";
  }

  if (hours === 1) {
    return "1 hour ago";
  }

  return `${hours} hours ago`;
}

function buildReliabilitySignals(
  reliability: PlatformReliabilityData,
): PlatformPrioritySignal[] {
  const signals: PlatformPrioritySignal[] = [];
  const { cron, payments, stripeConnect, systemChecks } = reliability;

  if (payments.queryable && payments.failedRecentCount > 0) {
    signals.push({
      id: `payment-webhook-failed-${payments.failedRecentCount}`,
      kind: "payment_webhook_failed",
      severity: SEVERITY_BY_KIND.payment_webhook_failed,
      title:
        payments.failedRecentCount === 1
          ? "1 payment webhook failed in the last 24 hours"
          : `${payments.failedRecentCount} payment webhooks failed in the last 24 hours`,
      description:
        payments.latestFailedMessage ??
        "Stripe webhook events failed processing — customer payments may not be recorded.",
      reason: "Failed payment webhooks silently block checkout reconciliation.",
      actionLabel: "Review reliability",
      href: "/platform#platform-reliability",
      score: BASE_SCORES.payment_webhook_failed + Math.min(payments.failedRecentCount - 1, 3),
      createdAt: payments.latestFailedAt ?? undefined,
    });
  }

  if (cron.queryable && cron.lastFailed && cron.latestRun) {
    signals.push({
      id: "workflow-cron-failed",
      kind: "workflow_cron_failed",
      severity: SEVERITY_BY_KIND.workflow_cron_failed,
      title: "Workflow reminder cron failed",
      description:
        cron.latestRun.errorSummary ??
        "The hourly workflow reminder evaluator did not complete successfully.",
      reason: "Dashboard follow-up reminders stop updating when this cron fails.",
      actionLabel: "Review reliability",
      href: "/platform#platform-reliability",
      score: BASE_SCORES.workflow_cron_failed,
      createdAt: cron.latestRun.startedAt,
    });
  }

  if (payments.queryable && payments.stuckCount > 0) {
    signals.push({
      id: `payment-event-stuck-${payments.stuckCount}`,
      kind: "payment_event_stuck",
      severity: SEVERITY_BY_KIND.payment_event_stuck,
      title:
        payments.stuckCount === 1
          ? "1 payment webhook event is stuck"
          : `${payments.stuckCount} payment webhook events are stuck`,
      description:
        "Events remain unprocessed in received or processing state beyond the safe window.",
      reason: "Stuck payment events mean checkout or Connect updates may not land.",
      actionLabel: "Review reliability",
      href: "/platform#platform-reliability",
      score: BASE_SCORES.payment_event_stuck + Math.min(payments.stuckCount - 1, 3),
    });
  }

  if (cron.queryable && cron.isStale && !cron.lastFailed) {
    const staleHours = cron.latestSuccessfulRun
      ? Math.floor(
          (Date.now() - Date.parse(cron.latestSuccessfulRun.startedAt)) /
            (60 * 60 * 1000),
        )
      : null;

    signals.push({
      id: "workflow-cron-stale",
      kind: "workflow_cron_stale",
      severity: SEVERITY_BY_KIND.workflow_cron_stale,
      title: cron.latestSuccessfulRun
        ? "Workflow reminder cron is stale"
        : "Workflow reminder cron has no successful run recorded",
      description: cron.latestSuccessfulRun
        ? `Last success ${staleHours != null ? formatRelativeHours(staleHours) : "unknown"}. Expected hourly.`
        : "No successful workflow reminder run is recorded yet.",
      reason: `Dashboard reminders depend on hourly evaluation (stale threshold ${WORKFLOW_CRON_STALE_MS / (60 * 60 * 1000)}h).`,
      actionLabel: "Review reliability",
      href: "/platform#platform-reliability",
      score: BASE_SCORES.workflow_cron_stale,
      createdAt: cron.latestSuccessfulRun?.startedAt,
    });
  }

  const criticalChecks = systemChecks.checks.filter((check) => check.status === "fail");

  if (criticalChecks.length > 0) {
    const featured = criticalChecks[0];
    signals.push({
      id: `platform-system-warning-${criticalChecks.length}`,
      kind: "platform_system_warning",
      severity: SEVERITY_BY_KIND.platform_system_warning,
      title:
        criticalChecks.length === 1
          ? `Platform config issue: ${featured.label}`
          : `${criticalChecks.length} critical platform configuration issues`,
      description: featured.message,
      reason: "Missing platform env blocks cron, payments, or core runtime behavior.",
      actionLabel: "Review reliability",
      href: "/platform#platform-reliability",
      score: BASE_SCORES.platform_system_warning + Math.min(criticalChecks.length - 1, 3),
    });
  }

  if (stripeConnect.queryable && stripeConnect.restricted.length > 0) {
    const featured = stripeConnect.restricted[0];
    signals.push({
      id: `stripe-connect-restricted-${stripeConnect.restricted.length}`,
      kind: "stripe_connect_restricted",
      severity: SEVERITY_BY_KIND.stripe_connect_restricted,
      title:
        stripeConnect.restricted.length === 1
          ? `${featured.companyName} Stripe Connect is restricted`
          : `${stripeConnect.restricted.length} companies have restricted Stripe Connect`,
      description: featured.reason,
      reason: "Online Pay Now is blocked for companies with billing activity.",
      actionLabel: "View companies",
      href: "/platform#platform-companies",
      score:
        BASE_SCORES.stripe_connect_restricted +
        Math.min(stripeConnect.restricted.length - 1, 4),
      companyId: featured.companyId,
      companyName: featured.companyName,
    });
  }

  if (stripeConnect.queryable && stripeConnect.incompleteWithInvoices.length > 0) {
    const featured = stripeConnect.incompleteWithInvoices[0];
    signals.push({
      id: `stripe-connect-incomplete-${stripeConnect.incompleteWithInvoices.length}`,
      kind: "stripe_connect_incomplete",
      severity: SEVERITY_BY_KIND.stripe_connect_incomplete,
      title:
        stripeConnect.incompleteWithInvoices.length === 1
          ? `${featured.companyName} needs Stripe Connect setup`
          : `${stripeConnect.incompleteWithInvoices.length} invoicing companies lack Stripe Connect`,
      description: featured.reason,
      reason: "Beta companies with invoices expect online payment collection.",
      actionLabel: "View companies",
      href: "/platform#platform-companies",
      score:
        BASE_SCORES.stripe_connect_incomplete +
        Math.min(stripeConnect.incompleteWithInvoices.length - 1, 4),
      companyId: featured.companyId,
      companyName: featured.companyName,
    });
  }

  return signals;
}

export function buildPlatformReliabilityPulse(
  reliability: PlatformReliabilityData,
): PlatformReliabilitySnapshot {
  const { cron, payments, stripeConnect, systemChecks, deferredSignals } = reliability;

  const pulse: PlatformReliabilityPulseItem[] = [];

  if (!cron.queryable) {
    pulse.push({
      id: "cron",
      label: "Workflow cron",
      status: "unknown",
      detail: "Cron health data unavailable.",
    });
  } else if (cron.lastFailed) {
    pulse.push({
      id: "cron",
      label: "Workflow cron",
      status: "critical",
      detail: cron.latestRun?.errorSummary ?? "Last run failed.",
    });
  } else if (cron.isStale) {
    pulse.push({
      id: "cron",
      label: "Workflow cron",
      status: "warning",
      detail: cron.latestSuccessfulRun
        ? `Last success ${formatRelativeDays(
            daysSince(cron.latestSuccessfulRun.startedAt, Date.now()),
          )}.`
        : "No successful run recorded.",
    });
  } else {
    pulse.push({
      id: "cron",
      label: "Workflow cron",
      status: "healthy",
      detail: cron.latestSuccessfulRun
        ? `Healthy — last run ${formatRelativeDays(
            daysSince(cron.latestSuccessfulRun.startedAt, Date.now()),
          )}.`
        : "Healthy.",
    });
  }

  if (!payments.queryable) {
    pulse.push({
      id: "payments",
      label: "Payment webhooks",
      status: "unknown",
      detail: "Payment event data unavailable.",
    });
  } else if (payments.failedRecentCount > 0 || payments.stuckCount > 0) {
    pulse.push({
      id: "payments",
      label: "Payment webhooks",
      status: "critical",
      detail: `${payments.failedRecentCount} failed, ${payments.stuckCount} stuck (24h).`,
    });
  } else {
    pulse.push({
      id: "payments",
      label: "Payment webhooks",
      status: "healthy",
      detail: "No failed or stuck events.",
    });
  }

  const stripeIssueCount =
    stripeConnect.restricted.length + stripeConnect.incompleteWithInvoices.length;

  if (!stripeConnect.queryable) {
    pulse.push({
      id: "stripe",
      label: "Stripe Connect",
      status: "unknown",
      detail: "Stripe Connect data unavailable.",
    });
  } else if (stripeConnect.restricted.length > 0) {
    pulse.push({
      id: "stripe",
      label: "Stripe Connect",
      status: "critical",
      detail: `${stripeConnect.restricted.length} restricted, ${stripeConnect.incompleteWithInvoices.length} incomplete.`,
    });
  } else if (stripeConnect.incompleteWithInvoices.length > 0) {
    pulse.push({
      id: "stripe",
      label: "Stripe Connect",
      status: "warning",
      detail: `${stripeConnect.incompleteWithInvoices.length} invoicing ${stripeIssueCount === 1 ? "company" : "companies"} need setup.`,
    });
  } else {
    pulse.push({
      id: "stripe",
      label: "Stripe Connect",
      status: "healthy",
      detail: "No invoicing companies blocked.",
    });
  }

  if (systemChecks.criticalFailureCount > 0) {
    pulse.push({
      id: "config",
      label: "Platform config",
      status: "critical",
      detail: `${systemChecks.criticalFailureCount} critical env ${systemChecks.criticalFailureCount === 1 ? "issue" : "issues"}.`,
    });
  } else if (systemChecks.warningCount > 0) {
    pulse.push({
      id: "config",
      label: "Platform config",
      status: "warning",
      detail: `${systemChecks.warningCount} optional env ${systemChecks.warningCount === 1 ? "warning" : "warnings"}.`,
    });
  } else {
    pulse.push({
      id: "config",
      label: "Platform config",
      status: "healthy",
      detail: "Critical env configured.",
    });
  }

  for (const deferred of deferredSignals) {
    pulse.push({
      id: deferred.kind,
      label: deferred.kind === "email_delivery_failure" ? "Email delivery" : "SMS delivery",
      status: "deferred",
      detail: "Not tracked durably yet.",
    });
  }

  return {
    isReliabilityHealthy: reliability.isReliabilityHealthy,
    pulse,
    deferredSignals,
  };
}

function buildBugSignals(
  blockingBugs: PlatformOpenBugBrief[],
  highBugs: PlatformOpenBugBrief[],
): PlatformPrioritySignal[] {
  const signals: PlatformPrioritySignal[] = [];

  if (blockingBugs.length > 0) {
    const top = blockingBugs[0];
    signals.push({
      id: `blocking-bugs-${blockingBugs.length}`,
      kind: "blocking_bug",
      severity: SEVERITY_BY_KIND.blocking_bug,
      title:
        blockingBugs.length === 1
          ? "Review 1 blocking bug report"
          : `Review ${blockingBugs.length} blocking bug reports`,
      description: top.messagePreview,
      reason: "Blocking severity stops beta testers from completing core workflows.",
      actionLabel: "Open bug reports",
      href: "/platform/bugs",
      score: BASE_SCORES.blocking_bug + Math.min(blockingBugs.length - 1, 5),
      companyId: top.companyId ?? undefined,
      companyName: top.companyName ?? undefined,
      createdAt: top.createdAt,
    });
  }

  if (highBugs.length > 0) {
    const top = highBugs[0];
    signals.push({
      id: `high-bugs-${highBugs.length}`,
      kind: "high_bug",
      severity: SEVERITY_BY_KIND.high_bug,
      title:
        highBugs.length === 1
          ? "Review 1 high-severity bug"
          : `Review ${highBugs.length} high-severity bugs`,
      description: top.messagePreview,
      reason: "High-severity reports indicate meaningful product risk during beta.",
      actionLabel: "Open bug reports",
      href: "/platform/bugs",
      score: BASE_SCORES.high_bug + Math.min(highBugs.length - 1, 4),
      companyId: top.companyId ?? undefined,
      companyName: top.companyName ?? undefined,
      createdAt: top.createdAt,
    });
  }

  return signals;
}

function buildDiagnosticSignals(diagnostics: string[]): PlatformPrioritySignal[] {
  if (diagnostics.length === 0) {
    return [];
  }

  if (diagnostics.length === 1) {
    return [
      {
        id: "diagnostics-1",
        kind: "diagnostic_warning",
        severity: SEVERITY_BY_KIND.diagnostic_warning,
        title: "Check platform diagnostics warning",
        description: diagnostics[0],
        reason: "Overview load reported a data integrity or query warning.",
        actionLabel: "Review diagnostics",
        href: "/platform#platform-diagnostics",
        score: BASE_SCORES.diagnostic_warning,
      },
    ];
  }

  return [
    {
      id: `diagnostics-${diagnostics.length}`,
      kind: "diagnostic_warning",
      severity: SEVERITY_BY_KIND.diagnostic_warning,
      title: `Check ${diagnostics.length} platform diagnostics warnings`,
      description: diagnostics[0],
      reason: "Multiple warnings surfaced while loading cross-tenant platform data.",
      actionLabel: "Review diagnostics",
      href: "/platform#platform-diagnostics",
      score: BASE_SCORES.diagnostic_warning + Math.min(diagnostics.length - 1, 3),
    },
  ];
}

function buildCompanySignals(
  companies: PlatformAdminCompanyRow[],
  nowMs: number,
): PlatformPrioritySignal[] {
  const signals: PlatformPrioritySignal[] = [];

  const stuckOnboarding = companies.filter((company) => {
    const ageDays = daysSince(company.createdAt, nowMs);
    if (ageDays < ONBOARDING_STUCK_DAYS) {
      return false;
    }

    return company.customerCount === 0 || company.jobCount === 0;
  });

  if (stuckOnboarding.length > 0) {
    const featured = stuckOnboarding[0];
    signals.push({
      id: `onboarding-stuck-${stuckOnboarding.length}`,
      kind: "onboarding_stuck",
      severity: SEVERITY_BY_KIND.onboarding_stuck,
      title:
        stuckOnboarding.length === 1
          ? `Help ${featured.name} finish onboarding`
          : `Help ${stuckOnboarding.length} companies finish onboarding`,
      description:
        featured.customerCount === 0
          ? `${featured.name} signed up ${daysSince(featured.createdAt, nowMs)} days ago with no customers yet.`
          : `${featured.name} has customers but no jobs scheduled yet.`,
      reason: "Companies idle past the first week rarely reach the money path without a nudge.",
      actionLabel: "View companies",
      href: "/platform#platform-companies",
      score: BASE_SCORES.onboarding_stuck + Math.min(stuckOnboarding.length - 1, 5),
      companyId: featured.id,
      companyName: featured.name,
      createdAt: featured.createdAt,
      lastActivityAt: featured.lastActivityAt ?? undefined,
    });
  }

  const inactiveCompanies = companies.filter((company) => {
    const ageDays = daysSince(company.createdAt, nowMs);
    if (ageDays < INACTIVE_AFTER_SIGNUP_DAYS) {
      return false;
    }

    const hasUsage =
      company.jobCount > 0 ||
      company.customerCount > 0 ||
      company.estimateCount > 0 ||
      company.invoiceCount > 0;

    if (!hasUsage) {
      return true;
    }

    if (!company.lastActivityAt) {
      return true;
    }

    return daysSince(company.lastActivityAt, nowMs) >= INACTIVE_AFTER_SIGNUP_DAYS;
  });

  if (inactiveCompanies.length > 0) {
    const featured = inactiveCompanies[0];
    signals.push({
      id: `inactive-companies-${inactiveCompanies.length}`,
      kind: "inactive_company",
      severity: SEVERITY_BY_KIND.inactive_company,
      title:
        inactiveCompanies.length === 1
          ? `${featured.name} has gone quiet`
          : `${inactiveCompanies.length} companies have no recent activity`,
      description: featured.lastActivityAt
        ? `Last activity ${formatRelativeDays(daysSince(featured.lastActivityAt, nowMs))}.`
        : "No operational activity recorded since signup.",
      reason: "Silent workspaces often mean onboarding friction or a blocker you can unblock.",
      actionLabel: "View companies",
      href: "/platform#platform-companies",
      score: BASE_SCORES.inactive_company + Math.min(inactiveCompanies.length - 1, 4),
      companyId: featured.id,
      companyName: featured.name,
      createdAt: featured.createdAt,
      lastActivityAt: featured.lastActivityAt ?? undefined,
    });
  }

  const recentNoCustomer = companies.filter((company) => {
    const ageDays = daysSince(company.createdAt, nowMs);
    return ageDays <= RECENT_SIGNUP_DAYS && company.customerCount === 0;
  });

  if (recentNoCustomer.length > 0 && stuckOnboarding.length === 0) {
    const featured = recentNoCustomer[0];
    signals.push({
      id: `recent-no-customer-${recentNoCustomer.length}`,
      kind: "recent_signup_no_customer",
      severity: SEVERITY_BY_KIND.recent_signup_no_customer,
      title:
        recentNoCustomer.length === 1
          ? `${featured.name} signed up with no customer yet`
          : `${recentNoCustomer.length} recent signups have no first customer`,
      description: `Signed up ${daysSince(featured.createdAt, nowMs)} day${daysSince(featured.createdAt, nowMs) === 1 ? "" : "s"} ago.`,
      reason: "The first customer unlocks jobs, estimates, and the money path.",
      actionLabel: "View recent companies",
      href: "/platform#platform-recent-companies",
      score:
        BASE_SCORES.recent_signup_no_customer +
        Math.min(recentNoCustomer.length - 1, 3),
      companyId: featured.id,
      companyName: featured.name,
      createdAt: featured.createdAt,
    });
  }

  const recentNoJob = companies.filter((company) => {
    const ageDays = daysSince(company.createdAt, nowMs);
    return (
      ageDays <= RECENT_SIGNUP_DAYS * 2 &&
      company.customerCount > 0 &&
      company.jobCount === 0
    );
  });

  if (recentNoJob.length > 0) {
    const featured = recentNoJob[0];
    signals.push({
      id: `recent-no-job-${recentNoJob.length}`,
      kind: "recent_signup_no_job",
      severity: SEVERITY_BY_KIND.recent_signup_no_job,
      title:
        recentNoJob.length === 1
          ? `${featured.name} has no first job yet`
          : `${recentNoJob.length} recent workspaces have no first job`,
      description: `${featured.name} added customers but has not scheduled field work.`,
      reason: "Jobs connect dispatch, technician workflows, and billing follow-through.",
      actionLabel: "View recent companies",
      href: "/platform#platform-recent-companies",
      score: BASE_SCORES.recent_signup_no_job + Math.min(recentNoJob.length - 1, 2),
      companyId: featured.id,
      companyName: featured.name,
      createdAt: featured.createdAt,
    });
  }

  return signals;
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

export function buildPlatformPrioritySignals(
  input: Pick<
    PlatformAdminOverview,
    "companies" | "diagnostics" | "openBlockingBugs" | "openHighBugs" | "reliabilityData"
  >,
  now: Date = new Date(),
): PlatformPrioritySignal[] {
  const nowMs = now.getTime();

  const signals = [
    ...buildReliabilitySignals(input.reliabilityData),
    ...buildBugSignals(input.openBlockingBugs, input.openHighBugs),
    ...buildDiagnosticSignals(input.diagnostics),
    ...buildCompanySignals(input.companies, nowMs),
  ];

  return signals.sort((left, right) => right.score - left.score);
}

export function isCompanyFullyActivated(company: PlatformAdminCompanyRow): boolean {
  return (
    company.customerCount > 0 &&
    company.jobCount > 0 &&
    company.estimateCount > 0 &&
    company.invoiceCount > 0
  );
}

export function buildPlatformActivationFunnel(
  companies: PlatformAdminCompanyRow[],
  paymentsQueryable: boolean,
): PlatformActivationFunnel {
  const totalCompanies = companies.length;

  return {
    totalCompanies,
    withFirstCustomer: companies.filter((company) => company.customerCount > 0).length,
    withFirstJob: companies.filter((company) => company.jobCount > 0).length,
    withFirstEstimate: companies.filter((company) => company.estimateCount > 0).length,
    withFirstInvoice: companies.filter((company) => company.invoiceCount > 0).length,
    withFirstPayment: paymentsQueryable
      ? companies.filter((company) => company.paymentCount > 0).length
      : null,
    fullyActivated: companies.filter(isCompanyFullyActivated).length,
  };
}

export function buildPlatformMissionHeroContent(
  signals: PlatformPrioritySignal[],
  funnel: PlatformActivationFunnel,
): PlatformMissionHeroContent {
  const primarySignal = signals[0] ?? null;
  const secondarySignals = signals.slice(1, 1 + HERO_SECONDARY_LIMIT);
  const isPlatformClear = primarySignal === null;

  const signalChips = [
    {
      label: "Companies",
      value: funnel.totalCompanies.toLocaleString(),
    },
    {
      label: "Activated",
      value: funnel.fullyActivated.toLocaleString(),
    },
    {
      label: "First customer",
      value: funnel.withFirstCustomer.toLocaleString(),
    },
    {
      label: "First job",
      value: funnel.withFirstJob.toLocaleString(),
    },
  ];

  if (isPlatformClear) {
    return {
      title: "Platform clear",
      operatingMessage:
        "No urgent founder actions — beta companies, platform reliability, and bug queues look stable.",
      primarySignal: null,
      secondarySignals: [],
      isPlatformClear: true,
      signalChips,
    };
  }

  return {
    title: primarySignal!.title,
    operatingMessage: primarySignal!.reason,
    primarySignal,
    secondarySignals,
    isPlatformClear: false,
    signalChips,
  };
}

export function buildPlatformBrainSnapshot(
  overview: Pick<
    PlatformAdminOverview,
    "companies" | "diagnostics" | "openBlockingBugs" | "openHighBugs" | "reliabilityData"
  >,
  paymentsQueryable: boolean,
  now: Date = new Date(),
): PlatformBrainSnapshot {
  const signals = buildPlatformPrioritySignals(overview, now);
  const activationFunnel = buildPlatformActivationFunnel(
    overview.companies,
    paymentsQueryable,
  );
  const missionHero = buildPlatformMissionHeroContent(signals, activationFunnel);
  const reliability = buildPlatformReliabilityPulse(overview.reliabilityData);

  return {
    signals,
    topSignals: signals.slice(0, TOP_SIGNAL_LIMIT),
    missionHero,
    activationFunnel,
    reliability,
  };
}
