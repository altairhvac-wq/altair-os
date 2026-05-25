import type {
  ExpenseCategoryMetric,
  InvoicePaymentBreakdown,
  OutstandingInvoice,
  PartnerRevenueEntry,
  ProfitByJobType,
  RevenueModule,
} from "@/shared/types/analytics";

export const revenueByModule30d: RevenueModule[] = [
  { module: "Jobs", revenue: 312_400, changePercent: 9.2, iconKey: "jobs" },
  {
    module: "Invoices",
    revenue: 487_250,
    changePercent: 12.4,
    iconKey: "invoices",
  },
  {
    module: "Estimates",
    revenue: 218_600,
    changePercent: 6.8,
    iconKey: "estimates",
  },
  {
    module: "Network",
    revenue: 64_200,
    changePercent: 18.5,
    iconKey: "network",
  },
  {
    module: "Expenses",
    revenue: 352_650,
    changePercent: -3.1,
    iconKey: "expenses",
  },
];

export const outstandingInvoices30d: OutstandingInvoice[] = [
  {
    id: "inv-1",
    invoiceNumber: "INV-1042",
    customerName: "Harborview Property Group",
    amount: 8_400,
    dueDate: "2026-05-10",
    daysOverdue: 15,
    status: "overdue",
  },
  {
    id: "inv-2",
    invoiceNumber: "INV-1051",
    customerName: "Summit Retail Partners",
    amount: 6_250,
    dueDate: "2026-05-18",
    daysOverdue: 7,
    status: "overdue",
  },
  {
    id: "inv-3",
    invoiceNumber: "INV-1058",
    customerName: "Lakeside Medical Center",
    amount: 5_800,
    dueDate: "2026-05-28",
    daysOverdue: 0,
    status: "due-soon",
  },
  {
    id: "inv-4",
    invoiceNumber: "INV-1062",
    customerName: "Greenfield HOA",
    amount: 4_200,
    dueDate: "2026-06-05",
    daysOverdue: 0,
    status: "sent",
  },
  {
    id: "inv-5",
    invoiceNumber: "INV-1065",
    customerName: "Northgate Warehouse Co.",
    amount: 4_100,
    dueDate: "2026-06-08",
    daysOverdue: 0,
    status: "sent",
  },
];

export const invoiceBreakdown30d: InvoicePaymentBreakdown = {
  paidAmount: 458_500,
  unpaidAmount: 28_750,
  paidCount: 142,
  unpaidCount: 18,
};

export const expensesByCategory30d: ExpenseCategoryMetric[] = [
  { category: "Materials", amount: 124_800, percentOfTotal: 35.4 },
  { category: "Fuel & Mileage", amount: 48_200, percentOfTotal: 13.7 },
  { category: "Tools & Equipment", amount: 42_600, percentOfTotal: 12.1 },
  { category: "Subcontractor", amount: 68_400, percentOfTotal: 19.4 },
  { category: "Permits & Fees", amount: 18_950, percentOfTotal: 5.4 },
  { category: "Other", amount: 49_700, percentOfTotal: 14.0 },
];

export const profitByJobType30d: ProfitByJobType[] = [
  {
    type: "Install",
    revenue: 176_800,
    expenses: 118_400,
    profit: 58_400,
    marginPercent: 33.0,
  },
  {
    type: "Service Call",
    revenue: 198_400,
    expenses: 142_800,
    profit: 55_600,
    marginPercent: 28.0,
  },
  {
    type: "Maintenance",
    revenue: 62_350,
    expenses: 44_800,
    profit: 17_550,
    marginPercent: 28.1,
  },
  {
    type: "Emergency",
    revenue: 49_700,
    expenses: 36_200,
    profit: 13_500,
    marginPercent: 27.2,
  },
];

export const partnerRevenue30d: PartnerRevenueEntry[] = [
  {
    id: "partner-1",
    partnerName: "Cascade Mechanical",
    tradeType: "HVAC",
    jobsSent: 8,
    jobsReceived: 3,
    revenueEarned: 18_400,
    revenuePaidOut: 12_600,
    totalRevenue: 31_000,
  },
  {
    id: "partner-2",
    partnerName: "BrightWire Electric",
    tradeType: "Electrical",
    jobsSent: 5,
    jobsReceived: 6,
    revenueEarned: 22_800,
    revenuePaidOut: 9_400,
    totalRevenue: 32_200,
  },
  {
    id: "partner-3",
    partnerName: "ProFlow Plumbing",
    tradeType: "Plumbing",
    jobsSent: 6,
    jobsReceived: 2,
    revenueEarned: 8_200,
    revenuePaidOut: 14_800,
    totalRevenue: 23_000,
  },
  {
    id: "partner-4",
    partnerName: "Summit Roofing Co.",
    tradeType: "Roofing",
    jobsSent: 3,
    jobsReceived: 4,
    revenueEarned: 15_600,
    revenuePaidOut: 6_200,
    totalRevenue: 21_800,
  },
  {
    id: "partner-5",
    partnerName: "ClearView Glass",
    tradeType: "Glazing",
    jobsSent: 2,
    jobsReceived: 1,
    revenueEarned: 4_800,
    revenuePaidOut: 3_100,
    totalRevenue: 7_900,
  },
];
