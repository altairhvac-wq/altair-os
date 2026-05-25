"use client";

import { useEffect, useMemo, useState } from "react";
import { getMockAnalytics } from "@/shared/data/mock-analytics";
import type { AnalyticsDateRange } from "@/shared/types/analytics";
import { AnalyticsEmptyState } from "./AnalyticsEmptyState";
import { AnalyticsInsightCards } from "./AnalyticsInsightCards";
import { AnalyticsLoadingState } from "./AnalyticsLoadingState";
import { AnalyticsSummaryCards } from "./AnalyticsSummaryCards";
import { DateRangeFilterBar } from "./DateRangeFilterBar";
import { JobPerformanceChart } from "./JobPerformanceChart";
import { OutstandingInvoicesPanel } from "./OutstandingInvoicesPanel";
import { PartnerRevenueLeaderboard } from "./PartnerRevenueLeaderboard";
import { ProfitabilityBreakdown } from "./ProfitabilityBreakdown";
import { RevenueByModuleCards } from "./RevenueByModuleCards";
import { RevenueTrendChart } from "./RevenueTrendChart";
import { TechnicianPerformanceTable } from "./TechnicianPerformanceTable";

export function AnalyticsPageView() {
  const [range, setRange] = useState<AnalyticsDateRange>("30d");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 650);

    return () => clearTimeout(timer);
  }, []);

  const dashboard = useMemo(() => getMockAnalytics(range), [range]);
  const isEmpty =
    dashboard.revenueTrend.length === 0 &&
    dashboard.summary.totalRevenue === 0;

  if (isLoading) {
    return <AnalyticsLoadingState />;
  }

  if (isEmpty) {
    return (
      <div className="flex flex-col gap-6">
        <DateRangeFilterBar range={range} onRangeChange={setRange} />
        <AnalyticsEmptyState variant="no-data" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-8">
      <DateRangeFilterBar range={range} onRangeChange={setRange} />

      <AnalyticsInsightCards insights={dashboard.insights} />

      <AnalyticsSummaryCards summary={dashboard.summary} />

      <div className="grid gap-4 xl:grid-cols-2">
        <RevenueTrendChart data={dashboard.revenueTrend} />
        <JobPerformanceChart performance={dashboard.jobPerformance} />
      </div>

      <TechnicianPerformanceTable
        technicians={dashboard.technicians}
        topCustomers={dashboard.topCustomers}
      />

      <ProfitabilityBreakdown
        invoiceBreakdown={dashboard.invoiceBreakdown}
        expensesByCategory={dashboard.expensesByCategory}
        profitByJobType={dashboard.profitByJobType}
      />

      <OutstandingInvoicesPanel
        invoices={dashboard.outstandingInvoices}
        totalOutstanding={dashboard.summary.outstandingInvoices}
      />

      <RevenueByModuleCards modules={dashboard.revenueByModule} />

      <PartnerRevenueLeaderboard partners={dashboard.partnerRevenue} />
    </div>
  );
}
