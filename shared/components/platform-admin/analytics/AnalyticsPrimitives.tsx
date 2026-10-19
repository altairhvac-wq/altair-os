import type { ReactNode } from "react";
import { AlertTriangle, Info, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { pt } from "@/shared/components/platform-admin/north-star-m13/platform-north-star-styles";
import type { FunnelStep, MetricValue } from "@/shared/lib/analytics/platform-metrics";
import type { NamedCount } from "@/shared/types/platform-analytics";
import { DASH, formatCount, formatDay, formatPercent } from "./analytics-format";

/**
 * Presentation primitives for Platform analytics. Server components, no
 * client JavaScript: the page is read-only, so charts are plain SVG.
 */

export function AnalyticsPanel({
  eyebrow,
  title,
  description,
  children,
  action,
  className = "",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`${pt.sectionSurface} ${className}`}>
      <div className={pt.panelHeader}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {eyebrow ? <p className={pt.sectionEyebrow}>{eyebrow}</p> : null}
            <h2 className={`${eyebrow ? "mt-0.5 " : ""}${pt.sectionTitle}`}>{title}</h2>
            {description ? <p className={pt.sectionSubtitle}>{description}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      </div>
      <div className="bg-[#FBF7EF] p-3 sm:p-4">{children}</div>
    </section>
  );
}

export function KpiGrid({ children, columns = 4 }: { children: ReactNode; columns?: 2 | 3 | 4 | 5 }) {
  const cols =
    columns === 2
      ? "sm:grid-cols-2"
      : columns === 3
        ? "sm:grid-cols-3"
        : columns === 5
          ? "sm:grid-cols-3 lg:grid-cols-5"
          : "sm:grid-cols-2 lg:grid-cols-4";
  return <div className={`grid grid-cols-2 gap-2.5 sm:gap-3 ${cols}`}>{children}</div>;
}

export function Kpi({
  label,
  value,
  hint,
  delta,
  unavailableReason,
}: {
  label: string;
  value: string;
  hint?: string;
  delta?: { text: string; tone: "up" | "down" | "flat" } | null;
  /** When set, the value is shown as "—" with this reason instead of a hint. */
  unavailableReason?: string | null;
}) {
  const DeltaIcon = delta?.tone === "up" ? TrendingUp : delta?.tone === "down" ? TrendingDown : Minus;
  const deltaClass =
    delta?.tone === "up" ? "text-[#166534]" : delta?.tone === "down" ? "text-[#B91C1C]" : "text-[#6B6255]";
  return (
    <div className={pt.metricCard}>
      <p className={pt.metricLabel}>{label}</p>
      <p className={pt.metricValue}>{unavailableReason ? DASH : value}</p>
      <div className="mt-1 flex min-h-[1rem] flex-wrap items-center gap-x-2 gap-y-0.5">
        {delta && !unavailableReason ? (
          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${deltaClass}`}>
            <DeltaIcon className="h-3 w-3" aria-hidden="true" />
            {delta.text}
          </span>
        ) : null}
        {unavailableReason ? (
          <span className="text-[11px] leading-snug text-[#6B6255]">{unavailableReason}</span>
        ) : hint ? (
          <span className="text-[11px] leading-snug text-[#6B6255]">{hint}</span>
        ) : null}
      </div>
    </div>
  );
}

export function metricReason(metric: MetricValue): string | null {
  return metric.state === "unavailable" ? metric.reason : null;
}

export function Notice({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "warning";
  title: string;
  children?: ReactNode;
}) {
  const Icon = tone === "warning" ? AlertTriangle : Info;
  return (
    <div className={tone === "warning" ? pt.attentionShell : pt.noticeShell} role={tone === "warning" ? "status" : undefined}>
      <div className="flex items-start gap-2.5">
        <Icon className={pt.noticeIcon} aria-hidden="true" />
        <div className="min-w-0">
          <p className={pt.noticeTitle}>{title}</p>
          {children ? <div className={pt.noticeBody}>{children}</div> : null}
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[rgba(119,89,27,0.22)] px-4 py-6 text-center">
      <p className={pt.emptyTitle}>{title}</p>
      {description ? <p className={pt.emptyDescription}>{description}</p> : null}
    </div>
  );
}

type Series = { key: string; label: string; color: string; values: number[] };

/**
 * Line chart over UTC days (or months). Responsive SVG; every point carries a
 * <title> so values are readable on hover and by screen readers.
 */
export function TrendChart({
  labels,
  series,
  height = 180,
  formatLabel = formatDay,
  formatValue = formatCount,
  emptyTitle = "No data in this period yet.",
}: {
  labels: string[];
  series: Series[];
  height?: number;
  formatLabel?: (label: string) => string;
  formatValue?: (value: number) => string;
  emptyTitle?: string;
}) {
  const all = series.flatMap((s) => s.values);
  const max = Math.max(0, ...all);
  if (labels.length === 0 || max === 0) {
    return <EmptyState title={emptyTitle} />;
  }
  const top = max * 1.1;
  const width = 600;
  const padL = 36;
  const padR = 8;
  const padT = 8;
  const padB = 22;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const x = (i: number) => padL + (labels.length === 1 ? plotW / 2 : (i / (labels.length - 1)) * plotW);
  const y = (v: number) => padT + plotH - (v / top) * plotH;
  const tickEvery = Math.max(1, Math.ceil(labels.length / 6));

  return (
    <div className="min-w-0">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={series.map((s) => s.label).join(", ")}
      >
        {[0, 0.5, 1].map((fraction) => (
          <g key={fraction}>
            <line
              x1={padL}
              x2={width - padR}
              y1={padT + plotH - fraction * plotH}
              y2={padT + plotH - fraction * plotH}
              stroke="rgba(119,89,27,0.12)"
              strokeWidth={1}
            />
            <text
              x={padL - 6}
              y={padT + plotH - fraction * plotH + 3}
              textAnchor="end"
              fontSize={10}
              fill="#6B6255"
            >
              {formatValue(Math.round(top * fraction))}
            </text>
          </g>
        ))}
        {labels.map((label, i) =>
          i % tickEvery === 0 || i === labels.length - 1 ? (
            <text key={label} x={x(i)} y={height - 6} textAnchor="middle" fontSize={10} fill="#6B6255">
              {formatLabel(label)}
            </text>
          ) : null,
        )}
        {series.map((s) => (
          <g key={s.key}>
            <polyline
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
            />
            {s.values.map((v, i) => (
              <circle key={i} cx={x(i)} cy={y(v)} r={labels.length > 45 ? 1.5 : 2.5} fill={s.color}>
                <title>{`${formatLabel(labels[i] ?? "")} · ${s.label}: ${formatValue(v)}`}</title>
              </circle>
            ))}
          </g>
        ))}
      </svg>
      {series.length > 1 ? (
        <div className="mt-1 flex flex-wrap gap-3">
          {series.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5 text-[11px] text-[#4F4638]">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} aria-hidden="true" />
              {s.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Ranked horizontal bars, e.g. top pages or referrers. */
export function BarList({
  rows,
  valueLabel,
  secondaryLabel,
  formatValue = formatCount,
  labelFormatter = (label: string) => label,
  emptyTitle = "Nothing recorded in this period.",
  emptyDescription,
}: {
  rows: NamedCount[];
  valueLabel: string;
  secondaryLabel?: string;
  formatValue?: (value: number) => string;
  labelFormatter?: (label: string) => string;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (rows.length === 0) return <EmptyState title={emptyTitle} description={emptyDescription} />;
  const max = Math.max(...rows.map((row) => row.value), 1);
  return (
    <div>
      <div className="mb-1.5 flex justify-end gap-4 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6B6255]">
        {secondaryLabel ? <span>{secondaryLabel}</span> : null}
        <span>{valueLabel}</span>
      </div>
      <ul className="space-y-1.5">
        {rows.map((row) => (
          <li key={row.label} className="relative overflow-hidden rounded-md">
            <div
              className="absolute inset-y-0 left-0 rounded-md bg-[rgba(164,130,58,0.16)]"
              style={{ width: `${Math.max(2, (row.value / max) * 100)}%` }}
              aria-hidden="true"
            />
            <div className="relative flex items-center justify-between gap-3 px-2.5 py-1.5 text-sm">
              <span className="min-w-0 truncate text-[#17130E]" title={labelFormatter(row.label)}>
                {labelFormatter(row.label)}
              </span>
              <span className="flex shrink-0 gap-4 tabular-nums">
                {secondaryLabel ? (
                  <span className="w-12 text-right text-xs text-[#6B6255]">
                    {row.secondary != null ? formatValue(row.secondary) : DASH}
                  </span>
                ) : null}
                <span className="w-12 text-right font-semibold text-[#17130E]">{formatValue(row.value)}</span>
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The acquisition funnel: one bar per step, conversion from the step before. */
export function Funnel({ steps, bottleneckKey }: { steps: FunnelStep[]; bottleneckKey?: string | null }) {
  const first = steps.find((step) => step.count != null && step.count > 0)?.count ?? 0;
  return (
    <ol className="space-y-2">
      {steps.map((step) => {
        const width = step.count != null && first > 0 ? Math.max(2, (step.count / first) * 100) : 0;
        const isBottleneck = bottleneckKey === step.key;
        return (
          <li key={step.key}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
              <span className="font-medium text-[#17130E]">
                {step.label}
                {isBottleneck ? (
                  <span className="ml-2 rounded-full bg-[rgba(185,28,28,0.08)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#991B1B]">
                    biggest drop
                  </span>
                ) : null}
              </span>
              <span className="tabular-nums text-[#17130E]">
                <span className="font-semibold">{step.count == null ? DASH : formatCount(step.count)}</span>
                <span className="ml-2 text-xs text-[#6B6255]">
                  {step.count == null
                    ? "not measured yet"
                    : step.fromPrevious == null
                      ? ""
                      : `${formatPercent(step.fromPrevious)} of previous`}
                </span>
              </span>
            </div>
            <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-[rgba(119,89,27,0.08)]">
              {step.count != null ? (
                <div
                  className={`h-full rounded-full ${isBottleneck ? "bg-[#B45309]" : "bg-[#A4823A]"}`}
                  style={{ width: `${width}%` }}
                />
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function DataTable({
  headers,
  rows,
  emptyTitle,
  emptyDescription,
}: {
  headers: { label: string; align?: "left" | "right" }[];
  rows: { key: string; cells: ReactNode[] }[];
  emptyTitle: string;
  emptyDescription?: string;
}) {
  if (rows.length === 0) return <EmptyState title={emptyTitle} description={emptyDescription} />;
  return (
    <div className={`${pt.tableWrap} -mx-3 sm:-mx-4`}>
      <table className="min-w-full text-left text-sm">
        <thead className={pt.tableHead}>
          <tr>
            {headers.map((header) => (
              <th key={header.label} className={`${pt.tableHeadCell} ${header.align === "right" ? "text-right" : ""}`}>
                {header.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={pt.tableBody}>
          {rows.map((row) => (
            <tr key={row.key} className={pt.tableRow}>
              {row.cells.map((cell, index) => (
                <td
                  key={index}
                  className={`${pt.tableCell} ${headers[index]?.align === "right" ? "text-right tabular-nums" : ""}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function HealthDot({ status }: { status: "healthy" | "warning" | "critical" | "unknown" }) {
  const color =
    status === "healthy" ? "bg-[#16A34A]" : status === "warning" ? "bg-[#D97706]" : status === "critical" ? "bg-[#DC2626]" : "bg-[#A8A29E]";
  return <span className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${color}`} aria-hidden="true" />;
}
