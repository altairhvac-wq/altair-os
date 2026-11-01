import { Briefcase, DollarSign, FileCheck2, type LucideIcon } from "lucide-react";
import { formatCurrency } from "@/shared/types/customer";
import type { DashboardPerformance } from "@/shared/types/dashboard-overview";
import { OVERVIEW_CARD_CLASS, OverviewCardHeader } from "./overview-chrome";

const CHART_WIDTH = 640;
const CHART_HEIGHT = 200;
const PAD_LEFT = 44;
const PAD_RIGHT = 36;
const PAD_TOP = 14;
const AXIS_Y = 158;
const LABEL_Y = 184;

function niceCeiling(max: number): number {
  if (max <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  const normalized = max / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

function compactMoney(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1).replace(/\.0$/, "")}K`;
  return `$${Math.round(value)}`;
}

function percentChange(current: number, prior: number | null): string | null {
  if (prior == null) return null;
  if (prior === 0) return current > 0 ? "New this period" : "No change";
  const change = Math.round(((current - prior) / prior) * 100);
  return `${change >= 0 ? "↑" : "↓"} ${Math.abs(change)}% vs prior 6 months`;
}

function Tile({
  icon: Icon,
  tone,
  value,
  label,
  delta,
  deltaTone,
}: {
  icon: LucideIcon;
  tone: string;
  value: string;
  label: string;
  delta: string;
  deltaTone: "success" | "danger" | "muted";
}) {
  const deltaClass =
    deltaTone === "success"
      ? "text-altair-success-foreground"
      : deltaTone === "danger"
        ? "text-altair-danger"
        : "text-altair-ink-on-paper-muted";
  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-control)] border border-altair-border/40 bg-altair-paper-subtle p-3.5">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${tone}`}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-xl font-black leading-tight tabular-nums text-altair-ink-on-paper">
          {value}
        </p>
        <p className="text-xs text-altair-ink-on-paper-secondary">{label}</p>
        <p className={`text-[11px] font-semibold ${deltaClass}`}>{delta}</p>
      </div>
    </div>
  );
}

export function OverviewPerformanceCard({
  performance,
}: {
  performance: DashboardPerformance;
}) {
  const months = performance.months;
  const moneyMax = niceCeiling(Math.max(...months.map((m) => m.collected), 0));
  const jobsMax = niceCeiling(Math.max(...months.map((m) => m.jobsCompleted), 0));
  const plotWidth = CHART_WIDTH - PAD_LEFT - PAD_RIGHT;
  const slot = plotWidth / months.length;
  const barWidth = Math.min(56, slot * 0.6);
  const plotHeight = AXIS_Y - PAD_TOP;
  const yMoney = (value: number) => AXIS_Y - (value / moneyMax) * plotHeight;
  const yJobs = (value: number) => AXIS_Y - (value / jobsMax) * plotHeight;
  const xCenter = (index: number) => PAD_LEFT + slot * index + slot / 2;
  const gridFractions = [1, 2 / 3, 1 / 3, 0];
  const hasAnything =
    performance.collectedTotal > 0 || performance.jobsCompletedTotal > 0;

  const collectedDelta = percentChange(
    performance.collectedTotal,
    performance.collectedPriorWindow,
  );
  const jobsDelta = percentChange(
    performance.jobsCompletedTotal,
    performance.jobsCompletedPriorWindow,
  );
  const deltaTone = (current: number, prior: number | null) =>
    prior == null || prior === 0
      ? "muted"
      : current >= prior
        ? "success"
        : "danger";

  return (
    <section className={OVERVIEW_CARD_CLASS} aria-label="Business performance">
      <OverviewCardHeader
        title="Business performance"
        trailing={
          <span className="rounded-[var(--radius-control)] border border-altair-border/50 px-2.5 py-1 text-xs font-semibold text-altair-ink-on-paper-secondary">
            Last 6 months
          </span>
        }
      />
      <div className="grid gap-4 border-t border-altair-border/40 px-4 pb-4 pt-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap gap-4 text-xs text-altair-ink-on-paper-secondary">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-[var(--chart-1)]" />
              Collected
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-altair-success" />
              Jobs completed
            </span>
          </div>
          {hasAnything ? (
            <svg
              viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
              className="h-auto w-full"
              role="img"
              aria-label={`Collected revenue and completed jobs by month for the last ${months.length} months`}
            >
              <g className="fill-altair-ink-on-paper-muted" fontSize="11">
                {gridFractions.map((fraction) => (
                  <text key={`m-${fraction}`} x="0" y={yMoney(moneyMax * fraction) + 4}>
                    {compactMoney(moneyMax * fraction)}
                  </text>
                ))}
                {gridFractions.map((fraction) => (
                  <text
                    key={`j-${fraction}`}
                    x={CHART_WIDTH}
                    y={yJobs(jobsMax * fraction) + 4}
                    textAnchor="end"
                  >
                    {Math.round(jobsMax * fraction)}
                  </text>
                ))}
              </g>
              <g className="stroke-altair-ink-on-paper" strokeOpacity="0.08">
                {gridFractions.map((fraction) => (
                  <line
                    key={`g-${fraction}`}
                    x1={PAD_LEFT}
                    x2={CHART_WIDTH - PAD_RIGHT}
                    y1={yMoney(moneyMax * fraction)}
                    y2={yMoney(moneyMax * fraction)}
                  />
                ))}
              </g>
              <g className="fill-[var(--chart-1)]">
                {months.map((month, index) => {
                  const top = yMoney(month.collected);
                  const height = Math.max(AXIS_Y - top, month.collected > 0 ? 2 : 0);
                  return (
                    <rect
                      key={month.key}
                      x={xCenter(index) - barWidth / 2}
                      y={AXIS_Y - height}
                      width={barWidth}
                      height={height}
                      rx="3"
                    >
                      <title>{`${month.label}: ${formatCurrency(month.collected)} collected`}</title>
                    </rect>
                  );
                })}
              </g>
              <polyline
                fill="none"
                className="stroke-altair-success"
                strokeWidth="2.5"
                strokeLinejoin="round"
                points={months
                  .map((month, index) => `${xCenter(index)},${yJobs(month.jobsCompleted)}`)
                  .join(" ")}
              />
              <g className="fill-altair-success">
                {months.map((month, index) => (
                  <circle key={month.key} cx={xCenter(index)} cy={yJobs(month.jobsCompleted)} r="4">
                    <title>{`${month.label}: ${month.jobsCompleted} jobs completed`}</title>
                  </circle>
                ))}
              </g>
              <g className="fill-altair-ink-on-paper-secondary" fontSize="11" textAnchor="middle">
                {months.map((month, index) => (
                  <text key={month.key} x={xCenter(index)} y={LABEL_Y}>
                    {month.label}
                  </text>
                ))}
              </g>
            </svg>
          ) : (
            <p className="rounded-[var(--radius-control)] bg-altair-paper-subtle px-4 py-8 text-center text-xs text-altair-ink-on-paper-muted">
              No payments or completed jobs in the last six months yet. The
              chart fills in as work gets done.
            </p>
          )}
        </div>
        <div className="grid content-center gap-2.5 sm:grid-cols-3 lg:grid-cols-1">
          <Tile
            icon={DollarSign}
            tone="bg-altair-success-surface text-altair-success-foreground"
            value={formatCurrency(performance.collectedTotal)}
            label="Collected, 6 months"
            delta={collectedDelta ?? "First 6 months on record"}
            deltaTone={deltaTone(performance.collectedTotal, performance.collectedPriorWindow)}
          />
          <Tile
            icon={Briefcase}
            tone="bg-altair-brass/15 text-[var(--brand-metal-text)]"
            value={String(performance.jobsCompletedTotal)}
            label="Jobs completed"
            delta={jobsDelta ?? "First 6 months on record"}
            deltaTone={deltaTone(performance.jobsCompletedTotal, performance.jobsCompletedPriorWindow)}
          />
          <Tile
            icon={FileCheck2}
            tone="bg-altair-information-surface text-altair-information-foreground"
            value={performance.estimateCloseRate != null ? `${performance.estimateCloseRate}%` : "—"}
            label="Estimate close rate"
            delta={
              performance.estimatesSentTotal > 0
                ? `${performance.estimatesApprovedTotal} of ${performance.estimatesSentTotal} sent were approved`
                : "No estimates sent in this window"
            }
            deltaTone="muted"
          />
        </div>
      </div>
    </section>
  );
}
