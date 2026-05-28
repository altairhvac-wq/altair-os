"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, MapPin } from "lucide-react";
import { JobStatusBadge } from "@/shared/components/jobs/JobStatusBadge";
import { DashboardOpenPanelButton } from "@/shared/components/dashboard/DashboardOpenPanelButton";
import { useDashboardDrilldown } from "@/shared/components/dashboard/dashboard-drilldown-context";
import {
  buildDashboardAttentionCards,
  countDashboardAttentionIssues,
} from "@/shared/lib/dashboard-attention-cards";
import type { CommandStripPanelId } from "@/shared/lib/dashboard-command-strip";
import {
  buildDashboardNextBestActions,
  hasDashboardNextBestActions,
} from "@/shared/lib/dashboard-next-best-actions";
import type { DashboardData } from "@/shared/types/dashboard";
import { formatCurrency } from "@/shared/types/customer";
import { formatDispatchTime } from "@/shared/types/dispatch";
import { formatExpenseAmount } from "@/shared/types/expense";
import {
  formatOperationalActivityLabelForAccess,
  formatOperationalActivityTimestamp,
  getOperationalActivityHref,
} from "@/shared/types/operational-activity";
import { OperationalHealthSection } from "@/shared/components/reports/OperationalHealthSection";
import {
  INVOICE_PAGE_CASH_FLOW_HREF,
  INVOICE_PAGE_OVERDUE_HREF,
  INVOICE_PAGE_UNPAID_HREF,
} from "@/shared/lib/invoice-page-focus";

const TODAY_JOB_PREVIEW_LIMIT = 3;
const RECENT_PAYMENT_PREVIEW_LIMIT = 3;
const RECENT_ACTIVITY_PREVIEW_LIMIT = 5;
const NEXT_ACTION_PREVIEW_LIMIT = 3;

function formatJobLocation(city?: string, state?: string): string {
  const parts = [city?.trim(), state?.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "—";
}

function CompactSectionShell({
  eyebrow,
  title,
  description,
  href,
  linkLabel,
  panelId,
  panelButtonLabel,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  href?: string;
  linkLabel?: string;
  panelId?: CommandStripPanelId;
  panelButtonLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="admin-card overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-slate-100/90 bg-slate-50/40 px-3 py-2.5 max-lg:px-3 sm:flex-row sm:items-center sm:justify-between lg:px-4 lg:py-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            {eyebrow}
          </p>
          <h3 className="text-sm font-black tracking-tight text-slate-900 lg:text-base">
            {title}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">{description}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {href && linkLabel ? (
            <Link href={href} className="admin-section-link text-xs">
              {linkLabel}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : null}
          {panelId && panelButtonLabel ? (
            <DashboardOpenPanelButton
              panelId={panelId}
              label={panelButtonLabel}
              className="max-sm:w-full"
            />
          ) : null}
        </div>
      </div>
      <div className="p-3 lg:p-4">{children}</div>
    </section>
  );
}

function MiniMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-100 bg-white px-2.5 py-2 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 text-lg font-black tabular-nums leading-none text-slate-900">
        {value}
      </p>
      {detail ? (
        <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">{detail}</p>
      ) : null}
    </div>
  );
}

export function DashboardCompactAttentionSummary({
  data,
}: {
  data: DashboardData;
}) {
  const cards = buildDashboardAttentionCards(data);
  const issueCount = countDashboardAttentionIssues(cards);
  const issueCards = cards.filter((card) => card.severity !== "healthy").slice(0, 4);

  return (
    <CompactSectionShell
      eyebrow="Priority signals"
      title="Attention summary"
      description={
        issueCount === 0
          ? "No urgent operational risks flagged."
          : `${issueCount} area${issueCount === 1 ? "" : "s"} need follow-up.`
      }
      panelId="attention"
      panelButtonLabel="Full attention breakdown"
    >
      {issueCount === 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50/50 px-3 py-2.5">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
          <p className="text-xs font-semibold text-emerald-900">
            All priority areas look healthy
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-1.5 sm:gap-2">
          {issueCards.map((card) => (
            <li
              key={card.id}
              className="rounded-lg border border-slate-100 bg-slate-50/60 px-2.5 py-2"
            >
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                {card.label}
              </p>
              <p className="mt-0.5 text-base font-black tabular-nums text-slate-900">
                {card.count !== null ? card.count : card.statusLabel}
              </p>
              <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-600">
                {card.explanation}
              </p>
            </li>
          ))}
        </ul>
      )}
    </CompactSectionShell>
  );
}

export function DashboardCompactTodaySection({
  operations,
}: {
  operations: DashboardData["operations"];
}) {
  const metrics = [
    {
      label: "Scheduled",
      value: operations.scheduledToday,
      detail: "Awaiting dispatch",
    },
    {
      label: "En route",
      value: operations.dispatched,
      detail: "Dispatched today",
    },
    {
      label: "In progress",
      value: operations.inProgress,
      detail: "On site",
    },
    {
      label: "Completed",
      value: operations.completedToday,
      detail: "Finished today",
    },
  ];

  const previewJobs = operations.todayJobs.slice(0, TODAY_JOB_PREVIEW_LIMIT);
  const remainingJobs = operations.todayJobs.length - previewJobs.length;

  return (
    <CompactSectionShell
      eyebrow="Field activity"
      title="Today's work"
      description={`${operations.totalJobsToday} job${operations.totalJobsToday === 1 ? "" : "s"} on the board · ${operations.unassignedToday} unassigned`}
      href="/dispatch?focus=today"
      linkLabel="Dispatch"
      panelId="today"
      panelButtonLabel="Full today breakdown"
    >
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 sm:gap-2">
        {metrics.map((metric) => (
          <MiniMetric key={metric.label} {...metric} />
        ))}
      </div>

      {previewJobs.length === 0 ? (
        <p className="mt-3 text-xs text-slate-500">No jobs scheduled today.</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-100">
          {previewJobs.map((job) => (
            <li key={job.id}>
              <Link
                href={`/jobs/${job.id}`}
                className="flex items-center justify-between gap-2 px-2.5 py-2 transition-colors hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-xs font-bold text-slate-900">
                      {job.jobNumber}
                    </p>
                    <JobStatusBadge status={job.status} />
                  </div>
                  <p className="truncate text-[11px] text-slate-600">
                    {job.customerName}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-400">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">
                      {formatJobLocation(job.city, job.state)}
                    </span>
                  </p>
                </div>
                <p className="shrink-0 text-[11px] font-semibold text-slate-600">
                  {formatDispatchTime(job.scheduledDate)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {remainingJobs > 0 ? (
        <p className="mt-2 text-xs font-semibold text-cyan-700">
          +{remainingJobs} more in full breakdown
        </p>
      ) : null}
    </CompactSectionShell>
  );
}

export function DashboardCompactTechnicianSummary({
  technicians,
}: {
  technicians: DashboardData["technicians"];
}) {
  const clockedIn = technicians.filter((t) => t.timeState !== "off_clock").length;
  const working = technicians.filter((t) => t.timeState === "working_job").length;
  const onBreak = technicians.filter((t) => t.timeState === "on_break").length;

  return (
    <CompactSectionShell
      eyebrow="Team"
      title="Technician status"
      description={`${clockedIn} clocked in · ${working} on job · ${onBreak} on break`}
      href="/time"
      linkLabel="Time tracking"
      panelId="today"
      panelButtonLabel="Roster details"
    >
      {technicians.length === 0 ? (
        <p className="text-xs text-slate-500">No technicians on roster yet.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {technicians.slice(0, 4).map((technician) => (
            <li
              key={technician.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/50 px-2.5 py-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
                  {technician.initials}
                </span>
                <p className="truncate text-xs font-semibold text-slate-900">
                  {technician.name}
                </p>
              </div>
              <span className="shrink-0 text-[10px] font-semibold uppercase text-slate-500">
                {technician.timeState.replaceAll("_", " ")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </CompactSectionShell>
  );
}

export function DashboardCompactBillingSection({
  money,
  canViewCompanyExpenses,
  expenses,
}: {
  money: DashboardData["money"];
  canViewCompanyExpenses: boolean;
  expenses?: DashboardData["expenses"];
}) {
  const recentPayments = money.recentPayments.slice(0, RECENT_PAYMENT_PREVIEW_LIMIT);

  return (
    <CompactSectionShell
      eyebrow="Receivables"
      title="Revenue and billing"
      description="Collections pressure and open invoices"
      href={INVOICE_PAGE_CASH_FLOW_HREF}
      linkLabel="Invoices"
      panelId="billing"
      panelButtonLabel="Full billing breakdown"
    >
      <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
        <MiniMetric
          label="Unpaid"
          value={formatCurrency(money.unpaidTotal)}
          detail={`${money.unpaidCount} open`}
        />
        <MiniMetric
          label="Overdue"
          value={formatCurrency(money.overdueTotal)}
          detail={`${money.overdueCount} past due`}
        />
        <MiniMetric
          label="Collected today"
          value={formatCurrency(money.paymentsTodayTotal)}
          detail={`${money.paymentsTodayCount} payment${money.paymentsTodayCount === 1 ? "" : "s"}`}
        />
        {canViewCompanyExpenses && expenses ? (
          <MiniMetric
            label="Pending approval"
            value={expenses.submittedCount}
            detail={formatExpenseAmount(expenses.submittedTotal)}
          />
        ) : (
          <MiniMetric
            label="Approved estimates"
            value={money.approvedEstimates.length}
            detail="Ready to invoice"
          />
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {money.unpaidCount > 0 ? (
          <Link
            href={INVOICE_PAGE_UNPAID_HREF}
            className="text-xs font-semibold text-cyan-700 hover:text-cyan-800"
          >
            Open unpaid
          </Link>
        ) : null}
        {money.overdueCount > 0 ? (
          <Link
            href={INVOICE_PAGE_OVERDUE_HREF}
            className="text-xs font-semibold text-rose-700 hover:text-rose-800"
          >
            Open overdue
          </Link>
        ) : null}
      </div>

      {recentPayments.length > 0 ? (
        <ul className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-100">
          {recentPayments.map((payment) => (
            <li key={payment.id}>
              <Link
                href={`/invoices/${payment.invoiceId}`}
                className="flex items-center justify-between gap-2 px-2.5 py-2 hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900">
                    {payment.invoiceNumber}
                  </p>
                  <p className="truncate text-[11px] text-slate-500">
                    {payment.customerName}
                  </p>
                </div>
                <p className="shrink-0 text-xs font-black text-emerald-700">
                  {formatCurrency(payment.amount)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </CompactSectionShell>
  );
}

export function DashboardCompactExpenseSection({
  expenses,
}: {
  expenses: DashboardData["expenses"];
}) {
  return (
    <CompactSectionShell
      eyebrow="Expenses"
      title="Expense review"
      description={`${expenses.submittedCount} awaiting approval`}
      href="/expenses?status=submitted"
      linkLabel="Expenses"
      panelId="billing"
      panelButtonLabel="Full expense breakdown"
    >
      <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
        <MiniMetric
          label="Needs approval"
          value={expenses.submittedCount}
          detail={formatExpenseAmount(expenses.submittedTotal)}
        />
        <MiniMetric
          label="Rejected"
          value={expenses.rejectedCount}
          detail="Returned to technician"
        />
      </div>
    </CompactSectionShell>
  );
}

export function DashboardCompactHealthCard({
  report,
}: {
  report: DashboardData["operationalHealth"];
}) {
  const { openDashboardPanel, hasPanel } = useDashboardDrilldown();
  const canDrilldown = hasPanel("health");

  return (
    <div className="min-w-0">
      {canDrilldown ? (
        <button
          type="button"
          onClick={() => openDashboardPanel("health")}
          className="group w-full text-left"
        >
          <OperationalHealthSection report={report} variant="compact" />
          <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-cyan-600 group-hover:text-cyan-700">
            Full health breakdown
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </button>
      ) : (
        <OperationalHealthSection report={report} variant="compact" />
      )}
    </div>
  );
}

export function DashboardCompactNextStepsSection({
  data,
}: {
  data: DashboardData;
}) {
  const actions = buildDashboardNextBestActions(data).slice(
    0,
    NEXT_ACTION_PREVIEW_LIMIT,
  );
  const hasActions = hasDashboardNextBestActions(data);
  const activities = data.recentActivity.slice(0, RECENT_ACTIVITY_PREVIEW_LIMIT);

  return (
    <div className="grid min-w-0 gap-3 lg:grid-cols-2 lg:gap-4">
      <CompactSectionShell
        eyebrow="Recommended"
        title="Next best actions"
        description={
          hasActions
            ? `${actions.length} top prioritized actions`
            : "Operations running smoothly"
        }
        href="/reports"
        linkLabel="Reports"
        panelId="next-steps"
        panelButtonLabel="All actions and activity"
      >
        {hasActions ? (
          <ul className="space-y-1.5">
            {actions.map((action) => (
              <li key={action.id}>
                <Link
                  href={action.href}
                  className="block rounded-lg border border-slate-100 bg-slate-50/50 px-2.5 py-2 transition-colors hover:border-slate-200 hover:bg-white"
                >
                  <p className="text-xs font-bold text-slate-900">{action.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-600">
                    {action.recommendedAction}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-slate-500">No urgent actions flagged.</p>
        )}
      </CompactSectionShell>

      <CompactSectionShell
        eyebrow="Activity"
        title="Recent activity"
        description="Latest operational events"
      >
        {activities.length === 0 ? (
          <p className="text-xs text-slate-500">No recent activity yet.</p>
        ) : (
          <ol className="space-y-2">
            {activities.map((activity) => {
              const href = getOperationalActivityHref(activity, {
                canViewBilling: data.access.canViewBilling,
                canManageCustomers: data.access.canManageCustomers,
              });
              const label = formatOperationalActivityLabelForAccess(
                activity,
                data.access.canViewBilling,
              );
              const body = (
                <>
                  <p className="text-xs font-semibold text-slate-900">{label}</p>
                  <time className="text-[10px] text-slate-400">
                    {formatOperationalActivityTimestamp(activity.createdAt)}
                  </time>
                </>
              );

              return (
                <li key={activity.id}>
                  {href ? (
                    <Link
                      href={href}
                      className="block rounded-lg px-1 py-0.5 hover:bg-slate-50"
                    >
                      {body}
                    </Link>
                  ) : (
                    <div className="px-1 py-0.5">{body}</div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </CompactSectionShell>
    </div>
  );
}
