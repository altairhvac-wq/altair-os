"use server";

import { revalidatePath } from "next/cache";
import { assertBusinessNumbersAccess } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import {
  getCompanyBusinessNumbers,
  saveCompanyBusinessNumbers,
  type BusinessNumbersRecord,
  type BusinessSetupPatch,
} from "@/lib/database/queries/business-numbers";
import {
  getGuidedSetupAvailability,
  listSetupPriceBookItems,
  saveLaborItems,
  saveServiceCallItem,
  saveSetupPriceList,
  updateCompanyShopContact,
  type SetupPriceBookItem,
} from "@/lib/database/queries/business-setup";
import { getCompanyBillingDefaultsFromRow, updateCompanyBillingDefaults } from "@/lib/database/queries/companies";
import type { ActiveCompanyContext } from "@/lib/database/types/core-tables";
import {
  STARTER_AFTER_HOURS_MULTIPLIER,
  STARTER_MAX_TASKS,
  STARTER_TASK_KEYS,
} from "@/shared/lib/business-numbers/starter-price-list";
import { hasSavedCompanyBillingDefaults, validateCompanyBillingDefaultsInput } from "@/shared/lib/company-billing-defaults";
import { validateCompanyTimezoneInput } from "@/shared/lib/company-profile";
import { getCompanyTimeZoneChoice } from "@/shared/lib/datetime";
import {
  BUSINESS_SETUP_STEPS,
  validateBusinessNumbersInput,
  type BusinessNumberKey,
  type BusinessNumbersInput,
  type BusinessNumbersPatch,
  type BusinessSetupStepId,
} from "@/shared/types/business-numbers";
import {
  validatePriceListStepInput,
  validateShopContact,
  type PriceListStepInput,
  type ShopStepInput,
} from "@/shared/types/business-setup";

/**
 * The guided setup's saves, one action per step.
 *
 * Each action is a public entry point: it resolves the signed-in person and
 * their company itself, checks they are an owner or admin, checks the setup
 * is switched on in this database, refuses if the page was opened for a
 * different company, checks every value, and only then writes. A step's
 * numbers and its "done" mark are saved in the same write.
 *
 * Skipping is always allowed and never undoes a step that was finished.
 */

export type SetupActionResult = {
  error?: string;
  /** Where the problem is, so the screen can point at it: a field name, or a row of the price list. */
  field?: string | null;
  row?: number | null;
  /** The numbers and the setup's progress as they now stand. */
  record?: BusinessNumbersRecord;
  /** Price list step only: how many price book items were added, updated and archived. */
  created?: number;
  updated?: number;
  removed?: number;
  /** Price list step only: the setup's price book items as they now stand. */
  items?: SetupPriceBookItem[];
};

const SETUP_UNAVAILABLE_MESSAGE = "The guided setup is not switched on for this workspace yet. Nothing was saved.";
const COMPANY_CHANGED_MESSAGE = "You are now working in a different company than this page was opened for. Reload the page, then try again.";

async function requireSetupContext(expectedCompanyId: string): Promise<{ context: ActiveCompanyContext } | { error: string }> {
  const context = await getActiveCompanyContext();
  if (!context) return { error: NO_ACTIVE_COMPANY_MESSAGE };

  const accessError = assertBusinessNumbersAccess(context);
  if (accessError) return { error: accessError };

  if (typeof expectedCompanyId !== "string" || expectedCompanyId !== context.company.id) {
    return { error: COMPANY_CHANGED_MESSAGE };
  }

  if (!(await getGuidedSetupAvailability())) return { error: SETUP_UNAVAILABLE_MESSAGE };

  return { context };
}

function revalidateSetupPaths(options: { timeZoneChanged?: boolean } = {}) {
  // A new time zone moves every date and time in the product, on every page.
  if (options.timeZoneChanged) revalidatePath("/", "layout");
  revalidatePath("/");
  revalidatePath("/get-started");
  revalidatePath("/settings");
  revalidatePath("/settings/business-numbers");
  revalidatePath("/settings/company");
  revalidatePath("/price-book");
  revalidatePath("/sales");
}

/**
 * The setup marks for finishing or skipping one step. A finished step stays
 * finished if it is later skipped past. The setup is complete the first time
 * every step has been visited.
 */
async function stepMark(context: ActiveCompanyContext, step: BusinessSetupStepId, status: "done" | "skipped"): Promise<BusinessSetupPatch> {
  const { record } = await getCompanyBusinessNumbers(context);
  const kept = status === "skipped" && record.setup.steps[step] === "done" ? "done" : status;
  const steps = { ...record.setup.steps, [step]: kept };
  const allVisited = BUSINESS_SETUP_STEPS.every((id) => steps[id]);
  return {
    steps: { [step]: kept },
    completedAt: allVisited && !record.setup.completedAt ? new Date().toISOString() : undefined,
  };
}

async function finishStep(
  context: ActiveCompanyContext,
  step: BusinessSetupStepId,
  patch: BusinessNumbersPatch,
  extra: Pick<SetupActionResult, "created" | "updated" | "removed" | "items"> = {},
  options: { timeZoneChanged?: boolean } = {},
): Promise<SetupActionResult> {
  const { record, error } = await saveCompanyBusinessNumbers(context.company.id, context, patch, await stepMark(context, step, "done"));
  // Revalidated even when the step's mark did not save: the shop's details
  // (and its time zone) were written before this.
  if (options.timeZoneChanged || !error) revalidateSetupPaths(options);
  if (error || !record) return { error: error ?? "This step could not be saved. Try again." };
  return { record, ...extra };
}

/** Only the keys a step is allowed to change are passed on; anything else in the form is dropped. */
function pick(input: BusinessNumbersInput | null | undefined, keys: readonly (BusinessNumberKey | "serviceCallCredited")[]): BusinessNumbersInput {
  const picked: BusinessNumbersInput = {};
  if (!input || typeof input !== "object") return picked;
  for (const key of keys) {
    if (!(key in input)) continue;
    if (key === "serviceCallCredited") picked.serviceCallCredited = input.serviceCallCredited;
    else picked[key] = input[key];
  }
  return picked;
}

/* ------------------------------------------------------------ 1. your shop */

export async function saveShopStepAction(rawInput: ShopStepInput, expectedCompanyId: string): Promise<SetupActionResult> {
  const required = await requireSetupContext(expectedCompanyId);
  if ("error" in required) return { error: required.error };
  const { context } = required;

  const input: ShopStepInput = rawInput && typeof rawInput === "object" ? rawInput : {};
  const contact = validateShopContact(input);
  if (contact.error || !contact.data) return { error: contact.error ?? "Your shop's details could not be read.", field: contact.field ?? null };

  // Time zone. Asked, and saved, only where the choice can be recorded
  // (migration 220); before that the step does not show the box and a value
  // sent anyway is ignored. Checked by the rule Settings > Company uses: any
  // zone this server knows.
  let chosenTimeZone: string | null = null;
  if ("timezone" in input && getCompanyTimeZoneChoice(context.company) !== "unavailable") {
    const zone = validateCompanyTimezoneInput(input.timezone);
    if (zone.error || !zone.timezone) return { error: "Pick your time zone from the list.", field: "timezone" };
    chosenTimeZone = zone.timezone;
  }

  // Sales tax. A number replaces the default and keeps the other document
  // defaults. A blank box means "we do not charge it": for a company that
  // had a rate saved, that is 0%; for one that never set a rate there is
  // nothing to change.
  const typedTax = input.defaultTaxRate === null || input.defaultTaxRate === undefined ? "" : String(input.defaultTaxRate).trim();
  const taxText = typedTax === "" && "defaultTaxRate" in input && hasSavedCompanyBillingDefaults(context.company.settings) ? "0" : typedTax;
  let defaults: ReturnType<typeof validateCompanyBillingDefaultsInput>["data"];
  if (taxText !== "") {
    const current = getCompanyBillingDefaultsFromRow(context.company);
    const checked = validateCompanyBillingDefaultsInput({
      defaultTaxRate: taxText.replace(/%$/, ""),
      defaultPaymentTermsDays: current.defaultPaymentTermsDays,
      defaultEstimateExpirationDays: current.defaultEstimateExpirationDays,
      defaultEstimateNotes: current.defaultEstimateNotes,
      defaultInvoiceNotes: current.defaultInvoiceNotes,
    });
    if (checked.error || !checked.data) return { error: checked.error ?? "Sales tax needs to be a number.", field: "defaultTaxRate" };
    defaults = checked.data;
  }

  const numbers = input.technicianCount !== null && input.technicianCount !== undefined && String(input.technicianCount).trim() !== ""
    ? validateBusinessNumbersInput({ technicianCount: input.technicianCount })
    : { data: {} as BusinessNumbersPatch };
  if (numbers.error !== undefined) return { error: numbers.error, field: numbers.field };

  const contactResult = await updateCompanyShopContact(context.company.id, context, contact.data, chosenTimeZone);
  if (contactResult.error) return { error: contactResult.error };

  if (defaults) {
    const taxResult = await updateCompanyBillingDefaults(context.company.id, context, defaults);
    if (taxResult.error) return { error: taxResult.error, field: "defaultTaxRate" };
  }

  return finishStep(context, "shop", numbers.data, {}, { timeZoneChanged: chosenTimeZone !== null });
}

/* ------------------------------------------------------ 2. your labor rate */

const RATE_KEYS = [
  "laborRate",
  "afterHoursMultiplier",
  "averageWage",
  "payrollBurdenPercent",
  "billedHoursPerWeek",
  "unbilledHoursPerWeek",
  "technicianCount",
  "monthlyOverhead",
  "targetNetMarginPercent",
] as const satisfies readonly BusinessNumberKey[];

export async function saveRateStepAction(input: BusinessNumbersInput, expectedCompanyId: string): Promise<SetupActionResult> {
  const required = await requireSetupContext(expectedCompanyId);
  if ("error" in required) return { error: required.error };

  const validation = validateBusinessNumbersInput(pick(input, RATE_KEYS));
  if (validation.error !== undefined) return { error: validation.error, field: validation.field };
  if (!validation.data.laborRate || validation.data.laborRate <= 0) {
    return { error: "Type the rate you will charge for an hour, or skip this step for now.", field: "laborRate" };
  }

  // Labor goes into the price book at this rate, so it can be picked on any
  // estimate or invoice with the hours as the quantity.
  const { context } = required;
  const { record: stored } = await getCompanyBusinessNumbers(context);
  const labor = await saveLaborItems(
    context.company.id,
    context,
    { laborRate: validation.data.laborRate, afterHoursMultiplier: validation.data.afterHoursMultiplier ?? stored.numbers.afterHoursMultiplier },
    { createIfMissing: true, previous: { laborRate: stored.numbers.laborRate, afterHoursMultiplier: stored.numbers.afterHoursMultiplier } },
  );
  if (labor.error) return { error: labor.error };

  return finishStep(context, "rate", validation.data);
}

/* ------------------------------------------------ 3. your service call fee */

export async function saveServiceCallStepAction(input: BusinessNumbersInput, expectedCompanyId: string): Promise<SetupActionResult> {
  const required = await requireSetupContext(expectedCompanyId);
  if ("error" in required) return { error: required.error };
  const { context } = required;

  const validation = validateBusinessNumbersInput(pick(input, ["serviceCallFee", "serviceCallCredited"]));
  if (validation.error !== undefined) return { error: validation.error, field: validation.field };
  const fee = validation.data.serviceCallFee;
  if (!fee || fee <= 0) {
    return { error: "Type your service call fee, or skip this step for now.", field: "serviceCallFee" };
  }

  const { record: stored } = await getCompanyBusinessNumbers(context);
  const item = await saveServiceCallItem(context.company.id, context, fee, { createIfMissing: true, previous: { serviceCallFee: stored.numbers.serviceCallFee } });
  if (item.error) return { error: item.error };

  return finishStep(context, "service-call", validation.data);
}

/* ------------------------------------------------------ 4. your price list */

export async function savePriceListStepAction(input: PriceListStepInput, expectedCompanyId: string): Promise<SetupActionResult> {
  const required = await requireSetupContext(expectedCompanyId);
  if ("error" in required) return { error: required.error };
  const { context } = required;

  const validation = validatePriceListStepInput(input, STARTER_TASK_KEYS, STARTER_MAX_TASKS);
  if (validation.error !== undefined) return { error: validation.error, row: validation.row, field: validation.field ?? null };

  // The rate comes from what is stored, never from the form: the prices saved
  // are the prices the company's own rate gives.
  const { record } = await getCompanyBusinessNumbers(context);
  const laborRate = record.numbers.laborRate;
  if (!laborRate || laborRate <= 0) {
    return { error: "Set your labor rate first (step 2). The price list is priced from it.", field: "laborRate" };
  }

  const saved = await saveSetupPriceList(
    context.company.id,
    context,
    validation.data,
    laborRate,
    record.numbers.afterHoursMultiplier ?? STARTER_AFTER_HOURS_MULTIPLIER,
  );
  if (saved.error) return { error: saved.error };

  return finishStep(
    context,
    "price-list",
    { partsMarkupPercent: validation.data.markupPercent },
    { created: saved.created, updated: saved.updated, removed: saved.removed, items: await listSetupPriceBookItems(context) },
  );
}

/* --------------------------------------------------- 5. your monthly target */

export async function saveTargetStepAction(input: BusinessNumbersInput, expectedCompanyId: string): Promise<SetupActionResult> {
  const required = await requireSetupContext(expectedCompanyId);
  if ("error" in required) return { error: required.error };

  const validation = validateBusinessNumbersInput(pick(input, ["monthlyOverhead", "averageJobRevenue", "jobVariableCostPercent"]));
  if (validation.error !== undefined) return { error: validation.error, field: validation.field };
  if (!validation.data.averageJobRevenue || validation.data.averageJobRevenue <= 0) {
    return { error: "Type what an average job brings in, or skip this step for now.", field: "averageJobRevenue" };
  }
  // A target needs all three: without the shop's costs or what a job uses up
  // there is no number of jobs to count against, and the step would be
  // marked done with nothing on the dashboard to show for it.
  if (!validation.data.monthlyOverhead || validation.data.monthlyOverhead <= 0) {
    return { error: "Type your shop costs each month, or skip this step for now. Without them there is no target to count against.", field: "monthlyOverhead" };
  }
  if (validation.data.jobVariableCostPercent === null || validation.data.jobVariableCostPercent === undefined) {
    return { error: "Type what a job uses up (0 if nothing), or skip this step for now.", field: "jobVariableCostPercent" };
  }

  return finishStep(required.context, "target", validation.data);
}

/* ------------------------------------------------- skipping and dismissing */

export async function skipSetupStepAction(step: BusinessSetupStepId, expectedCompanyId: string): Promise<SetupActionResult> {
  const required = await requireSetupContext(expectedCompanyId);
  if ("error" in required) return { error: required.error };
  const { context } = required;

  if (!BUSINESS_SETUP_STEPS.includes(step)) return { error: "That step could not be found. Reload the page." };

  const { record, error } = await saveCompanyBusinessNumbers(context.company.id, context, {}, await stepMark(context, step, "skipped"));
  if (error || !record) return { error: error ?? "That did not save. Try again." };
  revalidateSetupPaths();
  return { record };
}

/** "Not now" on the dashboard card: stops offering the setup. It can be opened again from Settings > Numbers. */
export async function dismissGuidedSetupAction(expectedCompanyId: string): Promise<SetupActionResult> {
  const required = await requireSetupContext(expectedCompanyId);
  if ("error" in required) return { error: required.error };
  const { context } = required;

  const { record, error } = await saveCompanyBusinessNumbers(context.company.id, context, {}, { dismissedAt: new Date().toISOString() });
  if (error || !record) return { error: error ?? "That did not save. Try again." };
  revalidateSetupPaths();
  return { record };
}
