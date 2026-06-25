import Link from "next/link";
import { formatPercent } from "@/shared/types/analytics";
import { formatLeadSource } from "@/shared/types/lead";
import type { LeadPipelineMetrics } from "@/shared/lib/leads/lead-metrics";
import { nsReportChart as ns } from "./north-star-chart-styles";
import {
  isNorthStarReportSurface,
  type ReportSurfaceVariant,
} from "./report-surface-variant";

type LeadPipelineSectionProps = {
  metrics: LeadPipelineMetrics;
  variant?: ReportSurfaceVariant;
};

type LeadKpiCardProps = {
  label: string;
  value: string;
  variant?: ReportSurfaceVariant;
};

function LeadKpiCard({ label, value, variant = "legacy" }: LeadKpiCardProps) {
  const northStar = isNorthStarReportSurface(variant);

  if (northStar) {
    return (
      <div className="min-w-0 rounded-[1.25rem] border border-[rgba(138,99,36,0.12)] bg-[#FBF7EF] px-3 py-3 shadow-[0_4px_16px_rgba(3,7,12,0.08)] sm:px-4 sm:py-3.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#4F4638] sm:text-[11px]">
          {label}
        </p>
        <p className="mt-1.5 truncate text-2xl font-extrabold tabular-nums tracking-tight text-[#17130E] sm:text-[1.75rem] sm:leading-none">
          {value}
        </p>
      </div>
    );
  }

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

export function LeadPipelineSection({
  metrics,
  variant = "legacy",
}: LeadPipelineSectionProps) {
  const hasLeads = metrics.totalLeads > 0;
  const northStar = isNorthStarReportSurface(variant);

  return (
    <section className="min-w-0 space-y-3 overflow-x-hidden">
      <div>
        <h3
          className={
            northStar
              ? "text-sm font-bold text-[#17130E]"
              : "admin-heading-section text-[13px] sm:text-sm"
          }
        >
          Lead Pipeline
        </h3>
        <p
          className={
            northStar
              ? "mt-0.5 text-xs text-[#64748B]"
              : "admin-text-helper mt-0.5 text-[11px] sm:text-xs"
          }
        >
          Lead activity created during the selected period.
        </p>
      </div>

      {!hasLeads ? (
        <div
          className={
            northStar
              ? "rounded-[1.25rem] border border-[rgba(138,99,36,0.12)] bg-[#FBF7EF] px-4 py-5 text-center shadow-[0_4px_16px_rgba(3,7,12,0.08)] sm:px-5"
              : "admin-card px-4 py-5 text-center sm:px-5"
          }
        >
          <p
            className={
              northStar
                ? "text-sm font-semibold text-[#17130E]"
                : "text-sm font-semibold text-slate-900"
            }
          >
            No leads created in this period.
          </p>
          <p
            className={
              northStar
                ? "mt-1 text-xs text-[#64748B]"
                : "admin-text-helper mt-1 text-xs"
            }
          >
            Try a wider date range or add a new lead to see pipeline metrics.
          </p>
          <Link
            href="/leads"
            className={
              northStar
                ? "mt-3 inline-flex text-xs font-semibold text-[#8A6324] transition-colors hover:text-[#6B5A2E]"
                : "mt-3 inline-flex text-xs font-semibold text-cyan-700 hover:text-cyan-800"
            }
          >
            Create Lead
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <LeadKpiCard
              label="Total Leads"
              value={String(metrics.totalLeads)}
              variant={variant}
            />
            <LeadKpiCard
              label="Won Leads"
              value={String(metrics.wonLeads)}
              variant={variant}
            />
            <LeadKpiCard
              label="Lost Leads"
              value={String(metrics.lostLeads)}
              variant={variant}
            />
            <LeadKpiCard
              label="Conversion Rate"
              value={formatRate(metrics.conversionRate)}
              variant={variant}
            />
          </div>

          <p
            className={
              northStar
                ? "text-[11px] text-[#64748B] sm:text-xs"
                : "text-[11px] text-slate-500 sm:text-xs"
            }
          >
            Won and lost reflect each lead&apos;s current status, not when they
            closed.
          </p>

          {metrics.topSourceInsight ? (
            <p className={northStar ? "text-xs text-[#4F4638]" : "text-xs text-slate-600"}>
              {metrics.topSourceInsight}
            </p>
          ) : null}

          <div
            className={
              northStar
                ? "min-w-0 overflow-hidden rounded-[1.25rem] border border-[rgba(138,99,36,0.12)] bg-[#FBF7EF] shadow-[0_4px_16px_rgba(3,7,12,0.08)]"
                : "admin-card min-w-0 overflow-hidden"
            }
          >
            <div
              className={
                northStar
                  ? "border-b border-[rgba(138,99,36,0.12)] bg-[#FFF9EA] px-3 py-2.5 sm:px-4"
                  : "border-b border-slate-100 px-3 py-2.5 sm:px-4"
              }
            >
              <h4
                className={
                  northStar
                    ? "text-xs font-bold text-[#17130E]"
                    : "text-xs font-bold text-slate-900"
                }
              >
                Lead Source Performance
              </h4>
            </div>

            <div
              className={
                northStar
                  ? "hidden border-b border-[rgba(138,99,36,0.10)] bg-[#FFF9EA]/80 px-3 py-2.5 sm:grid sm:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,0.6fr))] sm:gap-3 sm:px-4"
                  : "hidden px-3 py-2 sm:grid sm:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,0.6fr))] sm:gap-3 sm:px-4"
              }
            >
              <span
                className={
                  northStar
                    ? ns.table.header
                    : "text-[10px] font-bold uppercase tracking-wide text-slate-500"
                }
              >
                Source
              </span>
              <span
                className={
                  northStar
                    ? `${ns.table.header} text-right`
                    : "text-right text-[10px] font-bold uppercase tracking-wide text-slate-500"
                }
              >
                Leads
              </span>
              <span
                className={
                  northStar
                    ? `${ns.table.header} text-right`
                    : "text-right text-[10px] font-bold uppercase tracking-wide text-slate-500"
                }
              >
                Won
              </span>
              <span
                className={
                  northStar
                    ? `${ns.table.header} text-right`
                    : "text-right text-[10px] font-bold uppercase tracking-wide text-slate-500"
                }
              >
                Close Rate
              </span>
            </div>

            <ul
              className={
                northStar ? "divide-y divide-[rgba(138,99,36,0.10)]" : "divide-y divide-slate-100"
              }
            >
              {metrics.sourcePerformance.length === 0 ? (
                <li
                  className={
                    northStar
                      ? "px-3 py-4 text-center text-xs text-[#64748B] sm:px-4"
                      : "px-3 py-4 text-center text-xs text-slate-500 sm:px-4"
                  }
                >
                  No lead source activity in this period.
                </li>
              ) : null}
              {metrics.sourcePerformance.map((entry, rowIndex) => (
                <li
                  key={entry.source}
                  className={
                    northStar
                      ? `grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,0.6fr))] sm:items-center sm:gap-3 ${ns.table.row}${
                          rowIndex % 2 === 1 ? " bg-[#FFF9EA]/25" : ""
                        }`
                      : "grid grid-cols-2 gap-x-3 gap-y-1 px-3 py-2.5 sm:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,0.6fr))] sm:items-center sm:gap-3 sm:px-4"
                  }
                >
                  <p
                    className={
                      northStar
                        ? "col-span-2 break-words text-[13px] font-semibold text-[#17130E] sm:col-span-1"
                        : "col-span-2 break-words text-xs font-medium text-slate-800 sm:col-span-1"
                    }
                  >
                    {formatLeadSource(entry.source)}
                  </p>
                  <div className="flex items-center justify-between gap-2 sm:contents">
                    <span
                      className={
                        northStar
                          ? "text-[10px] font-semibold uppercase tracking-wide text-[#4F4638] sm:hidden"
                          : "text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:hidden"
                      }
                    >
                      Leads
                    </span>
                    <span
                      className={
                        northStar
                          ? "text-sm font-extrabold tabular-nums tracking-tight text-[#17130E] sm:text-right"
                          : "text-xs font-bold tabular-nums text-slate-900 sm:text-right"
                      }
                    >
                      {entry.total}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 sm:contents">
                    <span
                      className={
                        northStar
                          ? "text-[10px] font-semibold uppercase tracking-wide text-[#4F4638] sm:hidden"
                          : "text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:hidden"
                      }
                    >
                      Won
                    </span>
                    <span
                      className={
                        northStar
                          ? "text-sm font-extrabold tabular-nums tracking-tight text-[#17130E] sm:text-right"
                          : "text-xs font-bold tabular-nums text-slate-900 sm:text-right"
                      }
                    >
                      {entry.won}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 sm:contents">
                    <span
                      className={
                        northStar
                          ? "text-[10px] font-semibold uppercase tracking-wide text-[#4F4638] sm:hidden"
                          : "text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:hidden"
                      }
                    >
                      Close Rate
                    </span>
                    <span
                      className={
                        northStar
                          ? "text-sm font-extrabold tabular-nums tracking-tight text-[#17130E] sm:text-right"
                          : "text-xs font-bold tabular-nums text-slate-900 sm:text-right"
                      }
                    >
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
