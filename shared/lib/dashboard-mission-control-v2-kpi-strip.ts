import type { MissionControlV2KpiCard } from "@/shared/components/dashboard/mission-control-v2/sample-data";
import type { DashboardKpiStripData } from "@/lib/database/queries/dashboard-kpi-strip";

/**
 * Maps the shared dashboard KPI-strip aggregate into Mission Control v2 cards.
 */
export function buildMissionControlV2KpiCards(
  data: DashboardKpiStripData,
): MissionControlV2KpiCard[] {
  return data.metrics.map((metric) => ({
    id: metric.id,
    label: metric.label,
    value: metric.value,
    comparison: metric.comparison,
    comparisonPositive: metric.comparisonPositive,
    sparkline: metric.sparkline,
  }));
}
