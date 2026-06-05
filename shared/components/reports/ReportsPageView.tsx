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
import { AccountantSummaryCard } from "./AccountantSummaryCard";
import { AiBusinessSummaryCard } from "./AiBusinessSummaryCard";
import { CashHealthChartCard } from "./CashHealthChartCard";
import { OperationsSnapshotSection } from "./OperationsSnapshotCard";
import { ReportDateRangeBar } from "./ReportDateRangeBar";
import { ReportKpiCard } from "./ReportKpiCard";
import { RevenueTrendChartCard } from "./RevenueTrendChartCard";
import { SalesFunnelChartCard } from "./SalesFunnelChartCard";
import { TechnicianProfitabilityChartCard } from "./TechnicianProfitabilityChartCard";

type ReportsPageViewProps = {
  data: ReportsPageData;
  aiFeaturesEnabled: boolean;
  initialCachedSummary?: BusinessSummaryAiResult | null;
};

export function ReportsPageView({
  data,
  aiFeaturesEnabled,
  initialCachedSummary = null,
}: ReportsPageViewProps) {
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
    <div className="flex flex-col gap-4 pb-2 sm:gap-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="admin-heading-page">Reports</h1>
          <p className="admin-text-helper mt-0.5 max-w-2xl">
            Track revenue, cash flow, sales performance, and operational health.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <button
            type="button"
            className="admin-btn-secondary inline-flex w-full items-center justify-center gap-2 sm:w-auto"
            onClick={() => handleGenerateSummary(false)}
            disabled={!aiFeaturesEnabled || isSummaryPending}
          >
            {isSummaryPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            )}
            Generate AI Summary
          </button>
          <Link
            href={taxSummaryHref}
            className="admin-btn-primary inline-flex w-full items-center justify-center gap-2 sm:w-auto"
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            Export Tax Summary
          </Link>
        </div>
      </header>

      <ReportDateRangeBar range={data.dateRange} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {data.kpis.map((metric) => (
          <ReportKpiCard key={metric.id} metric={metric} />
        ))}
      </div>

      {showAiSummaryCard ? (
        <AiBusinessSummaryCard
          aiFeaturesEnabled={aiFeaturesEnabled}
          summary={summary}
          error={summaryError}
          isPending={isSummaryPending}
          onRefresh={() => handleGenerateSummary(true)}
        />
      ) : null}

      <div className="grid gap-3 lg:grid-cols-12 lg:gap-4">
        <div className="lg:col-span-8">
          <RevenueTrendChartCard data={data.revenueTrend} />
        </div>
        <div className="lg:col-span-4">
          <CashHealthChartCard data={data.cashHealth} />
        </div>
        <div className="lg:col-span-6">
          <SalesFunnelChartCard stages={data.salesFunnel} />
        </div>
        {data.showTechnicianProfitability ? (
          <div className="lg:col-span-6">
            <TechnicianProfitabilityChartCard
              technicians={data.technicianProfitability}
            />
          </div>
        ) : null}
      </div>

      <OperationsSnapshotSection
        topCustomers={data.operationsSnapshot.topCustomers}
        topServiceCategories={data.operationsSnapshot.topServiceCategories}
        overdueInvoices={data.operationsSnapshot.overdueInvoices}
        workCompleted={data.operationsSnapshot.workCompleted}
      />

      <AccountantSummaryCard dateRange={data.dateRange} />
    </div>
  );
}
