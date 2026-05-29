import Link from "next/link";
import { DashboardCommandStrip } from "@/shared/components/dashboard/DashboardCommandStrip";
import { MobileOperationsHub } from "@/shared/components/dashboard/MobileOperationsHub";
import {
  DashboardCompactAttentionSummary,
  DashboardCompactBillingSection,
  DashboardCompactExpenseSection,
  DashboardCompactHealthCard,
  DashboardCompactNextStepsSection,
  DashboardCompactTechnicianSummary,
  DashboardCompactTodaySection,
} from "@/shared/components/dashboard/DashboardCompactSummaries";
import { DashboardDrilldownProvider } from "@/shared/components/dashboard/dashboard-drilldown-context";
import type { DashboardData } from "@/shared/types/dashboard";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bell,
  Briefcase,
  CalendarCheck,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  Info,
  Loader2,
  MapPin,
  Navigation,
  Receipt,
  Sparkles,
  Timer,
  Users,
} from "lucide-react";
import type { DailyOperationsSummaryHighlight } from "@/shared/types/daily-operations-summary";
import { JobStatusBadge } from "@/shared/components/jobs/JobStatusBadge";
import { ExpenseStatusBadge } from "@/shared/components/expenses/ExpenseStatusBadge";
import { EstimateStatusBadge } from "@/shared/components/estimates/EstimateStatusBadge";
import { CashFlowCommandSection } from "@/shared/components/dashboard/CashFlowCommandSection";
import { DashboardNotificationsList } from "@/shared/components/dashboard/DashboardNotificationsList";
import { DispatchPressureSection } from "@/shared/components/dashboard/DispatchPressureSection";
import { NextBestActionsSection } from "@/shared/components/dashboard/NextBestActionsSection";
import type { CommandStripPanelId } from "@/shared/lib/dashboard-command-strip";
import {
  INVOICE_PAGE_CASH_FLOW_HREF,
  INVOICE_PAGE_OVERDUE_HREF,
  INVOICE_PAGE_UNPAID_HREF,
} from "@/shared/lib/invoice-page-focus";
import { OnboardingChecklistSection } from "@/shared/components/onboarding/OnboardingChecklistSection";
import { shouldShowOnboardingChecklist } from "@/shared/lib/onboarding-checklist";
import { OperationalMomentumSection } from "@/shared/components/dashboard/OperationalMomentumSection";
import { OperationalRiskDrilldownSection } from "@/shared/components/dashboard/OperationalRiskDrilldownSection";
import { TodayNeedsAttentionSection } from "@/shared/components/dashboard/TodayNeedsAttentionSection";
import { OfficeReviewQueueSection } from "@/shared/components/reports/OfficeReviewQueueSection";
import { OperationalHealthSection } from "@/shared/components/reports/OperationalHealthSection";
import type { OnboardingChecklist } from "@/shared/types/onboarding";
import { formatCurrency } from "@/shared/types/customer";
import {
  formatDispatchStatus,
  formatDispatchTime,
} from "@/shared/types/dispatch";
import {
  formatExpenseAmount,
  formatExpenseDate,
} from "@/shared/types/expense";
import {
  buildNotificationAccess,
  type NotificationAccess,
} from "@/shared/types/notification";
import {
  formatOperationalActivityDetailsForAccess,
  formatOperationalActivityLabelForAccess,
  formatOperationalActivityTimestamp,
  getOperationalActivityHref,
} from "@/shared/types/operational-activity";
import {
  formatTechnicianTimeState,
  getTechnicianTimeStateStyles,
} from "@/shared/types/time-entry";

type OperationalDashboardViewProps = {
  data: DashboardData;
  onboardingChecklist?: OnboardingChecklist;
  companyId?: string;
  userId?: string;
};

type DashboardRoleFocus = "command" | "dispatch" | "office";

type DashboardPrioritySectionId =
  | "needs-attention"
  | "todays-work"
  | "revenue-billing"
  | "operational-health"
  | "next-steps";

const DASHBOARD_SECTION_LABELS: Record<
  DashboardPrioritySectionId,
  { title: string; description: string }
> = {
  "needs-attention": {
    title: "Needs attention",
    description: "Blockers, review queues, and alerts that need action now",
  },
  "todays-work": {
    title: "Today's work",
    description: "Live field activity, dispatch board, and technician status",
  },
  "revenue-billing": {
    title: "Revenue and billing",
    description: "Receivables, collections, and expense approvals",
  },
  "operational-health": {
    title: "Operational health",
    description: "Momentum, trends, and overall workload balance",
  },
  "next-steps": {
    title: "Next steps",
    description: "Recommended actions and recent company activity",
  },
};

function getDashboardRoleFocus(access: DashboardData["access"]): DashboardRoleFocus {
  if (access.canViewBilling && access.canViewTechnicianRoster) {
    return "command";
  }
  if (access.canViewTechnicianRoster && !access.canViewBilling) {
    return "dispatch";
  }
  if (access.canViewBilling && !access.canViewTechnicianRoster) {
    return "office";
  }
  return "command";
}

function getDashboardSectionOrder(
  access: DashboardData["access"],
  roleFocus: DashboardRoleFocus,
): DashboardPrioritySectionId[] {
  if (!access.canViewOperationalReports) {
    const sections: DashboardPrioritySectionId[] = ["todays-work"];
    if (access.canViewBilling || access.canViewCompanyExpenses) {
      sections.push("revenue-billing");
    }
    sections.push("next-steps");
    return sections;
  }

  switch (roleFocus) {
    case "dispatch": {
      const sections: DashboardPrioritySectionId[] = [
        "needs-attention",
        "todays-work",
        "operational-health",
        "next-steps",
      ];
      if (access.canViewCompanyExpenses) {
        sections.splice(3, 0, "revenue-billing");
      }
      return sections;
    }
    case "office":
      return [
        "needs-attention",
        "revenue-billing",
        "todays-work",
        "operational-health",
        "next-steps",
      ];
    default:
      return [
        "needs-attention",
        "todays-work",
        "revenue-billing",
        "operational-health",
        "next-steps",
      ];
  }
}

function DashboardPriorityGroup({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const visibleChildren = Array.isArray(children)
    ? children.filter(Boolean)
    : children
      ? [children]
      : [];

  if (visibleChildren.length === 0) {
    return null;
  }

  return (
    <section className="flex min-w-0 flex-col gap-2 lg:gap-3">
      <header className="border-b border-slate-200/80 pb-1.5">
        <h2 className="text-xs font-black uppercase tracking-wide text-slate-900 sm:text-sm">
          {title}
        </h2>
        <p className="mt-0.5 text-[11px] leading-snug text-slate-500 sm:text-xs">
          {description}
        </p>
      </header>
      <div className="flex min-w-0 flex-col gap-2 lg:gap-3">{visibleChildren}</div>
    </section>
  );
}

function formatJobLocation(city?: string, state?: string): string {
  const parts = [city?.trim(), state?.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "—";
}

function DashboardSection({
  title,
  description,
  icon: Icon,
  href,
  linkLabel,
  children,
}: {
  title: string;
  description: string;
  icon: typeof CalendarCheck;
  href?: string;
  linkLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="admin-card overflow-hidden">
      <div className="flex min-w-0 items-start justify-between gap-2 border-b border-slate-100/90 bg-slate-50/40 px-4 py-3 max-lg:gap-2 lg:gap-3 lg:px-5 lg:py-3.5">
        <div className="flex min-w-0 items-start gap-2.5 lg:gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-slate-200/80 lg:h-9 lg:w-9 lg:rounded-xl">
            <Icon className="h-3.5 w-3.5 text-slate-600 lg:h-4 lg:w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="admin-heading-section">
              {title}
            </h2>
            <p className="admin-text-helper">
              {description}
            </p>
          </div>
        </div>
        {href && linkLabel ? (
          <Link href={href} className="admin-section-link shrink-0">
            {linkLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </div>
      <div className="p-4 lg:p-5">{children}</div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  description,
  icon: Icon,
  iconClass,
  accent,
  href,
}: {
  label: string;
  value: string | number;
  description: string;
  icon: typeof CalendarCheck;
  iconClass: string;
  accent: string;
  href?: string;
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 lg:text-xs">
            {label}
          </p>
          <p className="mt-1 text-xl font-black tabular-nums text-slate-900 lg:mt-2 lg:text-2xl">
            {value}
          </p>
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-500 lg:mt-1 lg:text-xs">
            {description}
          </p>
        </div>
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg lg:h-9 lg:w-9 ${iconClass}`}
        >
          <Icon className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
        </div>
      </div>
      {href ? (
        <p className="mt-2 text-xs font-semibold text-cyan-600 lg:mt-3">
          View invoices
        </p>
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={`admin-card-interactive block rounded-xl border bg-white p-3 shadow-sm max-lg:p-3 lg:p-4 ${accent}`}
      >
        {content}
      </Link>
    );
  }

  return (
    <div className={`rounded-xl border bg-white p-3 shadow-sm max-lg:p-3 lg:p-4 ${accent}`}>
      {content}
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="admin-empty-state max-lg:px-3 max-lg:py-3">
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </div>
  );
}

function getHighlightSeverityStyles(
  severity: DailyOperationsSummaryHighlight["severity"],
): { icon: typeof Info; iconClass: string; rowClass: string } {
  switch (severity) {
    case "critical":
      return {
        icon: AlertCircle,
        iconClass: "text-rose-700 bg-rose-50",
        rowClass: "border-rose-100 bg-rose-50/40",
      };
    case "warning":
      return {
        icon: AlertTriangle,
        iconClass: "text-amber-700 bg-amber-50",
        rowClass: "border-amber-100 bg-amber-50/40",
      };
    default:
      return {
        icon: Info,
        iconClass: "text-cyan-700 bg-cyan-50",
        rowClass: "border-slate-100 bg-slate-50/60",
      };
  }
}

function OperationalInsightsSection({
  insights,
}: {
  insights: DashboardData["operationalInsights"];
}) {
  const { highlights } = insights;

  return (
    <DashboardSection
      title="Operational insights"
      description="Rules-based summary from live operational data"
      icon={Sparkles}
      href="/reports"
      linkLabel="View reports"
    >
      {highlights.length === 0 ? (
        <EmptyState
          title="No actionable insights right now"
          description="Insights appear when stalled jobs, office review gaps, or expense reviews need attention."
        />
      ) : (
        <ul className="space-y-2">
          {highlights.map((highlight) => {
            const styles = getHighlightSeverityStyles(highlight.severity);
            const Icon = styles.icon;

            const content = (
              <div
                className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 max-lg:gap-2.5 max-lg:px-3 max-lg:py-2.5 lg:gap-3 lg:px-4 lg:py-3 ${styles.rowClass}`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${styles.iconClass}`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">
                    {highlight.message}
                  </p>
                  <p className="mt-0.5 text-xs capitalize text-slate-500">
                    {highlight.severity === "critical"
                      ? "Priority"
                      : highlight.severity === "warning"
                        ? "Follow up"
                        : "Info"}{" "}
                    · {highlight.category.replaceAll("_", " ")}
                  </p>
                </div>
                {highlight.href ? (
                  <ArrowRight
                    className="mt-1 h-4 w-4 shrink-0 text-slate-400"
                    aria-hidden="true"
                  />
                ) : null}
              </div>
            );

            return (
              <li key={highlight.id}>
                {highlight.href ? (
                  <Link href={highlight.href} className="block transition-opacity hover:opacity-90">
                    {content}
                  </Link>
                ) : (
                  content
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-3 text-[11px] text-slate-500 lg:mt-4 lg:text-xs">
        Deterministic counts only — no AI narrative or recommendations yet.
      </p>
    </DashboardSection>
  );
}

function AnalyticsSnapshotSection({
  analytics,
  canViewBilling,
}: {
  analytics: DashboardData["analytics"];
  canViewBilling: boolean;
}) {
  const metrics = [
    ...(canViewBilling
      ? [
          {
            label: "Collected today",
            value: formatCurrency(analytics.todayCollectedRevenue),
            description: `${analytics.todayPaymentCount} payment${analytics.todayPaymentCount === 1 ? "" : "s"}`,
            icon: DollarSign,
            iconClass: "text-emerald-600 bg-emerald-50",
            accent: "border-emerald-100",
            href: "/reports",
          },
        ]
      : []),
    {
      label: "Open jobs",
      value: analytics.openJobs,
      description: "Active backlog",
      icon: Briefcase,
      iconClass: "text-blue-600 bg-blue-50",
      accent: "border-blue-100",
      href: "/jobs",
    },
    {
      label: "Pending expenses",
      value: analytics.pendingExpenseCount,
      description: "Awaiting approval",
      icon: Receipt,
      iconClass: "text-amber-600 bg-amber-50",
      accent: "border-amber-100",
      href: "/expenses?status=submitted",
    },
    {
      label: "Active labor",
      value: analytics.activeLaborEntries,
      description: "Open job-labor clocks",
      icon: Timer,
      iconClass: "text-violet-600 bg-violet-50",
      accent: "border-violet-100",
      href: "/time",
    },
  ];

  return (
    <section className="admin-command-surface p-4 max-lg:p-4 lg:p-5 xl:p-6">
      <div className="mb-3 flex flex-col gap-2 max-lg:mb-3 sm:flex-row sm:items-end sm:justify-between lg:mb-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300/90">
            Live snapshot
          </p>
          <h2 className="mt-0.5 text-lg font-black tracking-tight max-lg:text-lg lg:mt-1 lg:text-xl xl:text-2xl">
            Today at a glance
          </h2>
          <p className="mt-0.5 hidden text-xs text-slate-300 lg:block lg:text-sm">
            {canViewBilling
              ? "Today's collections and current workload"
              : "Current workload and team activity"}
          </p>
        </div>
        <Link
          href="/reports"
          className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-cyan-200 ring-1 ring-white/10 transition-colors hover:bg-white/15 hover:text-white"
        >
          Full analytics
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2 max-lg:gap-2 sm:grid-cols-2 sm:gap-3 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Link
            key={metric.label}
            href={metric.href}
            className={`admin-card-interactive rounded-xl border bg-white/95 p-3 shadow-sm transition-colors hover:bg-white max-lg:p-3 lg:p-4 ${metric.accent}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 lg:text-xs">
                  {metric.label}
                </p>
                <p className="mt-1 text-xl font-black tabular-nums text-slate-900 lg:mt-2 lg:text-2xl">
                  {metric.value}
                </p>
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-500 lg:mt-1 lg:text-xs">
                  {metric.description}
                </p>
              </div>
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg lg:h-9 lg:w-9 ${metric.iconClass}`}
              >
                <metric.icon className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function TodayOperationsSection({
  operations,
}: {
  operations: DashboardData["operations"];
}) {
  const metrics = [
    {
      label: "Scheduled",
      value: operations.scheduledToday,
      description: "Awaiting dispatch",
      icon: CalendarCheck,
      iconClass: "text-blue-600 bg-blue-50",
      accent: "border-blue-100",
    },
    {
      label: "En Route",
      value: operations.dispatched,
      description: "Dispatched today",
      icon: Navigation,
      iconClass: "text-violet-600 bg-violet-50",
      accent: "border-violet-100",
    },
    {
      label: "In Progress",
      value: operations.inProgress,
      description: "On site or working",
      icon: Loader2,
      iconClass: "text-amber-600 bg-amber-50",
      accent: "border-amber-100",
    },
    {
      label: "Completed",
      value: operations.completedToday,
      description: "Finished today",
      icon: CheckCircle2,
      iconClass: "text-emerald-600 bg-emerald-50",
      accent: "border-emerald-100",
    },
  ];

  return (
    <DashboardSection
      title="Today's Operations"
      description="Live job board snapshot for today"
      icon={CalendarCheck}
      href="/dispatch?focus=today"
      linkLabel="Open dispatch"
    >
      <div className="grid grid-cols-2 gap-2 max-lg:gap-2 sm:grid-cols-2 sm:gap-3 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>

      <div className="mt-4 max-lg:mt-4 lg:mt-5">
        <div className="mb-2 flex items-center justify-between gap-2 lg:mb-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Today&apos;s jobs
          </p>
          <Link
            href="/jobs"
            className="text-xs font-semibold text-cyan-600 hover:text-cyan-700"
          >
            View all jobs
          </Link>
        </div>

        {operations.todayJobs.length === 0 ? (
          <EmptyState
            title="No jobs scheduled today"
            description="Scheduled jobs show here. Add a customer and create a job to get work on the board."
          />
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
            {operations.todayJobs.map((job) => (
              <li key={job.id}>
                <Link
                  href={`/jobs/${job.id}`}
                  className="flex flex-col gap-1.5 px-3 py-2.5 transition-colors hover:bg-slate-50 max-lg:px-3 max-lg:py-2.5 sm:flex-row sm:items-center sm:justify-between lg:gap-2 lg:px-4 lg:py-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-slate-900">
                        {job.jobNumber}
                      </p>
                      <JobStatusBadge status={job.status} />
                    </div>
                    <p className="mt-1 truncate text-sm text-slate-600">
                      {job.customerName} · {job.jobType}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">
                        {formatJobLocation(job.city, job.state)}
                      </span>
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-slate-700">
                      {formatDispatchTime(job.scheduledDate)}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatDispatchStatus(job.status)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardSection>
  );
}

function TechnicianStatusSection({
  technicians,
}: {
  technicians: DashboardData["technicians"];
}) {
  const clockedIn = technicians.filter((t) => t.timeState !== "off_clock").length;
  const onBreak = technicians.filter((t) => t.timeState === "on_break").length;
  const working = technicians.filter((t) => t.timeState === "working_job").length;

  return (
    <DashboardSection
      title="Technician Status"
      description={`${clockedIn} clocked in · ${working} on job · ${onBreak} on break`}
      icon={Users}
      href="/time"
      linkLabel="Time tracking"
    >
      {technicians.length === 0 ? (
        <EmptyState
          title="No technicians on roster"
          description="Technician members appear here after you invite them in Settings."
        />
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
          {technicians.map((technician) => (
            <li
              key={technician.id}
              className="flex flex-col gap-1.5 px-3 py-2.5 max-lg:px-3 max-lg:py-2.5 sm:flex-row sm:items-center sm:justify-between lg:gap-2 lg:px-4 lg:py-3"
            >
              <div className="flex min-w-0 items-center gap-2.5 lg:gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white lg:h-9 lg:w-9 lg:text-xs">
                  {technician.initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">
                    {technician.name}
                  </p>
                  {technician.currentJobId && technician.currentJobNumber ? (
                    <Link
                      href={`/jobs/${technician.currentJobId}`}
                      className="text-xs font-semibold text-cyan-700 hover:text-cyan-800"
                    >
                      Job {technician.currentJobNumber}
                    </Link>
                  ) : technician.currentJobNumber ? (
                    <p className="text-xs text-slate-400">
                      Job {technician.currentJobNumber}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400">No active job</p>
                  )}
                </div>
              </div>
              <span
                className={`inline-flex w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${getTechnicianTimeStateStyles(technician.timeState)}`}
              >
                {formatTechnicianTimeState(technician.timeState)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </DashboardSection>
  );
}

function MoneySnapshotSection({ money }: { money: DashboardData["money"] }) {
  return (
    <DashboardSection
      title="Money Snapshot"
      description="Receivables and recent collections"
      icon={DollarSign}
      href={INVOICE_PAGE_CASH_FLOW_HREF}
      linkLabel="Open invoices"
    >
      <div className="grid grid-cols-2 gap-2 max-lg:gap-2 lg:gap-3">
        <MetricCard
          label="Unpaid"
          value={formatCurrency(money.unpaidTotal)}
          description={`${money.unpaidCount} open invoice${money.unpaidCount === 1 ? "" : "s"}`}
          icon={Clock}
          iconClass="text-amber-600 bg-amber-50"
          accent="border-amber-100"
          href={money.unpaidCount > 0 ? INVOICE_PAGE_UNPAID_HREF : undefined}
        />
        <MetricCard
          label="Overdue"
          value={formatCurrency(money.overdueTotal)}
          description={`${money.overdueCount} past due`}
          icon={AlertCircle}
          iconClass="text-rose-600 bg-rose-50"
          accent="border-rose-100"
          href={money.overdueCount > 0 ? INVOICE_PAGE_OVERDUE_HREF : undefined}
        />
      </div>

      <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/40 px-3 py-2.5 max-lg:mt-3 lg:mt-4 lg:px-4 lg:py-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 lg:text-xs">
          Payments today
        </p>
        <p className="mt-0.5 text-lg font-black text-emerald-900 lg:mt-1 lg:text-xl">
          {formatCurrency(money.paymentsTodayTotal)}
        </p>
        <p className="text-xs text-emerald-700/80">
          {money.paymentsTodayCount} payment
          {money.paymentsTodayCount === 1 ? "" : "s"} recorded
        </p>
      </div>

      {money.recentPayments.length === 0 ? (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Recent payments
          </p>
          <EmptyState
            title="No recent payments"
            description="Payments recorded against invoices will show up here."
          />
        </div>
      ) : (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Recent payments
          </p>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
            {money.recentPayments.map((payment) => (
              <li key={payment.id}>
                <Link
                  href={`/invoices/${payment.invoiceId}`}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 transition-colors hover:bg-slate-50 max-lg:px-3 max-lg:py-2.5 lg:px-4 lg:py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900">
                      {payment.invoiceNumber}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {payment.customerName}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-black text-emerald-700">
                      {formatCurrency(payment.amount)}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatExpenseDate(payment.paymentDate)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {money.approvedEstimates.length === 0 ? (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Approved estimates
            </p>
            <Link
              href="/estimates"
              className="text-xs font-semibold text-cyan-600 hover:text-cyan-700"
            >
              View estimates
            </Link>
          </div>
          <EmptyState
            title="No approved estimates"
            description="Approved estimates ready for invoicing will show up here."
          />
        </div>
      ) : (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Approved estimates
            </p>
            <Link
              href="/estimates"
              className="text-xs font-semibold text-cyan-600 hover:text-cyan-700"
            >
              View estimates
            </Link>
          </div>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
            {money.approvedEstimates.map((estimate) => (
              <li key={estimate.id}>
                <Link
                  href={`/estimates/${estimate.id}`}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 transition-colors hover:bg-slate-50 max-lg:px-3 max-lg:py-2.5 lg:px-4 lg:py-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-slate-900">
                        {estimate.estimateNumber}
                      </p>
                      <EstimateStatusBadge status={estimate.status} />
                    </div>
                    <p className="truncate text-xs text-slate-500">
                      {estimate.customerName}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-black text-slate-900">
                    {formatCurrency(estimate.total)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </DashboardSection>
  );
}

function ExpenseReviewSection({
  expenses,
}: {
  expenses: DashboardData["expenses"];
}) {
  return (
    <DashboardSection
      title="Expense Review"
      description="Receipts and approvals needing attention"
      icon={Receipt}
      href="/expenses?status=submitted"
      linkLabel="Open expenses"
    >
      <div className="grid grid-cols-2 gap-2 max-lg:gap-2 lg:gap-3">
        <MetricCard
          label="Needs Approval"
          value={expenses.submittedCount}
          description={formatCurrency(expenses.submittedTotal)}
          icon={Clock}
          iconClass="text-blue-600 bg-blue-50"
          accent="border-blue-100"
        />
        <MetricCard
          label="Rejected"
          value={expenses.rejectedCount}
          description="Returned to technician"
          icon={AlertCircle}
          iconClass="text-rose-600 bg-rose-50"
          accent="border-rose-100"
        />
      </div>

      {expenses.pendingExpenses.length > 0 ? (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Pending approval
          </p>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
            {expenses.pendingExpenses.map((expense) => (
              <li key={expense.id}>
                <Link
                  href={`/expenses?selected=${expense.id}`}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 transition-colors hover:bg-slate-50 max-lg:px-3 max-lg:py-2.5 lg:px-4 lg:py-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-slate-900">
                        {expense.merchant}
                      </p>
                      <ExpenseStatusBadge status={expense.status} />
                    </div>
                    <p className="truncate text-xs text-slate-500">
                      {expense.technician} · {expense.expenseNumber}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-black text-slate-900">
                    {formatExpenseAmount(expense.amount)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="mt-4">
          <EmptyState
            title="No expenses awaiting approval"
            description="Submitted receipts waiting for review will show up here."
          />
        </div>
      )}

      {expenses.recentReceipts.length === 0 ? (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Recent receipt uploads
          </p>
          <EmptyState
            title="No recent receipt uploads"
            description="Expenses with attached receipts will show up here."
          />
        </div>
      ) : (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Recent receipt uploads
          </p>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
            {expenses.recentReceipts.map((expense) => (
              <li key={expense.id}>
                <Link
                  href={`/expenses?selected=${expense.id}`}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 transition-colors hover:bg-slate-50 max-lg:px-3 max-lg:py-2.5 lg:px-4 lg:py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900">
                      {expense.merchant}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {expense.technician}
                      {expense.receiptFileName
                        ? ` · ${expense.receiptFileName}`
                        : ""}
                    </p>
                  </div>
                  <ExpenseStatusBadge status={expense.status} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </DashboardSection>
  );
}

function NotificationsSummarySection({
  notifications,
  notificationAccess,
}: {
  notifications: DashboardData["notifications"];
  notificationAccess: NotificationAccess;
}) {
  return (
    <DashboardSection
      title="Notifications"
      description={
        notifications.recent.length === 0
          ? "All caught up"
          : notifications.unreadCount > 0
            ? `${notifications.unreadCount} unread`
            : "All caught up"
      }
      icon={Bell}
    >
      {notifications.recent.length === 0 ? (
        <EmptyState
          title="No notifications yet"
          description="Job, dispatch, and billing alerts will show up here as work happens."
        />
      ) : (
        <DashboardNotificationsList
          notifications={notifications.recent}
          notificationAccess={notificationAccess}
        />
      )}
    </DashboardSection>
  );
}

function RecentActivitySection({
  activities,
  canViewBilling,
  canManageCustomers,
}: {
  activities: DashboardData["recentActivity"];
  canViewBilling: boolean;
  canManageCustomers: boolean;
}) {
  return (
    <DashboardSection
      title="Recent Activity"
      description="Latest operational events across the company"
      icon={FileText}
    >
      {activities.length === 0 ? (
        <EmptyState
          title="No recent activity"
          description={
            canViewBilling
              ? "Job, billing, and expense events will show up here once your team starts working."
              : "Job and expense events will show up here once your team starts working."
          }
        />
      ) : (
        <ol className="space-y-0">
          {activities.map((activity, index) => {
            const href = getOperationalActivityHref(activity, {
              canViewBilling,
              canManageCustomers,
            });
            const details = formatOperationalActivityDetailsForAccess(
              activity,
              canViewBilling,
            );
            const isLast = index === activities.length - 1;

            const body = (
              <>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <p className="text-sm font-semibold text-slate-900">
                      {formatOperationalActivityLabelForAccess(
                        activity,
                        canViewBilling,
                      )}
                    </p>
                    <time className="shrink-0 text-xs text-slate-400">
                      {formatOperationalActivityTimestamp(activity.createdAt)}
                    </time>
                  </div>
                  {details ? (
                    <p className="mt-1 text-sm text-slate-600">{details}</p>
                  ) : null}
                  {activity.actorName ? (
                    <p className="mt-1 text-xs text-slate-500">
                      by {activity.actorName}
                    </p>
                  ) : null}
                </div>
              </>
            );

            return (
              <li key={activity.id} className="relative flex gap-2.5 pb-3 max-lg:pb-3 lg:gap-3 lg:pb-4">
                {!isLast ? (
                  <span
                    aria-hidden="true"
                    className="absolute left-[5px] top-3 h-[calc(100%-4px)] w-px bg-slate-200"
                  />
                ) : null}
                <span className="relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-cyan-500 ring-4 ring-cyan-50" />
                {href ? (
                  <Link
                    href={href}
                    className="-mx-2 flex min-w-0 flex-1 rounded-lg px-2 py-1 transition-colors hover:bg-slate-50"
                  >
                    {body}
                  </Link>
                ) : (
                  <div className="min-w-0 flex-1">{body}</div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </DashboardSection>
  );
}

function DashboardContentLayout({
  data,
  onboardingChecklist,
  companyId,
  userId,
}: OperationalDashboardViewProps) {
  const { access } = data;
  const roleFocus = getDashboardRoleFocus(access);
  const sectionOrder = getDashboardSectionOrder(access, roleFocus);
  const notificationAccess = buildNotificationAccess({
    canManageCustomers: access.canManageCustomers,
    canViewBilling: access.canViewBilling,
    canViewAllJobs: access.canViewAllJobs,
    canViewCompanyExpenses: access.canViewCompanyExpenses,
    canViewAssignedJobs: access.canViewAssignedJobs,
  });
  const showOnboarding =
    onboardingChecklist &&
    companyId &&
    shouldShowOnboardingChecklist(onboardingChecklist);
  const showLiveMetrics =
    access.canViewOperationalReports &&
    !(showOnboarding && onboardingChecklist && !onboardingChecklist.isComplete);

  const drilldownPanels: Partial<Record<CommandStripPanelId, React.ReactNode>> = {
    ...(access.canViewOperationalReports
      ? {
          attention: (
            <>
              <TodayNeedsAttentionSection data={data} />
              <OperationalRiskDrilldownSection data={data} />
              <OperationalInsightsSection insights={data.operationalInsights} />
            </>
          ),
          health: (
            <>
              <OperationalMomentumSection data={data} />
              <OperationalHealthSection
                report={data.operationalHealth}
                variant="full"
              />
            </>
          ),
        }
      : {}),
    ...(access.canViewBilling
      ? {
          "cash-flow": <CashFlowCommandSection data={data} />,
          billing: (
            <>
              <MoneySnapshotSection money={data.money} />
              {access.canViewCompanyExpenses ? (
                <ExpenseReviewSection expenses={data.expenses} />
              ) : null}
            </>
          ),
        }
      : access.canViewCompanyExpenses
        ? {
            billing: <ExpenseReviewSection expenses={data.expenses} />,
          }
        : {}),
    ...(access.canViewTechnicianRoster
      ? {
          dispatch: <DispatchPressureSection data={data} />,
        }
      : {}),
    ...(access.canViewOperationalReports
      ? {
          "next-steps": (
            <>
              <NextBestActionsSection data={data} />
              <RecentActivitySection
                activities={data.recentActivity}
                canViewBilling={access.canViewBilling}
                canManageCustomers={access.canManageCustomers}
              />
            </>
          ),
        }
      : {}),
    today: (
      <>
        {showLiveMetrics ? (
          <AnalyticsSnapshotSection
            analytics={data.analytics}
            canViewBilling={access.canViewBilling}
          />
        ) : null}
        <TodayOperationsSection operations={data.operations} />
        {access.canViewTechnicianRoster ? (
          <TechnicianStatusSection technicians={data.technicians} />
        ) : null}
      </>
    ),
  };

  const needsAttentionContent = access.canViewOperationalReports ? (
    <div className="grid min-w-0 gap-2 lg:grid-cols-2 lg:gap-3">
      <DashboardCompactAttentionSummary data={data} />
      <OfficeReviewQueueSection
        report={data.officeReviewQueue}
        variant="compact"
        itemLimit={4}
      />
      <div className="lg:col-span-2">
        <NotificationsSummarySection
          notifications={data.notifications}
          notificationAccess={notificationAccess}
        />
      </div>
    </div>
  ) : (
    <NotificationsSummarySection
      notifications={data.notifications}
      notificationAccess={notificationAccess}
    />
  );

  const todaysWorkContent = (
    <div className="grid min-w-0 gap-2 lg:grid-cols-2 lg:gap-3">
      <DashboardCompactTodaySection operations={data.operations} />
      {access.canViewTechnicianRoster ? (
        <DashboardCompactTechnicianSummary technicians={data.technicians} />
      ) : null}
    </div>
  );

  const revenueBillingContent =
    access.canViewBilling || access.canViewCompanyExpenses ? (
      <div className="grid min-w-0 gap-2 lg:grid-cols-2 lg:gap-3">
        {access.canViewBilling ? (
          <DashboardCompactBillingSection
            money={data.money}
            canViewCompanyExpenses={access.canViewCompanyExpenses}
            expenses={access.canViewCompanyExpenses ? data.expenses : undefined}
          />
        ) : null}
        {access.canViewCompanyExpenses ? (
          <DashboardCompactExpenseSection expenses={data.expenses} />
        ) : null}
      </div>
    ) : null;

  const operationalHealthContent = access.canViewOperationalReports ? (
    <DashboardCompactHealthCard report={data.operationalHealth} />
  ) : null;

  const nextStepsContent = access.canViewOperationalReports ? (
    <DashboardCompactNextStepsSection data={data} />
  ) : (
    <NotificationsSummarySection
      notifications={data.notifications}
      notificationAccess={notificationAccess}
    />
  );

  const sectionContent: Record<DashboardPrioritySectionId, React.ReactNode> = {
    "needs-attention": needsAttentionContent,
    "todays-work": todaysWorkContent,
    "revenue-billing": revenueBillingContent,
    "operational-health": operationalHealthContent,
    "next-steps": nextStepsContent,
  };

  return (
    <DashboardDrilldownProvider panels={drilldownPanels}>
      {showOnboarding ? (
        <OnboardingChecklistSection
          checklist={onboardingChecklist}
          companyId={companyId}
          userId={userId}
          variant="dashboard"
        />
      ) : null}

      <div className="hidden min-w-0 flex-col gap-3 lg:flex">
        <DashboardCommandStrip data={data} />

        {sectionOrder.map((sectionId) => {
          const content = sectionContent[sectionId];
          if (!content) {
            return null;
          }

          const labels = DASHBOARD_SECTION_LABELS[sectionId];

          return (
            <DashboardPriorityGroup
              key={sectionId}
              title={labels.title}
              description={labels.description}
            >
              {content}
            </DashboardPriorityGroup>
          );
        })}
      </div>

      <div className="min-w-0 lg:hidden">
        <MobileOperationsHub
          data={data}
          notificationAccess={notificationAccess}
          showLiveMetrics={showLiveMetrics}
        />
      </div>
    </DashboardDrilldownProvider>
  );
}

export function OperationalDashboardView({
  data,
  onboardingChecklist,
  companyId,
  userId,
}: OperationalDashboardViewProps) {
  return (
    <div className="mx-auto flex w-full min-w-0 max-w-full flex-col gap-3 pb-2 xl:max-w-[1440px]">
      <DashboardContentLayout
        data={data}
        onboardingChecklist={onboardingChecklist}
        companyId={companyId}
        userId={userId}
      />
    </div>
  );
}
