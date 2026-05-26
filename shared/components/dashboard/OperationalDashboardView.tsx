import Link from "next/link";
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
import type { DashboardData } from "@/shared/types/dashboard";
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
  formatNotificationTimestamp,
  getNotificationHref,
} from "@/shared/types/notification";
import {
  formatOperationalActivityDetails,
  formatOperationalActivityLabel,
  formatOperationalActivityTimestamp,
  getOperationalActivityHref,
} from "@/shared/types/operational-activity";
import { formatJobStatus } from "@/shared/types/job";
import {
  formatTechnicianTimeState,
  getTechnicianTimeStateStyles,
} from "@/shared/types/time-entry";

type OperationalDashboardViewProps = {
  data: DashboardData;
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
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-200">
            <Icon className="h-4 w-4 text-slate-500" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">{title}</h2>
            <p className="text-xs text-slate-500">{description}</p>
          </div>
        </div>
        {href && linkLabel ? (
          <Link
            href={href}
            className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-cyan-600 hover:text-cyan-700"
          >
            {linkLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </div>
      <div className="p-5">{children}</div>
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
}: {
  label: string;
  value: string | number;
  description: string;
  icon: typeof CalendarCheck;
  iconClass: string;
  accent: string;
}) {
  return (
    <div className={`rounded-xl border bg-white p-4 ${accent}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-black tabular-nums text-slate-900">
            {value}
          </p>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconClass}`}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center">
      <p className="text-sm font-medium text-slate-700">{title}</p>
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
                className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${styles.rowClass}`}
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

      <p className="mt-4 text-xs text-slate-500">
        Deterministic counts only — no AI narrative or recommendations yet.
      </p>
    </DashboardSection>
  );
}

function AnalyticsSnapshotSection({
  analytics,
}: {
  analytics: DashboardData["analytics"];
}) {
  const metrics = [
    {
      label: "Collected today",
      value: formatCurrency(analytics.todayCollectedRevenue),
      description: `${analytics.todayPaymentCount} payment${analytics.todayPaymentCount === 1 ? "" : "s"}`,
      icon: DollarSign,
      iconClass: "text-emerald-600 bg-emerald-50",
      accent: "border-emerald-100",
      href: "/reports",
    },
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
    <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-5 text-white shadow-sm">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-300/90">
            Command center
          </p>
          <h2 className="text-lg font-black tracking-tight">Live operations</h2>
          <p className="text-sm text-slate-300">
            Today&apos;s collections and current workload
          </p>
        </div>
        <Link
          href="/reports"
          className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-300 hover:text-cyan-200"
        >
          Full analytics
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Link
            key={metric.label}
            href={metric.href}
            className={`rounded-xl border bg-white/95 p-4 transition-colors hover:bg-white ${metric.accent}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  {metric.label}
                </p>
                <p className="mt-2 text-2xl font-black tabular-nums text-slate-900">
                  {metric.value}
                </p>
                <p className="mt-1 text-xs text-slate-500">{metric.description}</p>
              </div>
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${metric.iconClass}`}
              >
                <metric.icon className="h-4 w-4" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function StalledJobsSection({
  stalledJobs,
}: {
  stalledJobs: DashboardData["stalledJobs"];
}) {
  return (
    <DashboardSection
      title="Potentially stalled jobs"
      description={`${stalledJobs.inactivityThresholdDays}+ days without job activity`}
      icon={AlertCircle}
      href="/reports"
      linkLabel="View report"
    >
      <div className="mb-4">
        <MetricCard
          label="Stalled jobs"
          value={stalledJobs.stalledCount}
          description="Heuristic inactivity flag only"
          icon={AlertCircle}
          iconClass="text-amber-600 bg-amber-50"
          accent="border-amber-100"
        />
      </div>

      {stalledJobs.stalledJobs.length === 0 ? (
        <EmptyState
          title="No stalled jobs detected"
          description="Active pipeline jobs with recent activity look healthy."
        />
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
          {stalledJobs.stalledJobs.map((job) => (
            <li key={job.jobId}>
              <Link
                href={`/jobs/${job.jobId}`}
                className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-slate-900">
                      {job.jobNumber}
                    </p>
                    <JobStatusBadge status={job.status} />
                  </div>
                  <p className="mt-1 truncate text-sm text-slate-600">
                    {job.customerName}
                    {job.assignedTechnician
                      ? ` · ${job.assignedTechnician}`
                      : " · Unassigned"}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Last activity{" "}
                    {formatOperationalActivityTimestamp(job.lastActivityAt)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-amber-800">
                    {job.daysSinceActivity} day
                    {job.daysSinceActivity === 1 ? "" : "s"} idle
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatJobStatus(job.status)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-xs text-slate-500">
        Heuristic only — no scheduled checks, GPS, or dispatch schedule
        awareness.
      </p>
    </DashboardSection>
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
      href="/dispatch"
      linkLabel="Open dispatch"
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>

      <div className="mt-5">
        <div className="mb-3 flex items-center justify-between gap-2">
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
                  className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
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
              className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
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
      href="/invoices"
      linkLabel="Open invoices"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <MetricCard
          label="Unpaid"
          value={formatCurrency(money.unpaidTotal)}
          description={`${money.unpaidCount} open invoice${money.unpaidCount === 1 ? "" : "s"}`}
          icon={Clock}
          iconClass="text-amber-600 bg-amber-50"
          accent="border-amber-100"
        />
        <MetricCard
          label="Overdue"
          value={formatCurrency(money.overdueTotal)}
          description={`${money.overdueCount} past due`}
          icon={AlertCircle}
          iconClass="text-rose-600 bg-rose-50"
          accent="border-rose-100"
        />
      </div>

      <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/40 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
          Payments today
        </p>
        <p className="mt-1 text-xl font-black text-emerald-900">
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
                  className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-slate-50"
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
                  className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-slate-50"
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
      <div className="grid gap-3 sm:grid-cols-2">
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
                  className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-slate-50"
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
                  className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-slate-50"
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
}: {
  notifications: DashboardData["notifications"];
}) {
  return (
    <DashboardSection
      title="Notifications"
      description={
        notifications.unreadCount > 0
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
            const href = getNotificationHref(notification);

            const content = (
              <>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-slate-900">
                      {notification.title}
                    </p>
                    {!notification.readAt ? (
                      <span className="inline-flex h-2 w-2 rounded-full bg-cyan-500" />
                    ) : null}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-600">
                    {notification.message}
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
                    className="flex items-start justify-between gap-3 px-4 py-3 transition-colors hover:bg-slate-50"
                  >
                    {content}
                  </Link>
                ) : (
                  <div className="flex items-start justify-between gap-3 px-4 py-3">
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
}: {
  activities: DashboardData["recentActivity"];
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
            const href = getOperationalActivityHref(activity);
            const details = formatOperationalActivityDetails(activity);
            const isLast = index === activities.length - 1;

            const body = (
              <>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <p className="text-sm font-semibold text-slate-900">
                      {formatOperationalActivityLabel(activity)}
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
              <li key={activity.id} className="relative flex gap-3 pb-4">
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

export function OperationalDashboardView({ data }: OperationalDashboardViewProps) {
  return (
    <div className="flex flex-col gap-6">
      <AnalyticsSnapshotSection analytics={data.analytics} />
      <OperationalInsightsSection insights={data.operationalInsights} />
      <TodayOperationsSection operations={data.operations} />
      <StalledJobsSection stalledJobs={data.stalledJobs} />

      <div className="grid gap-6 xl:grid-cols-2">
        <TechnicianStatusSection technicians={data.technicians} />
        <MoneySnapshotSection money={data.money} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ExpenseReviewSection expenses={data.expenses} />
        <NotificationsSummarySection notifications={data.notifications} />
      </div>

      <RecentActivitySection activities={data.recentActivity} />
    </div>
  );
}
