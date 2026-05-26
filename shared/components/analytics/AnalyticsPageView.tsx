"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { AnalyticsDateRange } from "@/shared/types/analytics";
import { OperationalChartsSection } from "@/shared/components/reports/OperationalChartsSection";
import { OperationalReportsSections } from "@/shared/components/reports/OperationalReportsSections";
import { ProfitabilityReportSection } from "@/shared/components/reports/ProfitabilityReportSection";
import type {
  OperationalReportsBundle,
  ProfitabilityReport,
  ProfitabilityReportDateRange,
  ReportChartSeriesBundle,
} from "@/shared/types/reports";
import { AnalyticsEmptyState } from "./AnalyticsEmptyState";
import { DateRangeFilterBar } from "./DateRangeFilterBar";

// TODO(reports-v2): Wire real-data equivalents for sections previously backed by mock-analytics:
// - Insight cards (trend callouts from live aggregates)
// - Job performance breakdown (status/type from job records)
// - Technician performance leaderboard (labor + completion metrics)
// - Outstanding invoices panel (open invoice aging)
// - Revenue by module cards (invoicing vs payments vs other modules)
// - Partner revenue leaderboard (partner-attributed revenue)

type AnalyticsPageViewProps = {
  chartSeries?: ReportChartSeriesBundle;
  operationalReports?: OperationalReportsBundle;
  profitabilityReport?: ProfitabilityReport;
  profitabilityDateRange?: ProfitabilityReportDateRange;
};

function toAnalyticsDateRange(
  range: ProfitabilityReportDateRange,
): AnalyticsDateRange {
  return range === "all" ? "30d" : range;
}

export function AnalyticsPageView({
  chartSeries,
  operationalReports,
  profitabilityReport,
  profitabilityDateRange = "30d",
}: AnalyticsPageViewProps = {}) {
  const router = useRouter();
  const [range, setRange] = useState<AnalyticsDateRange>(
    toAnalyticsDateRange(profitabilityDateRange),
  );

  useEffect(() => {
    setRange(toAnalyticsDateRange(profitabilityDateRange));
  }, [profitabilityDateRange]);

  const handleRangeChange = (nextRange: AnalyticsDateRange) => {
    setRange(nextRange);

    if (operationalReports || profitabilityReport) {
      router.push(`/reports?range=${nextRange}`);
    }
  };

  const hasReportData = Boolean(
    operationalReports || chartSeries || profitabilityReport,
  );

  if (!hasReportData) {
    return (
      <div className="flex flex-col gap-6">
        <DateRangeFilterBar range={range} onRangeChange={handleRangeChange} />
        <AnalyticsEmptyState variant="no-data" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-8">
      <DateRangeFilterBar range={range} onRangeChange={handleRangeChange} />

      {operationalReports ? (
        <OperationalReportsSections reports={operationalReports} />
      ) : null}

      {chartSeries ? <OperationalChartsSection charts={chartSeries} /> : null}

      {profitabilityReport ? (
        <ProfitabilityReportSection report={profitabilityReport} />
      ) : null}
    </div>
  );
}
