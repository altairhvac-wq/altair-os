import { formatCurrency } from "@/shared/types/customer";
import { formatPercent } from "@/shared/types/analytics";
import type { TeamMemberWorkSummary } from "@/shared/types/team-member-profile";
import {
  adminCardSectionClass,
  adminEmptyWrapClass,
} from "@/shared/lib/admin-density";

type TeamMemberSummaryCardProps = {
  summary: TeamMemberWorkSummary | null;
};

function formatLaborHours(hours: number): string {
  if (hours <= 0) {
    return "0 hrs";
  }

  return `${hours} hrs`;
}

export function TeamMemberSummaryCard({ summary }: TeamMemberSummaryCardProps) {
  if (!summary) {
    return null;
  }

  const hasData =
    summary.jobsCompleted > 0 ||
    summary.revenue > 0 ||
    summary.laborHours > 0;

  return (
    <section className={adminCardSectionClass}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">Work Summary</h2>
        <span className="text-[11px] font-medium text-slate-500">
          {summary.periodLabel}
        </span>
      </div>

      {!hasData ? (
        <div className={adminEmptyWrapClass}>
          <p className="text-sm text-slate-500">
            Work summary will appear once this member has completed jobs.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <Metric label="Jobs Completed" value={String(summary.jobsCompleted)} />
          <Metric label="Revenue Generated" value={formatCurrency(summary.revenue)} />
          <Metric label="Labor Hours" value={formatLaborHours(summary.laborHours)} />
          {summary.profitAvailable ? (
            <>
              <Metric
                label="Gross Profit"
                value={formatCurrency(summary.grossProfit ?? 0)}
                accent="emerald"
              />
              <Metric
                label="Margin"
                value={
                  summary.margin != null
                    ? formatPercent(summary.margin, 0)
                    : "—"
                }
              />
            </>
          ) : null}
        </div>
      )}
    </section>
  );
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "emerald";
}) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p
        className={`mt-0.5 text-sm font-bold ${
          accent === "emerald" ? "text-emerald-700" : "text-slate-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
