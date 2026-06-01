import { listCompanyJobLaborEntries } from "@/lib/database/queries/time-entries";
import { roundJobMaterialAmount } from "@/shared/types/job-material";
import {
  buildReportSectionMeta,
  isDateWithinReportBounds,
  type ProfitabilityReportDateRange,
  resolveReportDateBounds,
  type TechnicianLaborReport,
} from "@/shared/types/reports";
import { resolveClosedJobLaborMinutes } from "@/shared/types/time-entry";

type TechnicianLaborReportOptions = {
  dateRange?: ProfitabilityReportDateRange;
};

export async function getCompanyTechnicianLaborReport(
  companyId: string,
  options: TechnicianLaborReportOptions = {},
): Promise<TechnicianLaborReport> {
  const dateRange = options.dateRange ?? "30d";
  const dateBounds = resolveReportDateBounds(dateRange);
  const limitations: string[] = [];

  const laborEntries = await listCompanyJobLaborEntries(companyId);

  const activeLaborEntries = laborEntries.filter(
    (entry) => entry.endedAt == null,
  ).length;

  if (dateBounds) {
    limitations.push(
      "Active labor entries reflects open job-labor clocks right now, not limited to the selected period.",
    );
  }

  const entriesInRange = dateBounds
    ? laborEntries.filter((entry) =>
        isDateWithinReportBounds(entry.startedAt, dateBounds),
      )
    : laborEntries;

  let totalLaborMinutes = 0;
  let closedLaborEntryCount = 0;

  for (const entry of entriesInRange) {
    const minutes = resolveClosedJobLaborMinutes(entry);
    if (minutes != null) {
      totalLaborMinutes += minutes;
      closedLaborEntryCount += 1;
    }
  }

  if (
    dateBounds &&
    entriesInRange.some((entry) => resolveClosedJobLaborMinutes(entry) == null)
  ) {
    limitations.push(
      "Open job-labor entries in period are excluded from total hours until closed.",
    );
  }

  const technicianCount = new Set(
    entriesInRange.map((entry) => entry.technicianId),
  ).size;

  return {
    summary: {
      totalLaborHours: roundJobMaterialAmount(totalLaborMinutes / 60),
      activeLaborEntries,
      technicianCount,
      closedLaborEntryCount,
    },
    meta: buildReportSectionMeta({
      dateRange,
      dateBounds,
      limitations,
    }),
  };
}
