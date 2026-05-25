import type {
  AnalyticsDashboard,
  AnalyticsDateRange,
} from "@/shared/types/analytics";
import {
  analyticsInsights30d,
  analyticsSummary30d,
  jobPerformance30d,
  revenueTrend30d,
  technicians30d,
  topCustomers30d,
} from "./mock-analytics-core";
import {
  expensesByCategory30d,
  invoiceBreakdown30d,
  outstandingInvoices30d,
  partnerRevenue30d,
  profitByJobType30d,
  revenueByModule30d,
} from "./mock-analytics-financials";

const dashboard30d: AnalyticsDashboard = {
  summary: analyticsSummary30d,
  revenueTrend: revenueTrend30d,
  jobPerformance: jobPerformance30d,
  technicians: technicians30d,
  topCustomers: topCustomers30d,
  revenueByModule: revenueByModule30d,
  outstandingInvoices: outstandingInvoices30d,
  invoiceBreakdown: invoiceBreakdown30d,
  expensesByCategory: expensesByCategory30d,
  profitByJobType: profitByJobType30d,
  partnerRevenue: partnerRevenue30d,
  insights: analyticsInsights30d,
};

const weeklyTrend = [
  { label: "Mon", revenue: 8_200, expenses: 5_800 },
  { label: "Tue", revenue: 9_400, expenses: 6_200 },
  { label: "Wed", revenue: 7_800, expenses: 5_400 },
  { label: "Thu", revenue: 10_100, expenses: 6_900 },
  { label: "Fri", revenue: 11_200, expenses: 7_400 },
  { label: "Sat", revenue: 6_400, expenses: 4_200 },
  { label: "Sun", revenue: 4_800, expenses: 3_100 },
];

const rangeMultipliers: Record<AnalyticsDateRange, number> = {
  "7d": 0.18,
  "30d": 1,
  "90d": 2.6,
  ytd: 4.2,
  "12m": 5.8,
};

export function getMockAnalytics(
  range: AnalyticsDateRange = "30d",
): AnalyticsDashboard {
  const multiplier = rangeMultipliers[range];

  return {
    ...dashboard30d,
    summary: {
      ...dashboard30d.summary,
      totalRevenue: Math.round(dashboard30d.summary.totalRevenue * multiplier),
      revenueThisMonth: Math.round(
        dashboard30d.summary.revenueThisMonth * (range === "7d" ? 0.25 : 1),
      ),
      outstandingInvoices: dashboard30d.summary.outstandingInvoices,
      netProfitEstimate: Math.round(
        dashboard30d.summary.netProfitEstimate * multiplier,
      ),
      jobsCompleted: Math.round(dashboard30d.summary.jobsCompleted * multiplier),
    },
    revenueTrend:
      range === "7d"
        ? weeklyTrend
        : range === "90d"
          ? dashboard30d.revenueTrend.slice(-3)
          : dashboard30d.revenueTrend,
    insights: dashboard30d.insights,
  };
}

export const emptyAnalyticsDashboard: AnalyticsDashboard = {
  summary: {
    totalRevenue: 0,
    revenueThisMonth: 0,
    revenueChangePercent: 0,
    outstandingInvoices: 0,
    netProfitEstimate: 0,
    profitMarginPercent: 0,
    jobsCompleted: 0,
    averageJobValue: 0,
    estimateApprovalRate: 0,
    technicianUtilization: 0,
  },
  revenueTrend: [],
  jobPerformance: { byStatus: [], byType: [] },
  technicians: [],
  topCustomers: [],
  revenueByModule: [],
  outstandingInvoices: [],
  invoiceBreakdown: {
    paidAmount: 0,
    unpaidAmount: 0,
    paidCount: 0,
    unpaidCount: 0,
  },
  expensesByCategory: [],
  profitByJobType: [],
  partnerRevenue: [],
  insights: [],
};
