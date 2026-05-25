import type {
  AnalyticsInsight,
  AnalyticsSummary,
  JobPerformance,
  RevenueTrendPoint,
  TechnicianPerformance,
  TopCustomer,
} from "@/shared/types/analytics";

export const analyticsSummary30d: AnalyticsSummary = {
  totalRevenue: 487_250,
  revenueThisMonth: 62_400,
  revenueChangePercent: 12.4,
  outstandingInvoices: 28_750,
  netProfitEstimate: 134_600,
  profitMarginPercent: 27.6,
  jobsCompleted: 186,
  averageJobValue: 2_619,
  estimateApprovalRate: 68,
  technicianUtilization: 82,
};

export const revenueTrend30d: RevenueTrendPoint[] = [
  { label: "Jan", revenue: 38_200, expenses: 27_400 },
  { label: "Feb", revenue: 41_800, expenses: 29_100 },
  { label: "Mar", revenue: 44_500, expenses: 30_800 },
  { label: "Apr", revenue: 47_200, expenses: 32_500 },
  { label: "May", revenue: 52_100, expenses: 35_200 },
  { label: "Jun", revenue: 48_900, expenses: 33_800 },
  { label: "Jul", revenue: 55_400, expenses: 37_600 },
  { label: "Aug", revenue: 58_200, expenses: 39_400 },
  { label: "Sep", revenue: 54_800, expenses: 38_100 },
  { label: "Oct", revenue: 61_300, expenses: 41_500 },
  { label: "Nov", revenue: 59_700, expenses: 40_200 },
  { label: "Dec", revenue: 62_400, expenses: 42_800 },
];

export const jobPerformance30d: JobPerformance = {
  byStatus: [
    { status: "Completed", count: 186, revenue: 487_250 },
    { status: "In Progress", count: 24, revenue: 68_400 },
    { status: "Scheduled", count: 31, revenue: 82_150 },
    { status: "On Hold", count: 8, revenue: 19_200 },
    { status: "Cancelled", count: 5, revenue: 0 },
  ],
  byType: [
    { type: "Service Call", count: 94, revenue: 198_400 },
    { type: "Install", count: 42, revenue: 176_800 },
    { type: "Maintenance", count: 38, revenue: 62_350 },
    { type: "Emergency", count: 28, revenue: 49_700 },
    { type: "Inspection", count: 52, revenue: 0 },
  ],
};

export const technicians30d: TechnicianPerformance[] = [
  {
    id: "tech-1",
    name: "Marcus Rivera",
    jobsCompleted: 48,
    revenue: 128_400,
    utilizationPercent: 91,
    averageJobValue: 2_675,
    onTimeRate: 94,
  },
  {
    id: "tech-2",
    name: "Jordan Lee",
    jobsCompleted: 42,
    revenue: 112_800,
    utilizationPercent: 86,
    averageJobValue: 2_686,
    onTimeRate: 89,
  },
  {
    id: "tech-3",
    name: "Sam Patel",
    jobsCompleted: 38,
    revenue: 98_200,
    utilizationPercent: 84,
    averageJobValue: 2_584,
    onTimeRate: 92,
  },
  {
    id: "tech-4",
    name: "Alex Chen",
    jobsCompleted: 35,
    revenue: 89_600,
    utilizationPercent: 78,
    averageJobValue: 2_560,
    onTimeRate: 87,
  },
  {
    id: "tech-5",
    name: "Taylor Brooks",
    jobsCompleted: 23,
    revenue: 58_250,
    utilizationPercent: 71,
    averageJobValue: 2_533,
    onTimeRate: 85,
  },
];

export const topCustomers30d: TopCustomer[] = [
  {
    id: "cust-1",
    name: "Harborview Property Group",
    company: "Harborview Property Group",
    revenue: 42_800,
    jobsCompleted: 14,
    lastServiceDate: "2026-05-18",
  },
  {
    id: "cust-2",
    name: "Summit Retail Partners",
    company: "Summit Retail Partners",
    revenue: 36_400,
    jobsCompleted: 11,
    lastServiceDate: "2026-05-12",
  },
  {
    id: "cust-3",
    name: "Lakeside Medical Center",
    company: "Lakeside Medical Center",
    revenue: 31_200,
    jobsCompleted: 9,
    lastServiceDate: "2026-05-20",
  },
  {
    id: "cust-4",
    name: "Greenfield HOA",
    company: "Greenfield HOA",
    revenue: 24_600,
    jobsCompleted: 18,
    lastServiceDate: "2026-05-08",
  },
  {
    id: "cust-5",
    name: "Northgate Warehouse Co.",
    company: "Northgate Warehouse Co.",
    revenue: 19_850,
    jobsCompleted: 6,
    lastServiceDate: "2026-04-29",
  },
];

export const analyticsInsights30d: AnalyticsInsight[] = [
  {
    id: "insight-1",
    title: "Revenue up 12.4% this month",
    description:
      "Strong install volume and higher average job value are driving growth.",
    tone: "positive",
    metric: "+12.4%",
  },
  {
    id: "insight-2",
    title: "$28.7K in outstanding invoices",
    description:
      "2 invoices are overdue. Follow up with Harborview and Summit Retail.",
    tone: "warning",
    metric: "$28.7K",
  },
  {
    id: "insight-3",
    title: "Estimate approval at 68%",
    description:
      "Approval rate improved 5 points. Install estimates convert best.",
    tone: "positive",
    metric: "68%",
  },
  {
    id: "insight-4",
    title: "Technician utilization at 82%",
    description:
      "Field capacity is healthy. Taylor Brooks has room for 2–3 more jobs.",
    tone: "neutral",
    metric: "82%",
  },
];
