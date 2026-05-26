"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownUp,
  Briefcase,
  CheckCircle2,
  ClipboardList,
  Clock,
  ExternalLink,
  FileText,
} from "lucide-react";
import { JobStatusBadge } from "@/shared/components/jobs/JobStatusBadge";
import { formatJobStatus } from "@/shared/types/job";
import {
  buildOfficeReviewQueueActions,
  compareOfficeReviewQueueItems,
  formatOfficeReviewQueueKind,
  OFFICE_REVIEW_QUEUE_AGING_DAYS,
  type OfficeReviewQueueGroup,
  type OfficeReviewQueueItem,
  type OfficeReviewQueueReport,
  type OfficeReviewQueueSortMode,
} from "@/shared/types/office-review-queue";
import { formatCompletedWorkReviewReasons } from "@/shared/types/reports";
import { formatOperationalActivityTimestamp } from "@/shared/types/operational-activity";

type OfficeReviewQueueSectionProps = {
  report: OfficeReviewQueueReport;
  variant?: "full" | "compact";
  /** When compact, caps visible rows while preserving summary metrics. */
  itemLimit?: number;
};

const GROUP_LABELS: Record<OfficeReviewQueueGroup, string> = {
  critical: "Critical",
  needs_attention: "Needs attention",
  aging: "Aging",
};

const GROUP_DESCRIPTIONS: Record<OfficeReviewQueueGroup, string> = {
  critical: "Multiple blockers on completed work — highest priority follow-up.",
  needs_attention: "Review flags, invoicing backlog, and active pipeline stalls.",
  aging: `${OFFICE_REVIEW_QUEUE_AGING_DAYS}+ days without meaningful progress — monitor for backlog buildup.`,
};

function severityBadgeClassName(
  severity: OfficeReviewQueueItem["severity"],
): string {
  switch (severity) {
    case "critical":
      return "bg-rose-100 text-rose-800";
    case "warning":
      return "bg-amber-100 text-amber-800";
    case "info":
      return "bg-sky-100 text-sky-800";
  }
}

function groupAccentClassName(group: OfficeReviewQueueGroup): string {
  switch (group) {
    case "critical":
      return "border-rose-200 bg-rose-50/40";
    case "needs_attention":
      return "border-amber-200 bg-amber-50/30";
    case "aging":
      return "border-slate-200 bg-slate-50/60";
  }
}

function MetricCard({
  label,
  value,
  description,
  icon: Icon,
  iconClassName,
  accentClassName,
}: {
  label: string;
  value: string;
  description: string;
  icon: typeof AlertTriangle;
  iconClassName: string;
  accentClassName: string;
}) {
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

function QueueItemActions({ item }: { item: OfficeReviewQueueItem }) {
  const actions = buildOfficeReviewQueueActions(item);

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <Link
          key={action.id}
          href={action.href}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
        >
          {action.label}
          {action.external ? (
            <ExternalLink className="h-3 w-3 text-slate-400" aria-hidden="true" />
          ) : null}
        </Link>
      ))}
    </div>
  );
}

function QueueItemRow({
  item,
  showActions,
}: {
  item: OfficeReviewQueueItem;
  showActions: boolean;
}) {
  return (
    <li className="px-4 py-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/jobs/${item.jobId}`}
              className="text-sm font-bold text-slate-900 hover:text-cyan-700"
            >
              {item.jobNumber}
            </Link>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-700">
              {formatOfficeReviewQueueKind(item.kind)}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${severityBadgeClassName(item.severity)}`}
            >
              {item.severity}
            </span>
            {item.jobStatus ? (
              <JobStatusBadge status={item.jobStatus} />
            ) : null}
          </div>
          <p className="mt-1 truncate text-sm text-slate-600">
            {item.customerName}
            {item.assignedTechnician
              ? ` · ${item.assignedTechnician}`
              : " · Unassigned"}
          </p>
          {item.reviewReasons.length > 0 ? (
            <p className="mt-0.5 text-xs text-slate-500">
              {formatCompletedWorkReviewReasons(item.reviewReasons)}
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-slate-500">{item.detail}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            <span>
              {item.daysAging} day{item.daysAging === 1 ? "" : "s"} aging
            </span>
            <span>
              {item.blockerCount} blocker{item.blockerCount === 1 ? "" : "s"}
            </span>
            <span>
              Last activity{" "}
              {item.lastActivityAt
                ? formatOperationalActivityTimestamp(item.lastActivityAt)
                : "not recorded"}
            </span>
          </div>
        </div>
        {showActions ? <QueueItemActions item={item} /> : null}
      </div>
    </li>
  );
}

function QueueGroupSection({
  group,
  items,
  showActions,
}: {
  group: OfficeReviewQueueGroup;
  items: OfficeReviewQueueItem[];
  showActions: boolean;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className={`rounded-xl border ${groupAccentClassName(group)}`}>
      <div className="border-b border-inherit px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {GROUP_LABELS[group]}
            </h3>
            <p className="mt-0.5 text-xs text-slate-600">
              {GROUP_DESCRIPTIONS[group]}
            </p>
          </div>
          <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-bold tabular-nums text-slate-700 ring-1 ring-slate-200">
            {items.length}
          </span>
        </div>
      </div>
      <ul className="divide-y divide-slate-100 bg-white/80">
        {items.map((item) => (
          <QueueItemRow key={`${group}-${item.jobId}-${item.kind}`} item={item} showActions={showActions} />
        ))}
      </ul>
    </section>
  );
}

function SortToggle({
  sortMode,
  onChange,
}: {
  sortMode: OfficeReviewQueueSortMode;
  onChange: (mode: OfficeReviewQueueSortMode) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 text-xs font-semibold">
      <button
        type="button"
        onClick={() => onChange("severity_first")}
        className={`rounded-md px-3 py-1.5 transition-colors ${
          sortMode === "severity_first"
            ? "bg-slate-900 text-white"
            : "text-slate-600 hover:bg-slate-50"
        }`}
      >
        Highest severity
      </button>
      <button
        type="button"
        onClick={() => onChange("oldest_first")}
        className={`rounded-md px-3 py-1.5 transition-colors ${
          sortMode === "oldest_first"
            ? "bg-slate-900 text-white"
            : "text-slate-600 hover:bg-slate-50"
        }`}
      >
        Oldest first
      </button>
    </div>
  );
}

function recomputeGroups(
  items: OfficeReviewQueueItem[],
  sortMode: OfficeReviewQueueSortMode,
): Record<OfficeReviewQueueGroup, OfficeReviewQueueItem[]> {
  const sorted = [...items].sort((left, right) =>
    compareOfficeReviewQueueItems(left, right, sortMode),
  );

  const groups: Record<OfficeReviewQueueGroup, OfficeReviewQueueItem[]> = {
    critical: [],
    needs_attention: [],
    aging: [],
  };

  for (const item of sorted) {
    groups[item.group].push(item);
  }

  return groups;
}

export function OfficeReviewQueueSection({
  report,
  variant = "full",
  itemLimit,
}: OfficeReviewQueueSectionProps) {
  const [sortMode, setSortMode] =
    useState<OfficeReviewQueueSortMode>("severity_first");

  const baseItems =
    variant === "compact" && itemLimit != null
      ? report.summary.items.slice(0, itemLimit)
      : report.summary.items;

  const groups = useMemo(
    () => recomputeGroups(baseItems, sortMode),
    [baseItems, sortMode],
  );

  const isCompact = variant === "compact";
  const showGrouped = !isCompact;
  const showActions = !isCompact;
  const { summary, meta } = report;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 ring-1 ring-violet-600/10">
            <ClipboardList className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Office review queue
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Centralized operational queue for completed-work review, invoicing
              backlog, and stalled pipeline jobs · All time
            </p>
          </div>
        </div>
        {!isCompact ? (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ArrowDownUp className="h-3.5 w-3.5" aria-hidden="true" />
            <SortToggle sortMode={sortMode} onChange={setSortMode} />
          </div>
        ) : (
          <Link
            href="/reports"
            className="text-xs font-semibold text-cyan-600 hover:text-cyan-700"
          >
            View full queue
          </Link>
        )}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Queue total"
          value={String(summary.totalCount)}
          description="Items needing office attention"
          icon={Briefcase}
          iconClassName="text-violet-600 bg-violet-50"
          accentClassName="border-violet-100"
        />
        <MetricCard
          label="Critical"
          value={String(summary.criticalCount)}
          description="Multiple completed-work blockers"
          icon={AlertTriangle}
          iconClassName="text-rose-600 bg-rose-50"
          accentClassName="border-rose-100"
        />
        <MetricCard
          label="Needs attention"
          value={String(summary.needsAttentionCount)}
          description="Standard follow-up items"
          icon={FileText}
          iconClassName="text-amber-600 bg-amber-50"
          accentClassName="border-amber-100"
        />
        <MetricCard
          label="Aging"
          value={String(summary.agingCount)}
          description={`${OFFICE_REVIEW_QUEUE_AGING_DAYS}+ days without progress`}
          icon={Clock}
          iconClassName="text-slate-600 bg-slate-100"
          accentClassName="border-slate-200"
        />
        <MetricCard
          label="Resolved this week"
          value={String(summary.resolvedThisWeek)}
          description="Review blockers cleared on completed jobs"
          icon={CheckCircle2}
          iconClassName="text-emerald-600 bg-emerald-50"
          accentClassName="border-emerald-100"
        />
      </div>

      {baseItems.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center text-sm text-slate-600">
          No items in the office review queue right now.
        </p>
      ) : showGrouped ? (
        <div className="mt-4 flex flex-col gap-4">
          <QueueGroupSection
            group="critical"
            items={groups.critical}
            showActions={showActions}
          />
          <QueueGroupSection
            group="needs_attention"
            items={groups.needs_attention}
            showActions={showActions}
          />
          <QueueGroupSection
            group="aging"
            items={groups.aging}
            showActions={showActions}
          />
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-100">
          {baseItems
            .slice()
            .sort((left, right) =>
              compareOfficeReviewQueueItems(left, right, "severity_first"),
            )
            .map((item) => (
              <QueueItemRow
                key={`${item.jobId}-${item.kind}`}
                item={item}
                showActions={false}
              />
            ))}
        </ul>
      )}

      {meta.limitations.length > 0 ? (
        <div
          className="mt-4 rounded-lg border border-amber-200/80 bg-amber-50/60 px-3 py-2.5"
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
      ) : null}

      {isCompact ? (
        <p className="mt-3 text-xs text-slate-500">
          Compact snapshot — open Reports for sorting, grouped views, and quick
          actions.
        </p>
      ) : (
        <p className="mt-3 text-xs text-slate-500">
          Quick actions navigate to existing screens only. Stalled jobs use{" "}
          {formatJobStatus("in_progress")} pipeline statuses as context.
        </p>
      )}
    </section>
  );
}
