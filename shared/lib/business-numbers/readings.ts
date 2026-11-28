/**
 * What a company's business numbers mean, in the owner's words.
 *
 * The settings page and the guided setup both show these sentences, so they
 * are written once here from the worked-out numbers
 * (shared/lib/business-numbers/derive.ts). Each reading has a tone so a
 * screen can colour it: "bad" is money being lost, "warn" is short of the
 * owner's own target, "good" is on target, "note" is a plain fact or a
 * prompt for a missing number.
 *
 * Every branch is a sentence that is true of the numbers in front of the
 * owner: a filled-in box is never answered with "add this number", and a
 * number that has no answer (a 100% profit, a job that uses up all it
 * earns) says so.
 *
 * Pure: safe on the server and in the browser.
 */

import type { DerivedBusinessNumbers } from "./derive";
import { formatCount, formatDollars, formatDollarsShort, formatPercent } from "./format";
import { BUSINESS_NUMBER_FIELDS, isStorableLaborRate, type BusinessNumbers } from "../../types/business-numbers";

export type ReadingTone = "good" | "warn" | "bad" | "note";

export type Reading = {
  readonly tone: ReadingTone;
  readonly text: string;
};

function listLabels(labels: readonly string[]): string {
  const lower = labels.map((label) => label.charAt(0).toLowerCase() + label.slice(1));
  if (lower.length <= 1) return lower.join("");
  return `${lower.slice(0, -1).join(", ")} and ${lower[lower.length - 1]}`;
}

/** The rate that reaches the owner's profit target, when there is one the product can store. */
export function usableSuggestedRate(derived: DerivedBusinessNumbers): number | null {
  return isStorableLaborRate(derived.suggestedRateRounded) ? derived.suggestedRateRounded : null;
}

/** What one billed hour costs, and what it is made of. */
export function readHourCost(derived: DerivedBusinessNumbers): Reading {
  if (derived.costPerBilledHour === null) {
    const missing = derived.missingForCost.map((key) => BUSINESS_NUMBER_FIELDS[key].label);
    return {
      tone: "note",
      text: missing.length > 0 ? `Add ${listLabels(missing)} to see what an hour of work costs you.` : "These numbers do not add up to a cost. Check the hours.",
    };
  }
  const parts =
    derived.laborPerBilledHour !== null && derived.overheadPerBilledHour !== null
      ? ` That is ${formatDollars(derived.laborPerBilledHour)} of labor and ${formatDollars(derived.overheadPerBilledHour)} of shop costs.`
      : "";
  return { tone: "note", text: `One billed hour costs you ${formatDollars(derived.costPerBilledHour)}.${parts}` };
}

/** How the rate the company charges compares with its cost and its target. */
export function readLaborRate(numbers: BusinessNumbers, derived: DerivedBusinessNumbers): Reading {
  const rate = numbers.laborRate;
  const cost = derived.costPerBilledHour;
  if (cost === null) {
    return {
      tone: "note",
      text: rate ? "Fill in what an hour costs you, below, to check this rate against your costs." : "Type the rate you charge, or fill in what an hour costs you below and a rate is suggested.",
    };
  }

  const target = numbers.targetNetMarginPercent;
  const suggested = usableSuggestedRate(derived);
  // A profit target that no storable rate reaches: say so instead of offering a rate that cannot be saved.
  const targetOutOfReach = target !== null && suggested === null;
  const reach = targetOutOfReach
    ? target >= 100
      ? " A profit of 100% or more has no price; lower the profit to keep."
      : ` Keeping ${formatPercent(target)} would take a rate no shop charges; lower the profit to keep.`
    : "";

  if (!rate) {
    if (suggested !== null && target !== null) {
      return { tone: "note", text: `An hour costs you ${formatDollars(cost)}. To keep ${formatPercent(target)}, charge ${formatDollarsShort(suggested)} an hour.` };
    }
    return { tone: "note", text: `An hour costs you ${formatDollars(cost)}. Charge more than that.${reach || " Add the profit you want to keep and a rate is suggested."}` };
  }
  if (derived.rateStanding === "below-cost") {
    return { tone: "bad", text: `You charge ${formatDollarsShort(rate)} and an hour costs you ${formatDollars(cost)}. Every billed hour loses ${formatDollars(cost - rate)}.` };
  }
  const kept = formatPercent(Math.max(0, derived.marginAtRatePercent ?? 0));
  if (derived.rateStanding === "below-target" && suggested !== null && target !== null) {
    return { tone: "warn", text: `At ${formatDollarsShort(rate)} you keep ${kept} of each billed hour. To keep ${formatPercent(target)} you would charge ${formatDollarsShort(suggested)}.` };
  }
  if (targetOutOfReach) {
    return { tone: "warn", text: `At ${formatDollarsShort(rate)} an hour you keep ${kept} of each billed hour.${reach}` };
  }
  return { tone: "good", text: `At ${formatDollarsShort(rate)} an hour you keep ${kept} of each billed hour, after labor and shop costs.` };
}

/** The after-hours rate, when both the rate and the multiplier are set. */
export function readAfterHours(derived: DerivedBusinessNumbers): Reading | null {
  return derived.afterHoursRate === null ? null : { tone: "note", text: `After hours you charge ${formatDollarsShort(derived.afterHoursRate)} an hour.` };
}

/** Whether the service call fee covers a one-hour visit. */
export function readServiceCall(numbers: BusinessNumbers, derived: DerivedBusinessNumbers): Reading | null {
  const fee = numbers.serviceCallFee;
  const floor = derived.serviceCallCostFloor;
  if (floor === null) return null;
  if (fee === null) {
    return { tone: "note", text: `A one-hour visit costs you ${formatDollars(floor)}. A fee under that loses money every time there is no repair.` };
  }
  const credited = numbers.serviceCallCredited ? " It comes off the bill when the customer goes ahead." : "";
  if (derived.serviceCallStanding === "below-cost") {
    return { tone: "bad", text: `A one-hour visit costs you ${formatDollars(floor)}. A ${formatDollarsShort(fee)} fee loses ${formatDollars(floor - fee)} every time there is no repair.${credited}` };
  }
  if (derived.serviceCallStanding === "below-rate") {
    return { tone: "warn", text: `Your ${formatDollarsShort(fee)} fee covers what the visit costs you (${formatDollars(floor)}) but is under an hour at your rate.${credited}` };
  }
  if (derived.serviceCallStanding === "at-rate") {
    return { tone: "good", text: `Your ${formatDollarsShort(fee)} fee covers a one-hour visit at your full rate.${credited}` };
  }
  // No labor rate to compare with yet, but the fee does cover the visit.
  return { tone: "good", text: `Your ${formatDollarsShort(fee)} fee covers what a one-hour visit costs you (${formatDollars(floor)}).${credited}` };
}

/** How many jobs a month cover the shop's costs. */
export function readMonthlyTarget(numbers: BusinessNumbers, derived: DerivedBusinessNumbers): Reading {
  if (derived.breakEvenJobs === null || derived.breakEvenJobsExact === null) {
    if (numbers.jobVariableCostPercent !== null && numbers.jobVariableCostPercent >= 100) {
      return { tone: "bad", text: "A job that uses up all of its price leaves nothing for the shop. Lower what a job uses up." };
    }
    const missing = [
      numbers.monthlyOverhead === null ? "your shop costs each month" : null,
      !numbers.averageJobRevenue ? "an average job" : null,
      numbers.jobVariableCostPercent === null ? "what a job uses up" : null,
    ].filter((part): part is string => part !== null);
    return { tone: "note", text: `Add ${missing.length > 1 ? `${missing.slice(0, -1).join(", ")} and ${missing[missing.length - 1]}` : missing[0] ?? "the numbers above"} to see how many jobs cover the month.` };
  }
  if (derived.breakEvenJobs === 0) {
    return { tone: "note", text: "With no shop costs to cover there is no monthly target: every job goes toward profit." };
  }
  const perWeek = Math.ceil(derived.breakEvenJobsExact / (52 / 12));
  return {
    tone: "note",
    text: `${formatCount(derived.breakEvenJobs)} ${derived.breakEvenJobs === 1 ? "job" : "jobs"} a month cover ${formatDollarsShort(numbers.monthlyOverhead ?? 0)} of shop costs. That is about ${formatCount(perWeek)} a week.`,
  };
}
