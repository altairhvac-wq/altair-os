import type { PlatformPrioritySignalKind } from "@/shared/types/platform-admin";
import type { CompanyHealthSummary } from "@/shared/types/platform-customer-health";
import type { PlatformReliabilityData } from "@/shared/types/platform-reliability";

/** Signal kinds that support founder action loop controls. */
export const ACTIONABLE_FOUNDER_SIGNAL_KINDS = new Set<PlatformPrioritySignalKind>([
  "company_no_first_customer",
  "company_no_first_job",
  "company_stuck_before_billing",
  "company_invoice_no_payment",
  "company_dormant",
  "company_stripe_blocking_billing",
  "stripe_connect_incomplete",
  "stripe_connect_restricted",
  "workflow_cron_stale",
  "workflow_cron_failed",
  "payment_webhook_failed",
  "payment_event_stuck",
  "platform_system_warning",
]);

export function isActionableFounderSignalKind(
  kind: PlatformPrioritySignalKind,
): boolean {
  return ACTIONABLE_FOUNDER_SIGNAL_KINDS.has(kind);
}

export function buildPlatformSignalKey(
  kind: PlatformPrioritySignalKind,
  companyId?: string,
): string {
  return companyId ? `${kind}:${companyId}` : kind;
}

export function computeReliabilitySignalFingerprint(
  kind: PlatformPrioritySignalKind,
  reliability: PlatformReliabilityData,
): string {
  const { cron, payments, systemChecks } = reliability;

  switch (kind) {
    case "workflow_cron_failed":
      return cron.latestRun?.startedAt ?? "none";
    case "workflow_cron_stale":
      return cron.latestSuccessfulRun?.startedAt ?? "none";
    case "payment_webhook_failed":
      return `${payments.latestFailedAt ?? "none"}:${payments.failedRecentCount}`;
    case "payment_event_stuck":
      return String(payments.stuckCount);
    case "platform_system_warning":
      return systemChecks.checks
        .filter((check) => check.status === "fail")
        .map((check) => check.id)
        .sort()
        .join(",");
    case "stripe_connect_restricted":
    case "stripe_connect_incomplete":
      return "stripe-risk";
    default:
      return "v1";
  }
}

export function computeCompanyHealthSignalFingerprint(
  summary: CompanyHealthSummary,
): string {
  return [
    summary.counts.customers,
    summary.counts.jobs,
    summary.counts.estimates,
    summary.counts.invoices,
    summary.counts.payments,
    summary.lastActivityAt ?? "",
    summary.lastSignInAt ?? "",
    summary.riskReasons
      .map((reason) => reason.code)
      .sort()
      .join(","),
  ].join("|");
}

export function computeStripeCompanySignalFingerprint(
  companyId: string,
  invoiceCount: number,
): string {
  return `${companyId}:${invoiceCount}`;
}
