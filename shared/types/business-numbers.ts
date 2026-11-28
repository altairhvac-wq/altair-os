/**
 * A company's business numbers: what it charges, what the work costs, and the
 * monthly target. One row per company (migration 218), filled by the guided
 * setup, edited at Settings > Business numbers, and read by estimates, the
 * price book, job profit and the dashboard.
 *
 * ============ WHAT IS HERE ============
 * The shape of the numbers, the limits each one must stay inside, and the
 * check a form's input goes through before anything is saved. Money is
 * dollars here (the database keeps whole cents) and percentages are percent:
 * 25 means 25%.
 *
 * Only inputs and decisions are stored. Everything worked out from them
 * (what an hour costs, the suggested rate, the break-even job count) comes
 * from shared/lib/business-numbers/derive.ts, which uses the same formulas
 * as the public calculators.
 *
 * Pure: no imports, safe on the server and in the browser.
 */

export type BusinessNumberKey =
  | "laborRate"
  | "afterHoursMultiplier"
  | "serviceCallFee"
  | "partsMarkupPercent"
  | "averageWage"
  | "payrollBurdenPercent"
  | "billedHoursPerWeek"
  | "unbilledHoursPerWeek"
  | "technicianCount"
  | "monthlyOverhead"
  | "targetNetMarginPercent"
  | "averageJobRevenue"
  | "jobVariableCostPercent";

export type BusinessNumbers = Record<BusinessNumberKey, number | null> & {
  /** True when the service call fee comes off the bill if the customer goes ahead. */
  serviceCallCredited: boolean;
};

export const EMPTY_BUSINESS_NUMBERS: BusinessNumbers = {
  laborRate: null,
  afterHoursMultiplier: null,
  serviceCallFee: null,
  serviceCallCredited: false,
  partsMarkupPercent: null,
  averageWage: null,
  payrollBurdenPercent: null,
  billedHoursPerWeek: null,
  unbilledHoursPerWeek: null,
  technicianCount: null,
  monthlyOverhead: null,
  targetNetMarginPercent: null,
  averageJobRevenue: null,
  jobVariableCostPercent: null,
};

export type BusinessNumberKind = "money" | "percent" | "hours" | "count" | "multiplier";

export type BusinessNumberField = {
  readonly key: BusinessNumberKey;
  readonly label: string;
  readonly kind: BusinessNumberKind;
  /** Inclusive limits, in the unit the owner types (dollars, percent, hours). */
  readonly min: number;
  readonly max: number;
  /** When true the value must be strictly below `max` (a 100% margin has no price). */
  readonly belowMax?: boolean;
  /** Decimal places kept. */
  readonly decimals: number;
};

/**
 * Every number, with its limits. The limits match the check constraints in
 * migration 218; scripts/verify-business-numbers.mjs holds the two together.
 */
export const BUSINESS_NUMBER_FIELDS: Readonly<Record<BusinessNumberKey, BusinessNumberField>> = {
  laborRate: { key: "laborRate", label: "Labor rate", kind: "money", min: 0, max: 100000, decimals: 2 },
  afterHoursMultiplier: { key: "afterHoursMultiplier", label: "After-hours multiplier", kind: "multiplier", min: 1, max: 5, decimals: 2 },
  serviceCallFee: { key: "serviceCallFee", label: "Service call fee", kind: "money", min: 0, max: 100000, decimals: 2 },
  partsMarkupPercent: { key: "partsMarkupPercent", label: "Parts markup", kind: "percent", min: 0, max: 1000, decimals: 2 },
  averageWage: { key: "averageWage", label: "Average hourly wage", kind: "money", min: 0, max: 100000, decimals: 2 },
  payrollBurdenPercent: { key: "payrollBurdenPercent", label: "Payroll costs on top", kind: "percent", min: 0, max: 200, decimals: 2 },
  billedHoursPerWeek: { key: "billedHoursPerWeek", label: "Hours billed a week", kind: "hours", min: 0, max: 168, decimals: 1 },
  unbilledHoursPerWeek: { key: "unbilledHoursPerWeek", label: "Paid hours not billed", kind: "hours", min: 0, max: 168, decimals: 1 },
  technicianCount: { key: "technicianCount", label: "Technicians", kind: "count", min: 1, max: 10000, decimals: 0 },
  monthlyOverhead: { key: "monthlyOverhead", label: "Shop costs each month", kind: "money", min: 0, max: 20000000, decimals: 2 },
  targetNetMarginPercent: { key: "targetNetMarginPercent", label: "Profit to keep", kind: "percent", min: 0, max: 100, belowMax: true, decimals: 2 },
  averageJobRevenue: { key: "averageJobRevenue", label: "Average job", kind: "money", min: 0, max: 20000000, decimals: 2 },
  jobVariableCostPercent: { key: "jobVariableCostPercent", label: "What a job uses up", kind: "percent", min: 0, max: 100, belowMax: true, decimals: 2 },
};

export const BUSINESS_NUMBER_KEYS = Object.keys(BUSINESS_NUMBER_FIELDS) as readonly BusinessNumberKey[];

/** What a form sends: only the numbers it is changing. Blank or null clears a number. */
export type BusinessNumbersInput = Partial<Record<BusinessNumberKey, string | number | null>> & {
  serviceCallCredited?: boolean;
};

/** The checked version of an input: only the keys that were sent. */
export type BusinessNumbersPatch = Partial<BusinessNumbers>;

export type BusinessNumbersValidation =
  | { readonly data: BusinessNumbersPatch; readonly error?: undefined; readonly field?: undefined }
  | { readonly data?: undefined; readonly error: string; readonly field: BusinessNumberKey | null };

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function describeLimit(field: BusinessNumberField, value: number): string {
  if (field.kind === "money") return `$${value.toLocaleString("en-US")}`;
  if (field.kind === "percent") return `${value}%`;
  return String(value);
}

/**
 * Reads one typed value. Accepts "1,250.50", "$121", "25%" and a number still
 * being typed ("120."); blank means "no number". Anything else is refused,
 * never guessed: "1.250,50" is not read as $1.25, and commas count only as
 * thousands separators. A minus sign is read so the range check can say
 * "cannot be less than" rather than "not a number".
 */
export function parseBusinessNumber(raw: unknown): number | null | "invalid" {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : "invalid";
  if (typeof raw !== "string") return "invalid";
  if (raw.length > 40) return "invalid";
  if (raw.trim() === "") return null;
  const text = raw.trim().replace(/^(-?)\$/, "$1").replace(/%$/, "").trim();
  // A lone "$" or "%" is a slip, not a request to clear the number.
  if (text === "") return "invalid";
  if (text.includes(",") && !/^-?\d{1,3}(,\d{3})+(\.\d*)?$/.test(text)) return "invalid";
  const plain = text.replace(/,/g, "");
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(plain)) return "invalid";
  const value = Number(plain);
  return Number.isFinite(value) ? value : "invalid";
}

/** True for a labor rate the product can store: the "use this rate" offers check it first. */
export function isStorableLaborRate(value: number | null): value is number {
  return value !== null && Number.isFinite(value) && value >= BUSINESS_NUMBER_FIELDS.laborRate.min && value <= BUSINESS_NUMBER_FIELDS.laborRate.max;
}

/**
 * Checks what a form sent. Returns only the keys that were sent, each inside
 * its limits and rounded to the places the database keeps. The first problem
 * found is reported in the owner's words, with the field it belongs to.
 */
export function validateBusinessNumbersInput(input: BusinessNumbersInput | null | undefined): BusinessNumbersValidation {
  if (!input || typeof input !== "object") {
    return { error: "Nothing to save.", field: null };
  }

  const patch: BusinessNumbersPatch = {};

  for (const key of BUSINESS_NUMBER_KEYS) {
    if (!(key in input)) continue;
    const field = BUSINESS_NUMBER_FIELDS[key];
    const parsed = parseBusinessNumber(input[key]);

    if (parsed === "invalid") {
      return { error: `${field.label} needs to be a number.`, field: key };
    }
    if (parsed === null) {
      patch[key] = null;
      continue;
    }

    // A count is a whole number or it is a mistake: 2.4 technicians is never
    // quietly saved as 2 while the screen was working with 2.4.
    if (field.decimals === 0 && !Number.isInteger(parsed)) {
      return { error: `${field.label} needs to be a whole number.`, field: key };
    }

    const value = roundTo(parsed, field.decimals);
    if (value < field.min) {
      return { error: `${field.label} cannot be less than ${describeLimit(field, field.min)}.`, field: key };
    }
    if (field.belowMax ? value >= field.max : value > field.max) {
      return {
        error: field.belowMax
          ? `${field.label} has to be under ${describeLimit(field, field.max)}.`
          : `${field.label} cannot be more than ${describeLimit(field, field.max)}.`,
        field: key,
      };
    }
    patch[key] = value;
  }

  if ("serviceCallCredited" in input) {
    if (typeof input.serviceCallCredited !== "boolean") {
      return { error: "Choose whether the service call fee is credited.", field: "serviceCallFee" };
    }
    patch.serviceCallCredited = input.serviceCallCredited;
  }

  if (Object.keys(patch).length === 0) {
    return { error: "Nothing to save.", field: null };
  }

  return { data: patch };
}

/** True once the owner has set at least one number. */
export function hasAnyBusinessNumber(numbers: BusinessNumbers): boolean {
  return BUSINESS_NUMBER_KEYS.some((key) => numbers[key] !== null);
}

/* ------------------------------------------------------------ guided setup */

/** The steps of the guided setup, in order. */
export const BUSINESS_SETUP_STEPS = ["shop", "rate", "service-call", "price-list", "target"] as const;

export type BusinessSetupStepId = (typeof BUSINESS_SETUP_STEPS)[number];

export type BusinessSetupStepStatus = "done" | "skipped";

export type BusinessSetupState = {
  readonly steps: Partial<Record<BusinessSetupStepId, BusinessSetupStepStatus>>;
  /** ISO time the last step was finished or skipped. */
  readonly completedAt: string | null;
  /** ISO time the owner chose "I'll do this later" for good. */
  readonly dismissedAt: string | null;
};

export const EMPTY_BUSINESS_SETUP_STATE: BusinessSetupState = { steps: {}, completedAt: null, dismissedAt: null };

/** Reads the stored steps object, dropping anything that is not a known step and status. */
export function parseBusinessSetupSteps(value: unknown): BusinessSetupState["steps"] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  const steps: Partial<Record<BusinessSetupStepId, BusinessSetupStepStatus>> = {};
  for (const step of BUSINESS_SETUP_STEPS) {
    const status = (value as Record<string, unknown>)[step];
    if (status === "done" || status === "skipped") steps[step] = status;
  }
  return steps;
}

/** The first step that is neither done nor skipped, or null when every step has been visited. */
export function nextBusinessSetupStep(state: BusinessSetupState): BusinessSetupStepId | null {
  return BUSINESS_SETUP_STEPS.find((step) => !state.steps[step]) ?? null;
}
