/**
 * Everything worked out from a company's business numbers.
 *
 * ============ ONE SET OF FORMULAS ============
 * These are the public calculators' formulas, called, not copied:
 * calculateLaborRate, calculateServiceCallFee and calculateBreakEven from
 * shared/lib/resources. A shop that works its rate out on the website and
 * then signs up sees the same answer inside the product, to the cent.
 *
 * ============ A CREW, NOT ONE TECHNICIAN ============
 * The labor rate calculator prices one technician carrying the whole of the
 * shop's costs. A company has `technicianCount` of them sharing those costs,
 * so each technician carries monthlyOverhead / technicianCount. With one
 * technician the two are identical.
 *
 * ============ NOTHING IS GUESSED ============
 * A result is null until every number it needs is there; `missingForCost`
 * names what is still needed so a screen can ask for it. An unbilled-hours
 * blank counts as zero and a blank technician count as one, since both are
 * true of a one-person shop that left them empty.
 *
 * Pure: safe on the server and in the browser. Imports are relative so
 * scripts/verify-business-numbers.mjs can load this file as it is.
 */

import { calculateBreakEven } from "../resources/break-even";
import { calculateLaborRate } from "../resources/labor-rate";
import { calculateServiceCallFee, type ServiceCallFeeStatus } from "../resources/service-call-fee";
import type { BusinessNumberKey, BusinessNumbers } from "../../types/business-numbers";

const WEEKS_PER_MONTH = 52 / 12;
const HALF_CENT = 0.005;

export type LaborRateStanding =
  /** The rate is under what an hour costs: every billed hour loses money. */
  | "below-cost"
  /** The rate covers cost but keeps less than the profit the owner asked for. */
  | "below-target"
  | "on-target";

export type DerivedBusinessNumbers = {
  /** Numbers still needed before the cost of an hour can be worked out. */
  readonly missingForCost: readonly BusinessNumberKey[];

  /** Wage plus payroll costs, per paid hour. A technician's cost to the company. */
  readonly loadedLaborCost: number | null;
  /** Labor for one billed hour: paid hours spread over the hours that are billed. */
  readonly laborPerBilledHour: number | null;
  /** Shop costs carried by one billed hour. */
  readonly overheadPerBilledHour: number | null;
  /** What one billed hour costs the company. Charging less loses money. */
  readonly costPerBilledHour: number | null;
  /** The rate that keeps the target profit, exact and rounded up to a whole dollar. */
  readonly suggestedRate: number | null;
  readonly suggestedRateRounded: number | null;

  /** Profit kept at the rate the company actually charges, as a percent of the rate. */
  readonly marginAtRatePercent: number | null;
  readonly rateStanding: LaborRateStanding | null;
  /** The labor rate for evenings, weekends and holidays. */
  readonly afterHoursRate: number | null;

  /** What a one-hour visit costs, and how the fee compares with it and with the rate. */
  readonly serviceCallCostFloor: number | null;
  readonly serviceCallStanding: ServiceCallFeeStatus | null;

  /** Hours the whole crew bills in a month at the numbers given. */
  readonly billedHoursPerMonth: number | null;
  /** Jobs a month that cover the shop's costs, exact and rounded up. */
  readonly breakEvenJobsExact: number | null;
  readonly breakEvenJobs: number | null;
  readonly breakEvenRevenue: number | null;
  /** What one average job leaves toward the shop's costs. */
  readonly contributionPerJob: number | null;
};

const COST_INPUTS: readonly BusinessNumberKey[] = ["averageWage", "payrollBurdenPercent", "billedHoursPerWeek", "monthlyOverhead"];

function positive(value: number | null): value is number {
  return value !== null && Number.isFinite(value) && value > 0;
}

export function deriveBusinessNumbers(numbers: BusinessNumbers): DerivedBusinessNumbers {
  const technicians = positive(numbers.technicianCount) ? numbers.technicianCount : 1;
  const missingForCost = COST_INPUTS.filter((key) => {
    const value = numbers[key];
    // A wage and billed hours of zero price nothing; zero payroll costs or zero overhead are real answers.
    return key === "averageWage" || key === "billedHoursPerWeek" ? !positive(value) : value === null;
  });

  const laborInput = {
    hourlyWage: numbers.averageWage ?? 0,
    burdenRate: (numbers.payrollBurdenPercent ?? 0) / 100,
    nonBillableHoursPerWeek: numbers.unbilledHoursPerWeek ?? 0,
    billableHoursPerWeek: numbers.billedHoursPerWeek ?? 0,
    monthlyOverhead: (numbers.monthlyOverhead ?? 0) / technicians,
  };
  // What an hour costs does not depend on the profit wanted, so it is worked
  // out with none: a profit target that has no price (100% or more) must not
  // make the cost disappear with it.
  const labor = missingForCost.length === 0 ? calculateLaborRate({ ...laborInput, targetNetMargin: 0 }) : null;
  // A suggestion needs the profit the owner wants; without it there is only a cost.
  const hasTarget = numbers.targetNetMarginPercent !== null;
  const priced = labor && hasTarget ? calculateLaborRate({ ...laborInput, targetNetMargin: (numbers.targetNetMarginPercent ?? 0) / 100 }) : null;

  const billed = numbers.billedHoursPerWeek ?? 0;
  const costPerBilledHour = labor ? labor.costPerBillableHour : null;
  const laborPerBilledHour = labor && billed > 0 ? labor.weeklyLaborCost / billed : null;
  const overheadPerBilledHour = labor && billed > 0 ? labor.weeklyOverhead / billed : null;

  const rate = positive(numbers.laborRate) ? numbers.laborRate : null;
  const marginAtRatePercent = rate !== null && costPerBilledHour !== null ? ((rate - costPerBilledHour) / rate) * 100 : null;
  let rateStanding: LaborRateStanding | null = null;
  if (rate !== null && costPerBilledHour !== null) {
    // Half a cent of slack both ways: a rate typed as the cost shown on screen
    // ($96.15 against 96.1538) is not "losing $0.00", and the suggested rate
    // itself is never called short of target.
    if (rate < costPerBilledHour - HALF_CENT) rateStanding = "below-cost";
    else if (priced && rate < priced.billableHourlyRate - HALF_CENT) rateStanding = "below-target";
    else rateStanding = "on-target";
  }

  const multiplier = positive(numbers.afterHoursMultiplier) ? numbers.afterHoursMultiplier : null;

  const serviceCall =
    rate !== null && costPerBilledHour !== null
      ? calculateServiceCallFee({
          billableRate: rate,
          costPerBillableHour: costPerBilledHour,
          hoursCovered: 1,
          currentFee: numbers.serviceCallFee ?? 0,
          callsPerMonth: 0,
          noRepairPercent: 0,
        })
      : null;

  const breakEven =
    numbers.monthlyOverhead !== null && positive(numbers.averageJobRevenue) && numbers.jobVariableCostPercent !== null
      ? calculateBreakEven({
          fixedMonthlyCosts: numbers.monthlyOverhead,
          averageJobRevenue: numbers.averageJobRevenue,
          variableCostRate: numbers.jobVariableCostPercent / 100,
        })
      : null;

  return {
    missingForCost,
    loadedLaborCost: labor ? labor.loadedHourlyCost : positive(numbers.averageWage) && numbers.payrollBurdenPercent !== null ? numbers.averageWage * (1 + numbers.payrollBurdenPercent / 100) : null,
    laborPerBilledHour,
    overheadPerBilledHour,
    costPerBilledHour,
    suggestedRate: priced ? priced.billableHourlyRate : null,
    suggestedRateRounded: priced ? priced.billableHourlyRateRounded : null,
    marginAtRatePercent,
    rateStanding,
    afterHoursRate: rate !== null && multiplier !== null ? rate * multiplier : null,
    serviceCallCostFloor: serviceCall ? serviceCall.costFloor : costPerBilledHour,
    serviceCallStanding:
      numbers.serviceCallFee === null
        ? null
        : serviceCall
          ? serviceCall.status
          : // No rate to compare with yet: the fee can still be checked against what the visit costs.
            costPerBilledHour !== null && numbers.serviceCallFee < costPerBilledHour - HALF_CENT
            ? "below-cost"
            : null,
    billedHoursPerMonth: positive(numbers.billedHoursPerWeek) ? numbers.billedHoursPerWeek * technicians * WEEKS_PER_MONTH : null,
    breakEvenJobsExact: breakEven ? breakEven.breakEvenJobsExact : null,
    breakEvenJobs: breakEven ? breakEven.breakEvenJobs : null,
    breakEvenRevenue: breakEven ? breakEven.breakEvenRevenue : null,
    contributionPerJob: breakEven ? breakEven.contributionPerJob : null,
  };
}
