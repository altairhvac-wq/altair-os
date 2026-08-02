import { sumCollectedRevenue } from "@/shared/lib/reports/report-metrics";
import { formatCurrency } from "@/shared/types/customer";
import type { InvoicePayment } from "@/shared/types/invoice-payment";

export type PaymentsGlanceStat = {
  id: "total-collected" | "this-week" | "this-month";
  label: string;
  /** Payment count for the window. */
  count: string;
  /** Formatted dollar total. */
  amount: string;
  detail: string;
};

/**
 * Builds MC glance stats for the Payments list header.
 * All-time collected uses the payment ledger via sumCollectedRevenue.
 * Week/month use dedicated summary helpers (count + total).
 */
export function buildPaymentsGlanceStats(input: {
  payments: ReadonlyArray<InvoicePayment>;
  thisWeek: { count: number; total: number };
  thisMonth: { count: number; total: number };
}): PaymentsGlanceStat[] {
  const allTimeTotal = sumCollectedRevenue([...input.payments]);
  const allTimeCount = input.payments.length;

  return [
    {
      id: "total-collected",
      label: "Total collected",
      count: String(allTimeCount),
      amount: formatCurrency(allTimeTotal),
      detail:
        allTimeCount === 0
          ? "No payments recorded yet"
          : "All-time collected from the payment ledger",
    },
    {
      id: "this-week",
      label: "This week",
      count: String(input.thisWeek.count),
      amount: formatCurrency(input.thisWeek.total),
      detail:
        input.thisWeek.count === 0
          ? "No payments this week"
          : "Sunday–today in company timezone",
    },
    {
      id: "this-month",
      label: "This month",
      count: String(input.thisMonth.count),
      amount: formatCurrency(input.thisMonth.total),
      detail:
        input.thisMonth.count === 0
          ? "No payments this month"
          : "Month-start–today in company timezone",
    },
  ];
}
