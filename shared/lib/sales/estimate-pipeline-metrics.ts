import {
  addDaysToDateOnly,
  getCompanyTimeZone,
  getDateOnlyInTimeZone,
} from "@/shared/lib/datetime";
import { sumCollectedRevenue } from "@/shared/lib/reports/report-metrics";
import type { Estimate } from "@/shared/types/estimate";
import { roundCurrency } from "@/shared/types/estimate";
import {
  isActiveInvoice,
  type Invoice,
} from "@/shared/types/invoice";
import type { InvoicePayment } from "@/shared/types/invoice-payment";

/** Days after cohort period end before outcomes are treated as settled. */
export const ESTIMATE_PIPELINE_MATURITY_DAYS = 90;

export type EstimatePipelineCohortStatus = "in_progress" | "settled";

export type EstimatePipelineCohort = {
  /** YYYY-MM */
  key: string;
  label: string;
  periodStart: string;
  periodEnd: string;
  /** periodEnd + maturity days */
  maturityDate: string;
  status: EstimatePipelineCohortStatus;
  estimateCount: number;
  /** Sum of estimate.total in the cohort. */
  estimateTotal: number;
  /**
   * Sum of linked active invoice.total (estimate_id set, not void/cancelled).
   * Live accrued for in-progress cohorts; settled for mature ones.
   */
  convertedTotal: number;
  /**
   * Sum of invoice_payments.amount for invoices linked to cohort estimates
   * (ledger truth — includes payments on voided linked invoices).
   */
  paidTotal: number;
  /** Count of estimates with a linked active invoice. */
  convertedCount: number;
  /**
   * Settled non-conversions: declined/cancelled, or open statuses with no
   * active linked invoice after maturity. Null while in progress.
   */
  lostCount: number | null;
  /**
   * Converted $ / Estimate $ for settled cohorts only. Null while in progress
   * or when Estimate $ is 0.
   */
  conversionRate: number | null;
};

export type EstimatePipelineMetrics = {
  cohorts: EstimatePipelineCohort[];
  /** Estimates included after deleting soft-deleted rows. */
  estimateCount: number;
  estimateTotal: number;
  convertedTotal: number;
  paidTotal: number;
  /** Linked active invoices across all cohorts. */
  convertedCount: number;
  /**
   * Dollar conversion rate across settled cohorts only.
   * Null when no settled Estimate $ exists.
   */
  settledConversionRate: number | null;
  settledEstimateTotal: number;
  settledConvertedTotal: number;
  inProgressCohortCount: number;
  settledCohortCount: number;
};

export const EMPTY_ESTIMATE_PIPELINE_METRICS: EstimatePipelineMetrics = {
  cohorts: [],
  estimateCount: 0,
  estimateTotal: 0,
  convertedTotal: 0,
  paidTotal: 0,
  convertedCount: 0,
  settledConversionRate: null,
  settledEstimateTotal: 0,
  settledConvertedTotal: 0,
  inProgressCohortCount: 0,
  settledCohortCount: 0,
};

type CohortAccumulator = {
  key: string;
  periodStart: string;
  periodEnd: string;
  maturityDate: string;
  status: EstimatePipelineCohortStatus;
  estimateCount: number;
  estimateTotal: number;
  convertedTotal: number;
  paidTotal: number;
  convertedCount: number;
  lostCount: number;
};

function isPipelineEstimate(estimate: Estimate): boolean {
  return !estimate.deletedAt;
}

function isPipelineInvoice(invoice: Invoice): boolean {
  return !invoice.deletedAt;
}

function monthKeyFromDateOnly(dateOnly: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly) && !/^\d{4}-\d{2}/.test(dateOnly)) {
    return null;
  }

  const key = dateOnly.slice(0, 7);
  return /^\d{4}-\d{2}$/.test(key) ? key : null;
}

function monthPeriodBounds(monthKey: string): {
  periodStart: string;
  periodEnd: string;
} {
  const [yearStr, monthStr] = monthKey.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getDate();

  return {
    periodStart: `${monthKey}-01`,
    periodEnd: `${monthKey}-${String(daysInMonth).padStart(2, "0")}`,
  };
}

function formatMonthLabel(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const anchor = new Date(Date.UTC(year, month - 1, 1, 12, 0, 0));

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(anchor);
}

function toCloseRate(convertedTotal: number, estimateTotal: number): number | null {
  if (estimateTotal <= 0) {
    return null;
  }

  return Math.round((convertedTotal / estimateTotal) * 1000) / 10;
}

function isSettledNonConversion(
  estimate: Estimate,
  hasActiveLinkedInvoice: boolean,
): boolean {
  if (hasActiveLinkedInvoice) {
    return false;
  }

  if (estimate.status === "declined" || estimate.status === "cancelled") {
    return true;
  }

  // Open / converted-without-active-invoice past maturity → settled loss.
  return (
    estimate.status === "draft" ||
    estimate.status === "sent" ||
    estimate.status === "approved" ||
    estimate.status === "converted"
  );
}

/**
 * Monthly estimate cohorts with accrued Converted $/Paid $ from linked invoices
 * and the payment ledger. Mature cohorts (period end + 90d) settle outcomes;
 * younger cohorts stay "in progress" with no claimed conversion rate.
 */
export function buildEstimatePipelineMetrics(input: {
  estimates: ReadonlyArray<Estimate>;
  invoices: ReadonlyArray<Invoice>;
  payments: ReadonlyArray<InvoicePayment>;
  referenceDate?: Date;
  timeZone?: string;
}): EstimatePipelineMetrics {
  const timeZone = input.timeZone ?? getCompanyTimeZone();
  const today = getDateOnlyInTimeZone(
    input.referenceDate ?? new Date(),
    timeZone,
  );

  const estimates = input.estimates.filter(isPipelineEstimate);
  const invoices = input.invoices.filter(isPipelineInvoice);

  const invoiceByEstimateId = new Map<string, Invoice>();
  for (const invoice of invoices) {
    if (!invoice.estimateId) {
      continue;
    }

    // Unique FK — keep first if duplicates ever appear in soft data.
    if (!invoiceByEstimateId.has(invoice.estimateId)) {
      invoiceByEstimateId.set(invoice.estimateId, invoice);
    }
  }

  const paymentsByInvoiceId = new Map<string, InvoicePayment[]>();
  for (const payment of input.payments) {
    const list = paymentsByInvoiceId.get(payment.invoiceId);
    if (list) {
      list.push(payment);
    } else {
      paymentsByInvoiceId.set(payment.invoiceId, [payment]);
    }
  }

  const cohorts = new Map<string, CohortAccumulator>();

  for (const estimate of estimates) {
    const monthKey = monthKeyFromDateOnly(estimate.createdAt);
    if (!monthKey) {
      continue;
    }

    let cohort = cohorts.get(monthKey);
    if (!cohort) {
      const { periodStart, periodEnd } = monthPeriodBounds(monthKey);
      const maturityDate = addDaysToDateOnly(
        periodEnd,
        ESTIMATE_PIPELINE_MATURITY_DAYS,
        timeZone,
      );
      cohort = {
        key: monthKey,
        periodStart,
        periodEnd,
        maturityDate,
        status: today < maturityDate ? "in_progress" : "settled",
        estimateCount: 0,
        estimateTotal: 0,
        convertedTotal: 0,
        paidTotal: 0,
        convertedCount: 0,
        lostCount: 0,
      };
      cohorts.set(monthKey, cohort);
    }

    cohort.estimateCount += 1;
    cohort.estimateTotal = roundCurrency(
      cohort.estimateTotal + (Number.isFinite(estimate.total) ? estimate.total : 0),
    );

    const linkedInvoice = invoiceByEstimateId.get(estimate.id);
    const hasActiveLinkedInvoice = Boolean(
      linkedInvoice && isActiveInvoice(linkedInvoice),
    );

    if (hasActiveLinkedInvoice && linkedInvoice) {
      cohort.convertedCount += 1;
      cohort.convertedTotal = roundCurrency(
        cohort.convertedTotal +
          (Number.isFinite(linkedInvoice.total) ? linkedInvoice.total : 0),
      );
    }

    // Paid $ follows the ledger for any linked invoice (including void).
    if (linkedInvoice) {
      const linkedPayments = paymentsByInvoiceId.get(linkedInvoice.id) ?? [];
      if (linkedPayments.length > 0) {
        cohort.paidTotal = roundCurrency(
          cohort.paidTotal + sumCollectedRevenue(linkedPayments),
        );
      }
    }

    if (
      cohort.status === "settled" &&
      isSettledNonConversion(estimate, hasActiveLinkedInvoice)
    ) {
      cohort.lostCount += 1;
    }
  }

  const sorted = [...cohorts.values()].sort((left, right) =>
    right.key.localeCompare(left.key),
  );

  const resultCohorts: EstimatePipelineCohort[] = sorted.map((cohort) => ({
    key: cohort.key,
    label: formatMonthLabel(cohort.key),
    periodStart: cohort.periodStart,
    periodEnd: cohort.periodEnd,
    maturityDate: cohort.maturityDate,
    status: cohort.status,
    estimateCount: cohort.estimateCount,
    estimateTotal: cohort.estimateTotal,
    convertedTotal: cohort.convertedTotal,
    paidTotal: cohort.paidTotal,
    convertedCount: cohort.convertedCount,
    lostCount: cohort.status === "settled" ? cohort.lostCount : null,
    conversionRate:
      cohort.status === "settled"
        ? toCloseRate(cohort.convertedTotal, cohort.estimateTotal)
        : null,
  }));

  let estimateTotal = 0;
  let convertedTotal = 0;
  let paidTotal = 0;
  let convertedCount = 0;
  let settledEstimateTotal = 0;
  let settledConvertedTotal = 0;
  let inProgressCohortCount = 0;
  let settledCohortCount = 0;

  for (const cohort of resultCohorts) {
    estimateTotal = roundCurrency(estimateTotal + cohort.estimateTotal);
    convertedTotal = roundCurrency(convertedTotal + cohort.convertedTotal);
    paidTotal = roundCurrency(paidTotal + cohort.paidTotal);
    convertedCount += cohort.convertedCount;

    if (cohort.status === "in_progress") {
      inProgressCohortCount += 1;
    } else {
      settledCohortCount += 1;
      settledEstimateTotal = roundCurrency(
        settledEstimateTotal + cohort.estimateTotal,
      );
      settledConvertedTotal = roundCurrency(
        settledConvertedTotal + cohort.convertedTotal,
      );
    }
  }

  return {
    cohorts: resultCohorts,
    estimateCount: estimates.length,
    estimateTotal,
    convertedTotal,
    paidTotal,
    convertedCount,
    settledConversionRate: toCloseRate(
      settledConvertedTotal,
      settledEstimateTotal,
    ),
    settledEstimateTotal,
    settledConvertedTotal,
    inProgressCohortCount,
    settledCohortCount,
  };
}
