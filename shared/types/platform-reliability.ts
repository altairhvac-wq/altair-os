export type PlatformAutomationRunBrief = {
  id: string;
  automationKey: string;
  status: "started" | "succeeded" | "failed";
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  companyCount: number | null;
  totals: {
    created?: number;
    updated?: number;
    completed?: number;
    skipped?: number;
    errorCount?: number;
  };
  errorSummary: string | null;
};

export type PlatformStripeConnectRisk = {
  companyId: string;
  companyName: string;
  status: string;
  invoiceCount: number;
  reason: string;
  severity: "restricted" | "incomplete";
};

export type PlatformSystemCheckItem = {
  id: string;
  label: string;
  status: "pass" | "fail" | "warn";
  message: string;
};

export type PlatformSystemCheckSummary = {
  checkedAt: string;
  checks: PlatformSystemCheckItem[];
  criticalFailureCount: number;
  warningCount: number;
  isHealthy: boolean;
};

export type PlatformReliabilityCronHealth = {
  latestRun: PlatformAutomationRunBrief | null;
  latestSuccessfulRun: PlatformAutomationRunBrief | null;
  queryable: boolean;
  isStale: boolean;
  lastFailed: boolean;
};

export type PlatformReliabilityPaymentHealth = {
  failedRecentCount: number;
  stuckCount: number;
  latestFailedAt: string | null;
  latestFailedMessage: string | null;
  queryable: boolean;
};

export type PlatformReliabilityStripeConnect = {
  restricted: PlatformStripeConnectRisk[];
  incompleteWithInvoices: PlatformStripeConnectRisk[];
  queryable: boolean;
};

export type PlatformDeferredReliabilitySignal = {
  kind: string;
  reason: string;
};

/** Server-fetched reliability data consumed by the priority engine. */
export type PlatformReliabilityData = {
  cron: PlatformReliabilityCronHealth;
  payments: PlatformReliabilityPaymentHealth;
  stripeConnect: PlatformReliabilityStripeConnect;
  systemChecks: PlatformSystemCheckSummary;
  deferredSignals: PlatformDeferredReliabilitySignal[];
  isReliabilityHealthy: boolean;
};
