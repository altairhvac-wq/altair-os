/**
 * Planning with a company's own numbers: three "what if" questions an owner
 * asks before spending money, started from the numbers already saved in
 * Settings > Numbers so nothing is typed twice.
 *
 *   - What does a truck cost me?
 *   - Can I afford another technician?
 *   - What would a different pay plan pay?
 *
 * ============ ONE SOURCE FOR THE MATH ============
 * Each plan calls the public calculator's own function
 * (shared/lib/resources/truck-cost.ts, new-hire.ts, technician-pay.ts), so
 * the answer inside the product and the answer on the website for the same
 * inputs can never differ. This file only does three things around them:
 * choose the starting values from the saved numbers, read the typed text
 * into numbers, and say what the result means in the owner's words.
 *
 * ============ THE SENTENCES ARE TRUE OF WHAT IS SHOWN ============
 * A sentence is written from the figures as the owner will read them, not
 * from the unrounded ones behind them. A hire within fifty cents a month of
 * break-even "breaks even"; it is never "pays for itself and leaves $0" or
 * "costs $0 more". Two pay plans within half a cent "pay the same"; neither
 * is then said to pay the most. Where the calculator leaves something out
 * that matters for these numbers (overtime on a hire paid more than 40
 * hours), a caution says so, with the amount.
 *
 * ============ NOTHING HERE IS SAVED ============
 * A plan is for trying things out. It reads the saved numbers and never
 * writes them. A box that has no saved number behind it starts EMPTY (the
 * screen shows a greyed example), so a made-up figure is never mistaken for
 * the company's own.
 *
 * Pure: safe on the server and in the browser. Imports are relative so
 * scripts/verify-business-numbers.mjs can load this file as it is.
 */

import { calculateNewHire, type NewHireResult } from "../resources/new-hire";
import { OVERTIME_MULTIPLIER, OVERTIME_THRESHOLD_HOURS, calculateTechnicianPay, type PayPlan, type TechnicianPayResult } from "../resources/technician-pay";
import { calculateTruckCost, type TruckCostResult } from "../resources/truck-cost";
import { parseBusinessNumber, type BusinessNumbers } from "../../types/business-numbers";
import { formatCount, formatDollars, formatDollarsShort, numberToFieldText } from "./format";
import type { Reading } from "./readings";

/** One line of a plan's result: a name and the figure. */
export type PlanLine = {
  readonly label: string;
  readonly value: string;
  /** A second, smaller figure under the first ("$30.00 an hour on the clock"). */
  readonly note?: string;
  readonly strong?: boolean;
};

export type PlanAnswer<K extends string, R> = {
  /** The sentence that answers the question, or says what is still needed. */
  readonly reading: Reading;
  /** Things the figures leave out that matter for these numbers. Usually none. */
  readonly cautions: readonly string[];
  /** The figures behind it. Empty until there is an answer. */
  readonly lines: readonly PlanLine[];
  /** A box whose text cannot be used, when there is one. */
  readonly badField: K | null;
  /** The calculator's own result, for a screen that wants a figure from it. */
  readonly result: R | null;
};

export type PlanStart<K extends string> = {
  readonly values: Readonly<Record<K, string>>;
  /** The boxes that started from a saved number, so the screen can say so. */
  readonly fromNumbers: readonly K[];
};

/** The most a box may hold, and the sentence for going over when the plain one would read oddly. */
type Limit = { readonly max: number; readonly over?: string };

const MONEY_A_MONTH: Limit = { max: 1_000_000 };
const WEEK_HOURS: Limit = { max: 168, over: "A week has 168 hours." };

function unanswered<K extends string, R>(reading: Reading, badField: K | null = null): PlanAnswer<K, R> {
  return { reading, cautions: [], lines: [], badField, result: null };
}

/**
 * Reads every box. An empty box is null. Text that is not a number, a
 * negative one, or one past the box's limit stops the plan and names the
 * box: a wild figure is answered with a sentence, never with a result.
 */
function parseAll<K extends string, R>(
  keys: readonly K[],
  text: Readonly<Record<K, string>>,
  labels: Readonly<Record<K, string>>,
  limits: Readonly<Record<K, Limit>>,
): { readonly values: Record<K, number | null>; readonly problem: PlanAnswer<K, R> | null } {
  const values = {} as Record<K, number | null>;
  let problem: PlanAnswer<K, R> | null = null;
  for (const key of keys) {
    const parsed = parseBusinessNumber(text[key]);
    if (parsed === "invalid" || (parsed !== null && parsed < 0)) {
      values[key] = null;
      problem = problem ?? unanswered({ tone: "bad", text: `${labels[key]} is not a number we can use. Type a plain amount, zero or more.` }, key);
    } else if (parsed !== null && parsed > limits[key].max) {
      values[key] = null;
      problem = problem ?? unanswered({ tone: "bad", text: limits[key].over ?? `${labels[key]} can be ${formatCount(limits[key].max)} at most. Check the figure.` }, key);
    } else {
      values[key] = parsed;
    }
  }
  return { values, problem };
}

function start<K extends string>(keys: readonly K[], known: Partial<Record<K, number | null>>): PlanStart<K> {
  const values = {} as Record<K, string>;
  const fromNumbers: K[] = [];
  for (const key of keys) {
    const value = known[key];
    if (value !== null && value !== undefined && Number.isFinite(value) && value > 0) {
      values[key] = numberToFieldText(value);
      fromNumbers.push(key);
    } else {
      values[key] = "";
    }
  }
  return { values, fromNumbers };
}

function listLabels(labels: readonly string[]): string {
  const lower = labels.map((label) => label.charAt(0).toLowerCase() + label.slice(1));
  if (lower.length <= 1) return lower.join("");
  return `${lower.slice(0, -1).join(", ")} and ${lower[lower.length - 1]}`;
}

/** "28", "28.5": hours, without trailing zeros. */
function hoursText(value: number): string {
  return String(Math.round(value * 10) / 10);
}

/**
 * Two hour figures that will sit in one sentence, written with as few
 * decimals as keep them apart ("14" and "13.9"; "14" and "13.99" when one
 * decimal would print both as 14). Equal to the thousandth, they print the
 * same and the caller says so in words.
 */
function hoursApart(a: number, b: number): readonly [string, string] {
  let pair: [string, string] = [hoursText(a), hoursText(b)];
  for (const places of [1, 2, 3]) {
    const factor = 10 ** places;
    pair = [String(Math.round(a * factor) / factor), String(Math.round(b * factor) / factor)];
    if (pair[0] !== pair[1]) break;
  }
  return pair;
}

function paidHoursFrom(numbers: BusinessNumbers): number | null {
  if (numbers.billedHoursPerWeek === null) return null;
  return numbers.billedHoursPerWeek + (numbers.unbilledHoursPerWeek ?? 0);
}

// ============================================================ the truck

export const TRUCK_PLAN_KEYS = ["paymentPerMonth", "insurancePerMonth", "fuelPerMonth", "maintenancePerMonth", "otherPerYear", "workingDaysPerMonth", "billedHoursPerDay", "jobsPerDay"] as const;
export type TruckPlanKey = (typeof TRUCK_PLAN_KEYS)[number];

export const TRUCK_PLAN_LABELS: Readonly<Record<TruckPlanKey, string>> = {
  paymentPerMonth: "Truck payment",
  insurancePerMonth: "Insurance",
  fuelPerMonth: "Fuel",
  maintenancePerMonth: "Maintenance and tires",
  otherPerYear: "Once-a-year costs",
  workingDaysPerMonth: "Working days a month",
  billedHoursPerDay: "Billed hours a day",
  jobsPerDay: "Jobs a day",
};

const TRUCK_PLAN_LIMITS: Readonly<Record<TruckPlanKey, Limit>> = {
  paymentPerMonth: MONEY_A_MONTH,
  insurancePerMonth: MONEY_A_MONTH,
  fuelPerMonth: MONEY_A_MONTH,
  maintenancePerMonth: MONEY_A_MONTH,
  otherPerYear: { max: 10_000_000 },
  workingDaysPerMonth: { max: 31, over: "A month has at most 31 working days." },
  billedHoursPerDay: { max: 24, over: "A day has 24 hours. Check the billed hours a day." },
  jobsPerDay: { max: 100 },
};

/** The week in Settings > Numbers is five working days: billed hours a day is a fifth of it. */
const WORKING_DAYS_PER_WEEK = 5;

export function truckPlanStart(numbers: BusinessNumbers): PlanStart<TruckPlanKey> {
  return start(TRUCK_PLAN_KEYS, {
    billedHoursPerDay: numbers.billedHoursPerWeek !== null ? Math.round((numbers.billedHoursPerWeek / WORKING_DAYS_PER_WEEK) * 10) / 10 : null,
  });
}

export function answerTruckPlan(text: Readonly<Record<TruckPlanKey, string>>): PlanAnswer<TruckPlanKey, TruckCostResult> {
  const { values, problem } = parseAll<TruckPlanKey, TruckCostResult>(TRUCK_PLAN_KEYS, text, TRUCK_PLAN_LABELS, TRUCK_PLAN_LIMITS);
  if (problem) return problem;

  const costs = (values.paymentPerMonth ?? 0) + (values.insurancePerMonth ?? 0) + (values.fuelPerMonth ?? 0) + (values.maintenancePerMonth ?? 0) + (values.otherPerYear ?? 0);
  if (costs <= 0) {
    return unanswered({ tone: "note", text: "Type what the truck costs you (the payment, insurance, fuel) to see what it costs a day, an hour and a job." });
  }
  if (values.workingDaysPerMonth === null || values.workingDaysPerMonth <= 0) {
    return unanswered({ tone: "note", text: "Add the working days a month to spread the cost over them. 21 is a five-day week." });
  }

  const result = calculateTruckCost({
    paymentPerMonth: values.paymentPerMonth ?? 0,
    insurancePerMonth: values.insurancePerMonth ?? 0,
    fuelPerMonth: values.fuelPerMonth ?? 0,
    maintenancePerMonth: values.maintenancePerMonth ?? 0,
    otherPerYear: values.otherPerYear ?? 0,
    workingDaysPerMonth: values.workingDaysPerMonth,
    billedHoursPerDay: values.billedHoursPerDay ?? 0,
    jobsPerDay: values.jobsPerDay ?? 0,
  });
  if (!result) {
    return unanswered({ tone: "note", text: "These numbers do not add up to a cost. Check the working days." });
  }

  const perHour = result.perBilledHour !== null ? ` Every billed hour carries ${formatDollars(result.perBilledHour)} of it.` : "";
  const lines: PlanLine[] = [
    { label: "A month", value: formatDollars(result.perMonth), strong: true },
    { label: "A year", value: formatDollars(result.perYear) },
    { label: "A working day", value: formatDollars(result.perWorkingDay) },
  ];
  if (result.perBilledHour !== null) lines.push({ label: "A billed hour", value: formatDollars(result.perBilledHour) });
  if (result.perJob !== null) lines.push({ label: "A job", value: formatDollars(result.perJob) });
  lines.push({ label: "A day it sits parked", value: formatDollars(result.parkedDay) });

  return {
    reading: { tone: "note", text: `This truck costs ${formatDollars(result.perMonth)} a month, which is ${formatDollars(result.perWorkingDay)} every working day.${perHour}` },
    cautions: [],
    lines,
    badField: null,
    result,
  };
}

// ============================================================ another technician

export const HIRE_PLAN_KEYS = ["hourlyWage", "burdenPercent", "paidHoursPerWeek", "truckPerMonth", "billableRate", "billedHoursPerWeek", "rampWeeks"] as const;
export type HirePlanKey = (typeof HIRE_PLAN_KEYS)[number];

export const HIRE_PLAN_LABELS: Readonly<Record<HirePlanKey, string>> = {
  hourlyWage: "Hourly wage",
  burdenPercent: "Payroll costs on top",
  paidHoursPerWeek: "Paid hours a week",
  truckPerMonth: "Truck and tools",
  billableRate: "Rate you bill",
  billedHoursPerWeek: "Hours billed a week",
  rampWeeks: "Weeks to get busy",
};

const HIRE_PLAN_LIMITS: Readonly<Record<HirePlanKey, Limit>> = {
  hourlyWage: { max: 1000 },
  burdenPercent: { max: 200 },
  paidHoursPerWeek: { ...WEEK_HOURS, over: "A week has 168 hours. Check the paid hours." },
  truckPerMonth: MONEY_A_MONTH,
  billableRate: { max: 10_000 },
  billedHoursPerWeek: { ...WEEK_HOURS, over: "A week has 168 hours. Check the hours billed." },
  rampWeeks: { max: 52, over: "Weeks to get busy is a whole number of weeks, 52 at most." },
};

const HIRE_REQUIRED: readonly HirePlanKey[] = ["hourlyWage", "paidHoursPerWeek", "billableRate", "billedHoursPerWeek"];

/** A hire within this many dollars a month of zero is "breaking even", not paying or losing. */
const BREAK_EVEN_DOLLARS = 0.5;
const WEEKS_PER_MONTH = 52 / 12;

export function hirePlanStart(numbers: BusinessNumbers): PlanStart<HirePlanKey> {
  return start(HIRE_PLAN_KEYS, {
    hourlyWage: numbers.averageWage,
    burdenPercent: numbers.payrollBurdenPercent,
    paidHoursPerWeek: paidHoursFrom(numbers),
    billableRate: numbers.laborRate,
    billedHoursPerWeek: numbers.billedHoursPerWeek,
  });
}

export function answerHirePlan(text: Readonly<Record<HirePlanKey, string>>): PlanAnswer<HirePlanKey, NewHireResult> {
  const { values, problem } = parseAll<HirePlanKey, NewHireResult>(HIRE_PLAN_KEYS, text, HIRE_PLAN_LABELS, HIRE_PLAN_LIMITS);
  if (problem) return problem;

  const missing = HIRE_REQUIRED.filter((key) => values[key] === null || values[key] === 0);
  if (missing.length > 0) {
    return unanswered({ tone: "note", text: `Add ${listLabels(missing.map((key) => HIRE_PLAN_LABELS[key]))} to see whether the hire pays for itself.` });
  }
  const wage = values.hourlyWage as number;
  const burden = values.burdenPercent ?? 0;
  const paid = values.paidHoursPerWeek as number;
  const billed = values.billedHoursPerWeek as number;
  if (billed > paid) {
    return unanswered({ tone: "bad", text: "A technician cannot bill more hours than they are paid for. Check the two hours boxes." }, "billedHoursPerWeek");
  }
  const ramp = values.rampWeeks ?? 0;
  if (!Number.isInteger(ramp)) {
    return unanswered({ tone: "bad", text: HIRE_PLAN_LIMITS.rampWeeks.over as string }, "rampWeeks");
  }

  const result = calculateNewHire({
    hourlyWage: wage,
    burdenPercent: burden,
    paidHoursPerWeek: paid,
    truckPerMonth: values.truckPerMonth ?? 0,
    billableRate: values.billableRate as number,
    billedHoursPerWeek: billed,
    rampWeeks: ramp,
  });
  if (!result) {
    return unanswered({ tone: "note", text: "These numbers do not add up to an answer. Check the wage, the hours and the rate." });
  }

  // The calculator prices every paid hour at the plain wage. Past 40 hours a
  // week most technicians are owed time and a half, so say what that adds.
  const overtimeHours = Math.max(0, paid - OVERTIME_THRESHOLD_HOURS);
  const overtimePerWeek = overtimeHours * wage * (OVERTIME_MULTIPLIER - 1) * (1 + burden / 100);
  const leftAfterOvertime = result.monthlyLeftOver - overtimePerWeek * WEEKS_PER_MONTH;
  const cautions: string[] = [];
  if (overtimePerWeek >= 0.005) {
    const flips = result.monthlyLeftOver >= BREAK_EVEN_DOLLARS && leftAfterOvertime < BREAK_EVEN_DOLLARS;
    cautions.push(
      `These figures price all ${hoursText(paid)} paid hours at the plain wage. Hours past ${OVERTIME_THRESHOLD_HOURS} a week are usually owed time and a half, which adds about ${formatDollarsShort(Math.round(overtimePerWeek))} a week to the cost.${flips ? " With that added, this hire no longer pays for itself." : ""}`,
    );
  }

  const breakEven = result.breakEvenHoursPerWeek;
  let reading: Reading;
  if (breakEven > paid) {
    const [needs, paidText] = hoursApart(breakEven, paid);
    reading = {
      tone: "bad",
      text: `To pay for itself this hire would have to bill ${needs === paidText ? `just over ${paidText}` : needs} hours a week, and they are paid for ${paidText}. At these numbers it cannot.`,
    };
  } else if (Math.abs(result.monthlyLeftOver) < BREAK_EVEN_DOLLARS) {
    reading = { tone: "note", text: `Billing ${hoursText(billed)} hours a week, this hire breaks even: it brings in what it costs, and nothing more.` };
  } else {
    const [billedText, breakEvenText] = hoursApart(billed, breakEven);
    reading = result.pays
      ? {
          tone: cautions.length > 0 && leftAfterOvertime < BREAK_EVEN_DOLLARS ? "warn" : "good",
          text: `Billing ${billedText} hours a week, this hire pays for itself and leaves about ${formatDollarsShort(Math.max(1, Math.round(result.monthlyLeftOver)))} a month. It breaks even at ${breakEvenText} billed hours a week.`,
        }
      : {
          tone: "bad",
          text: `Billing ${billedText} hours a week, this hire costs about ${formatDollarsShort(Math.max(1, Math.round(-result.monthlyLeftOver)))} a month more than it brings in. It needs ${breakEvenText} billed hours a week to break even.`,
        };
  }

  const lines: PlanLine[] = [
    { label: "Break-even billed hours a week", value: hoursApart(breakEven, billed)[0], strong: true },
    { label: "Costs you a week", value: formatDollars(result.weeklyCost) },
    { label: "Costs you a month", value: formatDollars(result.monthlyCost) },
    { label: "Bills a week, once busy", value: formatDollars(result.weeklyRevenue) },
    { label: result.monthlyLeftOver >= 0 ? "Left over a month, once busy" : "Short a month, once busy", value: formatDollars(Math.abs(result.monthlyLeftOver)) },
  ];
  if (ramp > 0) {
    lines.push({ label: `Cash to carry the first ${ramp === 1 ? "week" : `${ramp} weeks`}`, value: formatDollars(result.cashToCarry) });
    if (result.firstWeekInTheBlack !== null) {
      lines.push({ label: "First week that pays for itself", value: `Week ${result.firstWeekInTheBlack}` });
    }
  }

  return { reading, cautions, lines, badField: null, result };
}

// ============================================================ a pay plan

export const PAY_PLAN_KEYS = ["hourlyWage", "hoursOnClock", "bookHours", "payPerBookHour", "revenueProduced", "commissionPercent"] as const;
export type PayPlanKey = (typeof PAY_PLAN_KEYS)[number];

export const PAY_PLAN_LABELS: Readonly<Record<PayPlanKey, string>> = {
  hourlyWage: "Hourly wage",
  hoursOnClock: "Hours on the clock",
  bookHours: "Book hours turned",
  payPerBookHour: "Pay per book hour",
  revenueProduced: "Revenue produced",
  commissionPercent: "Commission",
};

const PAY_PLAN_LIMITS: Readonly<Record<PayPlanKey, Limit>> = {
  hourlyWage: { max: 1000 },
  hoursOnClock: { ...WEEK_HOURS, over: "A week has 168 hours. Check the hours on the clock." },
  bookHours: { max: 500 },
  payPerBookHour: { max: 1000 },
  revenueProduced: { max: 10_000_000 },
  commissionPercent: { max: 100, over: "A commission above 100% pays out more than came in." },
};

const PLAN_NAMES: Readonly<Record<PayPlan, string>> = { hourly: "Hourly", "flat-rate": "Flat rate", commission: "Commission" };

/** Two weeks' pay within half a cent are the same pay. */
const SAME_PAY = 0.005;

export function payPlanStart(numbers: BusinessNumbers): PlanStart<PayPlanKey> {
  return start(PAY_PLAN_KEYS, {
    hourlyWage: numbers.averageWage,
    hoursOnClock: paidHoursFrom(numbers),
    bookHours: numbers.billedHoursPerWeek,
    // Labor only: the week's billed hours at the company's rate. Parts are the owner's to add.
    revenueProduced: numbers.billedHoursPerWeek !== null && numbers.laborRate !== null ? numbers.billedHoursPerWeek * numbers.laborRate : null,
  });
}

export function answerPayPlan(text: Readonly<Record<PayPlanKey, string>>): PlanAnswer<PayPlanKey, TechnicianPayResult> {
  const { values, problem } = parseAll<PayPlanKey, TechnicianPayResult>(PAY_PLAN_KEYS, text, PAY_PLAN_LABELS, PAY_PLAN_LIMITS);
  if (problem) return problem;

  const missing = (["hourlyWage", "hoursOnClock"] as const).filter((key) => values[key] === null || values[key] === 0);
  if (missing.length > 0) {
    return unanswered({ tone: "note", text: `Add ${listLabels(missing.map((key) => PAY_PLAN_LABELS[key]))} to see what the week pays.` });
  }

  const bookHours = values.bookHours ?? 0;
  const payPerBookHour = values.payPerBookHour ?? 0;
  const revenue = values.revenueProduced ?? 0;
  const commissionPercent = values.commissionPercent ?? 0;
  const hasFlatRate = bookHours > 0 && payPerBookHour > 0;
  const hasCommission = revenue > 0 && commissionPercent > 0;

  const result = calculateTechnicianPay({
    hourlyWage: values.hourlyWage as number,
    hoursOnClock: values.hoursOnClock as number,
    bookHours: hasFlatRate ? bookHours : 0,
    payPerBookHour: hasFlatRate ? payPerBookHour : 0,
    revenueProduced: hasCommission ? revenue : 0,
    commissionRate: hasCommission ? commissionPercent / 100 : 0,
  });
  if (!result) {
    return unanswered({ tone: "note", text: "These numbers do not add up to a week's pay. Check the hours and the commission." });
  }

  // A plan typed halfway (the pay with no hours to pay it on) is asked for its other half.
  const asks: string[] = [];
  if (payPerBookHour > 0 && bookHours <= 0) asks.push("Add the book hours turned to see what flat rate pays.");
  if (commissionPercent > 0 && revenue <= 0) asks.push("Add the revenue produced to see what commission pays.");
  const cautions: string[] = [];
  if (commissionPercent > 0 && commissionPercent < 1) {
    const meant = Math.round(commissionPercent * 100 * 100) / 100;
    cautions.push(`A commission of ${commissionPercent}% is under one percent. If you meant ${meant}%, type ${meant}.`);
  }

  const plans: { readonly plan: PayPlan; readonly pay: number }[] = [{ plan: "hourly", pay: result.hourlyPay }];
  if (hasFlatRate) plans.push({ plan: "flat-rate", pay: result.flatRatePay });
  if (hasCommission) plans.push({ plan: "commission", pay: result.commissionPay });
  const most = Math.max(...plans.map((entry) => entry.pay));
  const top = plans.filter((entry) => most - entry.pay < SAME_PAY).map((entry) => entry.plan);
  const level = top.length === plans.length;

  const perHour = (plan: PayPlan) => {
    const value = result.effectiveHourly[plan];
    return value !== null ? `${formatDollars(value)} an hour on the clock` : undefined;
  };
  const strong = (plan: PayPlan) => plans.length > 1 && !level && top.includes(plan);
  const lines: PlanLine[] = [{ label: "Hourly", value: formatDollars(result.hourlyPay), note: perHour("hourly"), strong: strong("hourly") }];
  if (hasFlatRate) {
    lines.push({ label: "Flat rate", value: formatDollars(result.flatRatePay), note: perHour("flat-rate"), strong: strong("flat-rate") });
    if (result.bookHoursToMatchHourly !== null) lines.push({ label: "Book hours to match hourly", value: hoursText(result.bookHoursToMatchHourly) });
  }
  if (hasCommission) {
    lines.push({ label: "Commission", value: formatDollars(result.commissionPay), note: perHour("commission"), strong: strong("commission") });
    if (result.revenueToMatchHourly !== null) lines.push({ label: "Revenue to match hourly", value: formatDollars(result.revenueToMatchHourly) });
  }

  // "with 5 hours at time and a half", unless the overtime rounds to no hours at all.
  const overtimeText = hoursText(result.overtimeHours);
  const overtime = overtimeText !== "0" ? `, with ${overtimeText} ${overtimeText === "1" ? "hour" : "hours"} at time and a half` : "";

  if (plans.length === 1) {
    const next = asks.length > 0 ? asks.join(" ") : "Add a pay per book hour or a commission to compare it with another plan.";
    return { reading: { tone: "note", text: `Hourly, this week pays ${formatDollars(result.hourlyPay)}${overtime}. ${next}` }, cautions, lines, badField: null, result };
  }

  const others = plans.slice(1).map(({ plan, pay }) => {
    const difference = pay - result.hourlyPay;
    const name = PLAN_NAMES[plan].toLowerCase();
    if (Math.abs(difference) < SAME_PAY) return `${name} pays the same`;
    return `${name} pays ${formatDollars(Math.abs(difference))} ${difference > 0 ? "more" : "less"}`;
  });
  // Level plans have no "most"; plans tied at the top share it.
  let ranking = "";
  if (!level) {
    ranking =
      top.length === 1
        ? ` ${PLAN_NAMES[top[0]]} pays the most.`
        : ` ${PLAN_NAMES[top[0]]} and ${PLAN_NAMES[top[1]].toLowerCase()} pay the most, the same amount.`;
  }
  return {
    reading: {
      tone: "note",
      text: `For this week, hourly pays ${formatDollars(result.hourlyPay)}${overtime}; ${others.join(" and ")}.${ranking}${asks.length > 0 ? ` ${asks.join(" ")}` : ""}`,
    },
    cautions,
    lines,
    badField: null,
    result,
  };
}
