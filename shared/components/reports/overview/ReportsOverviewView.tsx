"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import {
  AlertTriangle,
  CircleDollarSign,
  FileText,
  Loader2,
  Percent,
  Receipt,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { generateBusinessSummaryAction } from "@/app/actions/reports-ai";
import {
  altairCanvasInkClass,
  altairCanvasInkMutedClass,
} from "@/shared/design-system/foundation";
import {
  MasterContentStack,
  MasterPageCanvas,
  MasterShellPage,
} from "@/shared/design-system/shell";
import { useCompanyTimezone } from "@/shared/lib/company-timezone";
import { formatDateInTimeZone } from "@/shared/lib/datetime";
import { formatActionError } from "@/shared/lib/operational-errors";
import { formatCurrency } from "@/shared/types/customer";
import { formatLeadSource } from "@/shared/types/lead";
import { getPartnerInitials } from "@/shared/types/network";
import {
  REPORTS_PAGE_DATE_RANGE_OPTIONS,
  type BusinessSummaryAiResult,
  type ReportKpiMetric,
  type ReportSnapshotRow,
  type ReportsPageData,
  type ReportsPageDateRange,
} from "@/shared/types/reports-page";
import { ReportsRevenueChart } from "./ReportsRevenueChart";

/**
 * Reports, on the same paper cards as the Dashboard.
 *
 * ============================ WHY IT WAS REBUILT ============================
 * UI audit 2026-11-12. The previous page was a column of near-black cards on
 * the cream canvas (the only screen built that way), about four desktop
 * screens tall with no order of importance, and it:
 *   - showed the same figure up to three times under three names
 *     (Collected, Revenue and Net income est. were one number);
 *   - had a "Cash Health" ring labelled "for the period" whose total was
 *     every invoice ever issued, beside a rate that WAS for the period;
 *   - drew a "sales funnel" with 9 estimates and 104 jobs on one scale;
 *   - used three ring charts and eight unlabelled sparklines.
 *
 * ============================ WHAT THIS PAGE IS ============================
 * One period picker that changes everything. Four headline figures, each
 * with the change from the previous period. One chart. Then short lists:
 * what the period added up to, who owes money, who and what brought it in.
 *
 * ============================ RULES IT KEEPS ============================
 * - Every number is the one the old page showed, from the same
 *   ReportsPageData. Nothing is computed here except display rounding and
 *   one ratio (approved estimates / sent estimates) from two counts on screen.
 * - Each figure appears once. A second card that needs it links to the first.
 * - A figure that is not for the selected period says so in its label
 *   ("as of today", "all time").
 * - Bars, not rings. Red, amber and green only where they mean something.
 */

const CARD_CLASS =
  "min-w-0 overflow-hidden rounded-[var(--radius-panel)] border border-altair-border/40 bg-altair-paper shadow-[var(--elev-hairline),var(--elev-2)]";
const LINK_CLASS =
  "shrink-0 text-xs font-semibold text-[var(--brand-metal-text)] underline-offset-2 transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]";
const SECONDARY_BUTTON_CLASS =
  "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-[var(--radius-control)] border border-altair-border/50 bg-altair-paper px-3 text-[13px] font-semibold text-altair-ink-on-paper shadow-[var(--elev-hairline)] transition-colors hover:bg-altair-paper-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-60";
const MUTED = "text-altair-ink-on-paper-secondary";

const RANGE_SHORT_LABELS: Record<ReportsPageDateRange, string> = {
  "7d": "7 days",
  "30d": "30 days",
  "90d": "90 days",
  ytd: "This year",
};

function formatBound(value: string): string {
  const date = new Date(value.length <= 10 ? `${value}T12:00:00.000Z` : value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function rowAmount(row: ReportSnapshotRow): number {
  if (typeof row.amount === "number") return row.amount;
  const parsed = Number(row.value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function CardHeader({
  title,
  note,
  href,
  hrefLabel,
}: {
  title: string;
  note?: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 pb-2 pt-3.5 sm:px-5">
      <div className="min-w-0">
        <h2 className="text-[15px] font-bold tracking-tight text-altair-ink-on-paper">{title}</h2>
        {note ? <p className={`mt-0.5 text-xs ${MUTED}`}>{note}</p> : null}
      </div>
      {href ? (
        <Link href={href} className={`${LINK_CLASS} mt-0.5`}>
          {hrefLabel ?? "View all"} →
        </Link>
      ) : null}
    </div>
  );
}

type StatTone = "brass" | "info" | "success" | "danger";

const STAT_ICON_TONE: Record<StatTone, string> = {
  brass: "bg-altair-brass/15 text-[var(--brand-metal-text)]",
  info: "bg-altair-information-surface text-altair-information-foreground",
  success: "bg-altair-success-surface text-altair-success-foreground",
  danger: "bg-altair-danger-surface text-altair-danger",
};

function StatCard({
  icon: Icon,
  tone,
  label,
  value,
  children,
}: {
  icon: LucideIcon;
  tone: StatTone;
  label: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={`${CARD_CLASS} flex items-start gap-3 p-3.5 sm:p-4`}>
      {/* Two cards share a row on a phone, so the icon waits for more room. */}
      <span className={`hidden h-10 w-10 shrink-0 items-center justify-center rounded-[10px] sm:flex ${STAT_ICON_TONE[tone]}`}>
        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className={`text-[13px] font-medium ${MUTED}`}>{label}</p>
        <p className="mt-0.5 text-[22px] font-bold leading-tight tracking-tight tabular-nums text-altair-ink-on-paper sm:text-[26px]">
          {value}
        </p>
        <div className="mt-1 space-y-0.5 text-xs">{children}</div>
      </div>
    </div>
  );
}

/** "Up 51% vs previous period", with an arrow as well as colour. */
function Comparison({ metric }: { metric: ReportKpiMetric | undefined }) {
  if (!metric?.comparison) return null;
  const Icon = metric.trend === "up" ? TrendingUp : metric.trend === "down" ? TrendingDown : null;
  const tone =
    metric.trend === "up"
      ? "font-semibold text-altair-success-foreground"
      : metric.trend === "down"
        ? "font-semibold text-altair-danger"
        : MUTED;
  return (
    <p className={`flex items-center gap-1 ${tone}`}>
      {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : null}
      <span>{metric.comparison}</span>
    </p>
  );
}

function LedgerRow({
  label,
  hint,
  value,
  strong = false,
}: {
  label: string;
  hint?: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="min-w-0">
        <span className={`text-sm ${strong ? "font-bold text-altair-ink-on-paper" : "text-altair-ink-on-paper"}`}>
          {label}
        </span>
        {hint ? <span className={`block text-xs ${MUTED}`}>{hint}</span> : null}
      </dt>
      <dd className={`shrink-0 tabular-nums text-altair-ink-on-paper ${strong ? "text-base font-bold" : "text-sm font-semibold"}`}>
        {value}
      </dd>
    </div>
  );
}

/** A ranked row: name, a line of detail, the amount, and a bar against the largest. */
function RankedRow({
  rank,
  label,
  detail,
  value,
  share,
  href,
  initials,
}: {
  rank: number;
  label: string;
  detail?: string;
  value: string;
  share: number;
  href?: string;
  initials?: string;
}) {
  const name = href ? (
    <Link href={href} className="truncate font-semibold text-altair-ink-on-paper underline-offset-2 hover:underline">
      {label}
    </Link>
  ) : (
    <span className="truncate font-semibold text-altair-ink-on-paper">{label}</span>
  );
  return (
    <li className="px-4 py-2.5 sm:px-5">
      <div className="flex items-center gap-3">
        {initials ? (
          <span
            aria-hidden="true"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--chrome-elevated)] text-[10.5px] font-bold text-white"
          >
            {initials}
          </span>
        ) : (
          <span className={`w-4 shrink-0 text-xs font-semibold tabular-nums ${MUTED}`}>{rank}</span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            {name}
            <span className="shrink-0 font-semibold tabular-nums text-altair-ink-on-paper">{value}</span>
          </div>
          <div className="mt-1.5 flex items-center gap-3">
            <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-altair-paper-subtle" aria-hidden="true">
              <span className="block h-full rounded-full bg-[var(--chart-1)]" style={{ width: `${Math.max(2, Math.round(share * 100))}%` }} />
            </span>
            {detail ? <span className={`shrink-0 text-xs ${MUTED}`}>{detail}</span> : null}
          </div>
        </div>
      </div>
    </li>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className={`px-4 pb-4 pt-1 text-sm sm:px-5 ${MUTED}`}>{children}</p>;
}

/** Oldest debt is the worst: neutral for not yet due, then amber through red. */
const AGING_COLORS = ["var(--chart-5)", "#d9b45f", "var(--altair-warning)", "#c9623f", "var(--altair-danger)"];

export type ReportsOverviewViewProps = {
  data: ReportsPageData;
  aiFeaturesEnabled: boolean;
  canManageCustomers?: boolean;
  initialCachedSummary?: BusinessSummaryAiResult | null;
};

export function ReportsOverviewView({
  data,
  aiFeaturesEnabled,
  canManageCustomers = false,
  initialCachedSummary = null,
}: ReportsOverviewViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const timeZone = useCompanyTimezone();
  const [isRangePending, startRangeTransition] = useTransition();

  // AI summary state is keyed by range and derived from props, so a summary
  // for one period never shows under another.
  const [summaryOverride, setSummaryOverride] = useState<{
    range: ReportsPageDateRange;
    value: BusinessSummaryAiResult | null;
  } | null>(null);
  const [errorOverride, setErrorOverride] = useState<{ range: ReportsPageDateRange; message: string } | null>(null);
  const [isSummaryPending, startSummaryTransition] = useTransition();
  const summary =
    summaryOverride && summaryOverride.range === data.dateRange ? summaryOverride.value : initialCachedSummary;
  const summaryError = errorOverride && errorOverride.range === data.dateRange ? errorOverride.message : null;

  function handleGenerateSummary(refresh = false) {
    if (!aiFeaturesEnabled || isSummaryPending) return;
    const range = data.dateRange;
    setErrorOverride(null);
    startSummaryTransition(async () => {
      const result = await generateBusinessSummaryAction(range, { refresh });
      if (result.error || !result.summary) {
        setErrorOverride({
          range,
          message: formatActionError(result.error, "Could not generate a business summary. Try again."),
        });
        return;
      }
      setSummaryOverride({ range, value: result.summary });
    });
  }

  function handleRangeChange(next: ReportsPageDateRange) {
    if (next === data.dateRange) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", next);
    startRangeTransition(() => router.push(`/reports?${params.toString()}`));
  }

  const kpi = (id: ReportKpiMetric["id"]) => data.kpis.find((metric) => metric.id === id);
  const ledger = data.accountantSummary;
  const rangeLabel =
    REPORTS_PAGE_DATE_RANGE_OPTIONS.find((option) => option.value === data.dateRange)?.label ?? "Selected period";
  const periodLine = `${rangeLabel} · ${formatBound(data.dateBounds.startDate)} to ${formatBound(data.dateBounds.endDate)}`;
  const taxSummaryHref = `/reports/tax-summary?range=${data.dateRange}`;

  const agingTotal = ledger.invoiceAging.reduce((sum, bucket) => sum + bucket.amount, 0);
  const overdueRows = data.operationsSnapshot.overdueInvoices.slice(0, 3);

  const stage = (key: string) => data.salesFunnel.find((entry) => entry.key === key)?.count;
  const funnel = data.salesFunnel;
  const estimatesSent = stage("sent") ?? funnel[0]?.count ?? 0;
  const estimatesApproved = stage("approved") ?? funnel[1]?.count ?? 0;
  const approvedShare = estimatesSent > 0 ? Math.round((estimatesApproved / estimatesSent) * 100) : null;

  const technicians = [...data.technicianProfitability].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  const topTechnicianRevenue = Math.max(1, ...technicians.map((entry) => entry.revenue));
  const anyProfitMissing = technicians.some((entry) => !entry.profitAvailable);

  const services = data.operationsSnapshot.topServiceCategories.slice(0, 5);
  const topServiceAmount = Math.max(1, ...services.map(rowAmount));
  const customers = data.operationsSnapshot.topCustomers.slice(0, 5);
  const topCustomerAmount = Math.max(1, ...customers.map(rowAmount));

  const time = data.timeTracking;
  const leads = data.leadPipeline;
  const showSummaryCard = summary != null || isSummaryPending || summaryError != null;

  return (
    <MasterShellPage density="compact" data-testid="page-reports">
      <MasterPageCanvas width="wide">
        <MasterContentStack density="compact" className="min-w-0 overflow-x-hidden">
          <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
            <div className="min-w-0">
              <h1 className={`text-[26px] font-bold leading-tight tracking-tight ${altairCanvasInkClass}`}>Reports</h1>
              <p className={`mt-1 text-sm ${altairCanvasInkMutedClass}`}>{periodLine}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div
                role="group"
                aria-label="Report period"
                aria-busy={isRangePending}
                className="flex min-h-11 items-stretch rounded-[var(--radius-control)] border border-altair-border/50 bg-altair-paper p-0.5 shadow-[var(--elev-hairline)] sm:min-h-10"
              >
                {REPORTS_PAGE_DATE_RANGE_OPTIONS.map((option) => {
                  const active = option.value === data.dateRange;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={active}
                      aria-label={option.label}
                      onClick={() => handleRangeChange(option.value)}
                      className={`min-w-[4.25rem] rounded-[calc(var(--radius-control)-2px)] px-2.5 text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${
                        active
                          ? "bg-[var(--chrome-elevated)] font-bold text-white"
                          : "font-semibold text-altair-ink-on-paper-secondary hover:bg-altair-paper-subtle"
                      }`}
                    >
                      {RANGE_SHORT_LABELS[option.value]}
                    </button>
                  );
                })}
              </div>
              <Link href={taxSummaryHref} className={SECONDARY_BUTTON_CLASS}>
                <FileText className="h-4 w-4" aria-hidden="true" />
                Tax summary
              </Link>
              {aiFeaturesEnabled ? (
                <button
                  type="button"
                  className={SECONDARY_BUTTON_CLASS}
                  onClick={() => handleGenerateSummary(false)}
                  disabled={isSummaryPending}
                >
                  {isSummaryPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                  )}
                  Summarize
                </button>
              ) : null}
            </div>
          </header>

          {/* Headline figures. Each appears here and nowhere else on the page. */}
          <section aria-label="Headline figures" className="grid min-w-0 grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
            <StatCard icon={CircleDollarSign} tone="success" label="Collected" value={kpi("revenue")?.value ?? formatCurrency(ledger.totalPaymentsCollected)}>
              <Comparison metric={kpi("revenue")} />
            </StatCard>
            <StatCard icon={Receipt} tone="brass" label="Average ticket" value={kpi("average-ticket")?.value ?? "—"}>
              <Comparison metric={kpi("average-ticket")} />
            </StatCard>
            <StatCard icon={Percent} tone="info" label="Estimates approved" value={kpi("close-rate")?.value ?? "—"}>
              <Comparison metric={kpi("close-rate")} />
            </StatCard>
            <StatCard
              icon={Wallet}
              tone={ledger.overdueBalance > 0 ? "danger" : "brass"}
              label="Owed to you, as of today"
              value={kpi("outstanding")?.value ?? formatCurrency(ledger.outstandingBalance)}
            >
              <p className={MUTED}>{kpi("outstanding")?.comparison}</p>
              {ledger.overdueBalance > 0 ? (
                <p className="font-semibold text-altair-danger">{formatCurrency(ledger.overdueBalance)} overdue</p>
              ) : null}
            </StatCard>
          </section>

          {showSummaryCard ? (
            <section aria-label="Summary of this period" className={CARD_CLASS}>
              <CardHeader title="Summary of this period" note="Written by AI from the figures on this page. Check anything important against them." />
              <div className="space-y-3 px-4 pb-4 sm:px-5">
                {isSummaryPending ? (
                  <p className={`flex items-center gap-2 text-sm ${MUTED}`}>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Writing the summary…
                  </p>
                ) : summary ? (
                  <>
                    <ul className="space-y-1.5 text-sm leading-relaxed text-altair-ink-on-paper">
                      {summary.bullets.map((bullet) => (
                        <li key={bullet} className="flex gap-2.5">
                          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-altair-brass" aria-hidden="true" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="rounded-[var(--radius-control)] bg-altair-brass/10 px-3.5 py-2.5 text-sm leading-relaxed text-altair-ink-on-paper">
                      <span className="font-bold">Takeaway: </span>
                      {summary.recommendedAction}
                    </p>
                    <button type="button" className={`${LINK_CLASS} disabled:opacity-60`} onClick={() => handleGenerateSummary(true)} disabled={isSummaryPending}>
                      Write it again
                    </button>
                  </>
                ) : null}
                {summaryError ? (
                  <p role="alert" className="text-sm font-medium text-altair-danger">
                    {summaryError}
                  </p>
                ) : null}
              </div>
            </section>
          ) : null}

          {/* The one chart, and what the period added up to. */}
          <div className="grid min-w-0 gap-3 lg:grid-cols-12">
            <section aria-label="Money collected over the period" className={`${CARD_CLASS} lg:col-span-8`}>
              <CardHeader title="Money collected" note="Payments recorded, by date received." />
              <div className="px-2 pb-3 sm:px-3">
                <ReportsRevenueChart points={data.revenueTrend} />
              </div>
            </section>

            <section aria-label="Period totals" className={`${CARD_CLASS} lg:col-span-4`}>
              <CardHeader title="This period" note="From records entered in Altair." />
              <dl className="divide-y divide-altair-border/30 px-4 pb-2 sm:px-5">
                <LedgerRow label="Invoiced" value={formatCurrency(ledger.totalInvoiceValue)} />
                <LedgerRow
                  label="Collection rate"
                  hint="Collected divided by invoiced, this period"
                  value={data.cashHealth.collectionRateLabel}
                />
                <LedgerRow label="Sales tax collected" value={formatCurrency(ledger.salesTaxCollected)} />
                <LedgerRow label="Expenses recorded" value={formatCurrency(ledger.expensesRecorded)} />
                <LedgerRow
                  label="Net income, estimated"
                  hint={
                    ledger.expensesRecorded > 0
                      ? "Collected less the expenses recorded here. Not tax advice."
                      : "No expenses are recorded for this period, so this equals Collected. Not tax advice."
                  }
                  value={formatCurrency(ledger.netIncomeEstimate)}
                  strong
                />
              </dl>
            </section>
          </div>

          {/* Who owes money, and how estimates turned into work. */}
          <div className="grid min-w-0 gap-3 lg:grid-cols-2">
            <section aria-label="Money owed" className={CARD_CLASS}>
              <CardHeader title="Money owed" note="Open invoice balances as of today, by how late they are." href="/sales?tab=invoices" hrefLabel="Open invoices" />
              {agingTotal <= 0 ? (
                <EmptyNote>Nothing is owed right now. Every invoice is paid.</EmptyNote>
              ) : (
                <div className="px-4 pb-4 sm:px-5">
                  <div className="flex h-2.5 overflow-hidden rounded-full bg-altair-paper-subtle" aria-hidden="true">
                    {ledger.invoiceAging.map((bucket, index) =>
                      bucket.amount > 0 ? (
                        <span
                          key={bucket.label}
                          style={{ width: `${(bucket.amount / agingTotal) * 100}%`, backgroundColor: AGING_COLORS[Math.min(index, AGING_COLORS.length - 1)] }}
                        />
                      ) : null,
                    )}
                  </div>
                  <ul className="mt-3 divide-y divide-altair-border/30">
                    {ledger.invoiceAging.map((bucket, index) => (
                      <li key={bucket.label} className={`flex items-center justify-between gap-3 py-2 text-sm ${bucket.amount > 0 ? "" : "opacity-55"}`}>
                        <span className="flex min-w-0 items-center gap-2 text-altair-ink-on-paper">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: AGING_COLORS[Math.min(index, AGING_COLORS.length - 1)] }} aria-hidden="true" />
                          <span className="truncate">{bucket.label}</span>
                        </span>
                        <span className="flex shrink-0 items-baseline gap-3">
                          <span className={`text-xs ${MUTED}`}>
                            {bucket.count} {bucket.count === 1 ? "invoice" : "invoices"}
                          </span>
                          <span className="w-20 text-right font-semibold tabular-nums text-altair-ink-on-paper">{formatCurrency(bucket.amount)}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                  {overdueRows.length > 0 ? (
                    <div className="mt-3 rounded-[var(--radius-control)] bg-altair-danger-surface px-3.5 py-3">
                      <p className="flex items-center gap-1.5 text-xs font-bold text-altair-danger">
                        <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                        Overdue, largest first
                      </p>
                      <ul className="mt-1.5 space-y-1">
                        {overdueRows.map((row) => (
                          <li key={row.id} className="flex items-baseline justify-between gap-3 text-sm text-altair-ink-on-paper">
                            <span className="min-w-0 truncate">
                              {row.label}
                              {row.detail ? <span className={`ml-1.5 text-xs ${MUTED}`}>{row.detail}</span> : null}
                            </span>
                            <span className="shrink-0 font-semibold tabular-nums">{formatCurrency(rowAmount(row))}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              )}
            </section>

            <section aria-label="Estimates and work" className={CARD_CLASS}>
              <CardHeader title="Estimates and work" note="Counts for this period." href="/sales" hrefLabel="Open sales" />
              <div className="grid grid-cols-2 gap-px bg-altair-border/30">
                {funnel.map((entry) => (
                  <div key={entry.key} className="bg-altair-paper px-4 py-3.5 sm:px-5">
                    <p className="text-[26px] font-bold leading-none tracking-tight tabular-nums text-altair-ink-on-paper">{entry.count}</p>
                    <p className={`mt-1.5 text-[13px] ${MUTED}`}>{entry.label}</p>
                  </div>
                ))}
              </div>
              <p className={`px-4 py-3 text-xs sm:px-5 ${MUTED}`}>
                {approvedShare != null
                  ? `${estimatesApproved} of ${estimatesSent} estimates sent were approved (${approvedShare}%). `
                  : "No estimates were sent in this period. "}
                Jobs and invoices are counted on their own; most jobs here did not start from an estimate.
              </p>
            </section>
          </div>

          {/* Who and what brought the money in. */}
          <div className={`grid min-w-0 gap-3 ${data.showTechnicianProfitability ? "lg:grid-cols-2" : ""}`}>
            {data.showTechnicianProfitability ? (
              <section aria-label="Top technicians" className={CARD_CLASS}>
                <CardHeader title="Top technicians" note="By revenue on completed work, this period." href="/team" hrefLabel="Open team" />
                {technicians.length === 0 ? (
                  <EmptyNote>No completed work with revenue in this period.</EmptyNote>
                ) : (
                  <ul className="divide-y divide-altair-border/30 pb-1">
                    {technicians.map((entry, index) => (
                      <RankedRow
                        key={entry.technicianId}
                        rank={index + 1}
                        initials={getPartnerInitials(entry.name)}
                        label={entry.name}
                        detail={`${entry.jobCount} ${entry.jobCount === 1 ? "job" : "jobs"}${
                          entry.profitAvailable && entry.margin != null ? ` · ${Math.round(entry.margin)}% margin` : ""
                        }`}
                        value={formatCurrency(entry.revenue)}
                        share={entry.revenue / topTechnicianRevenue}
                      />
                    ))}
                  </ul>
                )}
                {anyProfitMissing && technicians.length > 0 ? (
                  <p className={`border-t border-altair-border/30 px-4 py-3 text-xs sm:px-5 ${MUTED}`}>
                    To see profit and margin here, add an hourly labor cost on each person&apos;s page in Team.
                  </p>
                ) : null}
              </section>
            ) : null}

            <section aria-label="Top services" className={CARD_CLASS}>
              <CardHeader title="Top services" note="Revenue by service category, this period." />
              {services.length === 0 ? (
                <EmptyNote>No revenue has been tied to a service category in this period.</EmptyNote>
              ) : (
                <ul className="divide-y divide-altair-border/30 pb-1">
                  {services.map((row, index) => (
                    <RankedRow key={row.id} rank={index + 1} label={row.label} detail={row.detail} value={formatCurrency(rowAmount(row))} share={rowAmount(row) / topServiceAmount} />
                  ))}
                </ul>
              )}
            </section>
          </div>

          <div className="grid min-w-0 gap-3 lg:grid-cols-2">
            <section aria-label="Top customers" className={CARD_CLASS}>
              <CardHeader title="Top customers" note="By payments received, this period." href={canManageCustomers ? "/customers" : undefined} hrefLabel="Open customers" />
              {customers.length === 0 ? (
                <EmptyNote>No payments were received in this period.</EmptyNote>
              ) : (
                <ul className="divide-y divide-altair-border/30 pb-1">
                  {customers.map((row, index) => (
                    <RankedRow
                      key={row.id}
                      rank={index + 1}
                      label={row.label}
                      detail={row.detail}
                      value={formatCurrency(rowAmount(row))}
                      share={rowAmount(row) / topCustomerAmount}
                      href={canManageCustomers && row.customerId ? `/customers/${row.customerId}` : undefined}
                    />
                  ))}
                </ul>
              )}
              <dl className="grid grid-cols-2 gap-px border-t border-altair-border/30 bg-altair-border/30">
                <div className="bg-altair-paper px-4 py-3 sm:px-5">
                  <dt className={`text-xs ${MUTED}`}>Repeat customers, all time</dt>
                  <dd className="mt-0.5 text-lg font-bold tabular-nums text-altair-ink-on-paper">{data.customerHealth.repeatCustomerRateLabel}</dd>
                  <dd className={`text-xs ${MUTED}`}>
                    {data.customerHealth.repeatCustomerCount} of {data.customerHealth.totalCustomerCount} customers
                  </dd>
                </div>
                <div className="bg-altair-paper px-4 py-3 sm:px-5">
                  <dt className={`text-xs ${MUTED}`}>Collected, all time</dt>
                  <dd className="mt-0.5 text-lg font-bold tabular-nums text-altair-ink-on-paper">{formatCurrency(data.customerHealth.lifetimeRevenueTotal)}</dd>
                  <dd className={`text-xs ${MUTED}`}>Every payment recorded</dd>
                </div>
              </dl>
            </section>

            {data.showLeadPipeline ? (
              <section aria-label="Leads" className={CARD_CLASS}>
                <CardHeader title="Leads" note="Leads created in this period." href={canManageCustomers ? "/customers?tab=pipeline" : undefined} hrefLabel="Open leads" />
                {leads.totalLeads === 0 ? (
                  <EmptyNote>No leads were created in this period.</EmptyNote>
                ) : (
                  <>
                    <dl className="grid grid-cols-4 gap-px bg-altair-border/30">
                      {[
                        ["New", String(leads.totalLeads)],
                        ["Won", String(leads.wonLeads)],
                        ["Lost", String(leads.lostLeads)],
                        ["Won rate", leads.conversionRate == null ? "—" : `${Math.round(leads.conversionRate)}%`],
                      ].map(([label, value]) => (
                        <div key={label} className="bg-altair-paper px-3 py-3 sm:px-4">
                          <dd className="text-xl font-bold leading-none tabular-nums text-altair-ink-on-paper">{value}</dd>
                          <dt className={`mt-1.5 text-xs ${MUTED}`}>{label}</dt>
                        </div>
                      ))}
                    </dl>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className={`text-left text-xs ${MUTED}`}>
                          <th scope="col" className="px-4 pb-1.5 pt-3 font-medium sm:px-5">Source</th>
                          <th scope="col" className="px-2 pb-1.5 pt-3 text-right font-medium">Leads</th>
                          <th scope="col" className="px-2 pb-1.5 pt-3 text-right font-medium">Won</th>
                          <th scope="col" className="px-4 pb-1.5 pt-3 text-right font-medium sm:px-5">Won rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-altair-border/30 border-t border-altair-border/30">
                        {leads.sourcePerformance.map((source) => (
                          <tr key={source.source} className="text-altair-ink-on-paper">
                            <th scope="row" className="px-4 py-2 text-left font-semibold sm:px-5">{formatLeadSource(source.source)}</th>
                            <td className="px-2 py-2 text-right tabular-nums">{source.total}</td>
                            <td className="px-2 py-2 text-right tabular-nums">{source.won}</td>
                            <td className="px-4 py-2 text-right tabular-nums sm:px-5">
                              {source.conversionRate == null ? "—" : `${Math.round(source.conversionRate)}%`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className={`px-4 py-3 text-xs sm:px-5 ${MUTED}`}>
                      Won and lost show where each lead stands today, not when it closed.
                    </p>
                  </>
                )}
              </section>
            ) : null}
          </div>

          {/* The time clock is about today, whatever period is selected. */}
          <section aria-label="Time clock today" className={CARD_CLASS}>
            <CardHeader title="Time clock, today" note="Shift clocks only. This does not change with the period above." href="/team?tab=time-clock" hrefLabel="Review shifts" />
            <div className="grid gap-px bg-altair-border/30 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)]">
              <div className="bg-altair-paper px-4 py-3.5 sm:px-5">
                <p className="text-[26px] font-bold leading-none tabular-nums text-altair-ink-on-paper">{time.shiftHoursToday.toFixed(1)} h</p>
                <p className={`mt-1.5 text-[13px] ${MUTED}`}>On the clock today</p>
              </div>
              <div className="bg-altair-paper px-4 py-3.5 sm:px-5">
                <p className="text-[26px] font-bold leading-none tabular-nums text-altair-ink-on-paper">{time.openShiftCount}</p>
                <p className={`mt-1.5 text-[13px] ${MUTED}`}>{time.openShiftCount === 1 ? "Shift open now" : "Shifts open now"}</p>
              </div>
              <div className="bg-altair-paper px-4 py-3.5 sm:px-5">
                {time.staleOpenShifts.length === 0 ? (
                  <p className={`text-sm ${MUTED}`}>No shift has been open 12 hours or longer.</p>
                ) : (
                  <>
                    <p className="flex items-center gap-1.5 text-sm font-bold text-altair-warning-foreground">
                      <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                      {time.staleOpenShifts.length} open 12 hours or longer
                    </p>
                    <p className={`mt-0.5 text-xs ${MUTED}`}>
                      Probably a missed clock-out. Today&apos;s hours are overstated until these are corrected.
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-altair-ink-on-paper">
                      {time.staleOpenShifts.map((shift) => (
                        <li key={shift.id} className="flex items-baseline justify-between gap-3">
                          <span className="min-w-0 truncate font-semibold">{shift.technicianName}</span>
                          <span className={`shrink-0 text-xs ${MUTED}`}>
                            since{" "}
                            {formatDateInTimeZone(new Date(shift.startedAt), timeZone, {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })}{" "}
                            · {shift.elapsedHours.toFixed(1)} h
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>
          </section>

          {data.limitations.length > 0 ? (
            <section aria-label="About these numbers" className={`text-xs leading-relaxed ${altairCanvasInkMutedClass}`}>
              <p className="font-semibold">About these numbers</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                {data.limitations.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </MasterContentStack>
      </MasterPageCanvas>
    </MasterShellPage>
  );
}
