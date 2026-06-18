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
  MasterContentStack,
  MasterPageHeader,
  MasterShellPage,
} from "@/shared/design-system/shell";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";
import { AccountantSummaryCard } from "../AccountantSummaryCard";
import { AiBusinessSummaryCard } from "../AiBusinessSummaryCard";
import { CashHealthChartCard } from "../CashHealthChartCard";
import { LeadPipelineSection } from "../LeadPipelineSection";
import { OperationsSnapshotSection } from "../OperationsSnapshotCard";
import { ReportDateRangeBar } from "../ReportDateRangeBar";
import { ReportKpiCard } from "../ReportKpiCard";
import { RevenueTrendChartCard } from "../RevenueTrendChartCard";
import { SalesFunnelChartCard } from "../SalesFunnelChartCard";
import { TechnicianProfitabilityChartCard } from "../TechnicianProfitabilityChartCard";
import { ReportsNorthStarPeriodLedgerStrip } from "./ReportsNorthStarPeriodLedgerStrip";

export type ReportsNorthStarViewProps = {
  data: ReportsPageData;
  aiFeaturesEnabled: boolean;
  canManageCustomers?: boolean;
  initialCachedSummary?: BusinessSummaryAiResult | null;
};

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
    <MasterShellPage density="compact" className={lt.pageCanvas}>
      <MasterPageHeader
        eyebrow="Operating brief"
        title="Reports"
        subtitle="Revenue, cash flow, tax readiness, and operational signals for your business."
        density="compact"
        surfaceVariant="northStar"
        className={`north-star-reports-page-header ${lt.pageHeader}`}
        eyebrowClassName={lt.pageHeaderEyebrow}
        titleClassName={lt.pageHeaderTitle}
        subtitleClassName={lt.pageHeaderSubtitle}
        secondaryAction={
          <button
            type="button"
            className={`north-star-reports-secondary-action ${lt.secondaryAction} justify-center sm:justify-start`}
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
        }
        primaryAction={
          <Link
            href={taxSummaryHref}
            className={`north-star-reports-primary-action ${lt.primaryAction} justify-center sm:justify-start`}
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            Export Tax Summary
          </Link>
        }
      />

      <MasterContentStack
        density="compact"
        className="reports-north-star-brief min-w-0 px-3 sm:px-3.5 lg:px-5"
      >
        <ReportDateRangeBar range={data.dateRange} variant="northStar" />

        <ReportsNorthStarPeriodLedgerStrip summary={data.accountantSummary} />

        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-3">
          {data.kpis.map((metric) => (
            <ReportKpiCard key={metric.id} metric={metric} variant="northStar" />
          ))}
        </div>

        {showAiSummaryCard ? (
          <AiBusinessSummaryCard
            aiFeaturesEnabled={aiFeaturesEnabled}
            summary={summary}
            error={summaryError}
            isPending={isSummaryPending}
            onRefresh={() => handleGenerateSummary(true)}
            variant="northStar"
          />
        ) : null}

        <div className="grid gap-2.5 lg:grid-cols-12 lg:gap-3">
          <div className="lg:col-span-8">
            <RevenueTrendChartCard
              data={data.revenueTrend}
              variant="northStar"
            />
          </div>
          <div className="lg:col-span-4">
            <CashHealthChartCard data={data.cashHealth} variant="northStar" />
          </div>
          <div className="lg:col-span-6">
            <SalesFunnelChartCard stages={data.salesFunnel} variant="northStar" />
          </div>
          {data.showTechnicianProfitability ? (
            <div className="lg:col-span-6">
              <TechnicianProfitabilityChartCard
                technicians={data.technicianProfitability}
                variant="northStar"
              />
            </div>
          ) : null}
        </div>

        {data.showLeadPipeline ? (
          <LeadPipelineSection metrics={data.leadPipeline} variant="northStar" />
        ) : null}

        <OperationsSnapshotSection
          topCustomers={data.operationsSnapshot.topCustomers}
          topServiceCategories={data.operationsSnapshot.topServiceCategories}
          overdueInvoices={data.operationsSnapshot.overdueInvoices}
          workCompleted={data.operationsSnapshot.workCompleted}
          canManageCustomers={canManageCustomers}
          variant="northStar"
        />

        <AccountantSummaryCard dateRange={data.dateRange} variant="northStar" />
      </MasterContentStack>
    </MasterShellPage>
  );
}
