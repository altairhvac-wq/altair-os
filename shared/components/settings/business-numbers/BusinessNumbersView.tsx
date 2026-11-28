"use client";

import Link from "next/link";
import { useId, useMemo, useRef, useState, useTransition } from "react";
import { updateBusinessNumbersAction } from "@/app/actions/business-numbers";
import { NumberBox, ReadingLine } from "@/shared/components/business-numbers/fields";
import { SettingsAlertBanner } from "@/shared/components/settings/SettingsAlertBanner";
import { SettingsWorkspacePage, SettingsWorkspaceSection } from "@/shared/components/settings/SettingsWorkspacePage";
import { buttonClassName } from "@/shared/design-system/components/button-styles";
import { deriveBusinessNumbers } from "@/shared/lib/business-numbers/derive";
import { formatDollarsShort, numberToFieldText } from "@/shared/lib/business-numbers/format";
import {
  readAfterHours,
  readHourCost,
  readLaborRate,
  readMonthlyTarget,
  readServiceCall,
  usableSuggestedRate,
} from "@/shared/lib/business-numbers/readings";
import {
  BUSINESS_NUMBER_FIELDS,
  BUSINESS_NUMBER_KEYS,
  EMPTY_BUSINESS_NUMBERS,
  parseBusinessNumber,
  type BusinessNumberKey,
  type BusinessNumbers,
  type BusinessNumbersInput,
} from "@/shared/types/business-numbers";

/**
 * Settings > Business numbers: the one place a company's pricing numbers
 * live. Three groups (what you charge, what an hour costs you, the monthly
 * target), each with a plain reading of what the numbers mean that updates
 * as the owner types. Nothing is saved until "Save numbers" is pressed.
 *
 * ============ A SAVE NEVER LOSES WHAT WAS TYPED ============
 * Whatever goes wrong (a refused number, a dropped connection, a server
 * error) the boxes keep their text and a message says what happened, both at
 * the end of the form and in the save bar pinned to the bottom of a phone,
 * since that bar exists precisely because the end of the form is off screen.
 */

type FieldText = Record<BusinessNumberKey, string>;

type BusinessNumbersViewProps = {
  /** The company this page was opened for; the save is refused if the signed-in company has changed since. */
  readonly companyId: string;
  readonly initialNumbers: BusinessNumbers;
  readonly loadError?: string | null;
  /** True when the guided setup can run here; the page then links to it. */
  readonly guidedSetup?: boolean;
};

const SAVE_FAILED_MESSAGE = "The numbers could not be saved. Check your connection and try again. Nothing you typed was lost.";

function toFieldText(numbers: BusinessNumbers): FieldText {
  const text = {} as FieldText;
  for (const key of BUSINESS_NUMBER_KEYS) text[key] = numberToFieldText(numbers[key]);
  return text;
}

/** The numbers as typed so far. A box that does not hold a usable number counts as blank. */
function toNumbers(text: FieldText, credited: boolean): BusinessNumbers {
  const numbers: BusinessNumbers = { ...EMPTY_BUSINESS_NUMBERS, serviceCallCredited: credited };
  for (const key of BUSINESS_NUMBER_KEYS) {
    const parsed = parseBusinessNumber(text[key]);
    numbers[key] = parsed === "invalid" ? null : parsed;
  }
  return numbers;
}

/** Two boxes hold the same number when they read the same, however it was typed ("121.00" and "121"). */
function sameNumber(typed: string, saved: string): boolean {
  if (typed.trim() === saved) return true;
  const a = parseBusinessNumber(typed);
  const b = parseBusinessNumber(saved);
  return a !== "invalid" && b !== "invalid" && a === b;
}

export function BusinessNumbersView({ companyId, initialNumbers, loadError, guidedSetup = false }: BusinessNumbersViewProps) {
  const [saved, setSaved] = useState<BusinessNumbers>(initialNumbers);
  const [text, setText] = useState<FieldText>(() => toFieldText(initialNumbers));
  const [credited, setCredited] = useState(initialNumbers.serviceCallCredited);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error" | "warning"; message: string } | null>(null);
  const [badField, setBadField] = useState<BusinessNumberKey | null>(null);
  const [isPending, startTransition] = useTransition();
  const formId = useId();
  const feedbackId = useId();
  const formRef = useRef<HTMLFormElement>(null);

  const numbers = useMemo(() => toNumbers(text, credited), [text, credited]);
  const derived = useMemo(() => deriveBusinessNumbers(numbers), [numbers]);

  const savedText = useMemo(() => toFieldText(saved), [saved]);
  const changedKeys = BUSINESS_NUMBER_KEYS.filter((key) => !sameNumber(text[key], savedText[key]));
  const dirty = changedKeys.length > 0 || credited !== saved.serviceCallCredited;

  function change(field: BusinessNumberKey, value: string) {
    setText((current) => ({ ...current, [field]: value }));
    setFeedback(null);
    if (badField === field) setBadField(null);
  }

  function box(field: BusinessNumberKey, props: { label?: string; hint?: string; prefix?: string; suffix?: string } = {}) {
    return (
      <NumberBox
        name={field}
        label={props.label ?? BUSINESS_NUMBER_FIELDS[field].label}
        hint={props.hint}
        prefix={props.prefix}
        suffix={props.suffix}
        value={text[field]}
        whole={BUSINESS_NUMBER_FIELDS[field].decimals === 0}
        errorId={badField === field ? feedbackId : null}
        busy={isPending}
        onChange={(value) => change(field, value)}
      />
    );
  }

  /** Puts the cursor in the box a message is about, and brings it on screen. */
  function showField(field: BusinessNumberKey) {
    const input = formRef.current?.elements.namedItem(field);
    if (input instanceof HTMLInputElement) {
      input.focus({ preventScroll: true });
      input.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    }
  }

  function save(event: React.FormEvent) {
    event.preventDefault();
    if (!dirty || isPending) return;
    const input: BusinessNumbersInput = {};
    for (const key of changedKeys) input[key] = text[key];
    if (credited !== saved.serviceCallCredited) input.serviceCallCredited = credited;

    startTransition(async () => {
      let result: Awaited<ReturnType<typeof updateBusinessNumbersAction>>;
      try {
        result = await updateBusinessNumbersAction(input, companyId);
      } catch {
        // The request itself failed (no signal, a deploy mid-save). Keep
        // everything typed and say so; do not fall through to the error page.
        setFeedback({ tone: "error", message: SAVE_FAILED_MESSAGE });
        return;
      }
      if (result.error || !result.numbers) {
        setFeedback({ tone: "error", message: result.error ?? SAVE_FAILED_MESSAGE });
        setBadField(result.field ?? null);
        if (result.field) showField(result.field);
        return;
      }
      setSaved(result.numbers);
      setText(toFieldText(result.numbers));
      setCredited(result.numbers.serviceCallCredited);
      setBadField(null);
      setFeedback(result.notice ? { tone: "warning", message: result.notice } : { tone: "success", message: "Saved." });
    });
  }

  function undo() {
    setText(toFieldText(saved));
    setCredited(saved.serviceCallCredited);
    setBadField(null);
    setFeedback(null);
  }

  const rateReading = readLaborRate(numbers, derived);
  const afterHoursReading = readAfterHours(derived);
  const serviceCallReading = readServiceCall(numbers, derived);
  const suggested = usableSuggestedRate(derived);
  const offerSuggested = suggested !== null && numbers.laborRate !== suggested && derived.rateStanding !== "on-target";

  return (
    <SettingsWorkspacePage
      title="Business numbers"
      description="What you charge, what an hour of work costs you, and your monthly target, kept in one place. Change any of them here at any time."
    >
      {loadError ? <SettingsAlertBanner tone="error">{loadError}</SettingsAlertBanner> : null}

      {guidedSetup ? (
        <p className="text-sm text-altair-ink-on-paper-secondary">
          Rather be walked through it?{" "}
          <Link href="/get-started" className="font-semibold text-[var(--brand-metal-text)] underline underline-offset-2">
            Open the guided setup
          </Link>
          . It works these numbers out with you and builds a priced price book.
        </p>
      ) : null}

      <form id={formId} ref={formRef} onSubmit={save} noValidate className="flex flex-col gap-4">
        <SettingsWorkspaceSection id="charge" title="What you charge" description="Your prices. Leave a box empty if you have not decided yet.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {box("laborRate", { prefix: "$", suffix: "an hour", hint: "Billed labor, per hour." })}
            {box("afterHoursMultiplier", { label: "After hours", suffix: "times", hint: "Evenings, weekends, holidays. 1.5 is time and a half." })}
            {box("serviceCallFee", { prefix: "$", hint: "The fee for coming out." })}
            {box("partsMarkupPercent", { suffix: "%", hint: "Added on top of what a part cost you. 50 sells a $10 part for $15." })}
          </div>
          <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-altair-ink-on-paper sm:min-h-0">
            <input
              type="checkbox"
              checked={credited}
              onChange={(event) => {
                if (isPending) return;
                setCredited(event.target.checked);
                setFeedback(null);
              }}
              className="h-4 w-4 shrink-0 rounded border-altair-border-strong accent-[#77591b]"
            />
            The service call fee comes off the bill when the customer goes ahead with the repair.
          </label>
          <div className="mt-3 flex flex-col gap-2">
            <ReadingLine reading={rateReading}>
              {offerSuggested && suggested !== null ? (
                <button type="button" disabled={isPending} onClick={() => change("laborRate", String(suggested))} className={buttonClassName("secondary", "sm", "shrink-0")}>
                  Use {formatDollarsShort(suggested)}
                </button>
              ) : null}
            </ReadingLine>
            {afterHoursReading ? <ReadingLine reading={afterHoursReading} /> : null}
            {serviceCallReading ? <ReadingLine reading={serviceCallReading} /> : null}
          </div>
        </SettingsWorkspaceSection>

        <SettingsWorkspaceSection
          id="cost"
          title="What an hour costs you"
          description="Seven numbers that say what one billed hour really costs, so you can see what your rate leaves you. Only owners and admins can see this page."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {box("technicianCount", { hint: "Everyone who runs calls, you included if you do." })}
            {box("averageWage", { prefix: "$", suffix: "an hour", hint: "The average if they are paid differently." })}
            {box("payrollBurdenPercent", { suffix: "%", hint: "Payroll taxes, workers' comp and benefits. 20 to 30 is common." })}
            {box("billedHoursPerWeek", { suffix: "a week", hint: "Per technician: hours a customer pays for." })}
            {box("unbilledHoursPerWeek", { suffix: "a week", hint: "Per technician: driving, shop time, callbacks." })}
            {box("monthlyOverhead", { prefix: "$", suffix: "a month", hint: "Rent, trucks, insurance, software, office. Not wages or parts." })}
            {box("targetNetMarginPercent", { suffix: "%", hint: "The share of each billed dollar you mean to keep." })}
          </div>
          <div className="mt-3">
            <ReadingLine reading={readHourCost(derived)} />
          </div>
        </SettingsWorkspaceSection>

        <SettingsWorkspaceSection id="target" title="Your monthly target" description="How many jobs it takes to cover the shop before you make a dollar. It uses the shop costs above.">
          <div className="grid gap-3 sm:grid-cols-2">
            {box("averageJobRevenue", { prefix: "$", hint: "What a typical job brings in, before tax." })}
            {box("jobVariableCostPercent", { suffix: "%", hint: "The share of that price its own parts and labor use up. 35 to 45 is common." })}
          </div>
          <div className="mt-3">
            <ReadingLine reading={readMonthlyTarget(numbers, derived)} />
          </div>
        </SettingsWorkspaceSection>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button type="submit" disabled={!dirty || isPending} className={buttonClassName("primary", "md", "w-full sm:w-auto")}>
            {isPending ? "Saving…" : "Save numbers"}
          </button>
          {dirty && !isPending ? (
            <button type="button" onClick={undo} className={buttonClassName("secondary", "md", "w-full sm:w-auto")}>
              Undo changes
            </button>
          ) : null}
          <div aria-live="polite" className="min-w-0 flex-1">
            {feedback ? (
              <SettingsAlertBanner tone={feedback.tone}>
                <span id={feedbackId}>{feedback.message}</span>
              </SettingsAlertBanner>
            ) : dirty ? (
              <p className="text-sm text-altair-ink-on-paper-secondary">You have changes that are not saved yet.</p>
            ) : null}
          </div>
        </div>
      </form>

      {/* On a phone the page is several screens long and the save button is at
       * the end of it. While something is unsaved, a bar pinned above the tab
       * bar keeps Save in reach, and carries any message about a save that
       * did not go through. (.admin-sticky-footer sits on --bottom-nav-offset,
       * so it never covers the tabs.) */}
      {dirty ? (
        <>
          <div aria-hidden="true" className={`sm:hidden ${feedback?.tone === "error" ? "h-36" : "admin-sticky-footer-spacer"}`} />
          <div className="admin-sticky-footer sm:hidden">
            {feedback?.tone === "error" ? (
              <p role="alert" className="mb-2 text-[13px] leading-snug text-[#991B1B]">
                {feedback.message}
              </p>
            ) : null}
            <div className="flex gap-2">
              <button type="submit" form={formId} disabled={isPending} className={buttonClassName("primary", "md", "flex-1")}>
                {isPending ? "Saving…" : "Save numbers"}
              </button>
              <button type="button" onClick={undo} disabled={isPending} className={buttonClassName("secondary", "md", "shrink-0")}>
                Undo
              </button>
            </div>
          </div>
        </>
      ) : null}
    </SettingsWorkspacePage>
  );
}
