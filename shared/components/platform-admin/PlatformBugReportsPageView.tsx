"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { updatePlatformBugReportStatusAction } from "@/app/actions/platform-bug-reports";
import type {
  PlatformBugReport,
  PlatformBugReportSummary,
} from "@/shared/types/platform-admin";
import type {
  BetaFeedbackSeverity,
  BetaFeedbackStatus,
} from "@/shared/types/beta-feedback";
import { AlertCircle, Bug, CheckCircle2, Eye, RotateCcw, type LucideIcon } from "lucide-react";

type PlatformBugReportsPageViewProps = {
  initialReports: PlatformBugReport[];
  loadError?: string | null;
};

type SummaryCardProps = {
  label: string;
  value: number;
  icon: LucideIcon;
  accent?: "default" | "danger" | "warning" | "success";
};

const STATUS_OPTIONS: { value: BetaFeedbackStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "open", label: "Open" },
  { value: "reviewing", label: "Reviewing" },
  { value: "fixed", label: "Fixed" },
  { value: "ignored", label: "Ignored" },
];

const SEVERITY_OPTIONS: { value: BetaFeedbackSeverity | "all"; label: string }[] = [
  { value: "all", label: "All severities" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "blocking", label: "Blocking" },
];

const SEVERITY_STYLES: Record<BetaFeedbackSeverity, string> = {
  low: "bg-slate-100 text-slate-700 ring-slate-600/10",
  medium: "bg-amber-50 text-amber-800 ring-amber-600/10",
  high: "bg-orange-50 text-orange-800 ring-orange-600/10",
  blocking: "bg-red-50 text-red-700 ring-red-600/10",
};

const STATUS_STYLES: Record<BetaFeedbackStatus, string> = {
  open: "bg-sky-50 text-sky-800 ring-sky-600/10",
  reviewing: "bg-violet-50 text-violet-800 ring-violet-600/10",
  fixed: "bg-emerald-50 text-emerald-800 ring-emerald-600/10",
  ignored: "bg-slate-100 text-slate-600 ring-slate-600/10",
};

function formatLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function computeSummary(reports: PlatformBugReport[]): PlatformBugReportSummary {
  return reports.reduce<PlatformBugReportSummary>(
    (summary, report) => {
      summary.total += 1;

      if (report.status === "open") {
        summary.open += 1;
      } else if (report.status === "reviewing") {
        summary.reviewing += 1;
      } else if (report.status === "fixed") {
        summary.fixed += 1;
      }

      if (report.severity === "blocking" || report.severity === "high") {
        summary.blockingOrHigh += 1;
      }

      return summary;
    },
    {
      open: 0,
      blockingOrHigh: 0,
      reviewing: 0,
      fixed: 0,
      total: 0,
    },
  );
}

function filterReports(
  reports: PlatformBugReport[],
  statusFilter: BetaFeedbackStatus | "all",
  severityFilter: BetaFeedbackSeverity | "all",
  search: string,
): PlatformBugReport[] {
  const query = search.trim().toLowerCase();

  return reports.filter((report) => {
    if (statusFilter !== "all" && report.status !== statusFilter) {
      return false;
    }

    if (severityFilter !== "all" && report.severity !== severityFilter) {
      return false;
    }

    if (!query) {
      return true;
    }

    const haystack = [
      report.message,
      report.expectedBehavior ?? "",
      report.companyName ?? "",
      report.userEmail ?? "",
      report.pageUrl,
      report.userRole ?? "",
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  accent = "default",
}: SummaryCardProps) {
  const accentClass =
    accent === "danger"
      ? "text-red-700/80"
      : accent === "warning"
        ? "text-amber-700/80"
        : accent === "success"
          ? "text-emerald-700/80"
          : "text-cyan-700/80";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            {label}
          </p>
          <p className="mt-1 text-2xl font-black tabular-nums tracking-tight text-slate-900">
            {value.toLocaleString()}
          </p>
        </div>
        <Icon className={`h-5 w-5 shrink-0 ${accentClass}`} aria-hidden="true" />
      </div>
    </div>
  );
}

type StatusAction = {
  status: BetaFeedbackStatus;
  label: string;
  icon: LucideIcon;
};

const STATUS_ACTIONS: StatusAction[] = [
  { status: "reviewing", label: "Reviewing", icon: Eye },
  { status: "fixed", label: "Fixed", icon: CheckCircle2 },
  { status: "ignored", label: "Ignored", icon: AlertCircle },
  { status: "open", label: "Reopen", icon: RotateCcw },
];

type BugReportCardProps = {
  report: PlatformBugReport;
  isUpdating: boolean;
  onStatusChange: (reportId: string, status: BetaFeedbackStatus) => void;
};

function BugReportCard({ report, isUpdating, onStatusChange }: BugReportCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${SEVERITY_STYLES[report.severity]}`}
          >
            {formatLabel(report.severity)}
          </span>
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${STATUS_STYLES[report.status]}`}
          >
            {formatLabel(report.status)}
          </span>
        </div>
        <time
          className="text-xs text-slate-500"
          dateTime={report.createdAt}
          title={`Updated ${formatDateTime(report.updatedAt)}`}
        >
          {formatDateTime(report.createdAt)}
        </time>
      </div>

      <dl className="mt-3 grid gap-2 text-sm">
        <div className="grid gap-0.5 sm:grid-cols-[7rem_minmax(0,1fr)]">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Company
          </dt>
          <dd className="text-slate-900">{report.companyName?.trim() || "—"}</dd>
        </div>
        <div className="grid gap-0.5 sm:grid-cols-[7rem_minmax(0,1fr)]">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            User
          </dt>
          <dd className="break-all text-slate-900">
            {report.userEmail?.trim() || "—"}
            {report.userRole ? (
              <span className="ml-2 text-xs text-slate-500">({report.userRole})</span>
            ) : null}
          </dd>
        </div>
        <div className="grid gap-0.5 sm:grid-cols-[7rem_minmax(0,1fr)]">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Page
          </dt>
          <dd className="min-w-0 break-all">
            <a
              href={report.pageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-700 hover:underline"
            >
              {report.pageUrl}
            </a>
          </dd>
        </div>
      </dl>

      <div className="mt-3 space-y-2">
        <p className="text-sm font-medium text-slate-900">{report.message}</p>
        {report.expectedBehavior?.trim() ? (
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Expected behavior
            </p>
            <p className="mt-1 text-sm text-slate-700">{report.expectedBehavior}</p>
          </div>
        ) : null}
      </div>

      {report.userAgent?.trim() ? (
        <p className="mt-3 break-all font-mono text-[10px] leading-relaxed text-slate-400">
          {report.userAgent}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        {STATUS_ACTIONS.map(({ status, label, icon: Icon }) => {
          const isCurrent = report.status === status;
          const isReopen = status === "open";

          return (
            <button
              key={status}
              type="button"
              disabled={isUpdating || isCurrent}
              onClick={() => onStatusChange(report.id, status)}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                isCurrent
                  ? "bg-slate-100 text-slate-500"
                  : isReopen
                    ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    : "bg-cyan-950 text-white hover:bg-cyan-900"
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {isCurrent ? `${label} (current)` : label}
            </button>
          );
        })}
      </div>
    </article>
  );
}

export function PlatformBugReportsPageView({
  initialReports,
  loadError = null,
}: PlatformBugReportsPageViewProps) {
  const [reports, setReports] = useState(initialReports ?? []);
  const [statusFilter, setStatusFilter] = useState<BetaFeedbackStatus | "all">("all");
  const [severityFilter, setSeverityFilter] = useState<BetaFeedbackSeverity | "all">(
    "all",
  );
  const [search, setSearch] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [updatingReportId, setUpdatingReportId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const summary = useMemo(() => computeSummary(reports), [reports]);

  const filteredReports = useMemo(
    () => filterReports(reports, statusFilter, severityFilter, search),
    [reports, statusFilter, severityFilter, search],
  );

  function handleStatusChange(reportId: string, status: BetaFeedbackStatus) {
    setActionError(null);
    setUpdatingReportId(reportId);

    startTransition(async () => {
      const result = await updatePlatformBugReportStatusAction(reportId, status);

      if (result.error) {
        setActionError(result.error);
        setUpdatingReportId(null);
        return;
      }

      setReports((current) =>
        current.map((report) =>
          report.id === reportId
            ? {
                ...report,
                status,
                updatedAt: new Date().toISOString(),
              }
            : report,
        ),
      );
      setUpdatingReportId(null);
    });
  }

  return (
    <div className="mx-auto min-w-0 max-w-6xl space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Bug className="h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
          <h1 className="text-xl font-black tracking-tight text-slate-900">Bug Reports</h1>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          Reports submitted by beta testers from inside the app.
        </p>
      </div>

      {loadError ? (
        <section
          className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3"
          aria-label="Bug reports load error"
          role="alert"
        >
          <p className="text-sm font-semibold text-amber-950">
            Could not load bug reports
          </p>
          <p className="mt-1 text-xs text-amber-900/90">{loadError}</p>
          <p className="mt-2 text-xs text-amber-900/80">
            Check that migration 059 is applied and{" "}
            <code className="rounded bg-amber-100/80 px-1 py-0.5 font-mono text-[11px]">
              SUPABASE_SERVICE_ROLE_KEY
            </code>{" "}
            is set on the server.
          </p>
        </section>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <SummaryCard label="Open" value={summary.open} icon={Bug} accent="warning" />
        <SummaryCard
          label="Blocking / high"
          value={summary.blockingOrHigh}
          icon={AlertCircle}
          accent="danger"
        />
        <SummaryCard label="Reviewing" value={summary.reviewing} icon={Eye} />
        <SummaryCard
          label="Fixed"
          value={summary.fixed}
          icon={CheckCircle2}
          accent="success"
        />
        <SummaryCard label="Total" value={summary.total} icon={Bug} />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Status
            </span>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as BetaFeedbackStatus | "all")
              }
              className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Severity
            </span>
            <select
              value={severityFilter}
              onChange={(event) =>
                setSeverityFilter(event.target.value as BetaFeedbackSeverity | "all")
              }
              className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
            >
              {SEVERITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm sm:col-span-2 lg:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Search
            </span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Message, company, email, or page URL"
              className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400"
            />
          </label>
        </div>
      </section>

      {actionError ? (
        <div
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {actionError}
        </div>
      ) : null}

      {filteredReports.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center shadow-sm">
          <Bug className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold text-slate-900">
            {reports.length === 0 ? "No bug reports yet." : "No reports match your filters"}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {reports.length === 0
              ? "Beta testers can submit reports using the red bug button in the app."
              : "Try clearing filters or adjusting your search."}
          </p>
          {reports.length === 0 ? (
            <Link
              href="/platform"
              className="mt-4 inline-flex min-h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Back to platform overview
            </Link>
          ) : null}
        </section>
      ) : (
        <div className="grid gap-4">
          {filteredReports.map((report) => (
            <BugReportCard
              key={report.id}
              report={report}
              isUpdating={isPending && updatingReportId === report.id}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
