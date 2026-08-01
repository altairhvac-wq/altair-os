import type { MissionControlV2GlanceStat } from "@/shared/components/dashboard/mission-control-v2/sample-data";
import type { DashboardData } from "@/shared/types/dashboard";
import { formatCurrency } from "@/shared/types/customer";

/**
 * Format today-vs-yesterday revenue delta.
 * When yesterday is $0, avoid divide-by-zero and return null (caller picks a fallback).
 */
export function formatRevenueDeltaVsYesterday(
  todayTotal: number,
  yesterdayTotal: number,
): string | null {
  if (yesterdayTotal <= 0) {
    return null;
  }

  const deltaPct = Math.round(
    ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100,
  );
  const sign = deltaPct > 0 ? "+" : "";
  return `${sign}${deltaPct}% vs yesterday`;
}

function buildRevenueDetail(money: DashboardData["money"]): string {
  const comparison = formatRevenueDeltaVsYesterday(
    money.paymentsTodayTotal,
    money.paymentsYesterdayTotal,
  );

  if (comparison) {
    return comparison;
  }

  if (money.paymentsTodayTotal > 0) {
    return "No data for yesterday";
  }

  return "No payments yet today";
}

/**
 * Maps getDashboardData rollups into Mission Control v2 "Today at a glance" stats.
 */
export function buildMissionControlV2GlanceStats(
  data: DashboardData,
): MissionControlV2GlanceStat[] {
  const { access, operations, money, technicians, leadPipelineSummary } = data;
  const stats: MissionControlV2GlanceStat[] = [];

  if (access.canViewBilling) {
    stats.push({
      id: "revenue",
      label: "Revenue",
      value: formatCurrency(money.paymentsTodayTotal),
      detail: buildRevenueDetail(money),
    });
  } else {
    stats.push({
      id: "revenue",
      label: "Revenue",
      value: "—",
      detail: "Billing access required",
    });
  }

  const activeJobs = Math.max(
    0,
    operations.totalJobsToday - operations.completedToday,
  );
  const doneJobs = operations.completedToday;
  stats.push({
    id: "jobs",
    label: "Jobs",
    value: String(operations.totalJobsToday),
    detail:
      operations.totalJobsToday === 0
        ? "No jobs scheduled today"
        : `${activeJobs} active · ${doneJobs} done`,
  });

  if (access.canViewTechnicianRoster) {
    const onSite = technicians.filter(
      (technician) => technician.timeState === "working_job",
    ).length;
    const dispatchedJobs = operations.dispatched;
    stats.push({
      id: "technicians",
      label: "Technicians",
      value: String(technicians.length),
      detail:
        technicians.length === 0
          ? "No technicians on roster"
          : onSite === 0 && dispatchedJobs === 0
            ? "None on site or dispatched"
            : `${onSite} on site · ${dispatchedJobs} dispatched`,
    });
  } else {
    stats.push({
      id: "technicians",
      label: "Technicians",
      value: "—",
      detail: "Roster access required",
    });
  }

  if (access.canManageCustomers) {
    const newLeadsToday = leadPipelineSummary.newLeadsToday;
    stats.push({
      id: "leads",
      label: "Leads",
      value: String(newLeadsToday),
      detail: newLeadsToday === 0 ? "No new leads today" : "Created today",
    });
  } else {
    stats.push({
      id: "leads",
      label: "Leads",
      value: "—",
      detail: "Lead access required",
    });
  }

  return stats;
}
