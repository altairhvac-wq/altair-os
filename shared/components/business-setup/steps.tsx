"use client";

import { useId, useMemo, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  savePriceListStepAction,
  saveRateStepAction,
  saveServiceCallStepAction,
  saveShopStepAction,
  saveTargetStepAction,
  type SetupActionResult,
} from "@/app/actions/business-setup";
import { NumberBox, ReadingLine } from "@/shared/components/business-numbers/fields";
import { StepFrame, useStepSave } from "@/shared/components/business-setup/StepFrame";
import { buttonClassName } from "@/shared/design-system/components/button-styles";
import { fieldControlClass, fieldLabelClass, fieldSelectClass } from "@/shared/design-system/components/field-styles";
import { deriveBusinessNumbers } from "@/shared/lib/business-numbers/derive";
import { formatCount, formatDollarsShort, numberToFieldText } from "@/shared/lib/business-numbers/format";
import { readHourCost, readLaborRate, readMonthlyTarget, readServiceCall, usableSuggestedRate } from "@/shared/lib/business-numbers/readings";
import { getCompanyTimezoneSelectOptions } from "@/shared/lib/company-timezones";
import type { CompanyTimeZoneChoice } from "@/shared/lib/datetime";
import { useBrowserTimeZone } from "@/shared/lib/use-browser-time-zone";
import type { SetupPriceBookItem } from "@/lib/database/queries/business-setup";
import {
  SERVICE_CALL_SETUP_KEY,
  STARTER_AFTER_HOURS_MULTIPLIER,
  STARTER_MARKUP_PERCENT,
  STARTER_MAX_TASKS,
  priceStarterLine,
  type StarterTask,
} from "@/shared/lib/business-numbers/starter-price-list";
import { BREAK_EVEN_DEFAULTS } from "@/shared/lib/resources/break-even";
import { LABOR_RATE_DEFAULTS } from "@/shared/lib/resources/labor-rate";
import {
  BUSINESS_NUMBER_FIELDS,
  EMPTY_BUSINESS_NUMBERS,
  isStorableLaborRate,
  parseBusinessNumber,
  type BusinessNumberKey,
  type BusinessNumbers,
} from "@/shared/types/business-numbers";
import { CUSTOM_SETUP_KEY_PATTERN, roundPriceListNumber, type ShopStepInput } from "@/shared/types/business-setup";

/**
 * The five steps of the guided setup. Each asks one question, opens with the
 * company's own numbers if it has them and with plainly labelled examples if
 * it does not, shows the answer as the owner types, and saves only when the
 * owner presses the button. Skipping and going back are always there
 * (StepFrame).
 *
 * The math and the sentences are the same ones Settings > Numbers uses
 * (shared/lib/business-numbers), which are the public calculators' own.
 */

export type StepCommonProps = {
  readonly companyId: string;
  readonly number: number;
  readonly numbers: BusinessNumbers;
  /** Called with the saved result; the setup moves on. */
  readonly onSaved: (result: SetupActionResult) => void;
  readonly onBack: () => void;
  readonly onSkip: () => void;
  /** The setup is in the middle of skipping; buttons wait. */
  readonly skipping: boolean;
};

/** A typed box read as a number for the live answer; anything unusable counts as blank. */
function num(text: string): number | null {
  const parsed = parseBusinessNumber(text);
  return parsed === "invalid" ? null : parsed;
}

const EXAMPLE_NOTE_CLASS = "mb-3 rounded-xl border border-dashed border-altair-border-strong bg-altair-paper-subtle px-3 py-2 text-[13px] leading-relaxed text-altair-ink-on-paper-secondary";

/** Finds the box (or list) a message is about, puts the cursor in it and brings it on screen. */
function focusField(form: HTMLElement | null, name: string | null) {
  if (!form || !name) return;
  const input = form.querySelector<HTMLInputElement | HTMLSelectElement>(`input[name="${name}"], select[name="${name}"]`);
  if (input) {
    input.focus({ preventScroll: true });
    input.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }
}

/* ============================================================ 1. your shop */

export type ShopStepValues = {
  readonly phone: string;
  readonly addressLine1: string;
  readonly city: string;
  readonly state: string;
  readonly postalCode: string;
  /** The saved sales tax as text, or "" when the company has never set one. */
  readonly defaultTaxRate: string;
  /** The time zone the company runs on now (already resolved). */
  readonly timeZone: string;
  /**
   * Whether anyone has chosen that zone. "unconfirmed": the list opens on
   * this browser's zone instead, and saving the step is the choice.
   * "unavailable" (migration 220 pending): the list is not shown and no
   * zone is sent.
   */
  readonly timeZoneChoice: CompanyTimeZoneChoice;
};

export function ShopStep({
  companyId,
  number,
  onSaved,
  onBack,
  onSkip,
  skipping,
  initial,
  onValuesSaved,
}: Omit<StepCommonProps, "numbers"> & { readonly initial: ShopStepValues; /** What was just saved, so coming back to this step shows it. */ readonly onValuesSaved: (values: ShopStepValues) => void }) {
  const [values, setValues] = useState(initial);
  const problemId = useId();
  const zoneId = useId();
  const body = useRef<HTMLDivElement>(null);
  const save = useStepSave(onSaved);
  const busy = save.isPending || skipping;

  // The time zone list. A company that has chosen sees its choice. One that
  // has not is offered the zone this browser is in (known only after the
  // page has loaded), until the owner picks something else.
  const browserZone = useBrowserTimeZone();
  const [zonePicked, setZonePicked] = useState(false);
  const asksZone = values.timeZoneChoice !== "unavailable";
  const offersBrowserZone = values.timeZoneChoice === "unconfirmed" && !zonePicked && browserZone !== null;
  const shownZone = offersBrowserZone ? browserZone : values.timeZone;
  const zoneOptions = useMemo(() => getCompanyTimezoneSelectOptions(shownZone), [shownZone]);

  function set(key: Exclude<keyof ShopStepValues, "timeZoneChoice">, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    save.clearProblem();
  }
  const errorFor = (key: string) => (save.problem?.field === key ? problemId : null);

  return (
    <StepFrame
      number={number}
      title="Your shop"
      lede="These go on the top of every estimate and invoice you send. Fill in what you have; you can add the rest later."
      primaryLabel="Save and continue"
      busy={busy}
      problem={save.problem}
      problemId={problemId}
      onBack={onBack}
      onSkip={onSkip}
      onSubmit={() =>
        save.run(async () => {
          const contact: ShopStepInput = { phone: values.phone, addressLine1: values.addressLine1, city: values.city, state: values.state, postalCode: values.postalCode, defaultTaxRate: values.defaultTaxRate };
          const result = await saveShopStepAction(asksZone ? { ...contact, timezone: shownZone } : contact, companyId);
          if (result.error) focusField(body.current, result.field ?? null);
          // What was on screen is now the company's chosen zone.
          else onValuesSaved(asksZone ? { ...values, timeZone: shownZone, timeZoneChoice: "chosen" } : values);
          return result;
        })
      }
    >
      <div ref={body} className="grid gap-3 sm:grid-cols-2">
        <NumberBox text name="phone" label="Shop phone" autoComplete="tel" value={values.phone} busy={busy} errorId={errorFor("phone")} onChange={(v) => set("phone", v)} hint="The number customers call." />
        <NumberBox name="defaultTaxRate" label="Sales tax" suffix="%" value={values.defaultTaxRate} busy={busy} errorId={errorFor("defaultTaxRate")} onChange={(v) => set("defaultTaxRate", v)} hint="Added to new estimates and invoices. Leave empty if you do not charge it." />
        <div className="sm:col-span-2">
          <NumberBox text name="addressLine1" label="Street address" autoComplete="address-line1" maxLength={200} value={values.addressLine1} busy={busy} errorId={errorFor("addressLine1")} onChange={(v) => set("addressLine1", v)} />
        </div>
        <NumberBox text name="city" label="City" autoComplete="address-level2" maxLength={100} value={values.city} busy={busy} errorId={errorFor("city")} onChange={(v) => set("city", v)} />
        <div className="grid grid-cols-2 gap-3">
          <NumberBox text name="state" label="State" autoComplete="address-level1" maxLength={100} value={values.state} busy={busy} errorId={errorFor("state")} onChange={(v) => set("state", v)} />
          <NumberBox text name="postalCode" label="ZIP code" autoComplete="postal-code" maxLength={30} value={values.postalCode} busy={busy} errorId={errorFor("postalCode")} onChange={(v) => set("postalCode", v)} />
        </div>
        {asksZone ? (
          <div className="min-w-0 sm:col-span-2">
            <label htmlFor={zoneId} className={fieldLabelClass}>
              Time zone
            </label>
            <select
              id={zoneId}
              name="timezone"
              value={shownZone}
              aria-invalid={errorFor("timezone") ? true : undefined}
              aria-describedby={[`${zoneId}-hint`, errorFor("timezone")].filter(Boolean).join(" ")}
              onChange={(event) => {
                // A save is running: the list keeps its value (and its focus) instead of going disabled.
                if (busy) return;
                setZonePicked(true);
                set("timeZone", event.target.value);
              }}
              className={`${fieldSelectClass} mt-1`}
            >
              {zoneOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p id={`${zoneId}-hint`} className="mt-1 text-xs leading-snug text-altair-ink-on-paper-muted">
              {offersBrowserZone
                ? "Taken from this computer. Change it if your shop is somewhere else. Your schedule, reminders and due dates all use it."
                : "Your schedule, reminders and due dates all use it."}
            </p>
          </div>
        ) : null}
      </div>
    </StepFrame>
  );
}

/* ====================================================== 2. your labor rate */

const RATE_INPUT_KEYS = ["technicianCount", "averageWage", "payrollBurdenPercent", "billedHoursPerWeek", "unbilledHoursPerWeek", "monthlyOverhead", "targetNetMarginPercent"] as const satisfies readonly BusinessNumberKey[];
type RateInputKey = (typeof RATE_INPUT_KEYS)[number];

/** The website calculator's example shop, as this step's boxes. */
const RATE_EXAMPLES: Record<RateInputKey, string> = {
  technicianCount: "1",
  averageWage: String(LABOR_RATE_DEFAULTS.hourlyWage),
  payrollBurdenPercent: String(LABOR_RATE_DEFAULTS.burdenRate * 100),
  billedHoursPerWeek: String(LABOR_RATE_DEFAULTS.billableHoursPerWeek),
  unbilledHoursPerWeek: String(LABOR_RATE_DEFAULTS.nonBillableHoursPerWeek),
  monthlyOverhead: String(LABOR_RATE_DEFAULTS.monthlyOverhead),
  targetNetMarginPercent: String(LABOR_RATE_DEFAULTS.targetNetMargin * 100),
};

/** Numbers brought over from the public calculators, offered on the first screen. */
export type RatePrefill = Partial<Record<RateInputKey | "laborRate", string>>;

export function RateStep({ companyId, number, numbers, onSaved, onBack, onSkip, skipping, prefill }: StepCommonProps & { readonly prefill: RatePrefill | null }) {
  const hasOwnCosts = RATE_INPUT_KEYS.some((key) => key !== "technicianCount" && numbers[key] !== null);
  const usingExamples = !hasOwnCosts && !prefill;
  const [inputs, setInputs] = useState<Record<RateInputKey, string>>(() => {
    const start = {} as Record<RateInputKey, string>;
    for (const key of RATE_INPUT_KEYS) {
      start[key] = prefill?.[key] ?? (numbers[key] !== null ? numberToFieldText(numbers[key]) : usingExamples || key === "technicianCount" ? RATE_EXAMPLES[key] : "");
    }
    return start;
  });
  const [mode, setMode] = useState<"work" | "know">(numbers.laborRate !== null && !hasOwnCosts && !prefill ? "know" : "work");
  // The rate box follows the suggestion until the owner types in it.
  const [rateText, setRateText] = useState(prefill?.laborRate ?? numberToFieldText(numbers.laborRate));
  const [rateTouched, setRateTouched] = useState(Boolean(prefill?.laborRate) || numbers.laborRate !== null);
  const [edited, setEdited] = useState(false);
  const problemId = useId();
  const body = useRef<HTMLDivElement>(null);
  const save = useStepSave(onSaved);
  const busy = save.isPending || skipping;

  const costNumbers = useMemo<BusinessNumbers>(() => {
    const built: BusinessNumbers = { ...EMPTY_BUSINESS_NUMBERS };
    if (mode === "work") for (const key of RATE_INPUT_KEYS) built[key] = num(inputs[key]);
    return built;
  }, [inputs, mode]);
  const suggested = usableSuggestedRate(deriveBusinessNumbers(costNumbers));
  const shownRate = mode === "work" && !rateTouched ? (suggested !== null ? String(suggested) : "") : rateText;
  const live = useMemo<BusinessNumbers>(() => ({ ...costNumbers, laborRate: num(shownRate) }), [costNumbers, shownRate]);
  const derived = useMemo(() => deriveBusinessNumbers(live), [live]);
  const rate = isStorableLaborRate(live.laborRate) && live.laborRate > 0 ? live.laborRate : null;

  function setInput(key: RateInputKey, value: string) {
    setInputs((current) => ({ ...current, [key]: value }));
    setEdited(true);
    save.clearProblem();
  }
  const errorFor = (key: string) => (save.problem?.field === key ? problemId : null);

  function box(key: RateInputKey, props: { hint?: string; prefix?: string; suffix?: string; label?: string }) {
    return (
      <NumberBox
        name={key}
        label={props.label ?? BUSINESS_NUMBER_FIELDS[key].label}
        hint={props.hint}
        prefix={props.prefix}
        suffix={props.suffix}
        whole={BUSINESS_NUMBER_FIELDS[key].decimals === 0}
        value={inputs[key]}
        busy={busy}
        errorId={errorFor(key)}
        onChange={(value) => setInput(key, value)}
      />
    );
  }

  return (
    <StepFrame
      number={number}
      title="What should you charge for an hour?"
      lede={mode === "work" ? "Seven numbers say what an hour of work really costs you, and what to charge to keep the profit you want." : "Type the hourly rate you charge. You can work out what an hour costs you later, in Settings."}
      primaryLabel={rate !== null ? `Use ${formatDollarsShort(rate)} an hour` : "Use this rate"}
      headline={rate !== null ? `${formatDollarsShort(rate)} an hour` : null}
      busy={busy}
      problem={save.problem}
      problemId={problemId}
      onBack={onBack}
      onSkip={onSkip}
      onSubmit={() =>
        save.run(async () => {
          const input: Record<string, string> = { laborRate: shownRate };
          // The boxes are sent only if they hold the owner's numbers. Examples
          // nobody touched stay examples: the rate the owner pressed the
          // button for is saved, the made-up wage and shop costs are not.
          if (mode === "work" && !(usingExamples && !edited)) for (const key of RATE_INPUT_KEYS) input[key] = inputs[key];
          const result = await saveRateStepAction(input, companyId);
          if (result.error) focusField(body.current, result.field ?? null);
          return result;
        })
      }
    >
      <div ref={body}>
        {mode === "work" ? (
          <>
            {usingExamples && !edited ? <p className={EXAMPLE_NOTE_CLASS}>These are example numbers for a one-truck shop. Replace them with yours. Left as they are, only the rate is saved.</p> : null}
            {prefill && !edited ? <p className={EXAMPLE_NOTE_CLASS}>These are the numbers you worked out on our calculators. Check them, then carry on.</p> : null}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {box("technicianCount", { hint: "Everyone who runs calls, you included if you do." })}
              {box("averageWage", { prefix: "$", suffix: "an hour", hint: "The average if they are paid differently." })}
              {box("payrollBurdenPercent", { suffix: "%", hint: "Payroll taxes, workers' comp, benefits. 20 to 30 is common." })}
              {box("billedHoursPerWeek", { suffix: "a week", hint: "Per technician: hours a customer pays for." })}
              {box("unbilledHoursPerWeek", { suffix: "a week", hint: "Per technician: driving, shop time, callbacks." })}
              {box("monthlyOverhead", { prefix: "$", suffix: "a month", hint: "Rent, trucks, insurance, software, office. Not wages or parts." })}
              {box("targetNetMarginPercent", { suffix: "%", hint: "The share of each billed dollar you mean to keep." })}
            </div>
            <div className="mt-3">
              <ReadingLine reading={readHourCost(derived)} />
            </div>
          </>
        ) : null}

        <div className={`grid gap-3 sm:grid-cols-2 ${mode === "work" ? "mt-4 border-t border-altair-border pt-4" : ""}`}>
          <NumberBox
            name="laborRate"
            label="The rate you will charge"
            prefix="$"
            suffix="an hour"
            value={shownRate}
            busy={busy}
            errorId={errorFor("laborRate")}
            hint={mode === "work" ? "Starts at the rate that keeps your profit. Change it if you charge something else." : "Billed labor, per hour."}
            onChange={(value) => {
              setRateText(value);
              setRateTouched(true);
              save.clearProblem();
            }}
          />
        </div>
        {mode === "work" ? (
          <div className="mt-3">
            <ReadingLine reading={readLaborRate(live, derived)}>
              {rateTouched && suggested !== null && live.laborRate !== suggested ? (
                <button type="button" disabled={busy} onClick={() => setRateTouched(false)} className={buttonClassName("secondary", "sm", "shrink-0")}>
                  Use {formatDollarsShort(suggested)}
                </button>
              ) : null}
            </ReadingLine>
          </div>
        ) : null}

        <p className="mt-3 text-[13px] text-altair-ink-on-paper-secondary">
          Where this goes: a Labor item in your price book, so labor at your rate is one pick away on every estimate and invoice (the hours are the quantity), and every price on your price list. The Labor item starts as not taxed. Whether labor is taxed differs by state; if yours taxes it, tick Taxable on that item in your price book.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setMode(mode === "work" ? "know" : "work");
            setRateTouched(mode === "work" ? true : rateTouched);
            if (mode === "work") setRateText(shownRate);
            save.clearProblem();
          }}
          className="mt-2 min-h-11 text-left text-sm font-semibold text-[var(--brand-metal-text)] underline-offset-2 hover:underline sm:min-h-0"
        >
          {mode === "work" ? "I already know my rate. Let me just type it." : "Help me work out what to charge."}
        </button>
      </div>
    </StepFrame>
  );
}

/* ================================================ 3. your service call fee */

export function ServiceCallStep({ companyId, number, numbers, onSaved, onBack, onSkip, skipping }: StepCommonProps) {
  const startsSuggested = numbers.serviceCallFee === null && numbers.laborRate !== null;
  const [feeText, setFeeText] = useState(numbers.serviceCallFee !== null ? numberToFieldText(numbers.serviceCallFee) : numbers.laborRate !== null ? String(Math.ceil(numbers.laborRate)) : "");
  const [credited, setCredited] = useState(numbers.serviceCallCredited);
  const [edited, setEdited] = useState(false);
  const problemId = useId();
  const body = useRef<HTMLDivElement>(null);
  const save = useStepSave(onSaved);
  const busy = save.isPending || skipping;

  const live = useMemo<BusinessNumbers>(() => ({ ...numbers, serviceCallFee: num(feeText), serviceCallCredited: credited }), [numbers, feeText, credited]);
  const derived = useMemo(() => deriveBusinessNumbers(live), [live]);
  const reading = readServiceCall(live, derived);
  const fee = live.serviceCallFee !== null && live.serviceCallFee > 0 ? live.serviceCallFee : null;

  return (
    <StepFrame
      number={number}
      title="What do you charge to come out?"
      lede="Your service call fee: what a customer pays for the visit and the diagnosis, whether or not they go ahead with the repair."
      primaryLabel={fee !== null ? `Use ${formatDollarsShort(fee)}` : "Use this fee"}
      headline={fee !== null ? `${formatDollarsShort(fee)} service call` : null}
      busy={busy}
      problem={save.problem}
      problemId={problemId}
      onBack={onBack}
      onSkip={onSkip}
      onSubmit={() =>
        save.run(async () => {
          const result = await saveServiceCallStepAction({ serviceCallFee: feeText, serviceCallCredited: credited }, companyId);
          if (result.error) focusField(body.current, result.field ?? null);
          return result;
        })
      }
    >
      <div ref={body}>
        {startsSuggested && !edited ? <p className={EXAMPLE_NOTE_CLASS}>This starts at one hour at your labor rate. Change it to what you charge.</p> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberBox
            name="serviceCallFee"
            label="Service call fee"
            prefix="$"
            value={feeText}
            busy={busy}
            errorId={save.problem?.field === "serviceCallFee" ? problemId : null}
            onChange={(value) => {
              setFeeText(value);
              setEdited(true);
              save.clearProblem();
            }}
          />
        </div>
        <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-altair-ink-on-paper sm:min-h-0">
          <input
            type="checkbox"
            checked={credited}
            onChange={(event) => {
              if (!busy) setCredited(event.target.checked);
            }}
            className="h-4 w-4 shrink-0 rounded border-altair-border-strong accent-[#77591b]"
          />
          The fee comes off the bill when the customer goes ahead with the repair.
        </label>
        {reading ? (
          <div className="mt-3">
            <ReadingLine reading={reading} />
          </div>
        ) : null}
        <p className="mt-3 text-[13px] text-altair-ink-on-paper-secondary">Where this goes: a &quot;Service call&quot; item in your price book, one pick away on every estimate. It starts as not taxed; tick Taxable on it in your price book if your state taxes service calls.</p>
      </div>
    </StepFrame>
  );
}

/* ====================================================== 4. your price list */

type PriceRow = {
  readonly id: string;
  /** A starter key, the key of a job the owner added before, or null for one being added now. */
  readonly key: string | null;
  name: string;
  hours: string;
  part: string;
  checked: boolean;
  /** The price book item this row already is, when there is one. */
  readonly existing: SetupPriceBookItem | null;
};

/** An item the setup should leave alone unless the owner ticks it: they re-priced or archived it themselves. */
function isOwnersNow(item: SetupPriceBookItem): boolean {
  return item.handPriced || !item.active;
}

export function PriceListStep({
  companyId,
  number,
  numbers,
  onSaved,
  onBack,
  onSkip,
  skipping,
  starterTasks,
  existingItems,
  keptBefore,
  onGoToRate,
  onKept,
}: StepCommonProps & {
  readonly starterTasks: readonly StarterTask[];
  /** The price book items the setup made on earlier visits, as they stand now. */
  readonly existingItems: readonly SetupPriceBookItem[];
  /**
   * True when this step has been finished before. A starter job that is not
   * in the price book was then left out on purpose, so it opens unticked
   * instead of being offered as "common" all over again.
   */
  readonly keptBefore: boolean;
  readonly onGoToRate: () => void;
  /** The setup's price book items after the save. */
  readonly onKept: (items: readonly SetupPriceBookItem[]) => void;
}) {
  const [rows, setRows] = useState<PriceRow[]>(() => {
    const fromStarter: PriceRow[] = starterTasks.map((task) => {
      const existing = existingItems.find((item) => item.key === task.key) ?? null;
      return {
        id: task.key,
        key: task.key,
        name: existing?.name ?? task.name,
        hours: numberToFieldText(existing?.bookHours ?? task.bookHours),
        part: numberToFieldText(existing ? existing.partCost ?? 0 : task.partCost),
        // In the price book as the setup left it: ticked. Re-priced or
        // archived by the owner since: unticked, and left alone unless they
        // tick it. Never added: ticked only on the first visit.
        checked: existing ? !isOwnersNow(existing) : keptBefore ? false : task.common,
        existing,
      };
    });
    const ownJobs: PriceRow[] = existingItems
      .filter((item) => CUSTOM_SETUP_KEY_PATTERN.test(item.key))
      .map((item) => ({ id: item.key, key: item.key, name: item.name, hours: numberToFieldText(item.bookHours ?? 0), part: numberToFieldText(item.partCost ?? 0), checked: !isOwnersNow(item), existing: item }));
    return [...fromStarter, ...ownJobs];
  });
  const [markupText, setMarkupText] = useState(numberToFieldText(numbers.partsMarkupPercent ?? STARTER_MARKUP_PERCENT));
  const [nextCustom, setNextCustom] = useState(1);
  const problemId = useId();
  const body = useRef<HTMLDivElement>(null);
  const save = useStepSave(onSaved);
  const busy = save.isPending || skipping;

  const rate = numbers.laborRate;
  const multiplier = numbers.afterHoursMultiplier ?? STARTER_AFTER_HOURS_MULTIPLIER;
  const markup = num(markupText);
  const kept = rows.filter((row) => row.checked);
  // Unticking a job the setup put in the price book takes it out (archived).
  // One the owner has since made their own is unticked to begin with, and stays where it is.
  const removeKeys = rows.filter((row) => !row.checked && row.existing !== null && !isOwnersNow(row.existing) && row.key !== SERVICE_CALL_SETUP_KEY).map((row) => row.key as string);
  // The action reports a problem by its position among the kept rows.
  const badRowId = save.problem?.row !== null && save.problem?.row !== undefined ? kept[save.problem.row]?.id ?? null : null;

  function edit(id: string, patch: Partial<PriceRow>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
    save.clearProblem();
  }

  /** The price as it will be saved: the same rounding of hours and part cost the save uses. */
  function priceOf(row: PriceRow): { standard: string; afterHours: string } {
    const hours = num(row.hours);
    const part = num(row.part) ?? 0;
    if (!rate || hours === null || markup === null || (hours === 0 && part === 0)) return { standard: "", afterHours: "" };
    const line = priceStarterLine({ bookHours: roundPriceListNumber(hours), partCost: roundPriceListNumber(part) }, rate, roundPriceListNumber(markup), multiplier);
    return { standard: formatDollarsShort(line.standard), afterHours: formatDollarsShort(line.afterHours) };
  }

  /** Enter in a row's box must not send the whole list. */
  function keepEnter(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") event.preventDefault();
  }

  if (!rate) {
    return (
      <StepFrame
        number={number}
        title="Your price list"
        lede="Common jobs, priced at your labor rate. What you keep becomes your price book."
        primaryLabel="Set my labor rate"
        busy={busy}
        problem={save.problem}
        problemId={problemId}
        onBack={onBack}
        onSkip={onSkip}
        onSubmit={onGoToRate}
      >
        <p className="text-sm leading-relaxed text-altair-ink-on-paper">This list is priced from your labor rate, and you have not set one yet. Set it in step 2 and the prices fill in here.</p>
      </StepFrame>
    );
  }

  const inputClass = `${fieldControlClass} px-2.5`;
  const changes = kept.length + removeKeys.length;

  return (
    <StepFrame
      number={number}
      title="Your price list"
      lede={`Common jobs, priced at your ${formatDollarsShort(rate)} an hour. Untick what you do not do, fix any time or part cost, and add your own. What you keep becomes your price book.`}
      primaryLabel={kept.length > 0 ? `Keep ${kept.length === 1 ? "this job" : `these ${formatCount(kept.length)} jobs`}` : changes > 0 ? "Save these changes" : "Keep these jobs"}
      headline={`${formatCount(kept.length)} ${kept.length === 1 ? "job" : "jobs"} at ${formatDollarsShort(rate)} an hour`}
      busy={busy}
      problem={save.problem}
      problemId={problemId}
      onBack={onBack}
      onSkip={onSkip}
      onSubmit={() =>
        save.run(async () => {
          const result = await savePriceListStepAction(
            { markupPercent: markupText, tasks: kept.map((row) => ({ key: row.key, name: row.name, bookHours: row.hours, partCost: row.part })), removeKeys },
            companyId,
          );
          if (result.error) focusField(body.current, result.field ?? null);
          else if (result.items) onKept(result.items);
          return result;
        })
      }
    >
      <div ref={body} className="grid gap-3 sm:grid-cols-[minmax(0,14rem)_1fr] sm:items-end">
        <NumberBox
          name="markupPercent"
          label="Parts markup"
          suffix="%"
          value={markupText}
          busy={busy}
          errorId={save.problem?.field === "markupPercent" ? problemId : null}
          hint="Added on top of each part's cost. 100 sells a $20 part for $40."
          onChange={(value) => {
            setMarkupText(value);
            save.clearProblem();
          }}
        />
        <p className="text-xs leading-snug text-altair-ink-on-paper-muted sm:pb-6">
          Price = hours × {formatDollarsShort(rate)} + part cost with markup, rounded up to a whole dollar. After hours is {multiplier} times the labor.
        </p>
      </div>

      <div className="mt-4 hidden grid-cols-[2rem_minmax(0,1fr)_5rem_6rem_5.5rem_5.5rem_2rem] gap-2 border-b border-altair-border pb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-altair-ink-on-paper-muted sm:grid">
        <span />
        <span>Job</span>
        <span>Hours</span>
        <span>Part cost</span>
        <span className="text-right">Your price</span>
        <span className="text-right">After hours</span>
        <span />
      </div>

      <ul className="divide-y divide-altair-border">
        {rows.map((row, index) => {
          const price = priceOf(row);
          const bad = badRowId === row.id;
          const spoken = row.name || `job ${index + 1}`;
          const note =
            row.existing === null
              ? null
              : row.existing.handPriced
                ? `In your price book at ${formatDollarsShort(row.existing.unitPrice)}, your own price. ${row.checked ? "Saving puts it back on the price from your rate." : "Left as it is unless you tick it."}`
                : !row.existing.active
                  ? row.checked
                    ? "Archived in your price book. Saving brings it back."
                    : "Archived in your price book. Left there unless you tick it."
                  : !row.checked
                    ? "In your price book now. Saving takes it out (archived, not deleted)."
                    : null;
          return (
            <li
              key={row.id}
              data-row={row.id}
              className={`grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-2 gap-y-2 py-3 sm:grid-cols-[2rem_minmax(0,1fr)_5rem_6rem_5.5rem_5.5rem_2rem] sm:items-center sm:py-2 ${bad ? "rounded-lg bg-[rgba(254,242,242,0.92)] px-1" : ""}`}
            >
              {/* The label is the touch target: 44 px square on a phone. */}
              <label className="flex h-11 w-11 cursor-pointer items-center justify-center sm:h-auto sm:w-auto sm:justify-start">
                <input
                  type="checkbox"
                  checked={row.checked}
                  aria-label={`Keep ${spoken}`}
                  onChange={(event) => {
                    if (!busy) edit(row.id, { checked: event.target.checked });
                  }}
                  className="h-5 w-5 rounded border-altair-border-strong accent-[#77591b]"
                />
              </label>
              <div className={`min-w-0 ${row.checked ? "" : "opacity-60"}`}>
                <input
                  type="text"
                  value={row.name}
                  maxLength={80}
                  readOnly={busy}
                  aria-label={`Job ${index + 1} name`}
                  aria-invalid={bad ? true : undefined}
                  aria-describedby={bad ? problemId : undefined}
                  placeholder="Name of the job"
                  onKeyDown={keepEnter}
                  onChange={(event) => edit(row.id, { name: event.target.value })}
                  className={inputClass}
                />
                {note ? <p className="mt-1 text-xs leading-snug text-altair-ink-on-paper-muted">{note}</p> : null}
              </div>
              {/* On a phone the hours and part cost sit side by side under the
               * name, and the two prices share a line, so a job is a third of
               * a screen instead of most of one. From the tablet width up the
               * wrappers vanish (display: contents) and every piece takes its
               * column in the table. */}
              <div className={`col-start-2 grid grid-cols-2 gap-2 sm:contents ${row.checked ? "" : "opacity-60"}`}>
                <label className="block text-xs text-altair-ink-on-paper-muted sm:contents">
                  <span className="mb-1 block sm:hidden">Hours</span>
                  <input type="text" inputMode="decimal" value={row.hours} maxLength={8} readOnly={busy} aria-label={`${spoken} hours`} onKeyDown={keepEnter} onChange={(event) => edit(row.id, { hours: event.target.value })} className={inputClass} />
                </label>
                <label className="block text-xs text-altair-ink-on-paper-muted sm:contents">
                  <span className="mb-1 block sm:hidden">Part cost $</span>
                  <input type="text" inputMode="decimal" value={row.part} maxLength={10} readOnly={busy} aria-label={`${spoken} part cost`} onKeyDown={keepEnter} onChange={(event) => edit(row.id, { part: event.target.value })} className={inputClass} />
                </label>
              </div>
              <div className={`col-start-2 flex items-baseline justify-between gap-3 text-sm sm:contents ${row.checked ? "" : "opacity-60"}`}>
                <p className="sm:text-right">
                  <span className="text-xs text-altair-ink-on-paper-muted sm:hidden">Your price </span>
                  <span className="font-bold tabular-nums text-altair-ink-on-paper">{price.standard || "–"}</span>
                </p>
                <p className="sm:text-right">
                  <span className="text-xs text-altair-ink-on-paper-muted sm:hidden">After hours </span>
                  <span className="tabular-nums text-altair-ink-on-paper-secondary">{price.afterHours || "–"}</span>
                </p>
              </div>
              <span className={`col-start-2 sm:col-start-auto ${row.key === null ? "" : "max-sm:hidden"}`}>
                {row.key === null ? (
                  <button type="button" disabled={busy} aria-label={`Remove ${spoken}`} onClick={() => setRows((current) => current.filter((other) => other.id !== row.id))} className="flex h-11 w-11 items-center justify-center rounded-lg text-altair-ink-on-paper-muted hover:bg-altair-paper-subtle sm:h-8 sm:w-8">
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                  </button>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy || rows.length >= STARTER_MAX_TASKS}
          onClick={() => {
            setRows((current) => [...current, { id: `new-${nextCustom}`, key: null, name: "", hours: "1", part: "", checked: true, existing: null }]);
            setNextCustom((value) => value + 1);
          }}
          className={buttonClassName("secondary", "sm")}
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Add a job
        </button>
        <p className="text-xs text-altair-ink-on-paper-muted">The hours and part costs are starting points. Yours will differ.</p>
      </div>
    </StepFrame>
  );
}

/* =================================================== 5. your monthly target */

const TARGET_KEYS = ["monthlyOverhead", "averageJobRevenue", "jobVariableCostPercent"] as const satisfies readonly BusinessNumberKey[];
type TargetKey = (typeof TARGET_KEYS)[number];

export function TargetStep({ companyId, number, numbers, onSaved, onBack, onSkip, skipping }: StepCommonProps) {
  // Two of these are the owner's to say: what an average job brings in and
  // what it uses up. They open empty with a greyed example, never with an
  // example value that pressing the button would save as the company's own.
  const [inputs, setInputs] = useState<Record<TargetKey, string>>({
    monthlyOverhead: numberToFieldText(numbers.monthlyOverhead),
    averageJobRevenue: numberToFieldText(numbers.averageJobRevenue),
    jobVariableCostPercent: numberToFieldText(numbers.jobVariableCostPercent),
  });
  const problemId = useId();
  const body = useRef<HTMLDivElement>(null);
  const save = useStepSave(onSaved);
  const busy = save.isPending || skipping;

  const live = useMemo<BusinessNumbers>(() => {
    const built: BusinessNumbers = { ...numbers };
    for (const key of TARGET_KEYS) built[key] = num(inputs[key]);
    return built;
  }, [numbers, inputs]);
  const derived = useMemo(() => deriveBusinessNumbers(live), [live]);
  const jobs = derived.breakEvenJobs;

  function box(key: TargetKey, props: { hint?: string; prefix?: string; suffix?: string; placeholder?: string }) {
    return (
      <NumberBox
        name={key}
        label={BUSINESS_NUMBER_FIELDS[key].label}
        hint={props.hint}
        prefix={props.prefix}
        suffix={props.suffix}
        placeholder={props.placeholder}
        value={inputs[key]}
        busy={busy}
        errorId={save.problem?.field === key ? problemId : null}
        onChange={(value) => {
          setInputs((current) => ({ ...current, [key]: value }));
          save.clearProblem();
        }}
      />
    );
  }

  return (
    <StepFrame
      number={number}
      title="How many jobs cover the month?"
      lede="Your shop costs the same every month whether the phone rings or not. This is the number of jobs that pays for it. Everything after that is profit."
      primaryLabel={jobs !== null && jobs > 0 ? `Set my target at ${formatCount(jobs)} ${jobs === 1 ? "job" : "jobs"}` : "Save my target"}
      headline={jobs !== null && jobs > 0 ? `${formatCount(jobs)} ${jobs === 1 ? "job" : "jobs"} a month` : null}
      busy={busy}
      problem={save.problem}
      problemId={problemId}
      onBack={onBack}
      onSkip={onSkip}
      onSubmit={() =>
        save.run(async () => {
          const result = await saveTargetStepAction(inputs, companyId);
          if (result.error) focusField(body.current, result.field ?? null);
          return result;
        })
      }
    >
      <div ref={body}>
        <div className="grid gap-3 sm:grid-cols-3">
          {box("monthlyOverhead", { prefix: "$", suffix: "a month", hint: "Rent, trucks, insurance, software, office.", placeholder: String(LABOR_RATE_DEFAULTS.monthlyOverhead) })}
          {box("averageJobRevenue", { prefix: "$", hint: "What a typical job brings in, before tax.", placeholder: String(BREAK_EVEN_DEFAULTS.averageJobRevenue) })}
          {box("jobVariableCostPercent", { suffix: "%", hint: "The share of that price its own parts and labor use up. 35 to 45 is common.", placeholder: String(BREAK_EVEN_DEFAULTS.variableCostRate * 100) })}
        </div>
        <div className="mt-3">
          <ReadingLine reading={readMonthlyTarget(live, derived)} />
        </div>
        <p className="mt-3 text-[13px] text-altair-ink-on-paper-secondary">Where this goes: your dashboard, which counts each month&apos;s finished jobs against it. It needs all three boxes.</p>
      </div>
    </StepFrame>
  );
}
