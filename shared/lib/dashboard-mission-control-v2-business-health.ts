import type { MissionControlV2GlanceStat } from "@/shared/components/dashboard/mission-control-v2/sample-data";
import { buildCashFlowCards } from "@/shared/lib/dashboard-mission-control";
import type { DashboardData } from "@/shared/types/dashboard";

const BILLING_REQUIRED_DETAIL = "Billing access required";

/**
 * Maps the existing Mission Control Business Health / cash-flow cards into
 * Mission Control v2 "Business health" stats.
 *
 * Source mapping (from buildCashFlowCards):
 * - Outstanding → money.unpaidTotal (all open invoice balances)
 * - Past due → money.overdueTotal (past-due subset; live MC label "Awaiting Payment")
 * - Monthly revenue → money.paymentsThisMonthTotal (calendar month aggregate)
 * - Collections → money.paymentsThisWeekTotal (calendar week aggregate, currency)
 *
 * Mock details intentionally not fabricated:
 * - Collections % / "+N pts vs last month" — not on DashboardData
 *   (reports have period collectionRate; old MC "Collections" is week $)
 * - "On pace for $X" — revenueTrend is a 7-day chart, not a month pace
 * - "Sent this week" past-due detail — not on money snapshot
 */
export function buildMissionControlV2BusinessHealthStats(
  data: DashboardData,
): MissionControlV2GlanceStat[] {
  if (!data.access.canViewBilling) {
    return [
      {
        id: "outstanding",
        label: "Outstanding",
        value: "—",
        detail: BILLING_REQUIRED_DETAIL,
      },
      {
        id: "past-due",
        label: "Past due",
        value: "—",
        detail: BILLING_REQUIRED_DETAIL,
      },
      {
        id: "monthly-revenue",
        label: "Monthly revenue",
        value: "—",
        detail: BILLING_REQUIRED_DETAIL,
      },
      {
        id: "collections",
        label: "Collections",
        value: "—",
        detail: BILLING_REQUIRED_DETAIL,
      },
    ];
  }

  const cards = buildCashFlowCards(data);
  const byId = new Map(cards.map((card) => [card.id, card]));

  const outstanding = byId.get("outstanding-invoices");
  const pastDue = byId.get("awaiting-payments");
  const monthRevenue = byId.get("revenue-month");
  const weekCollections = byId.get("revenue-week");

  return [
    {
      id: "outstanding",
      label: "Outstanding",
      value: outstanding?.value ?? "—",
      detail: outstanding?.trend ?? "No open invoices",
    },
    {
      id: "past-due",
      label: "Past due",
      value: pastDue?.value ?? "—",
      detail: pastDue?.trend ?? "No invoices past due",
    },
    {
      id: "monthly-revenue",
      label: "Monthly revenue",
      value: monthRevenue?.value ?? "—",
      detail: monthRevenue?.trend ?? "From recorded payments this month",
    },
    {
      id: "collections",
      label: "Collections",
      value: weekCollections?.value ?? "—",
      detail: weekCollections?.trend ?? "Recorded payments this week",
    },
  ];
}
