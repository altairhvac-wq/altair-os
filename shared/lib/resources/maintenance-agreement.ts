/**
 * Maintenance agreement price — the pure math behind
 * /resources/calculators/maintenance-agreement.
 *
 * No React, no imports: the verifier (`scripts/verify-resource-center.mjs`)
 * loads this module directly and drives it with the worked example.
 *
 * ============ THE MODEL ============
 * An agreement is a promise to show up a set number of times a year, plus
 * whatever perks come with membership. What it costs to keep that promise is
 * the visits themselves, a little office time per agreement, and the discount
 * the member is given on repairs. The price has to cover all three and leave
 * the margin the business wants.
 *
 *   cost per visit        = hours per visit x cost per billable hour + materials per visit
 *   visit cost per year   = visits per year x cost per visit
 *   repair discount given = expected repair spend per year x member discount
 *   cost to serve         = visit cost per year + office cost per year + repair discount given
 *   annual price          = cost to serve / (1 - target net margin)
 *   monthly price         = annual price / 12
 *
 * "Cost per billable hour" is the same figure the labor rate calculator
 * produces: wage, burden, unbillable time and overhead, spread over the hours
 * that are billed. Using it here means a tune-up hour is costed the same way
 * as any other hour the technician could have billed.
 *
 * This prices the agreement on its own cost. It deliberately does not credit
 * the agreement with the repair and replacement work members later buy; that
 * is real, but it is a different question and a much less certain number.
 */

export type MaintenanceAgreementInput = {
  /** Scheduled maintenance visits included per year. */
  visitsPerYear: number;
  /** Hours per visit, including the drive. */
  hoursPerVisit: number;
  /** Cost of one billable hour: labor, burden, unbillable time and overhead. */
  costPerBillableHour: number;
  /** Filters, cleaner and other materials used on one visit, dollars. */
  materialsPerVisit: number;
  /** Office time and reminders per agreement per year, dollars. */
  officeCostPerYear: number;
  /** What a typical member spends on repairs in a year, before the discount. */
  expectedRepairSpendPerYear: number;
  /** Member discount on repairs as a fraction (0.15 = 15%). */
  repairDiscountRate: number;
  /** Desired net margin on the agreement price as a fraction (0.2 = 20%). */
  targetNetMargin: number;
};

export type MaintenanceAgreementResult = {
  costPerVisit: number;
  visitCostPerYear: number;
  repairDiscountGiven: number;
  costToServePerYear: number;
  annualPrice: number;
  monthlyPrice: number;
  /** Annual price minus cost to serve. */
  profitPerAgreement: number;
};

export const MAINTENANCE_AGREEMENT_DEFAULTS: MaintenanceAgreementInput = {
  visitsPerYear: 2,
  hoursPerVisit: 1.5,
  costPerBillableHour: 96,
  materialsPerVisit: 15,
  officeCostPerYear: 20,
  expectedRepairSpendPerYear: 300,
  repairDiscountRate: 0.15,
  targetNetMargin: 0.2,
};

function finite(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

export function calculateMaintenanceAgreement(
  input: MaintenanceAgreementInput,
): MaintenanceAgreementResult | null {
  const visits = Math.max(0, finite(input.visitsPerYear));
  const hours = Math.max(0, finite(input.hoursPerVisit));
  const hourCost = Math.max(0, finite(input.costPerBillableHour));
  const materials = Math.max(0, finite(input.materialsPerVisit));
  const office = Math.max(0, finite(input.officeCostPerYear));
  const repairSpend = Math.max(0, finite(input.expectedRepairSpendPerYear));
  const discount = finite(input.repairDiscountRate);
  const margin = finite(input.targetNetMargin);

  // An agreement with no visits is not an agreement, and a 100% margin or a
  // discount outside 0-100% has no price; the page shows a hint instead.
  if (visits <= 0 || margin >= 1 || margin < 0 || discount < 0 || discount > 1) return null;

  const costPerVisit = hours * hourCost + materials;
  const visitCostPerYear = visits * costPerVisit;
  const repairDiscountGiven = repairSpend * discount;
  const costToServePerYear = visitCostPerYear + office + repairDiscountGiven;
  const annualPrice = costToServePerYear / (1 - margin);

  return {
    costPerVisit,
    visitCostPerYear,
    repairDiscountGiven,
    costToServePerYear,
    annualPrice,
    monthlyPrice: annualPrice / 12,
    profitPerAgreement: annualPrice - costToServePerYear,
  };
}
