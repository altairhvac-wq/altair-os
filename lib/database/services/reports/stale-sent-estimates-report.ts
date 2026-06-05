import { listEstimates } from "@/lib/database/queries/estimates";
import {
  buildStaleSentEstimateEntries,
  ESTIMATE_RECOVERY_THRESHOLD_DAYS,
} from "@/shared/lib/estimate-recovery";
import {
  buildReportSectionMeta,
  type StaleSentEstimatesReport,
} from "@/shared/types/reports";

export async function getCompanyStaleSentEstimatesReport(
  companyId: string,
): Promise<StaleSentEstimatesReport> {
  const reference = new Date();
  const estimates = await listEstimates(companyId);
  const staleSentEstimates = buildStaleSentEstimateEntries(estimates, reference);

  const limitations = [
    "Stale sent estimates use a simple age heuristic based on first send time only.",
    "No scheduled or background evaluation; results reflect this page load only.",
    "Resent estimate emails do not reset the aging clock.",
    "Only estimates with status sent and a resolved sentAt timestamp are included.",
    `Flags sent estimates awaiting approval for ${ESTIMATE_RECOVERY_THRESHOLD_DAYS}+ days since first send.`,
  ];

  return {
    summary: {
      staleSentCount: staleSentEstimates.length,
      staleSentEstimates,
      recoveryThresholdDays: ESTIMATE_RECOVERY_THRESHOLD_DAYS,
    },
    meta: buildReportSectionMeta({
      dateRange: "all",
      dateBounds: null,
      limitations,
    }),
  };
}
