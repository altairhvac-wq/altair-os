/**
 * One calendar for a whole report, with one way back.
 *
 * ============================== THE RULE ==============================
 * A report that counts days reads several things from the database at once
 * (the Reports page: its headline figures and its per-day series). They must
 * all count on the same calendar, and the TypeScript around them (the date
 * range, "today") must use that calendar too.
 *
 *   1. Ask for everything on the company's calendar.
 *   2. If ANY of the reads answers that the database cannot take a time zone
 *      yet (its migration has not run), throw the whole attempt away and ask
 *      for everything again on the old calendar: UTC days and the server's
 *      own today, which is exactly what the report did before.
 *
 * There is no third state. A page with company-zone charts above UTC
 * figures, or with a company-zone "today" over UTC-counted days, is the
 * defect this exists to rule out.
 *
 * Pure: the reads are handed in, so the rule can be executed without a
 * database (scripts/verify-company-timezone.mjs does).
 */
import {
  resolveReportDayBasis,
  type ReportDayBasis,
} from "@/shared/types/reports";

export async function loadOnReportDayBasis<
  T extends { timeZoneUnsupported: boolean },
>(
  timeZone: string | null | undefined,
  load: (basis: ReportDayBasis) => Promise<T>,
  now: Date = new Date(),
): Promise<T> {
  const basis = resolveReportDayBasis(timeZone, now);
  const loaded = await load(basis);

  if (!basis.timeZone || !loaded.timeZoneUnsupported) {
    return loaded;
  }

  return load(resolveReportDayBasis(null, now));
}
