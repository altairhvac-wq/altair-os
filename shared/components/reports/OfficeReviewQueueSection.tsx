"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  ArrowDownUp,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock,
  ExternalLink,
  Eye,
  FileText,
  Inbox,
  Sparkles,
  X,
  TrendingDown,
  TrendingUp,
  Minus,
} from "lucide-react";
import {
  OFFICE_REVIEW_QUEUE_READINESS_LEGEND,
  OFFICE_REVIEW_QUEUE_READINESS_LIMITATIONS,
} from "@/shared/lib/office-review-queue-readiness";
import {
  loadQueuePreferences,
  parseCollapsedQueueGroups,
  parseQueueSortMode,
  persistQueuePreferences,
} from "@/shared/lib/office-review-queue-preferences";
import {
  BATCH_BLOCK_REASON_LABELS,
  buildQueueBatchPreview,
  OFFICE_REVIEW_QUEUE_BATCH_PREVIEW_LIMITATIONS,
  summarizeQueueBatchPreview,
  type OfficeReviewQueueBatchPreview,
} from "@/shared/lib/office-review-queue-batch-preview";
import {
  clearQueueSelection,
  OFFICE_REVIEW_QUEUE_SELECTION_LIMITATIONS,
  pruneQueueSelection,
  resolveBulkQueueActionAvailability,
  resolveGroupSelectionState,
  resolveSelectedQueueItems,
  toggleGroupQueueSelection,
  toggleQueueSelection,
  type OfficeReviewQueueBulkActionAvailability,
  type OfficeReviewQueueBulkActionId,
} from "@/shared/lib/office-review-queue-selection";
import {
  applyQueueDefaultView,
  applyQueuePreset,
  isDefaultOfficeReviewQueueView,
  OFFICE_REVIEW_QUEUE_PRESET_LIMITATIONS,
  OFFICE_REVIEW_QUEUE_PRESETS,
  resolveQueuePreset,
  type OfficeReviewQueuePreset,
} from "@/shared/lib/office-review-queue-presets";
import { JobStatusBadge } from "@/shared/components/jobs/JobStatusBadge";
import { formatJobStatus } from "@/shared/types/job";
import {
  compareOfficeReviewQueueItems,
  dedupeQueueActions,
  filterOfficeReviewQueueItems,
  formatOfficeReviewQueueKind,
  getOfficeReviewQueueFilterDescription,
  getOfficeReviewQueueFilterLabel,
  isOfficeReviewQueueFilterParam,
  isValidOfficeReviewQueueJobId,
  isValidQueueActionHref,
  OFFICE_REVIEW_QUEUE_AGING_BUCKET_MAX_DAYS,
  OFFICE_REVIEW_QUEUE_AGING_DAYS,
  OFFICE_REVIEW_QUEUE_FRESH_MAX_DAYS,
  OFFICE_REVIEW_QUEUE_FILTER_OPTIONS,
  OFFICE_REVIEW_QUEUE_SECTION_ID,
  type OfficeReviewQueueAgingBucket,
  type OfficeReviewQueueFilter,
  type OfficeReviewQueueGroup,
  type OfficeReviewQueueItem,
  type OfficeReviewQueueReport,
  type OfficeReviewQueueAction,
  type OfficeReviewQueueSortMode,
  type OfficeReviewQueueReadinessColor,
  resolvePrimaryQueueAction,
  resolveQueueActions,
} from "@/shared/types/office-review-queue";
import type { QueueResolutionTrendSummary } from "@/shared/types/queue-resolution-trends";
import { formatCompletedWorkReviewReasons } from "@/shared/types/reports";
import { formatOperationalActivityTimestamp } from "@/shared/types/operational-activity";

type OfficeReviewQueueSectionProps = {
  report: OfficeReviewQueueReport;
  variant?: "full" | "compact";
  /** When compact, caps visible rows while preserving summary metrics. */
  itemLimit?: number;
  /** Reports-only queue filter from URL search params. Ignored in compact variant. */
  queueFilter?: OfficeReviewQueueFilter;
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

const FILTER_EMPTY_MESSAGES: Record<
  Exclude<OfficeReviewQueueFilter, "all">,
  string
> = {
  critical: "No critical items match this filter — completed work has no multi-blocker flags.",
  aging: `No aging items match this filter — nothing sitting ${OFFICE_REVIEW_QUEUE_AGING_DAYS}+ days without progress.`,
  attention: "No standard follow-up items match this filter.",
  invoicing: "No completed jobs awaiting invoicing match this filter.",
  stalled: "No stalled pipeline jobs match this filter.",
  integrity:
    "No data integrity issues match this filter — dispatch, labor, billing, and workflow fields are in sync.",
};

const GROUP_FILTER_MAP: Partial<
  Record<OfficeReviewQueueFilter, OfficeReviewQueueGroup>
> = {
  critical: "critical",
  aging: "aging",
  attention: "needs_attention",
};

const GROUP_EMPTY_MESSAGES: Record<OfficeReviewQueueGroup, string> = {
  critical: "No critical items — completed work has no multi-blocker flags.",
  needs_attention: "No standard follow-up items in this group.",
  aging: `No aging items — nothing sitting ${OFFICE_REVIEW_QUEUE_AGING_DAYS}+ days without progress.`,
};

function severityBadgeClassName(
  severity: OfficeReviewQueueItem["severity"],
  escalated = false,
): string {
  if (escalated) {
    return "bg-rose-200 text-rose-950 ring-1 ring-rose-400/60";
  }

  switch (severity) {
    case "critical":
      return "bg-rose-100 text-rose-800";
    case "warning":
      return "bg-amber-100 text-amber-800";
    case "info":
      return "bg-sky-100 text-sky-800";
  }
}

function agingBucketBadgeClassName(
  bucket: OfficeReviewQueueAgingBucket,
): string {
  switch (bucket) {
    case "fresh":
      return "bg-emerald-100 text-emerald-800";
    case "aging":
      return "bg-amber-100 text-amber-900";
    case "overdue":
      return "bg-rose-100 text-rose-900 ring-1 ring-rose-300/70";
  }
}

function readinessBadgeClassName(
  color: OfficeReviewQueueReadinessColor,
): string {
  switch (color) {
    case "emerald":
      return "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200/80";
    case "sky":
      return "bg-sky-100 text-sky-900 ring-1 ring-sky-200/80";
    case "amber":
      return "bg-amber-100 text-amber-900 ring-1 ring-amber-200/80";
    case "orange":
      return "bg-orange-100 text-orange-900 ring-1 ring-orange-200/80";
    case "rose":
      return "bg-rose-100 text-rose-900 ring-1 ring-rose-300/70";
  }
}

function readinessProgressBarClassName(
  color: OfficeReviewQueueReadinessColor,
): string {
  switch (color) {
    case "emerald":
      return "bg-emerald-500";
    case "sky":
      return "bg-sky-500";
    case "amber":
      return "bg-amber-500";
    case "orange":
      return "bg-orange-500";
    case "rose":
      return "bg-rose-500";
  }
}

function ReadinessLegend({ compact = false }: { compact?: boolean }) {
  return (
    <details
      className={`rounded-lg border border-slate-200 bg-white ${
        compact ? "px-3 py-2" : "px-3 py-2.5"
      }`}
    >
      <summary className="cursor-pointer text-xs font-semibold text-slate-700">
        Workflow readiness legend
      </summary>
      <ul className={`mt-2 space-y-1.5 ${compact ? "text-[11px]" : "text-xs"} text-slate-600`}>
        {OFFICE_REVIEW_QUEUE_READINESS_LEGEND.map((entry) => (
          <li key={entry.score} className="flex items-start gap-2">
            <span
              className={`mt-0.5 inline-flex shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${readinessBadgeClassName(
                entry.score === 100
                  ? "emerald"
                  : entry.score === 75
                    ? "sky"
                    : entry.score === 50
                      ? "amber"
                      : entry.score === 25
                        ? "orange"
                        : "rose",
              )}`}
            >
              {entry.score}
            </span>
            <span>
              <span className="font-semibold text-slate-800">{entry.label}</span>
              {" — "}
              {entry.description}
            </span>
          </li>
        ))}
      </ul>
      <ul className="mt-2 space-y-1 border-t border-slate-200 pt-2 text-[11px] text-slate-500">
        {OFFICE_REVIEW_QUEUE_READINESS_LIMITATIONS.map((limitation) => (
          <li key={limitation}>{limitation}</li>
        ))}
      </ul>
    </details>
  );
}

function ReadinessIndicator({
  item,
  showProgress = true,
}: {
  item: OfficeReviewQueueItem;
  showProgress?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span
        className={`inline-flex w-fit max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${readinessBadgeClassName(item.readinessColor)}`}
        title={item.readinessExplanation}
      >
        <span className="tabular-nums">{item.readinessScore}</span>
        <span className="truncate normal-case">{item.readinessLabel}</span>
      </span>
      {showProgress ? (
        <div
          className="h-1 w-full max-w-[8rem] overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/80"
          role="progressbar"
          aria-valuenow={item.readinessScore}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Workflow readiness ${item.readinessScore}% — ${item.readinessLabel}`}
        >
          <div
            className={`h-full rounded-full transition-[width] ${readinessProgressBarClassName(item.readinessColor)}`}
            style={{ width: `${item.readinessScore}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

function queueItemRowClassName(item: OfficeReviewQueueItem): string {
  if (item.severityEscalated) {
    return "border-l-4 border-rose-500 bg-rose-50/50";
  }

  if (item.agingBucket === "overdue") {
    return "border-l-4 border-rose-300 bg-rose-50/30";
  }

  return "";
}

function groupAccentClassName(group: OfficeReviewQueueGroup): string {
  switch (group) {
    case "critical":
      return "border-rose-200 bg-rose-50/40";
    case "needs_attention":
      return "border-amber-200 bg-amber-50/30";
    case "aging":
      return "border-slate-200 bg-white";
  }
}

function MetricCard({
  label,
  value,
  description,
  icon: Icon,
  iconClassName,
  accentClassName,
  compact = false,
}: {
  label: string;
  value: string;
  description: string;
  icon: typeof AlertTriangle;
  iconClassName: string;
  accentClassName: string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div
        className={`rounded-lg border bg-white px-3 py-2.5 ${accentClassName}`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[10px] font-bold uppercase tracking-wide text-slate-500">
              {label}
            </p>
            <p className="mt-0.5 truncate text-lg font-black tabular-nums text-slate-900">
              {value}
            </p>
          </div>
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconClassName}`}
          >
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </div>
    );
  }

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

function formatTrendDelta(delta: number): string {
  if (delta > 0) {
    return `+${delta}`;
  }

  return String(delta);
}

function getTrendStyles(direction: QueueResolutionTrendSummary["direction"]): {
  chipClassName: string;
  icon: typeof TrendingUp;
  iconClassName: string;
} {
  switch (direction) {
    case "improving":
      return {
        chipClassName: "border-emerald-200 bg-emerald-50 text-emerald-900",
        icon: TrendingUp,
        iconClassName: "text-emerald-700",
      };
    case "declining":
      return {
        chipClassName: "border-rose-200 bg-rose-50 text-rose-900",
        icon: TrendingDown,
        iconClassName: "text-rose-700",
      };
    case "stable":
      return {
        chipClassName: "border-slate-200 bg-white text-slate-800",
        icon: Minus,
        iconClassName: "text-slate-600",
      };
  }
}

function QueueResolutionTrendBanner({
  trend,
  compact = false,
}: {
  trend: QueueResolutionTrendSummary;
  compact?: boolean;
}) {
  const styles = getTrendStyles(trend.direction);
  const TrendIcon = styles.icon;

  if (compact) {
    return (
      <div
        className={`mt-2 flex flex-col gap-2 rounded-lg border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between ${styles.chipClassName}`}
        role="status"
        aria-label={trend.headline}
      >
        <div className="flex min-w-0 items-start gap-2">
          <TrendIcon
            className={`mt-0.5 h-4 w-4 shrink-0 ${styles.iconClassName}`}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="text-xs font-bold">{trend.headline}</p>
            <p className="mt-0.5 text-[11px] opacity-90">{trend.detail}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex items-center rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold tabular-nums ring-1 ring-black/5">
            WoW {formatTrendDelta(trend.weekOverWeekDelta)}
          </span>
          <span className="inline-flex items-center rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold tabular-nums ring-1 ring-black/5">
            7d avg {trend.rollingSevenDayAverage.toFixed(1)}/d
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`mt-3 rounded-xl border px-4 py-3 sm:mt-4 ${styles.chipClassName}`}
      role="status"
      aria-label={trend.headline}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/80 ring-1 ring-black/5">
            <TrendIcon className={`h-4 w-4 ${styles.iconClassName}`} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-bold">{trend.headline}</p>
              <span className="inline-flex items-center rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-black/5">
                {trend.direction}
              </span>
            </div>
            <p className="mt-1 text-xs opacity-90">{trend.detail}</p>
          </div>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-lg bg-white/80 px-2.5 py-2 ring-1 ring-black/5">
            <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">
              This week
            </p>
            <p className="mt-0.5 text-lg font-black tabular-nums">
              {trend.resolvedThisWeek}
            </p>
          </div>
          <div className="rounded-lg bg-white/80 px-2.5 py-2 ring-1 ring-black/5">
            <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">
              Last week
            </p>
            <p className="mt-0.5 text-lg font-black tabular-nums">
              {trend.resolvedLastWeek}
            </p>
          </div>
          <div className="rounded-lg bg-white/80 px-2.5 py-2 ring-1 ring-black/5">
            <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">
              WoW delta
            </p>
            <p className="mt-0.5 text-lg font-black tabular-nums">
              {formatTrendDelta(trend.weekOverWeekDelta)}
            </p>
          </div>
          <div className="rounded-lg bg-white/80 px-2.5 py-2 ring-1 ring-black/5">
            <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">
              7d avg
            </p>
            <p className="mt-0.5 text-lg font-black tabular-nums">
              {trend.rollingSevenDayAverage.toFixed(1)}
              <span className="text-xs font-semibold">/d</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function QueueEmptyState() {
  return (
    <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center sm:py-10">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 ring-1 ring-emerald-600/10">
        <Sparkles className="h-6 w-6 text-emerald-600" />
      </div>
      <h3 className="mt-4 text-sm font-bold text-slate-900">
        Queue is clear
      </h3>
      <p className="mt-1 max-w-sm text-xs text-slate-500 sm:text-sm">
        No items need office review right now. Completed-work flags, invoicing
        backlog, and stalled jobs will appear here.
      </p>
    </div>
  );
}

function GroupEmptyState({ group }: { group: OfficeReviewQueueGroup }) {
  const isPositive = group === "critical" || group === "aging";

  return (
    <div
      className={`px-3 py-4 text-center sm:px-4 ${
        isPositive ? "bg-white/80" : "bg-white/60"
      }`}
    >
      <div className="mx-auto flex max-w-md items-start justify-center gap-2 text-left sm:items-center sm:text-center">
        {isPositive ? (
          <CheckCircle2
            className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 sm:mt-0"
            aria-hidden="true"
          />
        ) : (
          <Inbox
            className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 sm:mt-0"
            aria-hidden="true"
          />
        )}
        <p className="text-xs text-slate-600 sm:text-sm">
          {GROUP_EMPTY_MESSAGES[group]}
        </p>
      </div>
    </div>
  );
}

function FilterEmptyState({
  filter,
  clearHref,
}: {
  filter: Exclude<OfficeReviewQueueFilter, "all">;
  clearHref: string;
}) {
  return (
    <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center sm:py-10">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 ring-1 ring-slate-200">
        <Inbox className="h-6 w-6 text-slate-500" />
      </div>
      <h3 className="mt-4 text-sm font-bold text-slate-900">
        No items for {getOfficeReviewQueueFilterLabel(filter)}
      </h3>
      <p className="mt-1 max-w-sm text-xs text-slate-500 sm:text-sm">
        {FILTER_EMPTY_MESSAGES[filter]}
      </p>
      <Link
        href={clearHref}
        className="mt-4 inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
      >
        Clear filter
      </Link>
    </div>
  );
}

function QueueDrilldownBanner({
  filter,
}: {
  filter: Exclude<OfficeReviewQueueFilter, "all">;
}) {
  return (
    <div
      className="mt-3 rounded-xl border border-violet-200 bg-violet-50/70 px-3 py-2.5 sm:mt-4"
      role="status"
    >
      <p className="text-xs font-semibold text-violet-950">
        Operational focus · {getOfficeReviewQueueFilterLabel(filter)}
      </p>
      <p className="mt-0.5 text-xs leading-relaxed text-violet-900/80">
        {getOfficeReviewQueueFilterDescription(filter)}
      </p>
    </div>
  );
}

const QUEUE_PREFERENCE_LIMITATIONS = [
  "Queue filter, sort, and collapse preferences are browser-local only — not synced across users or devices.",
  "No server-side preference storage yet — shared links use URL params; remembered defaults use localStorage.",
  ...OFFICE_REVIEW_QUEUE_SELECTION_LIMITATIONS,
  ...OFFICE_REVIEW_QUEUE_BATCH_PREVIEW_LIMITATIONS,
  ...OFFICE_REVIEW_QUEUE_PRESET_LIMITATIONS,
] as const;

function buildReportsHref(input: {
  filter: OfficeReviewQueueFilter;
  range: string | null;
  sortMode?: OfficeReviewQueueSortMode;
  collapsedGroups?: ReadonlySet<OfficeReviewQueueGroup>;
}): string {
  const { filter, range, sortMode = "severity_first", collapsedGroups } = input;
  const params = new URLSearchParams();

  if (range) {
    params.set("range", range);
  }

  if (filter !== "all") {
    params.set("queue", filter);
  }

  if (sortMode !== "severity_first") {
    params.set("queueSort", sortMode);
  }

  if (collapsedGroups && collapsedGroups.size > 0) {
    params.set("queueCollapsed", [...collapsedGroups].join(","));
  }

  const query = params.toString();
  return query ? `/reports?${query}` : "/reports";
}

function QueuePresetBar({
  activeFilter,
  sortMode,
  onApplyPreset,
  onResetToDefault,
}: {
  activeFilter: OfficeReviewQueueFilter;
  sortMode: OfficeReviewQueueSortMode;
  onApplyPreset: (preset: OfficeReviewQueuePreset) => void;
  onResetToDefault: () => void;
}) {
  const activePreset = resolveQueuePreset({
    filter: activeFilter,
    sortMode,
  });
  const showReset = !isDefaultOfficeReviewQueueView({
    filter: activeFilter,
    sortMode,
  });

  return (
    <div className="mt-3 min-w-0 sm:mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Saved views
        </p>
        {showReset ? (
          <button
            type="button"
            onClick={onResetToDefault}
            className="inline-flex min-h-9 shrink-0 items-center text-xs font-semibold text-cyan-700 hover:text-cyan-800"
          >
            Reset to default
          </button>
        ) : null}
      </div>
      <div className="-mx-1 mt-2 overflow-x-auto px-1 pb-1">
        <div
          className="flex w-max min-w-full gap-2 sm:flex-wrap sm:w-auto"
          role="tablist"
          aria-label="Office review queue saved views"
        >
          {OFFICE_REVIEW_QUEUE_PRESETS.map((preset) => {
            const isActive = activePreset?.id === preset.id;

            return (
              <button
                key={preset.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                title={preset.description}
                onClick={() => onApplyPreset(preset)}
                className={`inline-flex min-h-10 shrink-0 items-center rounded-full px-3.5 py-2 text-xs font-semibold transition-colors sm:min-h-9 ${
                  isActive
                    ? "bg-violet-600 text-white shadow-sm ring-1 ring-violet-700/20"
                    : "bg-violet-50 text-violet-800 ring-1 ring-violet-200 hover:bg-violet-100"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function QueueFilterBar({
  activeFilter,
  range,
  sortMode,
  collapsedGroups,
}: {
  activeFilter: OfficeReviewQueueFilter;
  range: string | null;
  sortMode: OfficeReviewQueueSortMode;
  collapsedGroups: ReadonlySet<OfficeReviewQueueGroup>;
}) {
  const clearHref = buildReportsHref({
    filter: "all",
    range,
    sortMode,
    collapsedGroups,
  });

  return (
    <div className="mt-3 min-w-0 sm:mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Filter queue
        </p>
        {activeFilter !== "all" ? (
          <Link
            href={clearHref}
            className="inline-flex min-h-9 shrink-0 items-center text-xs font-semibold text-cyan-700 hover:text-cyan-800"
          >
            Clear filter
          </Link>
        ) : null}
      </div>
      <div className="-mx-1 mt-2 overflow-x-auto px-1 pb-1">
        <div
          className="flex w-max min-w-full gap-2 sm:flex-wrap sm:w-auto"
          role="tablist"
          aria-label="Office review queue filters"
        >
          {OFFICE_REVIEW_QUEUE_FILTER_OPTIONS.map((option) => {
            const isActive = option.value === activeFilter;

            return (
              <Link
                key={option.value}
                href={buildReportsHref({
                  filter: option.value,
                  range,
                  sortMode,
                  collapsedGroups,
                })}
                role="tab"
                aria-selected={isActive}
                className={`inline-flex min-h-10 shrink-0 items-center rounded-full px-3.5 py-2 text-xs font-semibold transition-colors sm:min-h-9 ${
                  isActive
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {option.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function primaryActionClassName(): string {
  return "inline-flex min-h-10 w-full min-w-0 max-w-full items-center justify-center gap-1 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-800 transition-colors hover:border-cyan-300 hover:bg-cyan-100 sm:min-h-0 sm:w-auto sm:max-w-none sm:justify-start sm:px-3 sm:py-2";
}

function secondaryActionClassName(): string {
  return "inline-flex min-h-9 w-full min-w-0 max-w-full items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 sm:min-h-0 sm:w-auto sm:max-w-none sm:justify-start sm:px-2 sm:py-1";
}

function QueueActionLink({
  action,
  variant,
}: {
  action: OfficeReviewQueueAction;
  variant: "primary" | "secondary";
}) {
  if (!isValidQueueActionHref(action.href)) {
    return null;
  }

  const className =
    variant === "primary"
      ? primaryActionClassName()
      : secondaryActionClassName();

  return (
    <Link href={action.href} className={className}>
      <span className="min-w-0 truncate">{action.label}</span>
      {action.external ? (
        <ExternalLink
          className={`h-3 w-3 shrink-0 ${variant === "primary" ? "text-cyan-600/80" : "text-slate-400"}`}
          aria-hidden="true"
        />
      ) : null}
    </Link>
  );
}

function QueueItemActions({
  item,
  compact = false,
}: {
  item: OfficeReviewQueueItem;
  compact?: boolean;
}) {
  const primary = resolvePrimaryQueueAction(item);
  const actions = resolveQueueActions(item);

  if (!primary || !isValidQueueActionHref(primary.href)) {
    return null;
  }

  if (compact) {
    return (
      <div className="w-full min-w-0 shrink-0 sm:w-auto">
        <QueueActionLink action={primary} variant="primary" />
      </div>
    );
  }

  const secondaryActions = dedupeQueueActions(
    actions.filter((action) => action.id !== primary.id),
  ).slice(0, 1);

  return (
    <div className="flex w-full min-w-0 flex-col gap-1.5 sm:w-auto sm:items-end">
      <QueueActionLink action={primary} variant="primary" />
      {secondaryActions.length > 0 ? (
        <div className="flex w-full flex-col gap-1 sm:flex-row sm:flex-wrap sm:justify-end">
          {secondaryActions.map((action) => (
            <QueueActionLink
              key={action.id}
              action={action}
              variant="secondary"
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function QueueItemRow({
  item,
  showActions,
  compactActions = false,
  dense = false,
  selectionEnabled = false,
  isSelected = false,
  onToggleSelect,
}: {
  item: OfficeReviewQueueItem;
  showActions: boolean;
  compactActions?: boolean;
  dense?: boolean;
  selectionEnabled?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (jobId: string) => void;
}) {
  const hasValidJobLink = isValidOfficeReviewQueueJobId(item.jobId);
  const jobHref = hasValidJobLink
    ? `/jobs/${encodeURIComponent(item.jobId)}`
    : null;

  return (
    <li
      className={`px-3 py-2.5 sm:px-4 sm:py-3 ${queueItemRowClassName(item)} ${
        selectionEnabled && isSelected ? "bg-violet-50/60" : ""
      }`}
    >
      <div className="flex min-w-0 flex-col gap-2 sm:gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-1 gap-2.5 sm:gap-3">
          {selectionEnabled ? (
            <label className="flex min-h-10 shrink-0 items-start pt-0.5 sm:min-h-0">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleSelect?.(item.jobId)}
                aria-label={`Select ${item.jobNumber} for bulk actions`}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
              />
            </label>
          ) : null}
          <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
            {jobHref ? (
              <Link
                href={jobHref}
                className="shrink-0 text-sm font-bold text-slate-900 hover:text-cyan-700"
              >
                {item.jobNumber}
              </Link>
            ) : (
              <span className="shrink-0 text-sm font-bold text-slate-900">
                {item.jobNumber}
              </span>
            )}
            <span className="max-w-full truncate rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-700">
              {formatOfficeReviewQueueKind(item.kind)}
            </span>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${agingBucketBadgeClassName(item.agingBucket)}`}
              title={`Operational age bucket: ${item.agingLabel} (${item.daysAging}d)`}
            >
              {item.agingLabel}
            </span>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${severityBadgeClassName(item.severity, item.severityEscalated)}`}
            >
              {item.severityEscalated ? "Critical · overdue" : item.severity}
            </span>
            <ReadinessIndicator item={item} showProgress={!dense} />
            {item.jobStatus ? (
              <JobStatusBadge
                status={item.jobStatus}
                className="shrink-0 px-2 py-0.5 text-[10px]"
              />
            ) : null}
          </div>
          <p className="mt-1 truncate text-sm text-slate-600">
            {item.customerName}
            {item.assignedTechnician
              ? ` · ${item.assignedTechnician}`
              : " · Unassigned"}
          </p>
          {!dense ? (
            item.reviewReasons.length > 0 ? (
              <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 sm:line-clamp-none">
                {formatCompletedWorkReviewReasons(item.reviewReasons)}
              </p>
            ) : (
              <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 sm:line-clamp-none">
                {item.detail}
              </p>
            )
          ) : null}
          <div
            className={`mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500 sm:mt-2 sm:gap-x-4 sm:text-xs ${
              dense ? "" : "max-sm:gap-y-1"
            }`}
          >
            <span className="shrink-0">
              {item.daysAging}d aging
            </span>
            <span className="shrink-0">
              {item.blockerCount} blocker{item.blockerCount === 1 ? "" : "s"}
            </span>
            {!dense ? (
              <span className="min-w-0 truncate max-sm:hidden">
                Last activity{" "}
                {item.lastActivityAt
                  ? formatOperationalActivityTimestamp(item.lastActivityAt)
                  : "not recorded"}
              </span>
            ) : null}
          </div>
          </div>
        </div>
        {showActions ? (
          <QueueItemActions item={item} compact={compactActions} />
        ) : null}
      </div>
    </li>
  );
}

function GroupSelectCheckbox({
  groupLabel,
  allSelected,
  someSelected,
  onChange,
}: {
  groupLabel: string;
  allSelected: boolean;
  someSelected: boolean;
  onChange: (selectAll: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  return (
    <label
      className="flex min-h-10 shrink-0 items-start pt-0.5 sm:min-h-0"
      onClick={(event) => event.stopPropagation()}
    >
      <input
        ref={inputRef}
        type="checkbox"
        checked={allSelected}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onChange(event.target.checked)
        }
        aria-label={`Select all visible items in ${groupLabel}`}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
      />
    </label>
  );
}

function QueueBatchPreviewModal({
  preview,
  selectedItems,
  onClose,
}: {
  preview: OfficeReviewQueueBatchPreview;
  selectedItems: OfficeReviewQueueItem[];
  onClose: () => void;
}) {
  const summary = summarizeQueueBatchPreview(preview);
  const selectedByJobId = useMemo(
    () => new Map(selectedItems.map((item) => [item.jobId, item])),
    [selectedItems],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="queue-batch-preview-title"
    >
      <button
        type="button"
        aria-label="Close batch preview"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/50"
      />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-violet-200 bg-white shadow-xl sm:max-h-[85vh] sm:rounded-2xl">
        <header className="flex shrink-0 items-start gap-3 border-b border-violet-100 bg-violet-50/60 px-4 py-3.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 ring-1 ring-violet-200">
            <Eye className="h-4 w-4 text-violet-700" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-violet-700">
              Batch preview
            </p>
            <h2
              id="queue-batch-preview-title"
              className="mt-0.5 text-sm font-bold text-slate-900 sm:text-base"
            >
              {preview.label}
            </h2>
            <p className="mt-0.5 text-xs text-slate-600">{summary.headline}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-violet-200 bg-white text-violet-800 transition-colors hover:bg-violet-50"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-emerald-100 bg-emerald-50/70 px-2.5 py-2 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-800/80">
                Eligible
              </p>
              <p className="mt-0.5 text-lg font-black tabular-nums text-emerald-900">
                {preview.eligibleCount}
              </p>
            </div>
            <div className="rounded-lg border border-rose-100 bg-rose-50/70 px-2.5 py-2 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wide text-rose-800/80">
                Blocked
              </p>
              <p className="mt-0.5 text-lg font-black tabular-nums text-rose-900">
                {preview.blockedCount}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-600">
                Selected
              </p>
              <p className="mt-0.5 text-lg font-black tabular-nums text-slate-900">
                {preview.totalSelected}
              </p>
            </div>
          </div>

          {summary.detail ? (
            <p className="mt-3 text-xs text-slate-600">{summary.detail}</p>
          ) : null}

          <div className="mt-4 rounded-lg border border-cyan-100 bg-cyan-50/60 px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-cyan-800">
              Recommended next step
            </p>
            <p className="mt-1 text-xs text-cyan-950/90">
              {summary.recommendedNextStep}
            </p>
          </div>

          {preview.blockedReasons.length > 0 ? (
            <div className="mt-4">
              <p className="text-xs font-bold text-slate-900">Blocked reasons</p>
              <ul className="mt-2 space-y-2">
                {preview.blockedReasons.map((entry) => (
                  <li
                    key={entry.reason}
                    className="rounded-lg border border-slate-100 bg-white px-3 py-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-800">
                        {entry.label}
                      </p>
                      <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold tabular-nums text-rose-800">
                        {entry.count}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {preview.eligibleJobIds.length > 0 ? (
            <div className="mt-4">
              <p className="text-xs font-bold text-slate-900">
                Would affect ({preview.eligibleJobIds.length})
              </p>
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-emerald-100 bg-emerald-50/40 p-2">
                {preview.eligibleJobIds.map((jobId) => {
                  const item = selectedByJobId.get(jobId);

                  return (
                    <li key={jobId}>
                      <Link
                        href={`/jobs/${encodeURIComponent(jobId)}`}
                        className="flex min-h-9 items-center justify-between gap-2 rounded-md px-2 py-1.5 text-xs font-semibold text-emerald-900 transition-colors hover:bg-emerald-100/70"
                      >
                        <span className="truncate">
                          {item?.jobNumber ?? jobId}
                        </span>
                        <ArrowRight
                          className="h-3.5 w-3.5 shrink-0 opacity-70"
                          aria-hidden="true"
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {preview.blockedJobIds.length > 0 ? (
            <div className="mt-4">
              <p className="text-xs font-bold text-slate-900">
                Blocked jobs ({preview.blockedJobIds.length})
              </p>
              <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto rounded-lg border border-rose-100 bg-rose-50/30 p-2">
                {preview.jobs
                  .filter((job) => !job.eligible)
                  .map((job) => (
                    <li
                      key={job.jobId}
                      className="rounded-md px-2 py-1.5 text-xs text-rose-900/90"
                    >
                      <span className="font-semibold">{job.jobNumber}</span>
                      {job.blockedReasons.length > 0 ? (
                        <span className="text-rose-800/80">
                          {" "}
                          ·{" "}
                          {job.blockedReasons
                            .map((reason) => BATCH_BLOCK_REASON_LABELS[reason])
                            .join(", ")}
                        </span>
                      ) : null}
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}

          <div
            className="mt-4 rounded-lg border border-amber-200/80 bg-amber-50/60 px-3 py-2.5"
            role="note"
          >
            <p className="text-xs font-bold text-amber-900">
              Bulk workflows coming soon
            </p>
            <ul className="mt-1.5 space-y-1 text-[11px] text-amber-900/90">
              {OFFICE_REVIEW_QUEUE_BATCH_PREVIEW_LIMITATIONS.map((limitation) => (
                <li key={limitation}>{limitation}</li>
              ))}
            </ul>
          </div>
        </div>

        <footer className="shrink-0 border-t border-violet-100 bg-white px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-900 transition-colors hover:bg-violet-100 sm:min-h-9"
          >
            Close preview
          </button>
        </footer>
      </div>
    </div>
  );
}

function QueueBulkSelectionBar({
  selectedCount,
  bulkActions,
  onClearSelection,
  onPreviewAction,
}: {
  selectedCount: number;
  bulkActions: OfficeReviewQueueBulkActionAvailability[];
  onClearSelection: () => void;
  onPreviewAction: (actionId: OfficeReviewQueueBulkActionId) => void;
}) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div
      className="sticky bottom-0 z-20 -mx-4 mt-4 border-t border-violet-200 bg-violet-50/95 px-4 py-3 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.25)] backdrop-blur-sm sm:-mx-5 sm:px-5"
      role="region"
      aria-label="Bulk queue actions"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-bold text-violet-950">
            {selectedCount} item{selectedCount === 1 ? "" : "s"} selected
          </p>
          <p className="mt-0.5 text-xs text-violet-800/80">
            Preview what batch actions would affect — no execution yet.
          </p>
        </div>
        <button
          type="button"
          onClick={onClearSelection}
          className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs font-semibold text-violet-800 transition-colors hover:border-violet-300 hover:bg-violet-50 sm:min-h-9"
        >
          Clear selection
        </button>
      </div>
      <div className="-mx-1 mt-3 overflow-x-auto px-1 pb-1">
        <div className="flex w-max min-w-full gap-2 sm:flex-wrap sm:w-auto">
          {bulkActions.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() => onPreviewAction(action.id)}
              title="Preview batch action — no execution"
              className="inline-flex min-h-10 shrink-0 items-center rounded-lg border border-violet-300 bg-white px-3 py-2 text-xs font-semibold text-violet-900 transition-colors hover:border-violet-400 hover:bg-violet-100 sm:min-h-9"
            >
              <Eye className="mr-1.5 h-3.5 w-3.5 shrink-0 text-violet-600" aria-hidden="true" />
              Preview {action.label.toLowerCase()}
              {action.applicableCount > 0 ? (
                <span className="ml-1.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-emerald-800">
                  {action.applicableCount}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function QueueGroupSection({
  group,
  items,
  showActions,
  compactActions = false,
  showEmptyState,
  collapsible = false,
  isCollapsed = false,
  onToggleCollapse,
  selectionEnabled = false,
  selectedJobIds,
  onToggleItemSelect,
  onToggleGroupSelect,
}: {
  group: OfficeReviewQueueGroup;
  items: OfficeReviewQueueItem[];
  showActions: boolean;
  compactActions?: boolean;
  showEmptyState: boolean;
  collapsible?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  selectionEnabled?: boolean;
  selectedJobIds?: ReadonlySet<string>;
  onToggleItemSelect?: (jobId: string) => void;
  onToggleGroupSelect?: (
    groupItems: OfficeReviewQueueItem[],
    selectAll: boolean,
  ) => void;
}) {
  if (items.length === 0 && !showEmptyState) {
    return null;
  }

  const groupSelection =
    selectionEnabled && selectedJobIds
      ? resolveGroupSelectionState(selectedJobIds, items)
      : null;
  const showGroupSelect =
    selectionEnabled &&
    items.length > 0 &&
    groupSelection != null &&
    onToggleGroupSelect != null;

  const groupTitle = (
    <div className="flex min-w-0 flex-1 items-start gap-2">
      {showGroupSelect ? (
        <GroupSelectCheckbox
          groupLabel={GROUP_LABELS[group]}
          allSelected={groupSelection.allSelected}
          someSelected={groupSelection.someSelected}
          onChange={(selectAll) => onToggleGroupSelect(items, selectAll)}
        />
      ) : null}
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-bold text-slate-900">
          {GROUP_LABELS[group]}
        </h3>
        <p className="mt-0.5 hidden text-xs text-slate-600 sm:block">
          {GROUP_DESCRIPTIONS[group]}
        </p>
      </div>
    </div>
  );

  const headerContent = (
    <>
      {groupTitle}
      <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-bold tabular-nums text-slate-700 ring-1 ring-slate-200">
        {items.length}
      </span>
    </>
  );

  return (
    <section className={`overflow-hidden rounded-xl border ${groupAccentClassName(group)}`}>
      <div
        className={`px-3 py-2.5 sm:px-4 sm:py-3 ${
          !isCollapsed ? "border-b border-inherit" : ""
        }`}
      >
        {collapsible && onToggleCollapse ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-expanded={!isCollapsed}
            className="flex w-full flex-wrap items-start justify-between gap-2 text-left transition-colors hover:opacity-90"
          >
            <span className="flex min-w-0 flex-1 items-start gap-2">
              {isCollapsed ? (
                <ChevronRight
                  className="mt-0.5 h-4 w-4 shrink-0 text-slate-500"
                  aria-hidden="true"
                />
              ) : (
                <ChevronDown
                  className="mt-0.5 h-4 w-4 shrink-0 text-slate-500"
                  aria-hidden="true"
                />
              )}
              {groupTitle}
            </span>
            <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-bold tabular-nums text-slate-700 ring-1 ring-slate-200">
              {items.length}
            </span>
          </button>
        ) : (
          <div className="flex flex-wrap items-start justify-between gap-2">
            {headerContent}
          </div>
        )}
      </div>
      {!isCollapsed ? (
        items.length === 0 ? (
          <GroupEmptyState group={group} />
        ) : (
          <ul className="divide-y divide-slate-100 bg-white/80 transition-opacity duration-200">
            {items.map((item) => (
              <QueueItemRow
                key={item.jobId}
                item={item}
                showActions={showActions}
                compactActions={compactActions}
                selectionEnabled={selectionEnabled}
                isSelected={selectedJobIds?.has(item.jobId) ?? false}
                onToggleSelect={onToggleItemSelect}
              />
            ))}
          </ul>
        )
      ) : null}
    </section>
  );
}

const SORT_MODE_OPTIONS: {
  value: OfficeReviewQueueSortMode;
  label: string;
}[] = [
  { value: "severity_first", label: "Highest severity" },
  { value: "readiness_highest_first", label: "Most ready" },
  { value: "readiness_lowest_first", label: "Least ready" },
  { value: "blockers_first", label: "Most blockers" },
  { value: "oldest_first", label: "Oldest first" },
  { value: "newest_first", label: "Newest first" },
];

function SortToggle({
  sortMode,
  onChange,
}: {
  sortMode: OfficeReviewQueueSortMode;
  onChange: (mode: OfficeReviewQueueSortMode) => void;
}) {
  return (
    <div
      className="flex w-full max-w-full flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-1 text-xs font-semibold sm:w-auto"
      role="group"
      aria-label="Sort office review queue"
    >
      {SORT_MODE_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`min-h-9 flex-1 rounded-md px-2.5 py-1.5 transition-colors sm:min-h-0 sm:flex-none sm:px-3 ${
            sortMode === option.value
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          {option.label}
        </button>
      ))}
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

function renderFilteredGroupSections(input: {
  activeFilter: OfficeReviewQueueFilter;
  activeGroupFilter: OfficeReviewQueueGroup | undefined;
  groups: Record<OfficeReviewQueueGroup, OfficeReviewQueueItem[]>;
  showActions: boolean;
  compactActions?: boolean;
  collapsedGroups: ReadonlySet<OfficeReviewQueueGroup>;
  onToggleGroupCollapse: (group: OfficeReviewQueueGroup) => void;
  selectionEnabled?: boolean;
  selectedJobIds?: ReadonlySet<string>;
  onToggleItemSelect?: (jobId: string) => void;
  onToggleGroupSelect?: (
    groupItems: OfficeReviewQueueItem[],
    selectAll: boolean,
  ) => void;
}): ReactNode {
  const {
    activeFilter,
    activeGroupFilter,
    groups,
    showActions,
    compactActions,
    collapsedGroups,
    onToggleGroupCollapse,
    selectionEnabled = false,
    selectedJobIds,
    onToggleItemSelect,
    onToggleGroupSelect,
  } = input;

  if (activeGroupFilter) {
    return (
      <QueueGroupSection
        group={activeGroupFilter}
        items={groups[activeGroupFilter]}
        showActions={showActions}
        compactActions={compactActions}
        showEmptyState
        collapsible
        isCollapsed={collapsedGroups.has(activeGroupFilter)}
        onToggleCollapse={() => onToggleGroupCollapse(activeGroupFilter)}
        selectionEnabled={selectionEnabled}
        selectedJobIds={selectedJobIds}
        onToggleItemSelect={onToggleItemSelect}
        onToggleGroupSelect={onToggleGroupSelect}
      />
    );
  }

  const groupOrder: OfficeReviewQueueGroup[] = [
    "critical",
    "needs_attention",
    "aging",
  ];

  return groupOrder.map((group) => {
    const items = groups[group];
    const showEmptyState =
      activeFilter === "all" && (group === "critical" || group === "aging");
    const hideWhenEmpty = activeFilter !== "all" && items.length === 0;

    if (hideWhenEmpty && !showEmptyState) {
      return null;
    }

    return (
      <QueueGroupSection
        key={group}
        group={group}
        items={items}
        showActions={showActions}
        compactActions={compactActions}
        showEmptyState={showEmptyState}
        collapsible
        isCollapsed={collapsedGroups.has(group)}
        onToggleCollapse={() => onToggleGroupCollapse(group)}
        selectionEnabled={selectionEnabled}
        selectedJobIds={selectedJobIds}
        onToggleItemSelect={onToggleItemSelect}
        onToggleGroupSelect={onToggleGroupSelect}
      />
    );
  });
}

export function OfficeReviewQueueSection({
  report,
  variant = "full",
  itemLimit,
  queueFilter = "all",
}: OfficeReviewQueueSectionProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isCompact = variant === "compact";
  const sectionRef = useRef<HTMLElement>(null);
  const hasScrolledToSectionRef = useRef(false);

  const queueParam = searchParams.get("queue");
  const sortParam = searchParams.get("queueSort");
  const collapsedParam = searchParams.get("queueCollapsed");
  const rangeParam = searchParams.get("range");

  const [savedFilter, setSavedFilter] = useState<OfficeReviewQueueFilter | null>(
    null,
  );
  const [sortMode, setSortMode] = useState<OfficeReviewQueueSortMode>(
    "severity_first",
  );
  const [collapsedGroups, setCollapsedGroups] = useState<
    Set<OfficeReviewQueueGroup>
  >(() => new Set());
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [previewActionId, setPreviewActionId] =
    useState<OfficeReviewQueueBulkActionId | null>(null);

  useEffect(() => {
    if (isCompact) {
      return;
    }

    const saved = loadQueuePreferences();

    if (queueParam == null) {
      setSavedFilter(saved.filter);
    }

    if (sortParam == null) {
      setSortMode(saved.sortMode);
    } else {
      setSortMode(parseQueueSortMode(sortParam));
    }

    if (collapsedParam == null) {
      setCollapsedGroups(new Set(saved.collapsedGroups));
    } else {
      setCollapsedGroups(new Set(parseCollapsedQueueGroups(collapsedParam)));
    }
  }, [collapsedParam, isCompact, queueParam, sortParam]);

  const activeFilter = isCompact
    ? "all"
    : queueParam != null
      ? queueFilter
      : (savedFilter ?? "all");
  const effectiveSortMode = isCompact ? "severity_first" : sortMode;
  const openedViaQueueParam = isOfficeReviewQueueFilterParam(queueParam);

  const clearHref = buildReportsHref({
    filter: "all",
    range: rangeParam,
    sortMode: effectiveSortMode,
    collapsedGroups,
  });

  useEffect(() => {
    if (isCompact) {
      return;
    }

    persistQueuePreferences({ filter: activeFilter });
  }, [activeFilter, isCompact]);

  useEffect(() => {
    if (isCompact) {
      return;
    }

    persistQueuePreferences({ sortMode: effectiveSortMode });
  }, [effectiveSortMode, isCompact]);

  const syncReportsUrl = (nextParams: URLSearchParams) => {
    const query = nextParams.toString();
    router.replace(query ? `/reports?${query}` : "/reports", { scroll: false });
  };

  useEffect(() => {
    if (isCompact || queueParam == null || openedViaQueueParam) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete("queue");
    syncReportsUrl(params);
  }, [isCompact, openedViaQueueParam, queueParam, searchParams]);

  useEffect(() => {
    if (
      isCompact ||
      hasScrolledToSectionRef.current ||
      !openedViaQueueParam
    ) {
      return;
    }

    hasScrolledToSectionRef.current = true;

    const frame = window.requestAnimationFrame(() => {
      sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [isCompact, openedViaQueueParam]);

  const handleSortChange = (nextSortMode: OfficeReviewQueueSortMode) => {
    if (isCompact) {
      return;
    }

    setSortMode(nextSortMode);

    const params = new URLSearchParams(searchParams.toString());
    if (nextSortMode === "severity_first") {
      params.delete("queueSort");
    } else {
      params.set("queueSort", nextSortMode);
    }

    syncReportsUrl(params);
  };

  const handleApplyPreset = (preset: OfficeReviewQueuePreset) => {
    if (isCompact) {
      return;
    }

    const { preferences, params } = applyQueuePreset(
      preset,
      new URLSearchParams(searchParams.toString()),
    );

    setSavedFilter(preferences.filter);
    setSortMode(preferences.sortMode);
    persistQueuePreferences(preferences);
    syncReportsUrl(params);
  };

  const handleResetToDefault = () => {
    if (isCompact) {
      return;
    }

    const { preferences, params } = applyQueueDefaultView(
      new URLSearchParams(searchParams.toString()),
    );

    setSavedFilter(preferences.filter);
    setSortMode(preferences.sortMode);
    persistQueuePreferences(preferences);
    syncReportsUrl(params);
  };

  const handleToggleGroupCollapse = (group: OfficeReviewQueueGroup) => {
    if (isCompact) {
      return;
    }

    setCollapsedGroups((previous) => {
      const next = new Set(previous);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }

      persistQueuePreferences({ collapsedGroups: [...next] });

      const params = new URLSearchParams(searchParams.toString());
      if (next.size === 0) {
        params.delete("queueCollapsed");
      } else {
        params.set("queueCollapsed", [...next].join(","));
      }

      syncReportsUrl(params);
      return next;
    });
  };

  const baseItems = useMemo(() => {
    const items =
      variant === "compact" && itemLimit != null
        ? report.summary.items.slice(0, itemLimit)
        : report.summary.items;

    return items.filter((item) => isValidOfficeReviewQueueJobId(item.jobId));
  }, [itemLimit, report.summary.items, variant]);

  const filteredItems = useMemo(
    () => filterOfficeReviewQueueItems(baseItems, activeFilter),
    [activeFilter, baseItems],
  );

  const groups = useMemo(
    () => recomputeGroups(filteredItems, effectiveSortMode),
    [filteredItems, effectiveSortMode],
  );

  useEffect(() => {
    if (isCompact) {
      return;
    }

    const validJobIds = new Set(baseItems.map((item) => item.jobId));
    setSelectedJobIds((previous) => {
      const pruned = pruneQueueSelection(previous, validJobIds);
      if (
        pruned.size === previous.size &&
        [...pruned].every((jobId) => previous.has(jobId))
      ) {
        return previous;
      }

      return pruned;
    });
  }, [baseItems, isCompact]);

  const selectedItems = useMemo(
    () => resolveSelectedQueueItems(baseItems, selectedJobIds),
    [baseItems, selectedJobIds],
  );

  const bulkActions = useMemo(
    () => resolveBulkQueueActionAvailability(selectedItems),
    [selectedItems],
  );

  const activeBatchPreview = useMemo(() => {
    if (previewActionId == null) {
      return null;
    }

    return buildQueueBatchPreview(selectedItems, previewActionId);
  }, [previewActionId, selectedItems]);

  const handleToggleItemSelect = (jobId: string) => {
    setSelectedJobIds((previous) => toggleQueueSelection(previous, jobId));
  };

  const handleToggleGroupSelect = (
    groupItems: OfficeReviewQueueItem[],
    selectAll: boolean,
  ) => {
    setSelectedJobIds((previous) =>
      toggleGroupQueueSelection(previous, groupItems, selectAll),
    );
  };

  const handleClearSelection = () => {
    setSelectedJobIds(clearQueueSelection());
    setPreviewActionId(null);
  };

  const handlePreviewAction = (actionId: OfficeReviewQueueBulkActionId) => {
    setPreviewActionId(actionId);
  };

  const handleCloseBatchPreview = () => {
    setPreviewActionId(null);
  };

  const showGrouped = !isCompact;
  const showActions = true;
  const compactActions = isCompact;
  const { summary, meta } = report;

  const visibleCount = baseItems.length;
  const hasMoreItems =
    isCompact && itemLimit != null && summary.totalCount > itemLimit;

  const activeGroupFilter = GROUP_FILTER_MAP[activeFilter];
  const isFiltered = activeFilter !== "all";
  const filteredCount = filteredItems.length;
  const showFilterEmptyState =
    isFiltered && filteredCount === 0 && summary.totalCount > 0;
  const showGlobalEmptyState = summary.totalCount === 0;
  const selectionEnabled =
    !isCompact && !showGlobalEmptyState && !showFilterEmptyState;

  return (
    <section
      ref={sectionRef}
      id={OFFICE_REVIEW_QUEUE_SECTION_ID}
      className={`admin-card min-w-0 scroll-mt-6 overflow-hidden p-3 lg:p-5 ${
        isFiltered && !isCompact
          ? "border-violet-300/80 ring-1 ring-violet-100"
          : ""
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2 max-lg:gap-2 lg:gap-3">
        <div className="flex min-w-0 items-start gap-2.5 lg:gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-50 ring-1 ring-violet-600/10 max-lg:h-8 max-lg:w-8 sm:h-10 sm:w-10">
            <ClipboardList className="h-4 w-4 text-violet-600 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="admin-heading-section text-sm sm:text-base">
              Office review queue
            </h2>
            <p className="admin-text-helper mt-0.5 sm:mt-1">
              {isCompact
                ? "Highest-priority items needing office follow-up"
                : "Centralized operational queue for completed-work review, invoicing backlog, and stalled pipeline jobs · All time"}
            </p>
          </div>
        </div>
        {!isCompact ? (
          <div className="flex w-full min-w-0 items-center gap-2 text-xs text-slate-500 sm:w-auto">
            <ArrowDownUp className="hidden h-3.5 w-3.5 sm:block" aria-hidden="true" />
            <SortToggle sortMode={effectiveSortMode} onChange={handleSortChange} />
          </div>
        ) : (
          <Link
            href="/reports"
            className="inline-flex min-h-9 w-full shrink-0 items-center justify-center gap-1.5 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-700 transition-colors hover:border-cyan-300 hover:bg-cyan-100 max-lg:min-h-9 max-lg:py-1.5 sm:min-h-0 sm:w-auto sm:py-2"
          >
            View all in reports
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        )}
      </div>

      {!isCompact ? (
        <>
          <QueuePresetBar
            activeFilter={activeFilter}
            sortMode={effectiveSortMode}
            onApplyPreset={handleApplyPreset}
            onResetToDefault={handleResetToDefault}
          />
          <QueueFilterBar
            activeFilter={activeFilter}
            range={rangeParam}
            sortMode={effectiveSortMode}
            collapsedGroups={collapsedGroups}
          />
          {isFiltered ? (
            <QueueDrilldownBanner
              filter={activeFilter as Exclude<OfficeReviewQueueFilter, "all">}
            />
          ) : null}
        </>
      ) : null}

      <div
        className={`mt-2.5 grid gap-1.5 lg:mt-4 lg:gap-4 ${
          isCompact
            ? "grid-cols-2 sm:grid-cols-4"
            : "sm:grid-cols-2 xl:grid-cols-5"
        }`}
      >
        <MetricCard
          label="Queue total"
          value={String(summary.totalCount)}
          description="Items needing office attention"
          icon={Briefcase}
          iconClassName="text-violet-600 bg-violet-50"
          accentClassName="border-violet-100"
          compact={isCompact}
        />
        <MetricCard
          label="Critical"
          value={String(summary.criticalCount)}
          description="Multiple completed-work blockers"
          icon={AlertTriangle}
          iconClassName="text-rose-600 bg-rose-50"
          accentClassName="border-rose-100"
          compact={isCompact}
        />
        <MetricCard
          label="Needs attention"
          value={String(summary.needsAttentionCount)}
          description="Standard follow-up items"
          icon={FileText}
          iconClassName="text-amber-600 bg-amber-50"
          accentClassName="border-amber-100"
          compact={isCompact}
        />
        <MetricCard
          label="Aging"
          value={String(summary.agingCount)}
          description={`${OFFICE_REVIEW_QUEUE_AGING_DAYS}+ days without progress`}
          icon={Clock}
          iconClassName="text-slate-600 bg-slate-100"
          accentClassName="border-slate-200"
          compact={isCompact}
        />
        {!isCompact ? (
          <MetricCard
            label="Resolved this week"
            value={String(summary.resolvedThisWeek)}
            description="Review blockers cleared on completed jobs"
            icon={CheckCircle2}
            iconClassName="text-emerald-600 bg-emerald-50"
            accentClassName="border-emerald-100"
          />
        ) : null}
      </div>

      <QueueResolutionTrendBanner
        trend={summary.resolutionTrend}
        compact={isCompact}
      />

      <div
        className={`mt-2 grid gap-1.5 lg:mt-3 lg:gap-3 ${
          isCompact ? "grid-cols-3" : "sm:grid-cols-3"
        }`}
      >
        <MetricCard
          label="Fresh"
          value={String(summary.agingBucketCounts.fresh)}
          description={`0–${OFFICE_REVIEW_QUEUE_FRESH_MAX_DAYS} days — newly surfaced`}
          icon={Sparkles}
          iconClassName="text-emerald-600 bg-emerald-50"
          accentClassName="border-emerald-100"
          compact={isCompact}
        />
        <MetricCard
          label="Aging"
          value={String(summary.agingBucketCounts.aging)}
          description={`${OFFICE_REVIEW_QUEUE_FRESH_MAX_DAYS + 1}–${OFFICE_REVIEW_QUEUE_AGING_BUCKET_MAX_DAYS} days — monitor follow-up`}
          icon={Clock}
          iconClassName="text-amber-600 bg-amber-50"
          accentClassName="border-amber-100"
          compact={isCompact}
        />
        <MetricCard
          label="Overdue"
          value={String(summary.agingBucketCounts.overdue)}
          description={`${OFFICE_REVIEW_QUEUE_AGING_DAYS}+ days — operationally neglected`}
          icon={AlertTriangle}
          iconClassName="text-rose-600 bg-rose-50"
          accentClassName="border-rose-100"
          compact={isCompact}
        />
      </div>

      {isFiltered && !showFilterEmptyState && !showGlobalEmptyState ? (
        <p className="mt-3 text-xs text-slate-500">
          Showing {filteredCount} of {summary.totalCount} queue items ·{" "}
          <span className="font-semibold text-slate-700">
            {getOfficeReviewQueueFilterLabel(activeFilter)}
          </span>
          {" · "}
          <Link
            href={clearHref}
            className="font-semibold text-cyan-600 hover:text-cyan-700"
          >
            Clear filter
          </Link>
        </p>
      ) : null}

      {!isCompact && !showGlobalEmptyState ? (
        <div className="mt-3 sm:mt-4">
          <ReadinessLegend />
        </div>
      ) : null}

      {showGlobalEmptyState ? (
        <QueueEmptyState />
      ) : showFilterEmptyState ? (
        <FilterEmptyState
          filter={activeFilter}
          clearHref={clearHref}
        />
      ) : showGrouped ? (
        <>
          <div className="mt-3 flex flex-col gap-3 sm:mt-4 sm:gap-4">
            {renderFilteredGroupSections({
              activeFilter,
              activeGroupFilter,
              groups,
              showActions,
              collapsedGroups,
              onToggleGroupCollapse: handleToggleGroupCollapse,
              selectionEnabled,
              selectedJobIds,
              onToggleItemSelect: handleToggleItemSelect,
              onToggleGroupSelect: handleToggleGroupSelect,
            })}
          </div>
          {selectionEnabled ? (
            <>
              <QueueBulkSelectionBar
                selectedCount={selectedItems.length}
                bulkActions={bulkActions}
                onClearSelection={handleClearSelection}
                onPreviewAction={handlePreviewAction}
              />
              {activeBatchPreview ? (
                <QueueBatchPreviewModal
                  preview={activeBatchPreview}
                  selectedItems={selectedItems}
                  onClose={handleCloseBatchPreview}
                />
              ) : null}
            </>
          ) : null}
        </>
      ) : (
        <ul className="mt-2.5 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-100 lg:mt-4">
          {baseItems
            .slice()
            .sort((left, right) =>
              compareOfficeReviewQueueItems(left, right, "severity_first"),
            )
            .map((item) => (
              <QueueItemRow
                key={item.jobId}
                item={item}
                showActions={showActions}
                compactActions={compactActions}
                dense
              />
            ))}
        </ul>
      )}

      {!isCompact ? (
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
              {QUEUE_PREFERENCE_LIMITATIONS.map((limitation) => (
                <li key={limitation}>{limitation}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {isCompact && hasMoreItems ? (
        <p className="mt-3 text-center text-xs text-slate-500">
          Showing {visibleCount} of {summary.totalCount} items ·{" "}
          <Link
            href="/reports"
            className="font-semibold text-cyan-600 hover:text-cyan-700"
          >
            View all in reports
          </Link>
        </p>
      ) : isCompact ? (
        <p className="mt-3 text-xs text-slate-500">
          Compact snapshot — one suggested next step per item. Open Reports for
          sorting, grouped views, and secondary shortcuts.
        </p>
      ) : (
        <p className="mt-3 text-xs text-slate-500">
          Quick actions are navigational only — primary step emphasized, no
          automatic writes. Stalled jobs use{" "}
          {formatJobStatus("in_progress")} pipeline statuses as context.
        </p>
      )}
    </section>
  );
}
