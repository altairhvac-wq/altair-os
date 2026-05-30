"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  Info,
  Receipt,
  Send,
  Timer,
  UserX,
  Wrench,
} from "lucide-react";
import { formatCurrency } from "@/shared/types/customer";
import type { ReportsFoundationData } from "@/shared/types/reports-foundation";
import {
  formatDateTime,
  formatDuration,
} from "@/shared/types/time-clock";
import { ReportsSummaryCard } from "./ReportsSummaryCard";

type ReportsFoundationViewProps = {
  data: ReportsFoundationData;
};

function ReportsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="admin-card min-w-0 overflow-x-clip p-4 sm:p-5">
      <div className="admin-panel-header -mx-4 mb-4 px-4 py-3 sm:-mx-5 sm:px-5 sm:py-4">
        <h2 className="admin-heading-section sm:text-base">{title}</h2>
        <p className="admin-text-helper mt-0.5">{description}</p>
      </div>
      {children}
    </section>
  );
}

function highlightSeverityStyles(
  severity: ReportsFoundationData["operations"]["highlights"][number]["severity"],
): string {
  switch (severity) {
    case "critical":
      return "border-rose-200 bg-rose-50 text-rose-900";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-900";
    default:
      return "border-slate-200 bg-white text-slate-800";
  }
}

export function ReportsFoundationView({ data }: ReportsFoundationViewProps) {
  const { jobs, invoices, estimates, labor, timeClock, operations } = data;
  const estimateTotal =
    estimates.draftCount + estimates.sentCount + estimates.approvedCount;
  const isLowDataCompany =
    jobs.openJobs === 0 &&
    jobs.completedJobs === 0 &&
    estimateTotal === 0 &&
    invoices.unpaidCount === 0 &&
    invoices.paidTotal === 0 &&
    timeClock.recentEntries.length === 0;

  return (
    <div className="flex flex-col gap-6 pb-8">
      <div
        className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
        role="note"
      >
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-slate-900">Read-only reports</p>
          <p className="mt-0.5 text-xs text-slate-600">
            Summaries reflect current company data. Export, AI insights, and custom
            reports are not available yet.
          </p>
        </div>
      </div>

      {isLowDataCompany ? (
        <div
          className="flex items-start gap-3 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3"
          role="note"
        >
          <Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-cyan-700" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-cyan-900">
              Your workspace is just getting started
            </p>
            <p className="mt-0.5 text-xs text-cyan-800">
              Reports will populate as you add customers, schedule jobs, send
              estimates, and record invoices. Empty counts here mean no activity
              yet — not a loading or permission issue.
            </p>
          </div>
        </div>
      ) : null}

      <ReportsSection
        title="Jobs summary"
        description="Scheduling and backlog counts from job records"
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ReportsSummaryCard
            label="Jobs today"
            value={String(jobs.jobsToday)}
            description="Scheduled on today's board"
            icon={CalendarDays}
            iconClassName="bg-indigo-50 text-indigo-600"
            accentClassName="border-indigo-100"
          />
          <ReportsSummaryCard
            label="Open jobs"
            value={String(jobs.openJobs)}
            description="Not completed or cancelled"
            icon={Briefcase}
            iconClassName="bg-cyan-50 text-cyan-600"
            accentClassName="border-cyan-100"
          />
          <ReportsSummaryCard
            label="Completed jobs"
            value={String(jobs.completedJobs)}
            description="All-time completed count"
            icon={CheckCircle2}
            iconClassName="bg-emerald-50 text-emerald-600"
            accentClassName="border-emerald-100"
          />
          <ReportsSummaryCard
            label="Unassigned jobs"
            value={String(jobs.unassignedJobs)}
            description="Open jobs without a technician"
            icon={UserX}
            iconClassName="bg-amber-50 text-amber-600"
            accentClassName="border-amber-100"
          />
        </div>
      </ReportsSection>

      <ReportsSection
        title="Revenue & invoices"
        description="Billing totals from invoice records"
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <ReportsSummaryCard
            label="Unpaid invoices"
            value={String(invoices.unpaidCount)}
            description={`${formatCurrency(invoices.unpaidTotal)} outstanding`}
            icon={Receipt}
            iconClassName="bg-amber-50 text-amber-600"
            accentClassName="border-amber-100"
          />
          <ReportsSummaryCard
            label="Collected"
            value={formatCurrency(invoices.paidTotal)}
            description="Paid invoice totals"
            icon={DollarSign}
            iconClassName="bg-emerald-50 text-emerald-600"
            accentClassName="border-emerald-100"
          />
          <ReportsSummaryCard
            label="Overdue invoices"
            value={String(invoices.overdueCount)}
            description={
              invoices.overdueCount > 0
                ? `${formatCurrency(invoices.overdueTotal)} past due`
                : "No overdue balances"
            }
            icon={AlertCircle}
            iconClassName="bg-rose-50 text-rose-600"
            accentClassName="border-rose-100"
          />
        </div>
      </ReportsSection>

      <ReportsSection
        title="Estimates summary"
        description="Pipeline counts by estimate status"
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <ReportsSummaryCard
            label="Draft estimates"
            value={String(estimates.draftCount)}
            description="Not yet sent to customers"
            icon={FileText}
            iconClassName="bg-slate-100 text-slate-600"
            accentClassName="border-slate-200"
          />
          <ReportsSummaryCard
            label="Sent estimates"
            value={String(estimates.sentCount)}
            description="Awaiting customer response"
            icon={Send}
            iconClassName="bg-blue-50 text-blue-600"
            accentClassName="border-blue-100"
          />
          <ReportsSummaryCard
            label="Approved estimates"
            value={String(estimates.approvedCount)}
            description="Accepted by customers"
            icon={CheckCircle2}
            iconClassName="bg-emerald-50 text-emerald-600"
            accentClassName="border-emerald-100"
          />
        </div>
        {estimates.draftCount === 0 &&
        estimates.sentCount === 0 &&
        estimates.approvedCount === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No estimates recorded yet.</p>
        ) : null}
      </ReportsSection>

      <ReportsSection
        title="Labor & payroll"
        description="Field labor and shift time for payroll review. Technicians track time through Start work and Complete work on jobs."
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <ReportsSummaryCard
            label="Working now"
            value={String(labor.currentlyWorkingCount)}
            description={
              labor.currentlyWorkingCount === 1
                ? "Open job-labor entry"
                : "Open job-labor entries"
            }
            icon={Wrench}
            iconClassName="bg-cyan-50 text-cyan-600"
            accentClassName="border-cyan-100"
          />
          <ReportsSummaryCard
            label="Started today"
            value={String(labor.startedTodayCount)}
            description="Technicians with a shift clock today"
            icon={CalendarDays}
            iconClassName="bg-indigo-50 text-indigo-600"
            accentClassName="border-indigo-100"
          />
          <ReportsSummaryCard
            label="Total hours today"
            value={`${labor.totalHoursToday}h`}
            description="Shift clock + job labor"
            icon={Timer}
            iconClassName="bg-violet-50 text-violet-600"
            accentClassName="border-violet-100"
          />
          <ReportsSummaryCard
            label="Open entries"
            value={String(labor.openEntryCount)}
            description="Shift, job labor, and break segments"
            icon={Clock}
            iconClassName="bg-amber-50 text-amber-600"
            accentClassName="border-amber-100"
          />
          <ReportsSummaryCard
            label="Time exceptions"
            value={String(labor.exceptionCount)}
            description={
              labor.exceptionCount === 0
                ? "No labor integrity issues"
                : "Needs admin review"
            }
            icon={AlertCircle}
            iconClassName="bg-rose-50 text-rose-600"
            accentClassName="border-rose-100"
          />
        </div>

        {labor.currentlyWorking.length > 0 ? (
          <div className="mt-4 rounded-xl border border-cyan-100 bg-cyan-50/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-800">
              Currently on job
            </p>
            <ul className="mt-2 space-y-1.5">
              {labor.currentlyWorking.map((entry) => (
                <li
                  key={entry.id}
                  className="flex flex-wrap items-center justify-between gap-2 text-sm text-cyan-900"
                >
                  <span className="font-medium">{entry.technicianName}</span>
                  <span className="text-cyan-700">
                    {entry.jobNumber ? `Job ${entry.jobNumber}` : "On site"} ·{" "}
                    Since {formatDateTime(entry.startedAt)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">
            No technicians are actively working a job right now.
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <Link
            href="/time-clock"
            className="font-semibold text-cyan-700 hover:text-cyan-800"
          >
            Shift exceptions
          </Link>
          <span className="text-slate-300" aria-hidden="true">
            ·
          </span>
          <Link
            href="/time"
            className="font-semibold text-cyan-700 hover:text-cyan-800"
          >
            Time entries
          </Link>
        </div>

        {timeClock.clockedInUsers.length > 0 ? (
          <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
              Clocked in for shift
            </p>
            <ul className="mt-2 space-y-1.5">
              {timeClock.clockedInUsers.map((entry) => (
                <li
                  key={entry.id}
                  className="flex flex-wrap items-center justify-between gap-2 text-sm text-emerald-900"
                >
                  <span className="font-medium">{entry.userName}</span>
                  <span className="text-emerald-700">
                    Since {formatDateTime(entry.clockInAt)} ·{" "}
                    {formatDuration(entry.clockInAt)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {timeClock.recentEntries.length > 0 ? (
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-white">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Employee
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Clock in
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Duration
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {timeClock.recentEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">
                      {entry.userName}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {formatDateTime(entry.clockInAt)}
                    </td>
                    <td className="px-4 py-3 text-sm tabular-nums text-slate-700">
                      {formatDuration(entry.clockInAt, entry.clockOutAt)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {entry.status === "open" ? "Open" : "Closed"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </ReportsSection>

      <ReportsSection
        title="Operations snapshot"
        description="Highlights from daily operations summary"
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <ReportsSummaryCard
            label="Collected today"
            value={formatCurrency(operations.todayCollectedRevenue)}
            description={`${operations.todayPaymentCount} payment${operations.todayPaymentCount === 1 ? "" : "s"} today`}
            icon={DollarSign}
            iconClassName="bg-emerald-50 text-emerald-600"
            accentClassName="border-emerald-100"
          />
          <ReportsSummaryCard
            label="Stalled jobs"
            value={String(operations.stalledJobs)}
            description="Jobs needing follow-up"
            icon={Clock}
            iconClassName="bg-amber-50 text-amber-600"
            accentClassName="border-amber-100"
          />
          <ReportsSummaryCard
            label="Awaiting invoicing"
            value={String(operations.completedAwaitingInvoicing)}
            description="Completed work not yet invoiced"
            icon={Receipt}
            iconClassName="bg-indigo-50 text-indigo-600"
            accentClassName="border-indigo-100"
          />
        </div>

        {operations.highlights.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {operations.highlights.map((highlight) => (
              <li
                key={highlight.id}
                className={`rounded-lg border px-3 py-2.5 text-sm ${highlightSeverityStyles(
                  highlight.severity,
                )}`}
              >
                {highlight.message}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-slate-500">
            No operational alerts right now. Metrics above reflect current company
            activity.
          </p>
        )}
      </ReportsSection>
    </div>
  );
}
