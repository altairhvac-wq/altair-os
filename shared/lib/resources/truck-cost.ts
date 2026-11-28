/**
 * Truck cost — the pure math behind /resources/calculators/truck-cost.
 *
 * No React, no imports: the verifier (`scripts/verify-resource-center.mjs`)
 * loads this module directly and drives it with the worked example.
 *
 * ============ THE MODEL ============
 * A service truck costs money every month whether or not it leaves the
 * yard. Spread over the days it works, the hours it bills and the jobs it
 * runs, that becomes a number an owner can price with:
 *
 *   cost per month        = payment + insurance + fuel + maintenance + other per year / 12
 *   cost per working day  = cost per month / working days in a month
 *   cost per billed hour  = cost per working day / billed hours a day
 *   cost per job          = cost per working day / jobs a day
 *   a parked day          = (payment + insurance + other per year / 12) / working days
 *
 * "A parked day" leaves out fuel and maintenance, which mostly stop when the
 * truck does. It is what a day with no technician in the seat still costs.
 *
 * ============ COUNT IT ONCE ============
 * The labor rate tools already have a place for the truck (vehicle and tools
 * per technician, or shop costs). This calculator explains that number; it
 * is not a second charge to add on top of a rate that already includes it.
 */

export type TruckCostInput = {
  /** Loan or lease payment. For a truck bought outright: price paid / months you expect to keep it. */
  paymentPerMonth: number;
  /** This truck's share of the commercial vehicle insurance. */
  insurancePerMonth: number;
  fuelPerMonth: number;
  /** Maintenance, tires and repairs, averaged over a year. */
  maintenancePerMonth: number;
  /** Registration, inspection, GPS, lettering: costs that come once a year. */
  otherPerYear: number;
  workingDaysPerMonth: number;
  /** Hours a day that end up on invoices. */
  billedHoursPerDay: number;
  jobsPerDay: number;
};

export type TruckCostResult = {
  perMonth: number;
  perYear: number;
  perWorkingDay: number;
  /** null when no billed hours were entered. */
  perBilledHour: number | null;
  /** null when no jobs were entered. */
  perJob: number | null;
  /** What a working day with the truck parked still costs. */
  parkedDay: number;
};

/** A financed service truck. Sample values, not industry averages. */
export const TRUCK_COST_DEFAULTS: TruckCostInput = {
  paymentPerMonth: 650,
  insurancePerMonth: 180,
  fuelPerMonth: 450,
  maintenancePerMonth: 150,
  otherPerYear: 600,
  workingDaysPerMonth: 21,
  billedHoursPerDay: 6,
  jobsPerDay: 3,
};

function amount(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function calculateTruckCost(input: TruckCostInput): TruckCostResult | null {
  const payment = amount(input.paymentPerMonth);
  const insurance = amount(input.insurancePerMonth);
  const fuel = amount(input.fuelPerMonth);
  const maintenance = amount(input.maintenancePerMonth);
  const otherPerMonth = amount(input.otherPerYear) / 12;
  const days = Number.isFinite(input.workingDaysPerMonth) ? input.workingDaysPerMonth : 0;
  const hours = amount(input.billedHoursPerDay);
  const jobs = amount(input.jobsPerDay);

  const perMonth = payment + insurance + fuel + maintenance + otherPerMonth;
  // No costs, or no days (or more days than a month has): nothing to spread.
  if (perMonth <= 0 || days <= 0 || days > 31) return null;

  const perWorkingDay = perMonth / days;
  return {
    perMonth,
    perYear: perMonth * 12,
    perWorkingDay,
    perBilledHour: hours > 0 ? perWorkingDay / hours : null,
    perJob: jobs > 0 ? perWorkingDay / jobs : null,
    parkedDay: (payment + insurance + otherPerMonth) / days,
  };
}
