import Link from "next/link";
import { formatPercent } from "@/shared/types/analytics";
import { formatLeadSource } from "@/shared/types/lead";
import type { LeadPipelineMetrics } from "@/shared/lib/leads/lead-metrics";

type LeadPipelineSectionProps = {
  metrics: LeadPipelineMetrics;
};

type LeadKpiCardProps = {
  label: string;
  value: string;
};

function LeadKpiCard({ label, value }: LeadKpiCardProps) {
  return (
    <div className="admin-card min-w-0 px-3 py-3 sm:px-4 sm:py-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-[11px]">
        {label}
      </p>
      <p className="mt-1.5 truncate text-2xl font-extrabold tabular-nums tracking-tight text-slate-900 sm:text-[1.75rem] sm:leading-none">
        {value}
      </p>
    </div>
  );
}

function formatRate(value: number | null): string {
  if (value == null) {
    return "—";
  }

  return formatPercent(value, 1);
}

export function LeadPipelineSection({ metrics }: LeadPipelineSectionProps) {
  const hasLeads = metrics.totalLeads > 0;

  return (
    <section className="space-y-3">
      <div>
        <h3 className="admin-heading-section text-[13px] sm:text-sm">
          Lead Pipeline
        </h3>
        <p className="admin-text-helper mt-0.5 text-[11px] sm:text-xs">
          Track lead volume, conversion, and source quality.
        </p>
      </div>

      {!hasLeads ? (
        <div className="admin-card px-4 py-5 text-center sm:px-5">
          <p className="text-sm font-semibold text-slate-900">No lead data yet.</p>
          <p className="admin-text-helper mt-1 text-xs">
            Lead source performance will appear once leads are created.
          </p>
          <Link
            href="/leads"
            className="mt-3 inline-flex text-xs font-semibold text-cyan-700 hover:text-cyan-800"
          >
            Create Lead
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <LeadKpiCard label="Total Leads" value={String(metrics.totalLeads)} />
            <LeadKpiCard label="Won Leads" value={String(metrics.wonLeads)} />
            <LeadKpiCard label="Lost Leads" value={String(metrics.lostLeads)} />
            <LeadKpiCard
              label="Conversion Rate"
              value={formatRate(metrics.conversionRate)}
            />
          </div>

          {metrics.topSourceInsight ? (
            <p className="text-xs text-slate-600">{metrics.topSourceInsight}</p>
          ) : null}

          <div className="admin-card min-w-0 overflow-hidden">
            <div className="border-b border-slate-100 px-3 py-2.5 sm:px-4">
              <h4 className="text-xs font-bold text-slate-900">
                Lead Source Performance
              </h4>
            </div>

            <div className="hidden px-3 py-2 sm:grid sm:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,0.6fr))] sm:gap-3 sm:px-4">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Source
              </span>
              <span className="text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Leads
              </span>
              <span className="text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Won
              </span>
              <span className="text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Close Rate
              </span>
            </div>

            <ul className="divide-y divide-slate-100">
              {metrics.sourcePerformance.map((entry) => (
                <li
                  key={entry.source}
                  className="grid grid-cols-2 gap-x-3 gap-y-1 px-3 py-2.5 sm:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,0.6fr))] sm:items-center sm:gap-3 sm:px-4"
                >
                  <p className="col-span-2 text-xs font-medium text-slate-800 sm:col-span-1">
                    {formatLeadSource(entry.source)}
                  </p>
                  <div className="flex items-center justify-between gap-2 sm:contents">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:hidden">
                      Leads
                    </span>
                    <span className="text-xs font-bold tabular-nums text-slate-900 sm:text-right">
                      {entry.total}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 sm:contents">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:hidden">
                      Won
                    </span>
                    <span className="text-xs font-bold tabular-nums text-slate-900 sm:text-right">
                      {entry.won}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 sm:contents">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:hidden">
                      Close Rate
                    </span>
                    <span className="text-xs font-bold tabular-nums text-slate-900 sm:text-right">
                      {formatRate(entry.conversionRate)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  );
}
