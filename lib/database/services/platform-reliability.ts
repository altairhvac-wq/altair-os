import "server-only";

import {
  fetchLatestPlatformAutomationRun,
  fetchLatestSuccessfulPlatformAutomationRun,
  WORKFLOW_REMINDERS_AUTOMATION_KEY,
} from "@/lib/database/services/platform-automation-runs";
import { STALE_PAYMENT_PROVIDER_EVENT_PROCESSING_MS } from "@/lib/database/services/payment-provider-events";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { runPlatformSystemChecks } from "@/lib/system-check/run-platform-system-checks";
import type {
  PlatformAutomationRunBrief,
  PlatformReliabilityCronHealth,
  PlatformReliabilityData,
  PlatformReliabilityPaymentHealth,
  PlatformReliabilityStripeConnect,
  PlatformStripeConnectRisk,
} from "@/shared/types/platform-reliability";

/** Daily Hobby-plan cron; allow schedule/build jitter before marking it stale. */
const WORKFLOW_CRON_STALE_MS = 36 * 60 * 60 * 1000;

/** Surface recent webhook failures from the last 24 hours. */
const PAYMENT_FAILURE_LOOKBACK_MS = 24 * 60 * 60 * 1000;

/** Unprocessed received events older than this are stuck. */
const PAYMENT_RECEIVED_STUCK_MS = 60 * 60 * 1000;

type CompanyInvoiceCount = {
  companyId: string;
  companyName: string;
  invoiceCount: number;
};

async function fetchPaymentReliabilityHealth(
  diagnostics: string[],
): Promise<PlatformReliabilityPaymentHealth> {
  const supabase = createServiceRoleClient();
  const nowMs = Date.now();
  const failureSinceIso = new Date(nowMs - PAYMENT_FAILURE_LOOKBACK_MS).toISOString();
  const receivedStuckBeforeIso = new Date(nowMs - PAYMENT_RECEIVED_STUCK_MS).toISOString();
  const processingStaleBeforeIso = new Date(
    nowMs - STALE_PAYMENT_PROVIDER_EVENT_PROCESSING_MS,
  ).toISOString();

  const [failedResult, stuckReceivedResult, stuckProcessingResult, latestFailedResult] =
    await Promise.all([
      supabase
        .from("payment_provider_events")
        .select("id", { count: "exact", head: true })
        .eq("provider", "stripe")
        .eq("processing_status", "failed")
        .gte("updated_at", failureSinceIso),
      supabase
        .from("payment_provider_events")
        .select("id", { count: "exact", head: true })
        .eq("provider", "stripe")
        .eq("processing_status", "received")
        .lt("created_at", receivedStuckBeforeIso),
      supabase
        .from("payment_provider_events")
        .select("id", { count: "exact", head: true })
        .eq("provider", "stripe")
        .eq("processing_status", "processing")
        .lt("updated_at", processingStaleBeforeIso),
      supabase
        .from("payment_provider_events")
        .select("updated_at, error_message")
        .eq("provider", "stripe")
        .eq("processing_status", "failed")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  if (failedResult.error) {
    const message = `payment_provider_events failed count query: ${failedResult.error.message}`;
    console.error(`[platform-reliability] ${message}`);
    diagnostics.push(message);
    return {
      failedRecentCount: 0,
      stuckCount: 0,
      latestFailedAt: null,
      latestFailedMessage: null,
      queryable: false,
    };
  }

  if (stuckReceivedResult.error || stuckProcessingResult.error) {
    const message =
      stuckReceivedResult.error?.message ??
      stuckProcessingResult.error?.message ??
      "payment_provider_events stuck count query failed";
    console.error(`[platform-reliability] ${message}`);
    diagnostics.push(message);
    return {
      failedRecentCount: failedResult.count ?? 0,
      stuckCount: 0,
      latestFailedAt: null,
      latestFailedMessage: null,
      queryable: false,
    };
  }

  if (latestFailedResult.error) {
    console.error("[platform-reliability] latest failed event query:", latestFailedResult.error.message);
  }

  const stuckCount = (stuckReceivedResult.count ?? 0) + (stuckProcessingResult.count ?? 0);

  return {
    failedRecentCount: failedResult.count ?? 0,
    stuckCount,
    latestFailedAt: latestFailedResult.data?.updated_at ?? null,
    latestFailedMessage: latestFailedResult.data?.error_message?.trim().slice(0, 200) ?? null,
    queryable: true,
  };
}

async function fetchStripeConnectRisks(
  companies: CompanyInvoiceCount[],
  diagnostics: string[],
): Promise<PlatformReliabilityStripeConnect> {
  const companiesWithInvoices = companies.filter((company) => company.invoiceCount > 0);

  if (companiesWithInvoices.length === 0) {
    return { restricted: [], incompleteWithInvoices: [], queryable: true };
  }

  const supabase = createServiceRoleClient();
  const companyIds = companiesWithInvoices.map((company) => company.companyId);
  const companyById = new Map(companiesWithInvoices.map((company) => [company.companyId, company]));

  const { data, error } = await supabase
    .from("company_payment_accounts")
    .select("company_id, status, charges_enabled, online_payments_enabled, disabled_at")
    .eq("provider", "stripe")
    .in("company_id", companyIds);

  if (error) {
    const message = `company_payment_accounts query failed: ${error.message}`;
    console.error(`[platform-reliability] ${message}`);
    diagnostics.push(message);
    return { restricted: [], incompleteWithInvoices: [], queryable: false };
  }

  const accountByCompanyId = new Map(
    (data ?? []).map((row) => [row.company_id, row]),
  );

  const restricted: PlatformStripeConnectRisk[] = [];
  const incompleteWithInvoices: PlatformStripeConnectRisk[] = [];

  for (const company of companiesWithInvoices) {
    const account = accountByCompanyId.get(company.companyId);

    if (!account) {
      incompleteWithInvoices.push({
        companyId: company.companyId,
        companyName: company.companyName,
        status: "not_connected",
        invoiceCount: company.invoiceCount,
        reason: "Has invoices but Stripe Connect is not set up.",
        severity: "incomplete",
      });
      continue;
    }

    const isRestricted =
      account.status === "restricted" ||
      account.status === "disabled" ||
      account.status === "error" ||
      account.disabled_at !== null;

    if (isRestricted) {
      restricted.push({
        companyId: company.companyId,
        companyName: company.companyName,
        status: account.status,
        invoiceCount: company.invoiceCount,
        reason:
          account.disabled_at !== null
            ? "Stripe Connect account is disabled."
            : `Stripe Connect status is ${account.status}.`,
        severity: "restricted",
      });
      continue;
    }

    const isIncomplete =
      account.status !== "active" ||
      !account.charges_enabled ||
      !account.online_payments_enabled;

    if (isIncomplete) {
      incompleteWithInvoices.push({
        companyId: company.companyId,
        companyName: company.companyName,
        status: account.status,
        invoiceCount: company.invoiceCount,
        reason: "Stripe Connect onboarding is incomplete — online Pay Now is unavailable.",
        severity: "incomplete",
      });
    }
  }

  return { restricted, incompleteWithInvoices, queryable: true };
}

function evaluateCronHealth(
  latestRun: PlatformAutomationRunBrief | null,
  latestSuccessfulRun: PlatformAutomationRunBrief | null,
  nowMs: number,
): Pick<PlatformReliabilityCronHealth, "isStale" | "lastFailed"> {
  const lastFailed = latestRun?.status === "failed";

  if (!latestSuccessfulRun) {
    return { isStale: true, lastFailed };
  }

  const lastSuccessMs = Date.parse(latestSuccessfulRun.startedAt);
  const isStale =
    Number.isNaN(lastSuccessMs) || nowMs - lastSuccessMs >= WORKFLOW_CRON_STALE_MS;

  return { isStale, lastFailed };
}

export async function fetchPlatformReliabilitySnapshot(input: {
  companies: CompanyInvoiceCount[];
  diagnostics: string[];
}): Promise<PlatformReliabilityData> {
  const nowMs = Date.now();

  const [latestRunResult, latestSuccessResult, payments, stripeConnect] = await Promise.all([
    fetchLatestPlatformAutomationRun(WORKFLOW_REMINDERS_AUTOMATION_KEY),
    fetchLatestSuccessfulPlatformAutomationRun(WORKFLOW_REMINDERS_AUTOMATION_KEY),
    fetchPaymentReliabilityHealth(input.diagnostics),
    fetchStripeConnectRisks(input.companies, input.diagnostics),
  ]);

  const cronEvaluation = evaluateCronHealth(
    latestRunResult.run,
    latestSuccessResult.run,
    nowMs,
  );

  const cron: PlatformReliabilityCronHealth = {
    latestRun: latestRunResult.run,
    latestSuccessfulRun: latestSuccessResult.run,
    queryable: latestRunResult.queryable && latestSuccessResult.queryable,
    ...cronEvaluation,
  };

  const systemChecks = runPlatformSystemChecks();

  const deferredSignals = [
    {
      kind: "email_delivery_failure",
      reason:
        "Email send failures are logged to console only — no durable delivery ledger exists yet.",
    },
    {
      kind: "sms_delivery_failure",
      reason:
        "SMS send failures are returned inline to callers — no cross-tenant failure ledger exists yet.",
    },
  ];

  const hasReliabilityIssues =
    cron.lastFailed ||
    cron.isStale ||
    payments.failedRecentCount > 0 ||
    payments.stuckCount > 0 ||
    stripeConnect.restricted.length > 0 ||
    stripeConnect.incompleteWithInvoices.length > 0 ||
    systemChecks.criticalFailureCount > 0;

  return {
    cron,
    payments,
    stripeConnect,
    systemChecks,
    deferredSignals,
    isReliabilityHealthy: !hasReliabilityIssues,
  };
}
