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

/**
 * The same stats, from summaries instead of an array.
 *
 * buildPaymentsGlanceStats above reduces over every payment the caller holds,
 * which was only ever right while the caller held every payment. The Sales hub
 * now pages the ledger, so the all-time figure comes from its own count and sum
 * (getPaymentsAllTimeSummary) rather than from the page on screen. Every label,
 * every empty-state sentence and the currency formatting are shared with the
 * array version by construction: this delegates to it.
 */
export function buildPaymentsGlanceStatsFromSummaries(input: {
  allTime: { count: number; total: number };
  thisWeek: { count: number; total: number };
  thisMonth: { count: number; total: number };
}): PaymentsGlanceStat[] {
  const stats = buildPaymentsGlanceStats({
    payments: [],
    thisWeek: input.thisWeek,
    thisMonth: input.thisMonth,
  });

  return stats.map((stat) =>
    stat.id === "total-collected"
      ? {
          ...stat,
          count: String(input.allTime.count),
          amount: formatCurrency(input.allTime.total),
          detail:
            input.allTime.count === 0
              ? "No payments recorded yet"
              : "All-time collected from the payment ledger",
        }
      : stat,
  );
}
