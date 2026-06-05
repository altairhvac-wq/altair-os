import type { AnalyticsDateRange } from "@/shared/types/analytics";
import type { ProfitabilityReportDateBounds } from "@/shared/types/reports";

export type ReportsPageDateRange = Extract<
  AnalyticsDateRange,
  "7d" | "30d" | "90d" | "ytd"
>;

export const REPORTS_PAGE_DATE_RANGE_OPTIONS: {
  value: ReportsPageDateRange;
  label: string;
}[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "ytd", label: "Year to date" },
];

export function parseReportsPageDateRange(
  value: string | undefined,
): ReportsPageDateRange {
  const ranges: ReportsPageDateRange[] = ["7d", "30d", "90d", "ytd"];

  if (value && ranges.includes(value as ReportsPageDateRange)) {
    return value as ReportsPageDateRange;
  }

  return "30d";
}

export type ReportKpiTrend = "up" | "down" | "flat";

export type ReportKpiMetric = {
  id: "revenue" | "average-ticket" | "close-rate" | "outstanding";
  label: string;
  value: string;
  comparison: string;
  trend?: ReportKpiTrend;
};

export type ReportTrendPoint = {
  label: string;
  value: number;
};

export type ReportCashHealth = {
  paid: number;
  outstanding: number;
  overdue: number;
  collectionRate: number | null;
  collectionRateLabel: string;
};

export type ReportFunnelStage = {
  key: string;
  label: string;
  count: number;
};

export type ReportTechnicianProfitability = {
  technicianId: string;
  name: string;
  revenue: number;
  laborHours: number;
  laborCost: number | null;
  grossProfit: number | null;
  margin: number | null;
  profitAvailable: boolean;
};

export type ReportSnapshotRow = {
  id: string;
  label: string;
  detail?: string;
  value: string;
};

export type ReportOperationsSnapshot = {
  topCustomers: ReportSnapshotRow[];
  topServiceCategories: ReportSnapshotRow[];
  overdueInvoices: ReportSnapshotRow[];
  workCompleted: ReportSnapshotRow[];
};

export type ReportPaymentMethodTotal = {
  method: string;
  amount: number;
  count: number;
};

export type ReportInvoiceAgingBucket = {
  label: string;
  count: number;
  amount: number;
};

export type AccountantSummaryData = {
  companyName: string;
  dateRange: ReportsPageDateRange;
  dateBounds: ProfitabilityReportDateBounds;
  totalInvoiceValue: number;
  totalPaymentsCollected: number;
  outstandingBalance: number;
  overdueBalance: number;
  salesTaxCollected: number;
  expensesRecorded: number;
  netIncomeEstimate: number;
  paymentsByMethod: ReportPaymentMethodTotal[];
  revenueByCustomer: ReportSnapshotRow[];
  revenueByServiceCategory: ReportSnapshotRow[];
  invoiceAging: ReportInvoiceAgingBucket[];
};

export type ReportsPageData = {
  dateRange: ReportsPageDateRange;
  dateBounds: ProfitabilityReportDateBounds;
  kpis: ReportKpiMetric[];
  revenueTrend: ReportTrendPoint[];
  cashHealth: ReportCashHealth;
  salesFunnel: ReportFunnelStage[];
  technicianProfitability: ReportTechnicianProfitability[];
  showTechnicianProfitability: boolean;
  operationsSnapshot: ReportOperationsSnapshot;
  accountantSummary: AccountantSummaryData;
  limitations: string[];
};

export type BusinessSummaryAiResult = {
  bullets: string[];
  recommendedAction: string;
  generatedAt: string;
  fromCache?: boolean;
};

export type GenerateBusinessSummaryResult = {
  error?: string;
  summary?: BusinessSummaryAiResult;
};
