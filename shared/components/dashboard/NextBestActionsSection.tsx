"use client";

import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ListChecks,
  type LucideIcon,
} from "lucide-react";
import { DashboardQueueActionTrigger } from "@/shared/components/dashboard/DashboardQueueActionTrigger";
import {
  buildDashboardNextBestActions,
  formatDashboardNextBestActionSeverityLabel,
  hasDashboardNextBestActions,
  type DashboardNextBestAction,
  type DashboardNextBestActionSeverity,
} from "@/shared/lib/dashboard-next-best-actions";
import type { DashboardData } from "@/shared/types/dashboard";

type NextBestActionsSectionProps = {
  data: DashboardData;
};

function getActionStyles(severity: DashboardNextBestActionSeverity): {
  rowClass: string;
  badgeClass: string;
  iconClass: string;
  Icon: LucideIcon;
} {
  switch (severity) {
    case "critical":
      return {
        rowClass: "border-rose-100 bg-rose-50/40 hover:bg-rose-50/70",
        badgeClass: "bg-rose-100 text-rose-800",
        iconClass: "bg-rose-100 text-rose-700",
        Icon: AlertCircle,
      };
    case "warning":
      return {
        rowClass: "border-amber-100 bg-amber-50/40 hover:bg-amber-50/70",
        badgeClass: "bg-amber-100 text-amber-800",
        iconClass: "bg-amber-100 text-amber-700",
        Icon: AlertTriangle,
      };
    default:
      return {
        rowClass: "border-cyan-100 bg-cyan-50/40 hover:bg-cyan-50/70",
        badgeClass: "bg-cyan-100 text-cyan-800",
        iconClass: "bg-cyan-100 text-cyan-700",
        Icon: ListChecks,
      };
  }
}

function ActionRow({
  action,
  data,
}: {
  action: DashboardNextBestAction;
  data: DashboardData;
}) {
  const styles = getActionStyles(action.severity);
  const StatusIcon = styles.Icon;

  return (
    <li>
      <DashboardQueueActionTrigger
        action={{
          id: action.id,
          label: action.title,
          description: action.explanation,
          count: action.count,
          severity:
            action.severity === "info"
              ? "info"
              : action.severity === "warning"
                ? "warning"
                : "critical",
          queueType: action.queueType,
          href: action.href,
        }}
        data={data}
        className={`block w-full rounded-xl border px-3 py-2.5 text-left transition-colors max-lg:px-3 max-lg:py-2.5 lg:px-4 lg:py-3 ${styles.rowClass}`}
      >
        <div className="flex items-start gap-2.5 lg:gap-3">
          <div
            className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg lg:h-8 lg:w-8 ${styles.iconClass}`}
          >
            <StatusIcon className="h-4 w-4" aria-hidden="true" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-bold text-slate-900">{action.title}</p>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${styles.badgeClass}`}
              >
                {formatDashboardNextBestActionSeverityLabel(action.severity)}
              </span>
              {action.count !== null ? (
                <span className="text-xs font-semibold tabular-nums text-slate-600">
                  {action.count}
                  {action.metricLabel ? ` ${action.metricLabel}` : ""}
                </span>
              ) : null}
            </div>

            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              {action.explanation}
            </p>

            <p className="mt-1.5 text-xs font-semibold text-slate-800 lg:mt-2">
              {action.recommendedAction}
            </p>
          </div>

          <ArrowRight
            className="mt-1 h-4 w-4 shrink-0 text-slate-400"
            aria-hidden="true"
          />
        </div>
      </DashboardQueueActionTrigger>
    </li>
  );
}

export function NextBestActionsSection({ data }: NextBestActionsSectionProps) {
  const actions = buildDashboardNextBestActions(data);
  const hasActions = hasDashboardNextBestActions(data);

  return (
    <section className="admin-card flex h-full flex-col overflow-hidden">
      <div className="flex flex-col gap-1.5 border-b border-slate-100 px-4 py-3 max-lg:gap-1.5 sm:flex-row sm:items-end sm:justify-between lg:gap-2 lg:px-5 lg:py-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-600/90 lg:text-xs">
            Next best actions
          </p>
          <h2 className="text-base font-black tracking-tight text-slate-900 lg:text-lg">
            What to do today
          </h2>
          <p className="text-xs text-slate-500 lg:text-sm">
            {hasActions
              ? `${actions.length} action${actions.length === 1 ? "" : "s"} with full context — top priorities may also appear in Altair Recommendations.`
              : "No operational actions flagged right now."}
          </p>
        </div>
        <Link
          href="/reports"
          className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-cyan-600 hover:text-cyan-700"
        >
          Open reports
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {hasActions ? (
        <ul className="space-y-2 p-4 lg:p-5">{actions.map((action) => (
            <ActionRow key={action.id} action={action} data={data} />
          ))}</ul>
      ) : (
        <div className="p-4 lg:p-5">
          <div className="flex items-start gap-2.5 rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-3 lg:gap-3 lg:px-4 lg:py-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-900">
                No pending actions
              </p>
              <p className="mt-1 text-xs leading-relaxed text-emerald-800/80">
                Office queue, billing, and pipeline signals are clear. New items
                will surface here as work completes or enters review.
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
