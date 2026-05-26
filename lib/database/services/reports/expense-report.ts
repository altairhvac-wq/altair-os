import { listExpenses } from "@/lib/database/queries/expenses";
import { roundCurrency } from "@/shared/types/invoice";
import type { Expense, ExpenseStatus } from "@/shared/types/expense";
import {
  buildReportSectionMeta,
  isDateWithinReportBounds,
  type ExpenseReport,
  type ExpenseStatusReportBucket,
  type ProfitabilityReportDateRange,
  resolveReportDateBounds,
} from "@/shared/types/reports";

type ExpenseReportOptions = {
  dateRange?: ProfitabilityReportDateRange;
};

function expenseAmount(expense: Expense): number {
  return expense.amount ?? 0;
}

function resolveExpenseReportDate(expense: Expense): string {
  return expense.purchaseDate ?? expense.createdAt;
}

function summarizeExpensesByStatus(
  expenses: Expense[],
  status: ExpenseStatus,
): ExpenseStatusReportBucket {
  const matched = expenses.filter((expense) => expense.status === status);

  return {
    count: matched.length,
    totalAmount: roundCurrency(
      matched.reduce((sum, expense) => sum + expenseAmount(expense), 0),
    ),
  };
}

function summarizeExpensesByStatuses(
  expenses: Expense[],
  statuses: ExpenseStatus[],
): ExpenseStatusReportBucket {
  const statusSet = new Set(statuses);
  const matched = expenses.filter((expense) => statusSet.has(expense.status));

  return {
    count: matched.length,
    totalAmount: roundCurrency(
      matched.reduce((sum, expense) => sum + expenseAmount(expense), 0),
    ),
  };
}

export async function getCompanyExpenseReport(
  companyId: string,
  options: ExpenseReportOptions = {},
): Promise<ExpenseReport> {
  const dateRange = options.dateRange ?? "30d";
  const dateBounds = resolveReportDateBounds(dateRange);
  const limitations: string[] = [];

  const expenses = await listExpenses(companyId);

  let scopedExpenses = expenses;
  let usedCreatedDateFallback = false;

  if (dateBounds) {
    scopedExpenses = expenses.filter((expense) => {
      const reportDate = resolveExpenseReportDate(expense);
      if (!expense.purchaseDate) {
        usedCreatedDateFallback = true;
      }
      return isDateWithinReportBounds(reportDate, dateBounds);
    });
  }

  if (usedCreatedDateFallback) {
    limitations.push(
      "Expenses without a purchase date use created date for period filtering.",
    );
  }

  return {
    summary: {
      submitted: summarizeExpensesByStatus(scopedExpenses, "submitted"),
      approvedReimbursed: summarizeExpensesByStatuses(scopedExpenses, [
        "approved",
        "reimbursed",
      ]),
      pending: summarizeExpensesByStatus(scopedExpenses, "draft"),
      rejected: summarizeExpensesByStatus(scopedExpenses, "rejected"),
    },
    meta: buildReportSectionMeta({
      dateRange,
      dateBounds,
      limitations,
    }),
  };
}
