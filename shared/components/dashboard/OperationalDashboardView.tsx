import Link from "next/link";
import {
  MobileDashboardShell,
  type MobileDashboardTabId,
} from "@/shared/components/dashboard/MobileDashboardShell";
import { buildMobileDashboardSnapshot } from "@/shared/lib/mobile-dashboard-snapshot";
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
import { DispatchPressureSection } from "@/shared/components/dashboard/DispatchPressureSection";
import { hasCashFlowPressure } from "@/shared/lib/dashboard-cash-flow-command";
import {
  INVOICE_PAGE_CASH_FLOW_HREF,
  INVOICE_PAGE_OVERDUE_HREF,
  INVOICE_PAGE_UNPAID_HREF,
} from "@/shared/lib/invoice-page-focus";
import { hasDispatchPressure } from "@/shared/lib/dashboard-dispatch-pressure";
import { NextBestActionsSection } from "@/shared/components/dashboard/NextBestActionsSection";
import { OnboardingChecklistSection } from "@/shared/components/onboarding/OnboardingChecklistSection";
import { shouldShowOnboardingChecklist } from "@/shared/lib/onboarding-checklist";
import { OperationalMomentumSection } from "@/shared/components/dashboard/OperationalMomentumSection";
import { OperationalRiskDrilldownSection } from "@/shared/components/dashboard/OperationalRiskDrilldownSection";
import { TodayNeedsAttentionSection } from "@/shared/components/dashboard/TodayNeedsAttentionSection";
import { OfficeReviewQueueSection } from "@/shared/components/reports/OfficeReviewQueueSection";
import { OperationalHealthSection } from "@/shared/components/reports/OperationalHealthSection";
import type { DashboardData } from "@/shared/types/dashboard";
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
  formatNotificationMessageForAccess,
  formatNotificationTitleForAccess,
  formatNotificationTimestamp,
  getNotificationHref,
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
      <div className="flex min-w-0 items-start justify-between gap-2 border-b border-slate-100/90 bg-slate-50/40 px-4 py-3 max-lg:gap-2 lg:gap-3 lg:px-5 lg:py-4">
        <div className="flex min-w-0 items-start gap-2.5 lg:gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-slate-200/80 lg:h-10 lg:w-10 lg:rounded-xl">
            <Icon className="h-3.5 w-3.5 text-slate-600 lg:h-4 lg:w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold tracking-tight text-slate-900">
              {title}
            </h2>
            <p className="text-[11px] leading-snug text-slate-500 lg:text-xs">
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
      <div className="p-4 lg:p-5 xl:p-6">{children}</div>
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
          description="Counts and warnings appear when stalled jobs, billing gaps, or expense reviews need attention."
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
                    {highlight.severity} · {highlight.category.replaceAll("_", " ")}
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
      href: "/expenses",
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
            Command center
          </p>
          <h2 className="mt-0.5 text-lg font-black tracking-tight max-lg:text-lg lg:mt-1 lg:text-xl xl:text-2xl">
            Live operations
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
            description="Scheduled jobs will appear here when work is on the board."
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
          description="Active technician members will appear here."
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
            description="Recorded payments will appear here."
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
            description="Approved estimates ready for invoicing will appear here."
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
      href="/expenses"
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
            description="Submitted receipts will appear here for review."
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
            description="Expenses with attached receipts will appear here."
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
  const canViewBilling = notificationAccess.canViewBilling !== false;

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
          description="Operational alerts will appear here as work happens."
        />
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
          {notifications.recent.map((notification) => {
            const href = getNotificationHref(notification, notificationAccess);

            const content = (
              <>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="break-words text-sm font-bold text-slate-900">
                      {formatNotificationTitleForAccess(
                        notification,
                        canViewBilling,
                      )}
                    </p>
                    {!notification.readAt ? (
                      <span className="inline-flex h-2 w-2 rounded-full bg-cyan-500" />
                    ) : null}
                  </div>
                  <p className="mt-1 line-clamp-2 break-words text-xs text-slate-600">
                    {formatNotificationMessageForAccess(
                      notification,
                      canViewBilling,
                    )}
                  </p>
                </div>
                <time className="shrink-0 text-xs text-slate-400">
                  {formatNotificationTimestamp(notification.createdAt)}
                </time>
              </>
            );

            return (
              <li key={notification.id}>
                {href ? (
                  <Link
                    href={href}
                    className="flex items-start justify-between gap-3 px-3 py-2.5 transition-colors hover:bg-slate-50 max-lg:px-3 max-lg:py-2.5 lg:px-4 lg:py-3"
                  >
                    {content}
                  </Link>
                ) : (
                  <div className="flex items-start justify-between gap-3 px-3 py-2.5 max-lg:px-3 max-lg:py-2.5 lg:px-4 lg:py-3">
                    {content}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </DashboardSection>
  );
}

function RecentActivitySection({
  activities,
  canViewBilling,
}: {
  activities: DashboardData["recentActivity"];
  canViewBilling: boolean;
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
          description="Job, billing, and expense events will show up here."
        />
      ) : (
        <ol className="space-y-0">
          {activities.map((activity, index) => {
            const href = getOperationalActivityHref(activity, {
              canViewBilling,
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

function DashboardZone({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-3 max-lg:gap-3 lg:gap-4 ${className}`}>
      {children}
    </div>
  );
}

function DashboardHeader() {
  return (
    <header className="admin-hero max-lg:px-4 max-lg:py-3 lg:px-6 lg:py-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-600 lg:text-xs">
        Operations overview
      </p>
      <h1 className="mt-1 text-xl font-black tracking-tight text-slate-900 max-lg:mt-1 lg:mt-1.5 lg:text-2xl xl:text-3xl">
        Command center
      </h1>
      <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-slate-600 max-lg:line-clamp-2 lg:mt-2 lg:text-sm lg:line-clamp-none">
        Real-time view of field operations, billing pressure, and team status —
        built for fast decisions during the workday.
      </p>
    </header>
  );
}

function buildMobileDashboardTabs(
  data: DashboardData,
  onboardingChecklist?: OnboardingChecklist,
  companyId?: string,
  userId?: string,
): Array<{ id: MobileDashboardTabId; label: string; content: React.ReactNode }> {
  const { access } = data;
  const notificationAccess = buildNotificationAccess({
    canManageCustomers: access.canManageCustomers,
    canViewBilling: access.canViewBilling,
    canViewAllJobs: access.canViewAllJobs,
    canViewCompanyExpenses: access.canViewCompanyExpenses,
  });
  const tabs: Array<{
    id: MobileDashboardTabId;
    label: string;
    content: React.ReactNode;
  }> = [];

  const overviewSections: React.ReactNode[] = [];
  if (
    onboardingChecklist &&
    companyId &&
    shouldShowOnboardingChecklist(onboardingChecklist)
  ) {
    overviewSections.push(
      <OnboardingChecklistSection
        key="onboarding"
        checklist={onboardingChecklist}
        companyId={companyId}
        userId={userId}
        variant="dashboard"
      />,
    );
  }
  if (access.canViewOperationalReports) {
    overviewSections.push(
      <AnalyticsSnapshotSection
        key="analytics"
        analytics={data.analytics}
        canViewBilling={access.canViewBilling}
      />,
      <TodayNeedsAttentionSection key="attention" data={data} />,
      <NextBestActionsSection key="actions" data={data} />,
      <OperationalMomentumSection key="momentum" data={data} />,
      <OperationalHealthSection
        key="health"
        report={data.operationalHealth}
        variant="compact"
      />,
    );
  } else {
    overviewSections.push(
      <TodayOperationsSection key="operations" operations={data.operations} />,
    );
  }

  if (overviewSections.length > 0) {
    tabs.push({
      id: "overview",
      label: "Overview",
      content: <DashboardZone>{overviewSections}</DashboardZone>,
    });
  }

  const dispatchSections: React.ReactNode[] = [];
  if (access.canViewOperationalReports) {
    dispatchSections.push(
      <DispatchPressureSection key="dispatch-pressure" data={data} />,
    );
  }
  dispatchSections.push(
    <TodayOperationsSection key="operations" operations={data.operations} />,
  );
  if (access.canViewTechnicianRoster) {
    dispatchSections.push(
      <TechnicianStatusSection key="technicians" technicians={data.technicians} />,
    );
  }

  tabs.push({
    id: "dispatch",
    label: "Dispatch",
    content: <DashboardZone>{dispatchSections}</DashboardZone>,
  });

  const moneySections: React.ReactNode[] = [];
  if (access.canViewOperationalReports && access.canViewBilling) {
    moneySections.push(
      <CashFlowCommandSection key="cash-flow" data={data} />,
    );
  }
  if (access.canViewBilling) {
    moneySections.push(
      <MoneySnapshotSection key="money" money={data.money} />,
    );
  }
  if (access.canViewCompanyExpenses) {
    moneySections.push(
      <ExpenseReviewSection key="expenses" expenses={data.expenses} />,
    );
  }

  if (moneySections.length > 0) {
    tabs.push({
      id: "money",
      label: "Money",
      content: <DashboardZone>{moneySections}</DashboardZone>,
    });
  }

  const alertSections: React.ReactNode[] = [];
  if (access.canViewOperationalReports) {
    alertSections.push(
      <OperationalRiskDrilldownSection key="risk" data={data} />,
      <OperationalInsightsSection
        key="insights"
        insights={data.operationalInsights}
      />,
      <OfficeReviewQueueSection
        key="review-queue"
        report={data.officeReviewQueue}
        variant="compact"
        itemLimit={5}
      />,
    );
  }
  alertSections.push(
    <NotificationsSummarySection
      key="notifications"
      notifications={data.notifications}
      notificationAccess={notificationAccess}
    />,
  );

  if (alertSections.length > 0) {
    tabs.push({
      id: "alerts",
      label: "Alerts",
      content: <DashboardZone>{alertSections}</DashboardZone>,
    });
  }

  const moreSections: React.ReactNode[] = [];
  if (access.canViewOperationalReports) {
    moreSections.push(
      <RecentActivitySection
        key="activity"
        activities={data.recentActivity}
        canViewBilling={access.canViewBilling}
      />,
    );
  }
  if (!access.canViewOperationalReports && access.canViewBilling) {
    moreSections.push(
      <MoneySnapshotSection key="money" money={data.money} />,
    );
  }
  if (!access.canViewOperationalReports && access.canViewCompanyExpenses) {
    moreSections.push(
      <ExpenseReviewSection key="expenses" expenses={data.expenses} />,
    );
  }

  if (moreSections.length > 0) {
    tabs.push({
      id: "more",
      label: "More",
      content: <DashboardZone>{moreSections}</DashboardZone>,
    });
  }

  return tabs;
}

function DesktopDashboardLayout({
  data,
  onboardingChecklist,
  companyId,
  userId,
}: OperationalDashboardViewProps) {
  const { access } = data;
  const notificationAccess = buildNotificationAccess({
    canManageCustomers: access.canManageCustomers,
    canViewBilling: access.canViewBilling,
    canViewAllJobs: access.canViewAllJobs,
    canViewCompanyExpenses: access.canViewCompanyExpenses,
  });
  const showCommandPairSideBySide =
    !hasCashFlowPressure(data) && !hasDispatchPressure(data);

  return (
    <>
      {onboardingChecklist &&
      companyId &&
      shouldShowOnboardingChecklist(onboardingChecklist) ? (
        <OnboardingChecklistSection
          checklist={onboardingChecklist}
          companyId={companyId}
          userId={userId}
          variant="dashboard"
        />
      ) : null}

      {access.canViewOperationalReports ? (
        <AnalyticsSnapshotSection
          analytics={data.analytics}
          canViewBilling={access.canViewBilling}
        />
      ) : null}

      <DashboardZone>
        {access.canViewOperationalReports ? (
          <>
            <div
              className={
                showCommandPairSideBySide
                  ? "grid gap-4 xl:grid-cols-2 xl:items-stretch"
                  : "flex flex-col gap-4"
              }
            >
              {access.canViewBilling ? (
                <CashFlowCommandSection data={data} />
              ) : null}
              <DispatchPressureSection data={data} />
            </div>

            <div className="grid gap-4 xl:grid-cols-2 xl:items-start">
              <TodayNeedsAttentionSection data={data} />
              <NextBestActionsSection data={data} />
            </div>

            <OperationalRiskDrilldownSection data={data} />

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] xl:items-start">
              <OperationalMomentumSection data={data} />
              <OperationalHealthSection
                report={data.operationalHealth}
                variant="compact"
              />
            </div>
          </>
        ) : null}
      </DashboardZone>

      {access.canViewOperationalReports ? (
        <DashboardZone>
          <OperationalInsightsSection insights={data.operationalInsights} />
          <OfficeReviewQueueSection
            report={data.officeReviewQueue}
            variant="compact"
            itemLimit={5}
          />
        </DashboardZone>
      ) : null}

      <DashboardZone>
        <TodayOperationsSection operations={data.operations} />

        <div className="grid gap-4 xl:grid-cols-2 xl:items-start">
          {access.canViewTechnicianRoster ? (
            <TechnicianStatusSection technicians={data.technicians} />
          ) : null}
          {access.canViewBilling ? (
            <MoneySnapshotSection money={data.money} />
          ) : null}
        </div>

        <div className="grid gap-4 xl:grid-cols-2 xl:items-start">
          {access.canViewCompanyExpenses ? (
            <ExpenseReviewSection expenses={data.expenses} />
          ) : null}
          <NotificationsSummarySection
            notifications={data.notifications}
            notificationAccess={notificationAccess}
          />
        </div>

        {access.canViewOperationalReports ? (
          <RecentActivitySection
            activities={data.recentActivity}
            canViewBilling={access.canViewBilling}
          />
        ) : null}
      </DashboardZone>
    </>
  );
}

export function OperationalDashboardView({
  data,
  onboardingChecklist,
  companyId,
  userId,
}: OperationalDashboardViewProps) {
  const mobileSnapshot = buildMobileDashboardSnapshot(data);
  const mobileTabs = buildMobileDashboardTabs(
    data,
    onboardingChecklist,
    companyId,
    userId,
  );

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-full flex-col gap-4 pb-2 max-lg:gap-4 lg:gap-6 xl:max-w-[1440px] xl:gap-8">
      <div className="lg:hidden">
        <MobileDashboardShell snapshot={mobileSnapshot} tabs={mobileTabs} />
      </div>

      <div className="hidden lg:flex lg:flex-col lg:gap-8">
        <DashboardHeader />
        <DesktopDashboardLayout
          data={data}
          onboardingChecklist={onboardingChecklist}
          companyId={companyId}
          userId={userId}
        />
      </div>
    </div>
  );
}
