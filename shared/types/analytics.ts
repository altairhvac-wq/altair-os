export type AnalyticsDateRange = "7d" | "30d" | "90d" | "ytd" | "12m";

export type AnalyticsDateRangeOption = {
  value: AnalyticsDateRange;
  label: string;
};

export const ANALYTICS_DATE_RANGE_OPTIONS: AnalyticsDateRangeOption[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "ytd", label: "Year to date" },
  { value: "12m", label: "Last 12 months" },
];

export type AnalyticsSummary = {
  totalRevenue: number;
  revenueThisMonth: number;
  revenueChangePercent: number;
  outstandingInvoices: number;
  netProfitEstimate: number;
  profitMarginPercent: number;
  jobsCompleted: number;
  averageJobValue: number;
  estimateApprovalRate: number;
  technicianUtilization: number;
};

export type RevenueTrendPoint = {
  label: string;
  revenue: number;
  expenses: number;
};

export type JobStatusMetric = {
  status: string;
  count: number;
  revenue: number;
};

export type JobTypeMetric = {
  type: string;
  count: number;
  revenue: number;
};

export type JobPerformance = {
  byStatus: JobStatusMetric[];
  byType: JobTypeMetric[];
};

export type TechnicianPerformance = {
  id: string;
  name: string;
  jobsCompleted: number;
  revenue: number;
  utilizationPercent: number;
  averageJobValue: number;
  onTimeRate: number;
};

export type TopCustomer = {
  id: string;
  name: string;
  company?: string;
  revenue: number;
  jobsCompleted: number;
  lastServiceDate: string;
};

export type RevenueModule = {
  module: string;
  revenue: number;
  changePercent: number;
  iconKey: "jobs" | "invoices" | "estimates" | "network" | "expenses";
};

export type OutstandingInvoice = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  amount: number;
  dueDate: string;
  daysOverdue: number;
  status: "overdue" | "due-soon" | "sent";
};

export type InvoicePaymentBreakdown = {
  paidAmount: number;
  unpaidAmount: number;
  paidCount: number;
  unpaidCount: number;
};

export type ExpenseCategoryMetric = {
  category: string;
  amount: number;
  percentOfTotal: number;
};

export type ProfitByJobType = {
  type: string;
  revenue: number;
  expenses: number;
  profit: number;
  marginPercent: number;
};

export type PartnerRevenueEntry = {
  id: string;
  partnerName: string;
  tradeType: string;
  jobsSent: number;
  jobsReceived: number;
  revenueEarned: number;
  revenuePaidOut: number;
  totalRevenue: number;
};

export type AnalyticsInsight = {
  id: string;
  title: string;
  description: string;
  tone: "positive" | "neutral" | "warning" | "critical";
  metric?: string;
};

export type AnalyticsDashboard = {
  summary: AnalyticsSummary;
  revenueTrend: RevenueTrendPoint[];
  jobPerformance: JobPerformance;
  technicians: TechnicianPerformance[];
  topCustomers: TopCustomer[];
  revenueByModule: RevenueModule[];
  outstandingInvoices: OutstandingInvoice[];
  invoiceBreakdown: InvoicePaymentBreakdown;
  expensesByCategory: ExpenseCategoryMetric[];
  profitByJobType: ProfitByJobType[];
  partnerRevenue: PartnerRevenueEntry[];
  insights: AnalyticsInsight[];
};

export function formatPercent(value: number, decimals = 0): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatCompactCurrency(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(0)}K`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}
