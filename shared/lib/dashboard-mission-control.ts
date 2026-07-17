import {
  buildDashboardAttentionCards,
  countDashboardAttentionIssues,
} from "@/shared/lib/dashboard-attention-cards";
import {
  INVOICE_PAGE_CASH_FLOW_HREF,
  INVOICE_PAGE_OVERDUE_HREF,
  INVOICE_PAGE_UNPAID_HREF,
} from "@/shared/lib/invoice-page-focus";
import {
  DISPATCH_PAGE_TODAY_HREF,
  DISPATCH_PAGE_UNASSIGNED_HREF,
} from "@/shared/lib/dispatch-page-focus";
import type {
  DashboardData,
  DashboardRecentPayment,
} from "@/shared/types/dashboard";
import { formatCurrency } from "@/shared/types/customer";
import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  Briefcase,
  Clock,
  DollarSign,
  FileText,
  Phone,
  Receipt,
  Users,
} from "lucide-react";

export type MissionCriticalSeverity = "critical" | "warning" | "healthy";

export type MissionCriticalItem = {
  id: string;
  label: string;
  count: number;
  description: string;
  href: string;
  severity: MissionCriticalSeverity;
};

export type MissionControlGreetingContent = {
  greeting: string;
  dateLabel: string;
  attentionSummary: string;
  attentionCount: number;
};

export type MissionControlOperationsCard = {
  id: string;
  label: string;
  value: string;
  trend: string;
  icon: LucideIcon;
  href: string;
  tone: "neutral" | "success" | "warning" | "info";
};

export type MissionControlCashFlowCard = {
  id: string;
  label: string;
  value: string;
  trend: string;
  href: string;
};

export type MissionControlQuickAction = {
  id: string;
  label: string;
  href: string;
  description: string;
};

export type MissionControlTrendPoint = {
  label: string;
  value: number;
};

export type MissionControlChartSeries = {
  id: string;
  title: string;
  subtitle: string;
  points: MissionControlTrendPoint[];
  valueFormatter: (value: number) => string;
  emptyTitle: string;
  emptyDescription: string;
};

export type MissionControlContent = {
  greeting: MissionControlGreetingContent;
  missionCritical: MissionCriticalItem[];
  isMissionClear: boolean;
  todaysOperations: MissionControlOperationsCard[];
  cashFlow: MissionControlCashFlowCard[];
  quickActions: MissionControlQuickAction[];
  revenueTrend: MissionControlChartSeries;
  jobsTrend: MissionControlChartSeries;
};

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? singular : plural;
}

function getTimeOfDayGreeting(reference = new Date()): string {
  const hour = reference.getHours();
  if (hour < 12) {
    return "Good Morning";
  }
  if (hour < 17) {
    return "Good Afternoon";
  }
  return "Good Evening";
}

function getFirstName(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) {
    return "there";
  }
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

function formatDateLabel(reference = new Date()): string {
  return reference.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function startOfCalendarWeek(reference: Date): Date {
  const date = new Date(reference);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - date.getDay());
  return date;
}

function startOfCalendarMonth(reference: Date): Date {
  return new Date(reference.getFullYear(), reference.getMonth(), 1);
}

function endOfDay(reference: Date): Date {
  const date = new Date(reference);
  date.setHours(23, 59, 59, 999);
  return date;
}

function sumPaymentsInRange(
  payments: DashboardRecentPayment[],
  rangeStart: Date,
  rangeEnd: Date,
  includeTodayTotal: number,
  todayAlreadyCounted: boolean,
): number {
  let total = payments
    .filter((payment) => {
      const paymentDate = new Date(`${payment.paymentDate}T12:00:00.000Z`);
      return paymentDate >= rangeStart && paymentDate <= rangeEnd;
    })
    .reduce((sum, payment) => sum + payment.amount, 0);

  if (!todayAlreadyCounted) {
    total += includeTodayTotal;
  }

  return total;
}

function paymentCoversToday(payments: DashboardRecentPayment[], reference: Date): boolean {
  return payments.some((payment) => {
    const paymentDate = new Date(`${payment.paymentDate}T12:00:00.000Z`);
    return (
      paymentDate.getFullYear() === reference.getFullYear() &&
      paymentDate.getMonth() === reference.getMonth() &&
      paymentDate.getDate() === reference.getDate()
    );
  });
}

function buildMissionCriticalItems(data: DashboardData): MissionCriticalItem[] {
  const { access, money, stalledJobs, completedWorkReview, operations } = data;
  const items: MissionCriticalItem[] = [];

  if (access.canViewOperationalReports) {
    const overdueJobs = stalledJobs.stalledCount;
    items.push({
      id: "overdue-jobs",
      label: "Overdue Jobs",
      count: overdueJobs,
      description:
        overdueJobs === 0
          ? "No jobs have gone quiet beyond the inactivity threshold."
          : `${overdueJobs} ${pluralize(overdueJobs, "job")} with no recent activity.`,
      href: "/reports?queue=stalled",
      severity: overdueJobs >= 5 ? "critical" : overdueJobs > 0 ? "warning" : "healthy",
    });

    const waitingOnCustomer = completedWorkReview.count;
    items.push({
      id: "jobs-waiting-customer",
      label: "Jobs Waiting on Customer",
      count: waitingOnCustomer,
      description:
        waitingOnCustomer === 0
          ? "No completed jobs are blocked waiting on customer sign-off."
          : `${waitingOnCustomer} completed ${pluralize(waitingOnCustomer, "job")} blocked on office review.`,
      href: "/reports?queue=attention",
      severity:
        waitingOnCustomer >= 3 ? "critical" : waitingOnCustomer > 0 ? "warning" : "healthy",
    });
  }

  if (access.canViewBilling) {
    const estimatesWaiting = money.staleSentEstimateCount;
    items.push({
      id: "estimates-waiting",
      label: "Estimates Waiting Approval",
      count: estimatesWaiting,
      description:
        estimatesWaiting === 0
          ? "No sent estimates are waiting on customer approval."
          : `${estimatesWaiting} sent ${pluralize(estimatesWaiting, "estimate")} past the follow-up threshold.`,
      href: "/estimates?status=sent",
      severity:
        estimatesWaiting >= 3 ? "critical" : estimatesWaiting > 0 ? "warning" : "healthy",
    });

    const invoicesPastDue = money.overdueCount;
    items.push({
      id: "invoices-past-due",
      label: "Invoices Past Due",
      count: invoicesPastDue,
      description:
        invoicesPastDue === 0
          ? "No overdue invoices."
          : `${invoicesPastDue} ${pluralize(invoicesPastDue, "invoice")} · ${formatCurrency(money.overdueTotal)} outstanding.`,
      href: INVOICE_PAGE_OVERDUE_HREF,
      severity:
        invoicesPastDue >= 3 ? "critical" : invoicesPastDue > 0 ? "warning" : "healthy",
    });
  }

  if (access.canViewTechnicianRoster || access.canViewOperationalReports) {
    const behindSchedule =
      operations.unassignedToday + operations.overloadedTechnicianCount;
    items.push({
      id: "technicians-behind",
      label: "Technicians Behind Schedule",
      count: behindSchedule,
      description:
        behindSchedule === 0
          ? "Today's board is covered and crews are on pace."
          : `${operations.unassignedToday} unassigned · ${operations.overloadedTechnicianCount} overloaded on today's board.`,
      href:
        operations.unassignedToday > 0
          ? DISPATCH_PAGE_UNASSIGNED_HREF
          : DISPATCH_PAGE_TODAY_HREF,
      severity:
        behindSchedule >= 3 ? "critical" : behindSchedule > 0 ? "warning" : "healthy",
    });
  }

  return items;
}

function buildAttentionSummary(data: DashboardData): {
  attentionCount: number;
  attentionSummary: string;
} {
  const missionIssues = buildMissionCriticalItems(data).filter(
    (item) => item.severity !== "healthy",
  ).length;

  if (missionIssues > 0) {
    return {
      attentionCount: missionIssues,
      attentionSummary: `${missionIssues} ${pluralize(missionIssues, "area")} need attention.`,
    };
  }

  if (data.access.canViewOperationalReports) {
    const attentionCards = buildDashboardAttentionCards(data);
    const issueCount = countDashboardAttentionIssues(attentionCards);
    if (issueCount > 0) {
      return {
        attentionCount: issueCount,
        attentionSummary: `${issueCount} ${pluralize(issueCount, "item")} need attention.`,
      };
    }
  }

  return {
    attentionCount: 0,
    attentionSummary: "Operations are running smoothly.",
  };
}

function buildTodaysOperationsCards(data: DashboardData): MissionControlOperationsCard[] {
  const { access, operations, money, analytics, technicians, leadPipelineSummary } =
    data;
  const cards: MissionControlOperationsCard[] = [];

  cards.push({
    id: "todays-jobs",
    label: "Today's Jobs",
    value: String(operations.totalJobsToday),
    trend:
      operations.unassignedToday > 0
        ? `${operations.unassignedToday} still unassigned`
        : "Board is covered",
    icon: Briefcase,
    href: DISPATCH_PAGE_TODAY_HREF,
    tone: operations.unassignedToday > 0 ? "warning" : "neutral",
  });

  if (access.canViewBilling) {
    cards.push({
      id: "todays-revenue",
      label: "Today's Revenue",
      value: formatCurrency(money.paymentsTodayTotal),
      trend:
        money.paymentsTodayCount > 0
          ? `${money.paymentsTodayCount} ${pluralize(money.paymentsTodayCount, "payment")} recorded`
          : "No payments yet today",
      icon: DollarSign,
      href: INVOICE_PAGE_CASH_FLOW_HREF,
      tone: money.paymentsTodayTotal > 0 ? "success" : "neutral",
    });
  } else {
    cards.push({
      id: "open-jobs",
      label: "Open Jobs",
      value: String(analytics.openJobs),
      trend: "Active backlog",
      icon: Briefcase,
      href: "/jobs",
      tone: "info",
    });
  }

  cards.push({
    id: "jobs-completed",
    label: "Jobs Completed",
    value: String(operations.completedToday),
    trend: `${operations.inProgress} in progress now`,
    icon: Clock,
    href: "/jobs",
    tone: operations.completedToday > 0 ? "success" : "neutral",
  });

  if (access.canViewTechnicianRoster) {
    const working = technicians.filter(
      (technician) => technician.timeState !== "off_clock",
    ).length;
    cards.push({
      id: "technicians-working",
      label: "Technicians Working",
      value: String(working),
      trend: `${technicians.length} on roster`,
      icon: Users,
      href: "/time",
      tone: working > 0 ? "success" : "neutral",
    });
  }

  if (access.canManageCustomers) {
    cards.push({
      id: "calls-scheduled",
      label: "Calls Scheduled",
      value: String(leadPipelineSummary.followUpsDue),
      trend:
        leadPipelineSummary.followUpsDue > 0
          ? "Follow-ups due today or overdue"
          : "Lead follow-ups are clear",
      icon: Phone,
      href: "/leads",
      tone: leadPipelineSummary.followUpsDue > 0 ? "warning" : "success",
    });
  }

  return cards.slice(0, 5);
}

function buildCashFlowCards(data: DashboardData): MissionControlCashFlowCard[] {
  const { access, money } = data;
  if (!access.canViewBilling) {
    return [];
  }

  const reference = new Date();
  const weekStart = startOfCalendarWeek(reference);
  const monthStart = startOfCalendarMonth(reference);
  const todayCounted = paymentCoversToday(money.recentPayments, reference);
  const weekRevenue = sumPaymentsInRange(
    money.recentPayments,
    weekStart,
    endOfDay(reference),
    money.paymentsTodayTotal,
    todayCounted,
  );
  const monthRevenue = sumPaymentsInRange(
    money.recentPayments,
    monthStart,
    endOfDay(reference),
    money.paymentsTodayTotal,
    todayCounted,
  );

  return [
    {
      id: "outstanding-invoices",
      label: "Outstanding Invoices",
      value: formatCurrency(money.unpaidTotal),
      trend: `${money.unpaidCount} open ${pluralize(money.unpaidCount, "invoice")}`,
      href: INVOICE_PAGE_UNPAID_HREF,
    },
    {
      id: "awaiting-payments",
      label: "Awaiting Payments",
      value: formatCurrency(money.overdueTotal),
      trend:
        money.overdueCount > 0
          ? `${money.overdueCount} past due`
          : "No invoices past due",
      href: INVOICE_PAGE_OVERDUE_HREF,
    },
    {
      id: "revenue-week",
      label: "Revenue This Week",
      value: formatCurrency(weekRevenue),
      trend: "From recorded payments this week",
      href: INVOICE_PAGE_CASH_FLOW_HREF,
    },
    {
      id: "revenue-month",
      label: "Revenue This Month",
      value: formatCurrency(monthRevenue),
      trend: "From recorded payments this month",
      href: INVOICE_PAGE_CASH_FLOW_HREF,
    },
  ];
}

function buildQuickActions(data: DashboardData): MissionControlQuickAction[] {
  const { access } = data;
  const actions: MissionControlQuickAction[] = [];

  if (access.canManageCustomers) {
    actions.push({
      id: "new-customer",
      label: "New Customer",
      href: "/customers",
      description: "Add a customer profile",
    });
  }

  if (access.canViewAllJobs) {
    actions.push({
      id: "new-job",
      label: "New Job",
      href: "/jobs?create=1",
      description: "Schedule field work",
    });
  }

  if (access.canViewBilling) {
    actions.push({
      id: "new-estimate",
      label: "New Estimate",
      href: "/estimates?create=1",
      description: "Send a quote",
    });
    actions.push({
      id: "create-invoice",
      label: "Create Invoice",
      href: "/invoices?create=1",
      description: "Bill completed work",
    });
    actions.push({
      id: "record-payment",
      label: "Record Payment",
      href: INVOICE_PAGE_UNPAID_HREF,
      description: "Apply payment to invoice",
    });
  }

  if (access.canViewTechnicianRoster || access.canViewAllJobs) {
    actions.push({
      id: "dispatch-technician",
      label: "Dispatch Technician",
      href: DISPATCH_PAGE_TODAY_HREF,
      description: "Open today's dispatch board",
    });
  }

  return actions;
}

function buildRevenueTrend(data: DashboardData): MissionControlChartSeries {
  const { access, money } = data;
  if (!access.canViewBilling) {
    return {
      id: "revenue-trend",
      title: "Revenue trend",
      subtitle: "Last 7 days of recorded payments",
      points: [],
      valueFormatter: (value) => formatCurrency(value),
      emptyTitle: "No payment history yet",
      emptyDescription: "Recorded payments will appear here as cash comes in.",
    };
  }

  const reference = new Date();
  const points: MissionControlTrendPoint[] = [];

  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date(reference);
    day.setDate(reference.getDate() - offset);
    day.setHours(0, 0, 0, 0);
    const dayEnd = endOfDay(day);
    const dayTotal =
      offset === 0
        ? money.paymentsTodayTotal
        : money.recentPayments
            .filter((payment) => {
              const paymentDate = new Date(`${payment.paymentDate}T12:00:00.000Z`);
              return paymentDate >= day && paymentDate <= dayEnd;
            })
            .reduce((sum, payment) => sum + payment.amount, 0);

    points.push({
      label: day.toLocaleDateString("en-US", { weekday: "short" }),
      value: dayTotal,
    });
  }

  return {
    id: "revenue-trend",
    title: "Revenue trend",
    subtitle: "Last 7 days of recorded payments",
    points,
    valueFormatter: (value) => formatCurrency(value),
    emptyTitle: "No payment history yet",
    emptyDescription: "Recorded payments will appear here as cash comes in.",
  };
}

function buildJobsTrend(data: DashboardData): MissionControlChartSeries {
  const { operations } = data;

  return {
    id: "jobs-trend",
    title: "Jobs trend",
    subtitle: "Today's field pipeline",
    points: [
      { label: "Sched", value: operations.scheduledToday },
      { label: "Route", value: operations.dispatched },
      { label: "Work", value: operations.inProgress },
      { label: "Done", value: operations.completedToday },
    ],
    valueFormatter: (value) => String(value),
    emptyTitle: "Today's schedule is clear",
    emptyDescription: "Scheduled jobs will show movement through the pipeline here.",
  };
}

export function buildMissionControlContent(
  data: DashboardData,
  userDisplayName: string,
  reference = new Date(),
): MissionControlContent {
  const missionCritical = buildMissionCriticalItems(data);
  const attention = buildAttentionSummary(data);
  const firstName = getFirstName(userDisplayName);

  return {
    greeting: {
      greeting: `${getTimeOfDayGreeting(reference)}, ${firstName}`,
      dateLabel: `Today is ${formatDateLabel(reference)}`,
      attentionSummary: attention.attentionSummary,
      attentionCount: attention.attentionCount,
    },
    missionCritical,
    isMissionClear: missionCritical.every((item) => item.severity === "healthy"),
    todaysOperations: buildTodaysOperationsCards(data),
    cashFlow: buildCashFlowCards(data),
    quickActions: buildQuickActions(data),
    revenueTrend: buildRevenueTrend(data),
    jobsTrend: buildJobsTrend(data),
  };
}

export const MISSION_CRITICAL_ICONS: Record<string, LucideIcon> = {
  "overdue-jobs": AlertCircle,
  "jobs-waiting-customer": Briefcase,
  "estimates-waiting": FileText,
  "invoices-past-due": Receipt,
  "technicians-behind": Users,
};

export const MISSION_CONTROL_SECTION_LABELS = {
  missionCritical: "Mission Critical",
  todaysOperations: "Today's Operations",
  cashFlow: "Cash Flow",
  activityTimeline: "Activity Timeline",
  quickActions: "Quick Actions",
} as const;
