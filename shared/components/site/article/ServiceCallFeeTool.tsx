"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { Field, NumberInput, ToolButton } from "@/shared/components/resources/tools/ToolControls";
import { CARRY_SOURCE_NAMES, carryText, useCarried } from "@/shared/components/resources/calc/carry";
import { NoResult, ResultHero, money } from "@/shared/components/resources/calc/CalculatorTool";
import { CompactCalculator, CompactStat } from "@/shared/components/resources/calc/CompactCalculator";
import { num } from "@/shared/components/resources/calc/useCalculatorTool";
import { calculatorPath } from "@/shared/lib/resources/catalog";
import { LABOR_WORKSPACE_PATH } from "@/shared/lib/resources/tool-hub";
import { LABOR_RATE_DEFAULTS, calculateLaborRate } from "@/shared/lib/resources/labor-rate";
import { useArticleTool } from "@/shared/components/site/article/useArticleTool";

/**
 * The service call fee check built into /insights/how-to-price-an-hvac-service-call.
 *
 * It is the article's steps 3 and 4 as a tool: the fee at your billable rate
 * for the hours it covers, the cost floor at your cost per billed hour, and
 * where your current (or advertised) fee sits against both. It opens with
 * the article's own example, computed by the labor rate calculator's
 * function from its defaults ($121 rounded rate, $96.15 an hour, a $49 fee),
 * so the tool and the text cannot disagree. A rate built in the Labor Cost
 * Workspace or the quick calculator can be filled in with one press.
 */

const EXAMPLE_RATE = calculateLaborRate(LABOR_RATE_DEFAULTS)!;

type Values = { readonly rate: string; readonly cost: string; readonly hours: string; readonly fee: string };

const EXAMPLE: Values = {
  rate: String(EXAMPLE_RATE.billableHourlyRateRounded),
  cost: EXAMPLE_RATE.costPerBillableHour.toFixed(2),
  hours: "1",
  fee: "49",
};

export function ServiceCallFeeTool() {
  const tool = useArticleTool<Values>("service-call-fee", EXAMPLE);
  const carried = useCarried();
  const v = tool.values;
  const set = (key: keyof Values) => (value: string) => {
    tool.markInteracted();
    tool.setValues((current) => ({ ...current, [key]: value }));
  };

  const rate = num(v.rate);
  const cost = num(v.cost);
  const hours = num(v.hours);
  const fee = num(v.fee);
  const valid = rate > 0 && cost > 0 && hours > 0;
  const atRate = rate * hours;
  const floor = cost * hours;
  const hasFee = v.fee.trim() !== "" && fee >= 0;

  const verdict = !valid || !hasFee
    ? null
    : fee < floor
      ? { tone: "negative" as const, title: `${money(floor - fee)} short of cost`, text: `Every visit that ends without a repair loses ${money(floor - fee)}. A repair has to make that up before it earns anything.` }
      : fee < atRate
        ? { tone: "warning" as const, title: `Covers cost, ${money(atRate - fee)} under target`, text: "The visit pays for itself but earns less than your target margin." }
        : { tone: "positive" as const, title: "At or above your rate", text: "The fee covers the visit and your target margin." };

  const applied = carried ? v.rate === carryText(carried.billedRate) && v.cost === carryText(carried.costPerBilledHour) : false;

  return (
    <CompactCalculator
      name="Service Call Fee Check"
      text="Your rate and your cost per billed hour, the hours the fee covers, and the fee you charge or advertise now."
      tool={tool}
      onReset={() => {
        tool.markInteracted();
        tool.setValues(EXAMPLE);
        tool.toast.show("Article example loaded.");
      }}
      carry={
        carried ? (
          <div className="flex flex-col gap-3 bg-amber-50/70 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-[13px] text-stone-700">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#77591B]">
                Your numbers · {CARRY_SOURCE_NAMES[carried.source]}
              </span>
              Rate <span className="font-semibold tabular-nums text-stone-900">{money(carried.billedRate, 0)}</span> · cost per billed hour{" "}
              <span className="font-semibold tabular-nums text-stone-900">{money(carried.costPerBilledHour)}</span>
            </p>
            {applied ? (
              <span className="inline-flex min-h-11 items-center gap-1.5 text-[13px] font-semibold text-emerald-700">
                <Check aria-hidden="true" className="h-4 w-4" /> Using your numbers
              </span>
            ) : (
              <ToolButton
                variant="primary"
                onClick={() => {
                  tool.markInteracted();
                  tool.setValues((current) => ({ ...current, rate: carryText(carried.billedRate), cost: carryText(carried.costPerBilledHour) }));
                  tool.toast.show(`Filled in from your ${CARRY_SOURCE_NAMES[carried.source]}.`);
                }}
              >
                Use my rate
              </ToolButton>
            )}
          </div>
        ) : undefined
      }
      inputs={
        <>
          <Field label="Your billable rate" hint="What one billed hour is quoted at.">
            {({ id, hintId }) => <NumberInput id={id} describedBy={hintId} value={v.rate} onChange={set("rate")} prefix="$" suffix="/hr" invalid={rate <= 0} />}
          </Field>
          <Field label="Cost per billed hour" hint="Your break-even rate: wage, burden, unbilled time, overhead.">
            {({ id, hintId }) => <NumberInput id={id} describedBy={hintId} value={v.cost} onChange={set("cost")} prefix="$" suffix="/hr" invalid={cost <= 0} />}
          </Field>
          <Field label="Hours the fee covers" hint="E.g. the trip and the first hour of diagnosis.">
            {({ id, hintId }) => <NumberInput id={id} describedBy={hintId} value={v.hours} onChange={set("hours")} suffix="hrs" invalid={hours <= 0} />}
          </Field>
          <Field label="Your fee now" hint="What you charge or advertise today.">
            {({ id, hintId }) => <NumberInput id={id} describedBy={hintId} value={v.fee} onChange={set("fee")} prefix="$" />}
          </Field>
        </>
      }
      results={
        valid ? (
          <>
            <ResultHero
              label="Fee at your rate"
              value={money(atRate, 0)}
              unit={`for ${hours} hr${hours === 1 ? "" : "s"}`}
              note={<>Below {money(floor)} the visit loses money unless a repair follows.</>}
            />
            <dl className="space-y-2 rounded-xl border border-stone-200 bg-white p-3.5">
              <CompactStat label="Cost floor" value={money(floor)} note="hours × cost per billed hour" />
              <CompactStat
                label="Your fee now"
                value={hasFee ? money(fee) : "–"}
                tone={verdict?.tone ?? "neutral"}
                note={verdict ? verdict.title : "enter your fee"}
              />
            </dl>
            {verdict ? (
              <p
                role="status"
                className={`rounded-xl px-3.5 py-3 text-[13px] leading-relaxed ring-1 ring-inset ${
                  verdict.tone === "negative"
                    ? "bg-red-50 text-red-900 ring-red-200"
                    : verdict.tone === "warning"
                      ? "bg-amber-50 text-amber-950 ring-amber-200"
                      : "bg-emerald-50 text-emerald-900 ring-emerald-200"
                }`}
              >
                {verdict.text}
              </p>
            ) : null}
          </>
        ) : (
          <NoResult title="No fee yet" text="Enter a rate, a cost per billed hour and the hours the fee covers, each above 0." />
        )
      }
      fullHref={LABOR_WORKSPACE_PATH}
      fullLabel="Work out your rate in the Labor Cost Workspace"
      fullTrack="next-tool-labor-workspace-service-call"
      footnote={
        <>
          Don&apos;t know your rate yet? The workspace builds it for the whole crew and prices flat-rate tasks; the{" "}
          <Link href={calculatorPath("labor-rate")} className="font-medium text-[#77591B] hover:underline">
            quick calculator
          </Link>{" "}
          does one technician.
        </>
      }
    />
  );
}
