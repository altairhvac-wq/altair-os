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
} from "@/shared/types/platform-admin";

const MS_PER_DAY = 86_400_000;

const RECENT_SIGNUP_DAYS = 7;
const ONBOARDING_STUCK_DAYS = 7;
const INACTIVE_AFTER_SIGNUP_DAYS = 14;

const BASE_SCORES: Record<PlatformPrioritySignalKind, number> = {
  blocking_bug: 100,
  high_bug: 85,
  diagnostic_warning: 80,
  onboarding_stuck: 70,
  inactive_company: 65,
  recent_signup_no_customer: 60,
  recent_signup_no_job: 55,
};

const SEVERITY_BY_KIND: Record<PlatformPrioritySignalKind, PlatformPrioritySeverity> = {
  blocking_bug: "critical",
  high_bug: "high",
  diagnostic_warning: "high",
  onboarding_stuck: "medium",
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
    "companies" | "diagnostics" | "openBlockingBugs" | "openHighBugs"
  >,
  now: Date = new Date(),
): PlatformPrioritySignal[] {
  const nowMs = now.getTime();

  const signals = [
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
        "No urgent founder actions right now — beta companies and bug queues look stable.",
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
  overview: PlatformAdminOverview,
  paymentsQueryable: boolean,
  now: Date = new Date(),
): PlatformBrainSnapshot {
  const signals = buildPlatformPrioritySignals(overview, now);
  const activationFunnel = buildPlatformActivationFunnel(
    overview.companies,
    paymentsQueryable,
  );
  const missionHero = buildPlatformMissionHeroContent(signals, activationFunnel);

  return {
    signals,
    topSignals: signals.slice(0, TOP_SIGNAL_LIMIT),
    missionHero,
    activationFunnel,
  };
}
