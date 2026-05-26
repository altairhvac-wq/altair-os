import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ListChecks,
  type LucideIcon,
} from "lucide-react";
import {
  buildDashboardNextBestActions,
  hasDashboardNextBestActions,
  type DashboardNextBestAction,
  type DashboardNextBestActionSeverity,
  type DashboardNextBestActionsInput,
} from "@/shared/lib/dashboard-next-best-actions";

type NextBestActionsSectionProps = {
  data: DashboardNextBestActionsInput;
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

function ActionRow({ action }: { action: DashboardNextBestAction }) {
  const styles = getActionStyles(action.severity);
  const StatusIcon = styles.Icon;

  return (
    <li>
      <Link
        href={action.href}
        className={`block rounded-xl border px-4 py-3 transition-colors ${styles.rowClass}`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${styles.iconClass}`}
          >
            <StatusIcon className="h-4 w-4" aria-hidden="true" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-bold text-slate-900">{action.title}</p>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${styles.badgeClass}`}
              >
                {action.severity}
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

            <p className="mt-2 text-xs font-semibold text-slate-800">
              {action.recommendedAction}
            </p>
          </div>

          <ArrowRight
            className="mt-1 h-4 w-4 shrink-0 text-slate-400"
            aria-hidden="true"
          />
        </div>
      </Link>
    </li>
  );
}

export function NextBestActionsSection({ data }: NextBestActionsSectionProps) {
  const actions = buildDashboardNextBestActions(data);
  const hasActions = hasDashboardNextBestActions(data);

  return (
    <section className="admin-card flex h-full flex-col overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-600/90">
            Next best actions
          </p>
          <h2 className="text-lg font-black tracking-tight text-slate-900">
            What to do today
          </h2>
          <p className="text-sm text-slate-500">
            {hasActions
              ? `${actions.length} prioritized action${actions.length === 1 ? "" : "s"} based on live operational data.`
              : "Operations are running smoothly today."}
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
        <ul className="space-y-2 p-5">{actions.map((action) => (
            <ActionRow key={action.id} action={action} />
          ))}</ul>
      ) : (
        <div className="p-5">
          <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-900">
                Operations are running smoothly today
              </p>
              <p className="mt-1 text-xs leading-relaxed text-emerald-800/80">
                No urgent office queue, billing, or pipeline actions are flagged
                right now. Check back as work completes or new items enter review.
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
