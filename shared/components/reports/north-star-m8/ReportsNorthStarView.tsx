"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { FileText, Loader2, Sparkles } from "lucide-react";
import { generateBusinessSummaryAction } from "@/app/actions/reports-ai";
import { formatActionError } from "@/shared/lib/operational-errors";
import type {
  BusinessSummaryAiResult,
  ReportsPageData,
} from "@/shared/types/reports-page";
import {
  altairMcMetricLabelClass,
  altairReportSecondaryActionClass,
  SectionHeader,
} from "@/shared/design-system/components";
import {
  altairCanvasInkClass,
  altairCanvasInkMutedClass,
} from "@/shared/design-system/foundation";
import {
  MasterContentStack,
  MasterPageCanvas,
  MasterShellPage,
} from "@/shared/design-system/shell";
import { AccountantSummaryCard } from "../AccountantSummaryCard";
import { AiBusinessSummaryCard } from "../AiBusinessSummaryCard";
import { CashHealthChartCard } from "../CashHealthChartCard";
import { CustomerHealthCard } from "../CustomerHealthCard";
import { LeadPipelineSection } from "../LeadPipelineSection";
import { OperationsSnapshotSection } from "../OperationsSnapshotCard";
import { ReceivablesAgingChartCard } from "../ReceivablesAgingChartCard";
import { ReportDateRangeBar } from "../ReportDateRangeBar";
import { ReportKpiCard } from "../ReportKpiCard";
import { RevenueTrendChartCard } from "../RevenueTrendChartCard";
import { SalesFunnelChartCard } from "../SalesFunnelChartCard";
import { TopPerformersChartCard } from "../TopPerformersChartCard";
import { TopRevenueSourcesChartCard } from "../TopRevenueSourcesChartCard";
import { TimeTrackingSummaryCard } from "../TimeTrackingSummaryCard";
import { ReportsNorthStarPeriodLedgerStrip } from "./ReportsNorthStarPeriodLedgerStrip";

export type ReportsNorthStarViewProps = {
  data: ReportsPageData;
  aiFeaturesEnabled: boolean;
  canManageCustomers?: boolean;
  initialCachedSummary?: BusinessSummaryAiResult | null;
};

function TierSectionIntro({
  title,
  description,
  quiet = false,
}: {
  title: string;
  description: string;
  quiet?: boolean;
}) {
  return (
    <div className="min-w-0">
      <SectionHeader title={title} />
      <p
        className={`mt-1 pl-[14px] ${
          quiet ? `text-[11px] ${altairCanvasInkMutedClass}` : `text-xs ${altairCanvasInkMutedClass}`
        }`}
      >
        {description}
      </p>
    </div>
  );
}

export function ReportsNorthStarView({
  data,
  aiFeaturesEnabled,
  canManageCustomers = false,
  initialCachedSummary = null,
}: ReportsNorthStarViewProps) {
  const taxSummaryHref = `/reports/tax-summary?range=${data.dateRange}`;
  const [summary, setSummary] = useState<BusinessSummaryAiResult | null>(
    initialCachedSummary,
  );
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [isSummaryPending, startSummaryTransition] = useTransition();

  useEffect(() => {
    setSummary(initialCachedSummary);
    setSummaryError(null);
  }, [data.dateRange, initialCachedSummary]);

  function handleGenerateSummary(refresh = false) {
    if (!aiFeaturesEnabled || isSummaryPending) {
      return;
    }

    setSummaryError(null);

    startSummaryTransition(async () => {
      const result = await generateBusinessSummaryAction(data.dateRange, {
        refresh,
      });

      if (result.error || !result.summary) {
        setSummaryError(
          formatActionError(
            result.error,
            "Could not generate a business summary. Try again.",
          ),
        );
        return;
      }

      setSummary(result.summary);
    });
  }

  const showAiSummaryCard =
    summary != null || isSummaryPending || summaryError != null;

  return (
    <MasterShellPage density="compact">
      <MasterPageCanvas width="wide">
        <MasterContentStack density="compact" className="min-w-0 overflow-x-hidden">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div className="min-w-0">
              <p className={altairMcMetricLabelClass}>Operating brief</p>
              <h1
                className={`mt-1 text-2xl font-bold tracking-tight sm:text-3xl ${altairCanvasInkClass}`}
              >
                Reports
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:justify-end sm:gap-2.5">
              <button
                type="button"
                className={altairReportSecondaryActionClass}
                onClick={() => handleGenerateSummary(false)}
                disabled={!aiFeaturesEnabled || isSummaryPending}
              >
                {isSummaryPending ? (
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                )}
                Generate AI Summary
              </button>
              <Link
                href={taxSummaryHref}
                className={altairReportSecondaryActionClass}
              >
                <FileText className="h-4 w-4" aria-hidden="true" />
                Export Tax Summary
              </Link>
            </div>
          </header>

          <ReportDateRangeBar range={data.dateRange} variant="northStar" />

          {/* Tier 1 — primary operating brief */}
          <div className="flex min-w-0 flex-col gap-5">
            <ReportsNorthStarPeriodLedgerStrip summary={data.accountantSummary} />

            <section className="flex min-w-0 flex-col gap-3">
              <TierSectionIntro
                title="Key metrics"
                description="Period performance at a glance."
              />
              <div className="grid min-w-0 gap-2.5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-3">
                {data.kpis.map((metric) => (
                  <ReportKpiCard
                    key={metric.id}
                    metric={metric}
                    variant="northStar"
                  />
                ))}
              </div>
            </section>

            {showAiSummaryCard ? (
              <section className="flex min-w-0 flex-col gap-3">
                <TierSectionIntro
                  title="AI business review"
                  description="Plain-English summary for this reporting period."
                />
                <AiBusinessSummaryCard
                  aiFeaturesEnabled={aiFeaturesEnabled}
                  summary={summary}
                  error={summaryError}
                  isPending={isSummaryPending}
                  onRefresh={() => handleGenerateSummary(true)}
                  variant="northStar"
                />
              </section>
            ) : null}

            <div className="grid min-w-0 gap-2.5 lg:grid-cols-12 lg:gap-3">
              <div className="min-w-0 lg:col-span-12">
                <SalesFunnelChartCard
                  stages={data.salesFunnel}
                  variant="northStar"
                />
              </div>
              <div className="min-w-0 lg:col-span-8">
                <RevenueTrendChartCard
                  data={data.revenueTrend}
                  variant="northStar"
                />
              </div>
              <div className="min-w-0 lg:col-span-4">
                <CashHealthChartCard
                  data={data.cashHealth}
                  variant="northStar"
                />
              </div>
            </div>
          </div>

          {/* Tier 2 — secondary performance detail */}
          <div className="flex min-w-0 flex-col gap-3.5 border-t border-altair-border/60 pt-4">
            <div
              className={`grid min-w-0 gap-3 ${
                data.showTechnicianProfitability
                  ? "lg:grid-cols-2 lg:gap-2.5"
                  : ""
              }`}
            >
              {data.showTechnicianProfitability ? (
                <section className="flex min-w-0 flex-col gap-2">
                  <TierSectionIntro
                    title="Top Performers"
                    description="Technicians ranked by revenue on completed work."
                    quiet
                  />
                  <TopPerformersChartCard
                    technicians={data.technicianProfitability}
                    variant="northStar"
                  />
                </section>
              ) : null}

              <section className="flex min-w-0 flex-col gap-2">
                <TierSectionIntro
                  title="Top Revenue Sources"
                  description="Revenue mix by service category for the period."
                  quiet
                />
                <TopRevenueSourcesChartCard
                  categories={data.operationsSnapshot.topServiceCategories}
                  variant="northStar"
                />
              </section>
            </div>

            <div className="grid min-w-0 gap-3 lg:grid-cols-2 lg:gap-2.5">
              <section className="flex min-w-0 flex-col gap-2">
                <TierSectionIntro
                  title="Receivables Aging"
                  description="Open invoice balances by days past due."
                  quiet
                />
                <ReceivablesAgingChartCard
                  buckets={data.accountantSummary.invoiceAging}
                  variant="northStar"
                />
              </section>

              <section className="flex min-w-0 flex-col gap-2">
                <TierSectionIntro
                  title="Customer Health"
                  description="Retention rate and all-time payment totals."
                  quiet
                />
                <CustomerHealthCard
                  data={data.customerHealth}
                  variant="northStar"
                />
              </section>
            </div>
          </div>

          {/* Tier 3 — quieter supporting reports (always visible) */}
          <div className="flex min-w-0 flex-col gap-3 border-t border-altair-border/40 pt-3.5 opacity-90">
            <div className="min-w-0">
              <p
                className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${altairCanvasInkMutedClass}`}
              >
                More reports
              </p>
            </div>

            <section className="flex min-w-0 flex-col gap-2">
              <div className="min-w-0">
                <SectionHeader
                  title="Shift Time"
                  action={{ label: "Review shifts", href: "/time-clock" }}
                />
                <p
                  className={`mt-1 pl-[14px] text-[11px] ${altairCanvasInkMutedClass}`}
                >
                  Payroll shift clocks only. Job labor is allocation within shift
                  time.
                </p>
              </div>
              <TimeTrackingSummaryCard
                summary={data.timeTracking}
                variant="northStar"
              />
            </section>

            {data.showLeadPipeline ? (
              <section className="flex min-w-0 flex-col gap-2">
                <TierSectionIntro
                  title="Lead Pipeline"
                  description="Lead activity created during the selected period."
                  quiet
                />
                <LeadPipelineSection
                  metrics={data.leadPipeline}
                  variant="northStar"
                />
              </section>
            ) : null}

            <section className="flex min-w-0 flex-col gap-2">
              <TierSectionIntro
                title="Operations Snapshot"
                description="Quick lists for customers, services, collections, and completed work."
                quiet
              />
              <OperationsSnapshotSection
                topCustomers={data.operationsSnapshot.topCustomers}
                topServiceCategories={
                  data.operationsSnapshot.topServiceCategories
                }
                overdueInvoices={data.operationsSnapshot.overdueInvoices}
                workCompleted={data.operationsSnapshot.workCompleted}
                canManageCustomers={canManageCustomers}
                variant="northStar"
              />
            </section>
          </div>

          <section className="flex min-w-0 flex-col gap-2 border-t border-altair-border/30 pt-3 opacity-85">
            <TierSectionIntro
              title="Accountant summary"
              description="Printable bookkeeping export for the selected period."
              quiet
            />
            <AccountantSummaryCard
              dateRange={data.dateRange}
              variant="northStar"
            />
          </section>
        </MasterContentStack>
      </MasterPageCanvas>
    </MasterShellPage>
  );
}
