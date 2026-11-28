"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { NumberBox, ReadingLine } from "@/shared/components/business-numbers/fields";
import { SettingsAlertBanner } from "@/shared/components/settings/SettingsAlertBanner";
import { SettingsWorkspacePage, SettingsWorkspaceSection } from "@/shared/components/settings/SettingsWorkspacePage";
import { buttonClassName } from "@/shared/design-system/components/button-styles";
import { formatDollarsShort, numberToFieldText } from "@/shared/lib/business-numbers/format";
import {
  HIRE_PLAN_LABELS,
  PAY_PLAN_LABELS,
  TRUCK_PLAN_LABELS,
  answerHirePlan,
  answerPayPlan,
  answerTruckPlan,
  hirePlanStart,
  payPlanStart,
  truckPlanStart,
  type HirePlanKey,
  type PayPlanKey,
  type PlanAnswer,
  type TruckPlanKey,
} from "@/shared/lib/business-numbers/planning";
import { parseBusinessNumber, type BusinessNumbers } from "@/shared/types/business-numbers";

/**
 * Settings > Numbers > Plan with your numbers: three "what if" questions,
 * each started from the company's saved numbers.
 *
 * Nothing on this page is saved and nothing here changes the saved numbers;
 * it is a place to try an idea. The math is the public calculators' own
 * (shared/lib/business-numbers/planning.ts), so the answer here and on the
 * website agree. A box with no saved number behind it starts empty and shows
 * a greyed example, never a made-up figure that looks like the company's.
 */

type BoxSpec<K extends string> = {
  readonly key: K;
  readonly prefix?: string;
  readonly suffix?: string;
  readonly hint?: string;
  /** Said instead of the hint when the box started from a saved number. */
  readonly savedHint?: string;
  readonly placeholder?: string;
  readonly whole?: boolean;
};

const FROM_NUMBERS = "From your numbers.";

function PlanBoxes<K extends string>({
  name,
  boxes,
  labels,
  values,
  fromNumbers,
  touched,
  badField,
  errorId,
  onChange,
  columns,
}: {
  /** Prefix for the field names, so the three plans' boxes never share one. */
  readonly name: string;
  readonly boxes: readonly BoxSpec<K>[];
  readonly labels: Readonly<Record<K, string>>;
  readonly values: Readonly<Record<K, string>>;
  readonly fromNumbers: readonly K[];
  readonly touched: ReadonlySet<K>;
  readonly badField: K | null;
  readonly errorId: string;
  readonly onChange: (key: K, value: string) => void;
  readonly columns: string;
}) {
  return (
    <div className={`grid gap-3 ${columns}`}>
      {boxes.map((box) => {
        // "From your numbers" is true only until the owner types over it.
        const saved = fromNumbers.includes(box.key) && !touched.has(box.key);
        return (
          <NumberBox
            key={box.key}
            name={`${name}-${box.key}`}
            label={labels[box.key]}
            prefix={box.prefix}
            suffix={box.suffix}
            hint={saved ? (box.savedHint ?? FROM_NUMBERS) : box.hint}
            placeholder={box.placeholder}
            whole={box.whole}
            value={values[box.key]}
            errorId={badField === box.key ? errorId : null}
            onChange={(value) => onChange(box.key, value)}
          />
        );
      })}
    </div>
  );
}

function PlanResult<K extends string, R>({ answer, id, children }: { readonly answer: PlanAnswer<K, R>; readonly id: string; readonly children?: React.ReactNode }) {
  return (
    <div className="mt-3 flex flex-col gap-3">
      <div id={id} aria-live="polite" className="flex flex-col gap-2">
        <ReadingLine reading={answer.reading}>{children}</ReadingLine>
        {answer.cautions.map((caution) => (
          <ReadingLine key={caution} reading={{ tone: "warn", text: caution }} />
        ))}
      </div>
      {answer.lines.length > 0 ? (
        <dl className="divide-y divide-altair-border overflow-hidden rounded-xl border border-altair-border">
          {answer.lines.map((line) => (
            <div key={line.label} className="flex items-baseline justify-between gap-4 px-3 py-2">
              <dt className="min-w-0 text-[13px] text-altair-ink-on-paper-secondary">{line.label}</dt>
              <dd className="shrink-0 text-right tabular-nums">
                <span className={`block text-sm text-altair-ink-on-paper ${line.strong ? "font-bold" : "font-medium"}`}>{line.value}</span>
                {line.note ? <span className="block text-xs text-altair-ink-on-paper-muted">{line.note}</span> : null}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}

function PlanNote({ children }: { readonly children: React.ReactNode }) {
  return <p className="mt-3 text-xs leading-relaxed text-altair-ink-on-paper-muted">{children}</p>;
}

const TRUCK_BOXES: readonly BoxSpec<TruckPlanKey>[] = [
  { key: "paymentPerMonth", prefix: "$", suffix: "a month", placeholder: "e.g. 650", hint: "Loan or lease. Bought outright: the price divided by the months you will keep it." },
  { key: "insurancePerMonth", prefix: "$", suffix: "a month", placeholder: "e.g. 180", hint: "This truck's share of the policy." },
  { key: "fuelPerMonth", prefix: "$", suffix: "a month", placeholder: "e.g. 450" },
  { key: "maintenancePerMonth", prefix: "$", suffix: "a month", placeholder: "e.g. 150", hint: "Service, tires and repairs, averaged over a year." },
  { key: "otherPerYear", prefix: "$", suffix: "a year", placeholder: "e.g. 600", hint: "Registration, inspection, GPS, lettering." },
  { key: "workingDaysPerMonth", suffix: "days", placeholder: "e.g. 21", hint: "21 is a five-day week." },
  { key: "billedHoursPerDay", suffix: "hours", placeholder: "e.g. 6", hint: "Hours a day that end up on invoices.", savedHint: "A fifth of the billed hours a week in your numbers." },
  { key: "jobsPerDay", suffix: "jobs", placeholder: "e.g. 3" },
];

const HIRE_BOXES: readonly BoxSpec<HirePlanKey>[] = [
  { key: "hourlyWage", prefix: "$", suffix: "an hour", placeholder: "e.g. 28", hint: "What you would offer.", savedHint: "The average wage in your numbers. Change it to the offer." },
  { key: "burdenPercent", suffix: "%", placeholder: "e.g. 25", hint: "Payroll taxes, workers' comp and benefits." },
  { key: "paidHoursPerWeek", suffix: "a week", placeholder: "e.g. 40", hint: "Hours you pay them for. Past 40 is usually overtime.", savedHint: "Billed plus unbilled hours in your numbers." },
  { key: "truckPerMonth", prefix: "$", suffix: "a month", placeholder: "e.g. 1200", hint: "Their truck, fuel, insurance, tools and phone." },
  { key: "billableRate", prefix: "$", suffix: "an hour", placeholder: "e.g. 121", hint: "What one billed hour is quoted at.", savedHint: "Your labor rate." },
  { key: "billedHoursPerWeek", suffix: "a week", placeholder: "e.g. 28", hint: "Once they are busy.", savedHint: "From your numbers: what a technician bills now." },
  { key: "rampWeeks", suffix: "weeks", placeholder: "e.g. 8", whole: true, hint: "Until they bill that much. Leave empty if they bill a full week from the first one." },
];

const PAY_BOXES: readonly BoxSpec<PayPlanKey>[] = [
  { key: "hourlyWage", prefix: "$", suffix: "an hour", placeholder: "e.g. 30", hint: "What they are paid by the hour now.", savedHint: "The average wage in your numbers." },
  { key: "hoursOnClock", suffix: "hours", placeholder: "e.g. 45", hint: "In the week. Past 40 is paid at time and a half here.", savedHint: "Billed plus unbilled hours in your numbers. Past 40 is paid at time and a half here." },
  { key: "bookHours", suffix: "hours", placeholder: "e.g. 38", hint: "Flat-rate hours turned in the week.", savedHint: "Started at the billed hours a week in your numbers." },
  { key: "payPerBookHour", prefix: "$", suffix: "an hour", placeholder: "e.g. 34", hint: "What a flat-rate plan would pay per book hour." },
  { key: "revenueProduced", prefix: "$", suffix: "a week", placeholder: "e.g. 7500", hint: "What the technician's jobs brought in.", savedHint: "Billed hours times your rate: labor only. Add parts if commission is paid on them." },
  { key: "commissionPercent", suffix: "%", placeholder: "e.g. 12", hint: "The share of that revenue a commission plan would pay. Type 12 for 12%." },
];

export function PlanningView({ numbers, loadError = null }: { readonly numbers: BusinessNumbers; readonly loadError?: string | null }) {
  const starts = useMemo(() => ({ truck: truckPlanStart(numbers), hire: hirePlanStart(numbers), pay: payPlanStart(numbers) }), [numbers]);

  const [truck, setTruck] = useState(starts.truck.values);
  const [hire, setHire] = useState(starts.hire.values);
  const [pay, setPay] = useState(starts.pay.values);
  const [touched, setTouched] = useState<{ truck: ReadonlySet<TruckPlanKey>; hire: ReadonlySet<HirePlanKey>; pay: ReadonlySet<PayPlanKey> }>({
    truck: new Set(),
    hire: new Set(),
    pay: new Set(),
  });

  const truckAnswer = useMemo(() => answerTruckPlan(truck), [truck]);
  const hireAnswer = useMemo(() => answerHirePlan(hire), [hire]);
  const payAnswer = useMemo(() => answerPayPlan(pay), [pay]);

  const truckResultId = useId();
  const hireResultId = useId();
  const payResultId = useId();

  const anySaved = starts.truck.fromNumbers.length + starts.hire.fromNumbers.length + starts.pay.fromNumbers.length > 0;
  const changed = touched.truck.size + touched.hire.size + touched.pay.size > 0;

  // The truck's monthly cost, offered to the hiring plan while the two differ.
  // "1,480" and "1480.00" are the same amount, so amounts are compared, not text.
  const truckPerMonth = truckAnswer.result ? numberToFieldText(truckAnswer.result.perMonth) : null;
  const hireTruck = parseBusinessNumber(hire.truckPerMonth);
  const offerTruck = truckPerMonth !== null && !(typeof hireTruck === "number" && Math.abs(hireTruck - Number(truckPerMonth)) < 0.005);

  function startOver() {
    setTruck(starts.truck.values);
    setHire(starts.hire.values);
    setPay(starts.pay.values);
    setTouched({ truck: new Set(), hire: new Set(), pay: new Set() });
  }

  return (
    <SettingsWorkspacePage
      title="Plan with your numbers"
      description="Try an idea before you spend the money. Each plan starts from the numbers you have saved. Nothing you type here is saved, and nothing here changes them."
    >
      {loadError ? <SettingsAlertBanner tone="error">{loadError} The plans below start empty.</SettingsAlertBanner> : null}

      <p className="text-sm text-altair-ink-on-paper-secondary">
        <Link href="/settings/business-numbers" className="font-semibold text-[var(--brand-metal-text)] underline underline-offset-2">
          Back to your numbers
        </Link>
        {anySaved || loadError ? "." : ". They are not filled in yet, so these plans start empty. Fill them in and they start here."}
      </p>

      <SettingsWorkspaceSection id="truck" title="What does a truck cost me?" description="What one service truck costs a month, a working day, a billed hour and a job.">
        <PlanBoxes
          name="truck"
          boxes={TRUCK_BOXES}
          labels={TRUCK_PLAN_LABELS}
          values={truck}
          fromNumbers={starts.truck.fromNumbers}
          touched={touched.truck}
          badField={truckAnswer.badField}
          errorId={truckResultId}
          columns="sm:grid-cols-2 lg:grid-cols-4"
          onChange={(key, value) => {
            setTruck((current) => ({ ...current, [key]: value }));
            setTouched((current) => ({ ...current, truck: new Set(current.truck).add(key) }));
          }}
        />
        <PlanResult answer={truckAnswer} id={truckResultId} />
        <PlanNote>
          Count it once. If your trucks are already in the monthly shop costs in your numbers, this is not a cost on top of them: it shows how much of them one truck is.
        </PlanNote>
      </SettingsWorkspaceSection>

      <SettingsWorkspaceSection id="hire" title="Can I afford another technician?" description="How many hours a week a new technician has to bill before the hire pays for itself, and the cash the first weeks take.">
        <PlanBoxes
          name="hire"
          boxes={HIRE_BOXES}
          labels={HIRE_PLAN_LABELS}
          values={hire}
          fromNumbers={starts.hire.fromNumbers}
          touched={touched.hire}
          badField={hireAnswer.badField}
          errorId={hireResultId}
          columns="sm:grid-cols-2 lg:grid-cols-4"
          onChange={(key, value) => {
            setHire((current) => ({ ...current, [key]: value }));
            setTouched((current) => ({ ...current, hire: new Set(current.hire).add(key) }));
          }}
        />
        {offerTruck && truckPerMonth !== null && truckAnswer.result ? (
          <div className="mt-3 flex flex-col gap-2 rounded-xl border border-altair-border bg-altair-paper-subtle px-3 py-2.5 text-[13px] leading-relaxed text-altair-ink-on-paper-secondary sm:flex-row sm:items-center sm:justify-between">
            <p className="min-w-0">
              The truck you worked out above costs {formatDollarsShort(Math.round(truckAnswer.result.perMonth * 100) / 100)} a month. Using it replaces what is in the truck and tools box; add tools and a phone on top if you count them.
            </p>
            <button
              type="button"
              className={buttonClassName("secondary", "sm", "shrink-0")}
              onClick={() => {
                setHire((current) => ({ ...current, truckPerMonth }));
                setTouched((current) => ({ ...current, hire: new Set(current.hire).add("truckPerMonth") }));
              }}
            >
              Use it for this hire
            </button>
          </div>
        ) : null}
        <PlanResult answer={hireAnswer} id={hireResultId} />
        <PlanNote>
          This counts only what the hire adds: the wage, the payroll costs and the truck. Your shop costs are already being paid by the technicians you have. Profit on the parts their jobs use is left out, so the real result is usually a little better. Hiring costs (ads, training days, a set of tools up front) are not in it.
        </PlanNote>
      </SettingsWorkspaceSection>

      <SettingsWorkspaceSection id="pay" title="What would a different pay plan pay?" description="The same week of work paid three ways: by the hour, by the book hour and by commission.">
        <PlanBoxes
          name="pay"
          boxes={PAY_BOXES}
          labels={PAY_PLAN_LABELS}
          values={pay}
          fromNumbers={starts.pay.fromNumbers}
          touched={touched.pay}
          badField={payAnswer.badField}
          errorId={payResultId}
          columns="sm:grid-cols-2 lg:grid-cols-3"
          onChange={(key, value) => {
            setPay((current) => ({ ...current, [key]: value }));
            setTouched((current) => ({ ...current, pay: new Set(current.pay).add(key) }));
          }}
        />
        <PlanResult answer={payAnswer} id={payResultId} />
        <PlanNote>
          This compares gross pay for one week as typed. Hourly overtime here is the federal weekly rule, time and a half past 40 hours; some states also count daily overtime. It does not work out overtime on flat-rate or commission pay: most technicians are owed overtime however they are paid, and at least minimum wage for every hour worked, and how both are worked out depends on federal and state rules. Check with your payroll provider before you change a pay plan.
        </PlanNote>
      </SettingsWorkspaceSection>

      {changed ? (
        <div>
          <button type="button" onClick={startOver} className={buttonClassName("secondary", "md", "w-full sm:w-auto")}>
            Start over from your saved numbers
          </button>
        </div>
      ) : null}
    </SettingsWorkspacePage>
  );
}
