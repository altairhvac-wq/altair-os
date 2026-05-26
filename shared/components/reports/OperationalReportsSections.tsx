import type { ReactNode } from "react";
import {
  AlertTriangle,
  Briefcase,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  Receipt,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import { formatCurrency } from "@/shared/types/customer";
import { formatJobProfitabilityLaborHours } from "@/shared/types/job-profitability";
import type {
  ExpenseReport,
  JobActivityReport,
  OperationalReportsBundle,
  ReportSectionMeta,
  RevenueReport,
  TechnicianLaborReport,
} from "@/shared/types/reports";
import type { OfficeReviewQueueFilter } from "@/shared/types/office-review-queue";
import { formatPercent } from "@/shared/types/analytics";
import { OfficeReviewQueueSection } from "@/shared/components/reports/OfficeReviewQueueSection";
import { OperationalHealthSection } from "@/shared/components/reports/OperationalHealthSection";

type OperationalReportsSectionsProps = {
  reports: OperationalReportsBundle;
  officeReviewQueueFilter?: OfficeReviewQueueFilter;
};

type MetricCardProps = {
  label: string;
  value: string;
  description: string;
  icon: typeof DollarSign;
  iconClassName: string;
  accentClassName: string;
};

function MetricCard({
  label,
  value,
  description,
  icon: Icon,
  iconClassName,
  accentClassName,
}: MetricCardProps) {
  return (
    <div className={`rounded-xl border bg-white p-4 ${accentClassName}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-2 truncate text-2xl font-black tabular-nums text-slate-900 sm:text-3xl">
            {value}
          </p>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClassName}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function formatExpenseBucket(
  bucket: { count: number; totalAmount: number },
  countLabel: string,
): string {
  return `${bucket.count} ${countLabel} · ${formatCurrency(bucket.totalAmount)}`;
}

function ReportLimitations({ meta }: { meta: ReportSectionMeta }) {
  if (meta.limitations.length === 0) {
    return null;
  }

  return (
    <div
      className="mt-3 rounded-lg border border-amber-200/80 bg-amber-50/60 px-3 py-2.5"
      role="note"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle
          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700"
          aria-hidden="true"
        />
        <ul className="space-y-1 text-xs text-amber-900/90">
          {meta.limitations.map((limitation) => (
            <li key={limitation}>{limitation}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function resolveScopeLabel(meta: ReportSectionMeta): string {
  if (meta.dateBounds == null) {
    return "All time";
  }

  return `${meta.dateBounds.startDate} – ${meta.dateBounds.endDate}`;
}

function ReportSectionShell({
  title,
  description,
  meta,
  children,
}: {
  title: string;
  description: string;
  meta: ReportSectionMeta;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <p className="mt-1 text-xs text-slate-500">
            {description} · {resolveScopeLabel(meta)}
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{children}</div>
      <ReportLimitations meta={meta} />
    </section>
  );
}

function RevenueReportSection({ report }: { report: RevenueReport }) {
  const { summary, meta } = report;

  return (
    <ReportSectionShell
      title="Revenue summary"
      description="Payments and invoicing from company records"
      meta={meta}
    >
      <MetricCard
        label="Collected revenue"
        value={formatCurrency(summary.collectedRevenue)}
        description="Payments recorded in period"
        icon={DollarSign}
        iconClassName="text-emerald-600 bg-emerald-50"
        accentClassName="border-emerald-100"
      />
      <MetricCard
        label="Invoiced revenue"
        value={formatCurrency(summary.invoicedRevenue)}
        description="Invoice totals by issue date"
        icon={FileText}
        iconClassName="text-cyan-600 bg-cyan-50"
        accentClassName="border-cyan-100"
      />
      <MetricCard
        label="Outstanding revenue"
        value={formatCurrency(summary.outstandingRevenue)}
        description="Uncollected invoice balances"
        icon={Receipt}
        iconClassName="text-amber-600 bg-amber-50"
        accentClassName="border-amber-100"
      />
      <MetricCard
        label="Payment count"
        value={String(summary.paymentCount)}
        description="Payments recorded in period"
        icon={Wallet}
        iconClassName="text-violet-600 bg-violet-50"
        accentClassName="border-violet-100"
      />
    </ReportSectionShell>
  );
}

function ExpenseReportSection({ report }: { report: ExpenseReport }) {
  const { summary, meta } = report;

  return (
    <ReportSectionShell
      title="Expense summary"
      description="Expense workflow totals by status"
      meta={meta}
    >
      <MetricCard
        label="Submitted expenses"
        value={formatExpenseBucket(summary.submitted, "awaiting review")}
        description="Awaiting approval"
        icon={Clock}
        iconClassName="text-blue-600 bg-blue-50"
        accentClassName="border-blue-100"
      />
      <MetricCard
        label="Approved / reimbursed"
        value={formatExpenseBucket(summary.approvedReimbursed, "processed")}
        description="Approved or reimbursed"
        icon={CheckCircle2}
        iconClassName="text-emerald-600 bg-emerald-50"
        accentClassName="border-emerald-100"
      />
      <MetricCard
        label="Pending expenses"
        value={formatExpenseBucket(summary.pending, "draft")}
        description="Draft — not yet submitted"
        icon={FileText}
        iconClassName="text-amber-600 bg-amber-50"
        accentClassName="border-amber-100"
      />
      <MetricCard
        label="Rejected expenses"
        value={formatExpenseBucket(summary.rejected, "rejected")}
        description="Declined submissions"
        icon={XCircle}
        iconClassName="text-rose-600 bg-rose-50"
        accentClassName="border-rose-100"
      />
    </ReportSectionShell>
  );
}

function JobActivityReportSection({ report }: { report: JobActivityReport }) {
  const { summary, meta } = report;

  return (
    <ReportSectionShell
      title="Job volume"
      description="Scheduling and completion activity"
      meta={meta}
    >
      <MetricCard
        label="Jobs scheduled"
        value={String(summary.jobsScheduled)}
        description="Scheduled in selected range"
        icon={Briefcase}
        iconClassName="text-indigo-600 bg-indigo-50"
        accentClassName="border-indigo-100"
      />
      <MetricCard
        label="Jobs completed"
        value={String(summary.jobsCompleted)}
        description="Completed in selected range"
        icon={CheckCircle2}
        iconClassName="text-emerald-600 bg-emerald-50"
        accentClassName="border-emerald-100"
      />
      <MetricCard
        label="Open jobs"
        value={String(summary.openJobs)}
        description="Not completed or cancelled"
        icon={Clock}
        iconClassName="text-cyan-600 bg-cyan-50"
        accentClassName="border-cyan-100"
      />
      <MetricCard
        label="Completion rate"
        value={
          summary.completionRatePercent == null
            ? "—"
            : formatPercent(summary.completionRatePercent, 1)
        }
        description="Completed vs scheduled in range"
        icon={Briefcase}
        iconClassName="text-violet-600 bg-violet-50"
        accentClassName="border-violet-100"
      />
    </ReportSectionShell>
  );
}

function TechnicianLaborReportSection({
  report,
}: {
  report: TechnicianLaborReport;
}) {
  const { summary, meta } = report;

  return (
    <ReportSectionShell
      title="Technician labor"
      description="Closed job-labor hours from time entries"
      meta={meta}
    >
      <MetricCard
        label="Total labor hours"
        value={formatJobProfitabilityLaborHours(summary.totalLaborHours)}
        description="Closed job labor in period"
        icon={Clock}
        iconClassName="text-violet-600 bg-violet-50"
        accentClassName="border-violet-100"
      />
      <MetricCard
        label="Active labor entries"
        value={String(summary.activeLaborEntries)}
        description="Open job-labor clocks"
        icon={Clock}
        iconClassName="text-amber-600 bg-amber-50"
        accentClassName="border-amber-100"
      />
      <MetricCard
        label="Technicians with time"
        value={String(summary.technicianCount)}
        description="Distinct techs with entries in period"
        icon={Users}
        iconClassName="text-cyan-600 bg-cyan-50"
        accentClassName="border-cyan-100"
      />
      <MetricCard
        label="Closed labor entries"
        value={String(summary.closedLaborEntryCount)}
        description="Closed job-labor entries in period"
        icon={CheckCircle2}
        iconClassName="text-emerald-600 bg-emerald-50"
        accentClassName="border-emerald-100"
      />
    </ReportSectionShell>
  );
}

export function OperationalReportsSections({
  reports,
  officeReviewQueueFilter = "all",
}: OperationalReportsSectionsProps) {
  return (
    <div className="flex flex-col gap-6">
      <OperationalHealthSection report={reports.operationalHealth} />
      <OfficeReviewQueueSection
        report={reports.officeReviewQueue}
        queueFilter={officeReviewQueueFilter}
      />
      <RevenueReportSection report={reports.revenue} />
      <ExpenseReportSection report={reports.expenses} />
      <JobActivityReportSection report={reports.jobs} />
      <TechnicianLaborReportSection report={reports.labor} />
    </div>
  );
}
