/**
 * HVAC Labor Cost Workspace: the pure math behind
 * /insights/how-to-calculate-hvac-labor-rate.
 *
 * No React and no imports, so it can be driven directly by a verifier. It is
 * the same model as the simple labor rate calculator
 * (shared/lib/resources/labor-rate.ts), worked out over a year and over a
 * whole crew instead of one technician's week:
 *
 *   annual wages        = wage x paid hours a week x 52             (per tech)
 *   burden              = wages x burden %                           (simple)
 *                       | FICA + FUTA + SUTA + workers' comp + health + vehicle/tools  (advanced)
 *   billable hours      = (paid hours - unbillable hours) x weeks worked
 *                       | paid hours x billable efficiency x weeks worked
 *   overhead            = monthly overhead x 12                      (whole company)
 *   break-even rate     = (labor cost of every tech + overhead) / billable hours of every tech
 *   recommended rate    = break-even rate / (1 - target net margin)
 *
 * With one technician and the simple burden this is exactly the simple
 * calculator: $30 wage, 25% burden, 40 paid / 30 billable hours, $6,000 a
 * month of overhead and a 20% margin give $96.15 to break even and $120.19.
 *
 * ============ PAID TIME OFF ============
 * In advanced mode PTO and holidays are paid but not worked. They are part of
 * the annual wages already (52 paid weeks); what they change is how many
 * weeks there are to bill in. The wages paid for those days are reported as
 * their own cost line so the owner can see what they add to every billed hour.
 */

export const WEEKS_PER_YEAR = 52;
export const MONTHS_PER_YEAR = 12;
export const HOURS_PER_DAY = 8;

/** IRS Topic 751: employer Social Security and Medicare (2026). */
export const SOCIAL_SECURITY_RATE = 0.062;
export const SOCIAL_SECURITY_WAGE_BASE_2026 = 184_500;
export const MEDICARE_RATE = 0.0145;
/** IRS Topic 759: FUTA after the full state credit, on the first $7,000. */
export const FUTA_NET_RATE = 0.006;
export const FUTA_WAGE_BASE = 7_000;

export type Technician = {
  readonly id: string;
  readonly name: string;
  /** Base hourly wage, dollars. */
  readonly wage: number;
  /** Paid hours a week. */
  readonly paidHours: number;
};

export type BurdenMode = "simple" | "advanced";
export type BillableMode = "hours" | "efficiency";

export type AdvancedBurden = {
  /** Fraction of wages, up to `sutaWageBase` a year. */
  readonly sutaRate: number;
  readonly sutaWageBase: number;
  /** Fraction of wages. */
  readonly workersCompRate: number;
  /** Employer share, dollars a year per technician. */
  readonly healthPerYear: number;
  /** Paid days off a year (vacation, sick, holidays). */
  readonly ptoDays: number;
  /** Truck, fuel, tools and phone, dollars a month per technician. */
  readonly vehiclePerMonth: number;
};

/** Unbillable hours a week, per technician. */
export type UnbillableHours = {
  readonly drive: number;
  readonly shop: number;
  readonly training: number;
  readonly callbacks: number;
  readonly other: number;
};

/** Company overhead, dollars a month. */
export type Overhead = {
  readonly rent: number;
  readonly office: number;
  readonly insurance: number;
  readonly software: number;
  readonly marketing: number;
  readonly vehicles: number;
  readonly other: number;
};

export type WorkspaceInput = {
  readonly techs: readonly Technician[];
  readonly burdenMode: BurdenMode;
  /** Simple mode: fraction of wages (0.25 = 25%). */
  readonly burdenRate: number;
  readonly advanced: AdvancedBurden;
  readonly billableMode: BillableMode;
  readonly unbillable: UnbillableHours;
  /** Efficiency mode: billable share of paid hours (0.75 = 75%). */
  readonly efficiency: number;
  readonly overhead: Overhead;
  /** Target net margin as a fraction of the billed rate (0.2 = 20%). */
  readonly margin: number;
};

export type TechResult = {
  readonly id: string;
  readonly name: string;
  readonly wages: number;
  readonly burden: number;
  readonly laborCost: number;
  readonly paidHoursPerYear: number;
  readonly billableHoursPerYear: number;
  readonly billableHoursPerWeek: number;
  /** Labor cost (wage + burden) per billable hour for this technician. */
  readonly laborPerBillableHour: number;
};

/** Where each dollar of the recommended rate goes, per billable hour. */
export type RateSlices = {
  readonly billedWages: number;
  readonly unbilledWages: number;
  readonly taxes: number;
  readonly benefits: number;
  readonly vehicle: number;
  readonly overhead: number;
  readonly profit: number;
};

export type BurdenLines = {
  readonly fica: number;
  readonly futa: number;
  readonly suta: number;
  readonly workersComp: number;
  readonly health: number;
  readonly pto: number;
  readonly vehicle: number;
};

export type WorkspaceResult = {
  readonly techs: readonly TechResult[];
  readonly totalWages: number;
  readonly totalBurden: number;
  readonly burdenLines: BurdenLines | null;
  /** Burden as a share of wages for worked hours (simple mode: the input). */
  readonly effectiveBurdenRate: number;
  readonly totalLaborCost: number;
  readonly paidHoursPerYear: number;
  readonly billableHoursPerYear: number;
  readonly annualOverhead: number;
  readonly monthlyOverhead: number;
  /** Wage + burden for every paid hour, crew average. */
  readonly loadedCostPerPaidHour: number;
  readonly laborPerBillableHour: number;
  /** Overhead alone, per billable hour. */
  readonly overheadPerBillableHour: number;
  readonly breakEvenRate: number;
  readonly recommendedRate: number;
  readonly recommendedRateRounded: number;
  readonly profitPerBillableHour: number;
  /** Billable share of paid hours, crew wide. */
  readonly billableEfficiency: number;
  readonly annualRevenueAtRate: number;
  readonly annualProfitAtRate: number;
  readonly slices: RateSlices;
};

export type WorkspaceProblem =
  | "no-techs"
  | "no-billable-hours"
  | "margin-out-of-range";

function finite(value: number): number {
  return Number.isFinite(value) ? value : 0;
}
function nonNegative(value: number): number {
  return Math.max(0, finite(value));
}

export function sumUnbillable(hours: UnbillableHours): number {
  return (
    nonNegative(hours.drive) +
    nonNegative(hours.shop) +
    nonNegative(hours.training) +
    nonNegative(hours.callbacks) +
    nonNegative(hours.other)
  );
}

export function sumOverhead(overhead: Overhead): number {
  return (
    nonNegative(overhead.rent) +
    nonNegative(overhead.office) +
    nonNegative(overhead.insurance) +
    nonNegative(overhead.software) +
    nonNegative(overhead.marketing) +
    nonNegative(overhead.vehicles) +
    nonNegative(overhead.other)
  );
}

export function calculateWorkspace(
  input: WorkspaceInput,
): { ok: true; result: WorkspaceResult } | { ok: false; problem: WorkspaceProblem } {
  const margin = finite(input.margin);
  if (margin < 0 || margin >= 1) return { ok: false, problem: "margin-out-of-range" };

  const techs = input.techs.filter((tech) => nonNegative(tech.paidHours) > 0 && nonNegative(tech.wage) > 0);
  if (techs.length === 0) return { ok: false, problem: "no-techs" };

  const advanced = input.burdenMode === "advanced";
  const unbillablePerWeek = sumUnbillable(input.unbillable);
  const efficiency = Math.min(1, nonNegative(input.efficiency));

  const lines = {
    fica: 0,
    futa: 0,
    suta: 0,
    workersComp: 0,
    health: 0,
    pto: 0,
    vehicle: 0,
  };
  let billedWages = 0;
  let unbilledWages = 0;

  const techResults: TechResult[] = techs.map((tech) => {
    const wage = nonNegative(tech.wage);
    const paid = nonNegative(tech.paidHours);
    const wages = wage * paid * WEEKS_PER_YEAR;
    const paidHoursPerYear = paid * WEEKS_PER_YEAR;

    const ptoHours = advanced
      ? Math.min(paidHoursPerYear, nonNegative(input.advanced.ptoDays) * HOURS_PER_DAY)
      : 0;
    const weeksWorked = WEEKS_PER_YEAR - ptoHours / paid;

    const billablePerWeek =
      input.billableMode === "efficiency"
        ? paid * efficiency
        : Math.max(0, paid - unbillablePerWeek);
    const billableHoursPerYear = billablePerWeek * weeksWorked;

    let burden: number;
    if (advanced) {
      const a = input.advanced;
      const fica =
        SOCIAL_SECURITY_RATE * Math.min(wages, SOCIAL_SECURITY_WAGE_BASE_2026) +
        MEDICARE_RATE * wages;
      const futa = FUTA_NET_RATE * Math.min(wages, FUTA_WAGE_BASE);
      const suta = nonNegative(a.sutaRate) * Math.min(wages, nonNegative(a.sutaWageBase));
      const workersComp = nonNegative(a.workersCompRate) * wages;
      const health = nonNegative(a.healthPerYear);
      const vehicle = nonNegative(a.vehiclePerMonth) * MONTHS_PER_YEAR;
      lines.fica += fica;
      lines.futa += futa;
      lines.suta += suta;
      lines.workersComp += workersComp;
      lines.health += health;
      lines.vehicle += vehicle;
      lines.pto += wage * ptoHours;
      burden = fica + futa + suta + workersComp + health + vehicle;
    } else {
      burden = wages * nonNegative(input.burdenRate);
    }

    billedWages += wage * billableHoursPerYear;
    unbilledWages += wages - wage * billableHoursPerYear;

    const laborCost = wages + burden;
    return {
      id: tech.id,
      name: tech.name,
      wages,
      burden,
      laborCost,
      paidHoursPerYear,
      billableHoursPerYear,
      billableHoursPerWeek: billablePerWeek,
      laborPerBillableHour: billableHoursPerYear > 0 ? laborCost / billableHoursPerYear : 0,
    };
  });

  const billableHoursPerYear = techResults.reduce((sum, t) => sum + t.billableHoursPerYear, 0);
  if (billableHoursPerYear <= 0) return { ok: false, problem: "no-billable-hours" };

  const totalWages = techResults.reduce((sum, t) => sum + t.wages, 0);
  const totalBurden = techResults.reduce((sum, t) => sum + t.burden, 0);
  const totalLaborCost = totalWages + totalBurden;
  const paidHoursPerYear = techResults.reduce((sum, t) => sum + t.paidHoursPerYear, 0);
  const monthlyOverhead = sumOverhead(input.overhead);
  const annualOverhead = monthlyOverhead * MONTHS_PER_YEAR;

  const laborPerBillableHour = totalLaborCost / billableHoursPerYear;
  const overheadPerBillableHour = annualOverhead / billableHoursPerYear;
  const breakEvenRate = laborPerBillableHour + overheadPerBillableHour;
  const recommendedRate = breakEvenRate / (1 - margin);
  const profitPerBillableHour = recommendedRate - breakEvenRate;

  const workedWages = totalWages - lines.pto;
  const effectiveBurdenRate = advanced
    ? workedWages > 0
      ? (totalBurden + lines.pto) / workedWages
      : 0
    : nonNegative(input.burdenRate);

  const per = (amount: number) => amount / billableHoursPerYear;
  const slices: RateSlices = advanced
    ? {
        billedWages: per(billedWages),
        unbilledWages: per(unbilledWages),
        taxes: per(lines.fica + lines.futa + lines.suta + lines.workersComp),
        benefits: per(lines.health),
        vehicle: per(lines.vehicle),
        overhead: overheadPerBillableHour,
        profit: profitPerBillableHour,
      }
    : {
        billedWages: per(billedWages),
        unbilledWages: per(unbilledWages),
        taxes: per(totalBurden),
        benefits: 0,
        vehicle: 0,
        overhead: overheadPerBillableHour,
        profit: profitPerBillableHour,
      };

  return {
    ok: true,
    result: {
      techs: techResults,
      totalWages,
      totalBurden,
      burdenLines: advanced ? lines : null,
      effectiveBurdenRate,
      totalLaborCost,
      paidHoursPerYear,
      billableHoursPerYear,
      annualOverhead,
      monthlyOverhead,
      loadedCostPerPaidHour: totalLaborCost / paidHoursPerYear,
      laborPerBillableHour,
      overheadPerBillableHour,
      breakEvenRate,
      recommendedRate,
      recommendedRateRounded: Math.ceil(recommendedRate - 1e-9),
      profitPerBillableHour,
      billableEfficiency: billableHoursPerYear / paidHoursPerYear,
      annualRevenueAtRate: recommendedRate * billableHoursPerYear,
      annualProfitAtRate: profitPerBillableHour * billableHoursPerYear,
      slices,
    },
  };
}

/**
 * The same crew at a different billable efficiency: every tech bills the
 * given share of their paid hours. For the sensitivity table.
 */
export function rateAtEfficiency(
  input: WorkspaceInput,
  efficiency: number,
  margin: number,
): { breakEven: number; rate: number } | null {
  const out = calculateWorkspace({ ...input, billableMode: "efficiency", efficiency, margin });
  return out.ok ? { breakEven: out.result.breakEvenRate, rate: out.result.recommendedRate } : null;
}

/** One line of a flat-rate price book. */
export type FlatRateTask = {
  readonly id: string;
  readonly task: string;
  readonly bookHours: number;
  readonly partCost: number;
  /** Markup on part cost as a fraction (1 = 100%, which doubles the cost). */
  readonly markup: number;
};

export type FlatRateLine = {
  readonly labor: number;
  readonly parts: number;
  readonly standard: number;
  readonly afterHours: number;
  /** What the customer pays in total when a diagnostic fee was charged on the call. */
  readonly withDiagnostic: number;
  readonly afterHoursWithDiagnostic: number;
};

export function priceFlatRateTask(
  task: FlatRateTask,
  laborRate: number,
  afterHoursMultiplier: number,
  diagnosticFee: number,
  creditDiagnostic: boolean,
): FlatRateLine {
  const labor = nonNegative(task.bookHours) * nonNegative(laborRate);
  const parts = nonNegative(task.partCost) * (1 + nonNegative(task.markup));
  const standard = labor + parts;
  const afterHours = labor * Math.max(1, finite(afterHoursMultiplier)) + parts;
  const fee = nonNegative(diagnosticFee);
  const total = (price: number) => (creditDiagnostic ? Math.max(price, fee) : price + fee);
  return {
    labor,
    parts,
    standard,
    afterHours,
    withDiagnostic: total(standard),
    afterHoursWithDiagnostic: total(afterHours),
  };
}

/**
 * Published ranges for what customers are charged, for the comparison band.
 * Each figure is the source's own; see the page's sources section.
 */
export const MARKET_RATE_RANGE = { low: 75, high: 150, source: "HVAC.com (2023)" } as const;
export const MARKET_RATE_BENCHMARK = { value: 140, source: "IBISWorld 2026 benchmark" } as const;
