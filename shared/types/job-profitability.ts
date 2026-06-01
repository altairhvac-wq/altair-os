import type { Estimate } from "@/shared/types/estimate";
import type { Expense, ExpenseCategory, ExpenseStatus } from "@/shared/types/expense";
import {
  roundCurrency,
  type Invoice,
  type InvoiceStatus,
} from "@/shared/types/invoice";
import {
  calculateJobMaterialTotalCost,
  roundJobMaterialAmount,
  type JobMaterial,
} from "@/shared/types/job-material";
import {
  calculateDurationMinutes,
  type TimeEntry,
} from "@/shared/types/time-entry";

const EXCLUDED_INVOICE_STATUSES: ReadonlySet<InvoiceStatus> = new Set([
  "void",
  "cancelled",
]);

const ELIGIBLE_EXPENSE_STATUSES: ReadonlySet<ExpenseStatus> = new Set([
  "approved",
  "reimbursed",
]);

const PENDING_EXPENSE_STATUSES: ReadonlySet<ExpenseStatus> = new Set([
  "draft",
  "submitted",
]);

const EXCLUDED_ESTIMATE_STATUSES: ReadonlySet<Estimate["status"]> = new Set([
  "converted",
  "cancelled",
  "declined",
]);

export type JobProfitabilityInputs = {
  invoices: Invoice[];
  estimates: Estimate[];
  expenses: Expense[];
  materials: JobMaterial[];
  laborEntries: TimeEntry[];
};

export type JobProfitabilityRevenue = {
  /** Cash collected from job-linked invoices (sum of amountPaid). */
  collected: number;
  /** Accrual total from job-linked invoices (sum of total). */
  invoiced: number;
  /** Uncollected balance on job-linked invoices (sum of balanceDue). */
  outstanding: number;
};

export type JobProfitabilityProjectedRevenue = {
  estimateId: string;
  estimateNumber: string;
  total: number;
  createdAt: string;
};

export type JobProfitabilityCosts = {
  /** Sum of quantity × unit_cost for materials with a recorded unit cost. */
  materialCogs: number;
  /** Approved/reimbursed job expenses excluding materials category. */
  expenseCogs: number;
  /** materialCogs + expenseCogs */
  directCostTotal: number;
};

export type JobProfitabilityLabor = {
  /** Closed job-labor segments only (minutes). */
  totalMinutes: number;
  /** totalMinutes / 60, rounded to two decimal places. */
  totalHours: number;
  /** Count of job_labor entries included in totals. */
  entryCount: number;
};

export type JobProfitabilityCompleteness = {
  /** Materials on the job with no unit_cost recorded. */
  materialsMissingUnitCostCount: number;
  /** Draft or submitted expenses excluded from COGS. */
  excludedPendingExpenseCount: number;
  /** Rejected expenses excluded from COGS. */
  excludedRejectedExpenseCount: number;
  /** Materials-category expenses excluded to avoid double-counting job_materials. */
  excludedMaterialsExpenseCount: number;
  /** Approved/reimbursed expenses with no amount recorded. */
  expensesMissingAmountCount: number;
  /** No active (non-void/cancelled) invoices in the input set. */
  noActiveInvoices: boolean;
  /** A projected revenue estimate is available (not used in profit math). */
  hasProjectedEstimate: boolean;
  /** job_labor entries still open or missing a computable duration. */
  openLaborEntryCount: number;
};

export type JobProfitabilitySnapshot = {
  revenue: JobProfitabilityRevenue;
  /** Newest approved estimate; excluded from grossProfit and grossMarginPercent. */
  projectedRevenue: JobProfitabilityProjectedRevenue | null;
  costs: JobProfitabilityCosts;
  /** collected revenue minus directCostTotal. */
  grossProfit: number;
  /** Percent of collected revenue; null when collected revenue is zero. */
  grossMarginPercent: number | null;
  labor: JobProfitabilityLabor;
  completeness: JobProfitabilityCompleteness;
  /** Active invoices included in revenue totals. */
  activeInvoiceCount: number;
};

function isFiniteAmount(value: number | undefined | null): value is number {
  return value != null && Number.isFinite(value);
}

function normalizeAmount(value: number | undefined | null): number {
  if (!isFiniteAmount(value)) {
    return 0;
  }

  return roundCurrency(value);
}

function isActiveInvoice(invoice: Invoice): boolean {
  return !EXCLUDED_INVOICE_STATUSES.has(invoice.status);
}

function isEligibleExpense(expense: Expense): boolean {
  return (
    ELIGIBLE_EXPENSE_STATUSES.has(expense.status) &&
    expense.category !== ("materials" satisfies ExpenseCategory)
  );
}

function resolveLaborMinutes(entry: TimeEntry): number | null {
  if (entry.entryType !== "job_labor") {
    return null;
  }

  if (isFiniteAmount(entry.durationMinutes)) {
    return Math.max(0, Math.round(entry.durationMinutes));
  }

  if (entry.endedAt) {
    return calculateDurationMinutes(entry.startedAt, entry.endedAt);
  }

  return null;
}

function selectProjectedEstimate(
  estimates: Estimate[],
): JobProfitabilityProjectedRevenue | null {
  const candidates = estimates
    .filter(
      (estimate) =>
        estimate.status === "approved" &&
        !EXCLUDED_ESTIMATE_STATUSES.has(estimate.status),
    )
    .sort(
      (left, right) =>
        Date.parse(right.createdAt) - Date.parse(left.createdAt),
    );

  const newest = candidates[0];
  if (!newest) {
    return null;
  }

  return {
    estimateId: newest.id,
    estimateNumber: newest.estimateNumber,
    total: normalizeAmount(newest.total),
    createdAt: newest.createdAt,
  };
}

function roundMarginPercent(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundLaborHours(totalMinutes: number): number {
  return roundJobMaterialAmount(totalMinutes / 60);
}

/**
 * Pure job-level profitability read model from existing domain records.
 *
 * Revenue basis for profit: collected (amountPaid) only.
 * Projected estimate revenue is informational and never affects grossProfit.
 */
export function computeJobProfitability(
  inputs: JobProfitabilityInputs,
): JobProfitabilitySnapshot {
  const activeInvoices = inputs.invoices.filter(isActiveInvoice);

  const collected = roundCurrency(
    activeInvoices.reduce(
      (sum, invoice) => sum + normalizeAmount(invoice.amountPaid),
      0,
    ),
  );

  const invoiced = roundCurrency(
    activeInvoices.reduce(
      (sum, invoice) => sum + normalizeAmount(invoice.total),
      0,
    ),
  );

  const outstanding = roundCurrency(
    activeInvoices.reduce(
      (sum, invoice) => sum + normalizeAmount(invoice.balanceDue),
      0,
    ),
  );

  let materialsMissingUnitCostCount = 0;
  let materialCogs = 0;

  for (const material of inputs.materials) {
    const lineCost = calculateJobMaterialTotalCost(material);
    if (lineCost == null) {
      materialsMissingUnitCostCount += 1;
      continue;
    }

    materialCogs = roundCurrency(materialCogs + lineCost);
  }

  let expenseCogs = 0;
  let excludedPendingExpenseCount = 0;
  let excludedRejectedExpenseCount = 0;
  let excludedMaterialsExpenseCount = 0;
  let expensesMissingAmountCount = 0;

  for (const expense of inputs.expenses) {
    if (PENDING_EXPENSE_STATUSES.has(expense.status)) {
      excludedPendingExpenseCount += 1;
      continue;
    }

    if (expense.status === "rejected") {
      excludedRejectedExpenseCount += 1;
      continue;
    }

    if (expense.category === "materials") {
      if (ELIGIBLE_EXPENSE_STATUSES.has(expense.status)) {
        excludedMaterialsExpenseCount += 1;
      }
      continue;
    }

    if (!ELIGIBLE_EXPENSE_STATUSES.has(expense.status)) {
      continue;
    }

    if (!isFiniteAmount(expense.amount)) {
      expensesMissingAmountCount += 1;
      continue;
    }

    expenseCogs = roundCurrency(expenseCogs + expense.amount);
  }

  const directCostTotal = roundCurrency(materialCogs + expenseCogs);
  const grossProfit = roundCurrency(collected - directCostTotal);
  const grossMarginPercent =
    collected > 0 ? roundMarginPercent((grossProfit / collected) * 100) : null;

  let totalMinutes = 0;
  let laborEntryCount = 0;
  let openLaborEntryCount = 0;

  for (const entry of inputs.laborEntries) {
    if (entry.entryType !== "job_labor") {
      continue;
    }

    const minutes = resolveLaborMinutes(entry);
    if (minutes == null) {
      openLaborEntryCount += 1;
      continue;
    }

    totalMinutes += minutes;
    laborEntryCount += 1;
  }

  const projectedRevenue = selectProjectedEstimate(inputs.estimates);

  return {
    revenue: {
      collected,
      invoiced,
      outstanding,
    },
    projectedRevenue,
    costs: {
      materialCogs,
      expenseCogs,
      directCostTotal,
    },
    grossProfit,
    grossMarginPercent,
    labor: {
      totalMinutes,
      totalHours: roundLaborHours(totalMinutes),
      entryCount: laborEntryCount,
    },
    completeness: {
      materialsMissingUnitCostCount,
      excludedPendingExpenseCount,
      excludedRejectedExpenseCount,
      excludedMaterialsExpenseCount,
      expensesMissingAmountCount,
      noActiveInvoices: activeInvoices.length === 0,
      hasProjectedEstimate: projectedRevenue != null,
      openLaborEntryCount,
    },
    activeInvoiceCount: activeInvoices.length,
  };
}

export function jobMaterialCostExceedsCollectedRevenue(
  snapshot: JobProfitabilitySnapshot,
): boolean {
  const { materialCogs } = snapshot.costs;
  if (materialCogs <= 0) {
    return false;
  }

  return materialCogs > snapshot.revenue.collected;
}

export function formatJobProfitabilityCurrency(amount: number): string {
  if (!Number.isFinite(amount)) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function formatJobProfitabilityMargin(
  marginPercent: number | null,
): string {
  if (marginPercent == null || !Number.isFinite(marginPercent)) {
    return "—";
  }

  return `${roundMarginPercent(marginPercent).toFixed(2).replace(/\.?0+$/, "")}%`;
}

export function formatJobProfitabilityLaborHours(hours: number): string {
  if (!Number.isFinite(hours)) {
    return "—";
  }

  if (hours === 0) {
    return "0h";
  }

  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);

  if (wholeHours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${wholeHours}h`;
  }

  return `${wholeHours}h ${minutes}m`;
}

/** Minimal fixtures for manual verification; not used at runtime by the app. */
export const JOB_PROFITABILITY_COMPUTE_FIXTURES = {
  paidJobWithCosts: {
    input: {
      invoices: [
        {
          id: "inv-1",
          invoiceNumber: "INV-1001",
          customerId: "cust-1",
          customerName: "Acme",
          status: "paid",
          lineItems: [],
          subtotal: 1000,
          taxRate: 0,
          total: 1000,
          amountPaid: 1000,
          balanceDue: 0,
          issueDate: "2026-05-01",
          dueDate: "2026-05-31",
          createdAt: "2026-05-01",
        },
      ],
      estimates: [],
      expenses: [
        {
          id: "exp-1",
          expenseNumber: "EXP-1",
          amount: 50,
          merchant: "Supply Co",
          category: "fuel",
          paymentMethod: "company_card",
          isReimbursable: false,
          technicianId: "tech-1",
          technician: "Tech",
          receiptStatus: "attached",
          status: "approved",
          createdAt: "2026-05-02",
        },
      ],
      materials: [
        {
          id: "mat-1",
          companyId: "co-1",
          jobId: "job-1",
          name: "Copper pipe",
          quantity: 2,
          unitCost: 40,
          unitPrice: 75,
          taxable: true,
          createdAt: "2026-05-02",
          updatedAt: "2026-05-02",
        },
      ],
      laborEntries: [
        {
          id: "time-1",
          companyId: "co-1",
          technicianId: "tech-1",
          technicianName: "Tech",
          jobId: "job-1",
          entryType: "job_labor",
          startedAt: "2026-05-02T09:00:00.000Z",
          endedAt: "2026-05-02T11:30:00.000Z",
          durationMinutes: 150,
          createdAt: "2026-05-02",
          updatedAt: "2026-05-02",
        },
      ],
    } satisfies JobProfitabilityInputs,
    expected: {
      grossProfit: 920,
      grossMarginPercent: 92,
      directCostTotal: 80,
      laborHours: 2.5,
    },
  },
} as const;

/** Runtime sanity check for fixture expectations. Call manually when validating changes. */
export function verifyJobProfitabilityComputeFixtures(): boolean {
  const { paidJobWithCosts } = JOB_PROFITABILITY_COMPUTE_FIXTURES;
  const snapshot = computeJobProfitability(paidJobWithCosts.input);

  return (
    snapshot.grossProfit === paidJobWithCosts.expected.grossProfit &&
    snapshot.grossMarginPercent === paidJobWithCosts.expected.grossMarginPercent &&
    snapshot.costs.directCostTotal === paidJobWithCosts.expected.directCostTotal &&
    snapshot.labor.totalHours === paidJobWithCosts.expected.laborHours
  );
}
