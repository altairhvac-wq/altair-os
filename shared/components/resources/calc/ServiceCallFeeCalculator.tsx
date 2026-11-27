"use client";

import Link from "next/link";
import { calculatorPath } from "@/shared/lib/resources/catalog";
import { useCarried } from "@/shared/components/resources/calc/carry";
import {
  AnalysisCard,
  AnalysisGrid,
  CalculatorTool,
  CarryBanner,
  EmptyAnalysis,
  InputGroup,
  NoResult,
  NumField,
  ResultHero,
  ResultReading,
  ResultTile,
  ResultTiles,
  WhatIfTable,
  YourMath,
  hours,
  money,
} from "@/shared/components/resources/calc/CalculatorTool";
import { CHART, HBars } from "@/shared/components/resources/calc/charts";
import { num, useCalculatorTool, type CalcPreset } from "@/shared/components/resources/calc/useCalculatorTool";
import {
  SERVICE_CALL_FEE_DEFAULTS as D,
  calculateServiceCallFee,
  type ServiceCallFeeInput,
  type ServiceCallFeeResult,
} from "@/shared/lib/resources/service-call-fee";

/**
 * The service call fee calculator at /resources/calculators/service-call-fee.
 *
 * The same check the article "How to price an HVAC service call" builds in
 * (the fee at your rate, the cost floor, where today's fee sits), plus what
 * the article's small tool cannot show: what a fee under cost adds up to over
 * a month and a year of calls that end with no repair. It opens with the
 * article's own example, so the two pages cannot disagree.
 */

const KEYS = ["billableRate", "costPerBillableHour", "hoursCovered", "currentFee", "callsPerMonth", "noRepairPercent"] as const;
type K = (typeof KEYS)[number];

const EXAMPLE: Record<K, string> = {
  billableRate: String(D.billableRate),
  costPerBillableHour: String(D.costPerBillableHour),
  hoursCovered: String(D.hoursCovered),
  currentFee: String(D.currentFee),
  callsPerMonth: String(D.callsPerMonth),
  noRepairPercent: String(D.noRepairPercent),
};

const PRESETS: readonly CalcPreset<K>[] = [
  { id: "example", label: "Worked example", text: "A $49 fee against a $121 rate and $96.15 an hour of cost. The numbers in the guide below.", values: EXAMPLE },
  {
    id: "free",
    label: "A free service call",
    text: "$0 at the door, 100 calls a month. Made-up numbers.",
    values: { ...EXAMPLE, currentFee: "0", callsPerMonth: "100", noRepairPercent: "30" },
  },
  {
    id: "blank",
    label: "Start blank",
    text: "Empty fields for your own numbers.",
    values: { billableRate: "", costPerBillableHour: "", hoursCovered: "", currentFee: "", callsPerMonth: "", noRepairPercent: "" },
  },
];

function toInput(v: Record<K, string>): ServiceCallFeeInput {
  return {
    billableRate: num(v.billableRate),
    costPerBillableHour: num(v.costPerBillableHour),
    hoursCovered: num(v.hoursCovered),
    currentFee: num(v.currentFee),
    callsPerMonth: num(v.callsPerMonth),
    noRepairPercent: num(v.noRepairPercent),
  };
}

const link = "font-semibold text-[#77591B] underline underline-offset-2";

/** "1 hour", "1.5 hrs": the shared `hours()` helper writes "1 hrs". */
const hoursText = (value: number) => (value === 1 ? "1 hour" : hours(value));

export function ServiceCallFeeCalculator() {
  const tool = useCalculatorTool<K>({ slug: "service-call-fee", keys: KEYS, presets: PRESETS });
  const carried = useCarried();
  const input = toInput(tool.values);
  const result = calculateServiceCallFee(input);
  const shareBad = input.noRepairPercent > 100 || input.noRepairPercent < 0;
  const visits = result ? Math.round(result.noRepairVisitsPerMonth * 10) / 10 : 0;
  const covered = hoursText(input.hoursCovered);

  return (
    <CalculatorTool
      name="Service Call Fee Calculator"
      tool={tool}
      printTitle="Service call fee check"
      mobile={{
        label: "Fee at your rate",
        value: result ? money(result.feeAtRate, 0) : "Check inputs",
        note: result ? `cost floor ${money(result.costFloor)}` : undefined,
      }}
      printInputs={[
        { label: "Billable hourly rate", value: money(input.billableRate) },
        { label: "Cost per billable hour", value: money(input.costPerBillableHour) },
        { label: "Hours the fee covers", value: hours(input.hoursCovered) },
        { label: "Fee charged today", value: money(input.currentFee) },
        { label: "Service calls per month", value: String(input.callsPerMonth) },
        { label: "Calls that end with no repair", value: `${input.noRepairPercent}%` },
      ]}
      carry={
        <CarryBanner
          tool={tool}
          carried={carried}
          fields={[
            { key: "billableRate", from: "billedRate", label: "Labor rate", format: (n) => `${money(n, 0)}/hr` },
            { key: "costPerBillableHour", from: "costPerBilledHour", label: "Cost per billed hour", format: (n) => money(n) },
          ]}
          emptyText="The fee is checked against your labor rate and what a billed hour costs you. The Labor Cost Workspace works out both and hands them to this calculator."
        />
      }
      inputs={
        <>
          <InputGroup title="The visit" text="What the customer pays to get a technician to the door and the problem found, before any repair.">
            <NumField
              tool={tool}
              k="currentFee"
              label="Your fee today"
              prefix="$"
              hint="What you charge or advertise now. Enter 0 for a free service call."
              find="Your price book, your website or your latest ad: whichever number the customer hears when they book."
            />
            <NumField
              tool={tool}
              k="hoursCovered"
              label="Hours the fee covers"
              suffix="hrs"
              invalid={input.hoursCovered <= 0}
              hint="The drive to the job plus the time to find the problem."
              find="Timesheets for a few recent diagnostic visits: from leaving the last job to telling the customer what is wrong. Use the average. The example uses one hour: the trip and the diagnosis."
            />
          </InputGroup>
          <InputGroup title="Your hourly numbers">
            <NumField
              tool={tool}
              k="billableRate"
              label="Your billable rate"
              prefix="$"
              suffix="/hr"
              invalid={input.billableRate <= 0}
              hint="What one billed hour is quoted at."
              find={
                <>
                  The hourly labor rate in your price book, or the recommended rate from the{" "}
                  <Link href={calculatorPath("labor-rate")} className={link}>
                    labor rate calculator
                  </Link>
                  .
                </>
              }
            />
            <NumField
              tool={tool}
              k="costPerBillableHour"
              label="Cost per billable hour"
              prefix="$"
              suffix="/hr"
              invalid={input.costPerBillableHour <= 0}
              hint="Wage, payroll costs, unbilled time and overhead for one hour: your break-even rate."
              find={
                <>
                  The &ldquo;Break-even rate&rdquo; from the{" "}
                  <Link href={calculatorPath("labor-rate")} className={link}>
                    labor rate calculator
                  </Link>
                  . Work it out there once; after that, this calculator offers to fill it in.
                </>
              }
            />
          </InputGroup>
          <InputGroup title="Your calls" text="Used to turn the gap on one visit into a month and a year.">
            <NumField
              tool={tool}
              k="callsPerMonth"
              label="Service calls a month"
              suffix="calls"
              hint="Diagnostic visits, not installs or maintenance."
              find="Your job software's list of last month's service or diagnostic jobs, or the invoices that carry a service call line."
            />
            <NumField
              tool={tool}
              k="noRepairPercent"
              label="Calls that end with no repair"
              suffix="% of calls"
              invalid={shareBad}
              hint="The customer declines, shops around, or nothing needed fixing."
              find="Of last month's service calls, count the ones invoiced for the fee alone, then divide by all service calls. 20 fee-only visits out of 80 calls is 25%."
            />
          </InputGroup>
        </>
      }
      results={
        result ? (
          <>
            <ResultHero
              label="Fee at your rate"
              value={money(result.feeAtRate, 0)}
              unit={`for ${covered}`}
              note={
                <>
                  Below <span className="font-semibold text-[#e8d9ac]">{money(result.costFloor)}</span> the visit loses money unless a repair follows.
                </>
              }
            />
            <Reading input={input} result={result} visits={visits} />
            <ResultTiles>
              <ResultTile label="Cost floor" value={money(result.costFloor)} note="what the visit costs you" strong />
              <ResultTile label="Your fee today" value={money(input.currentFee)} note={input.currentFee === 0 ? "a free service call" : "charged at the door"} />
              <ResultTile
                label="Short of cost"
                value={money(result.shortOfCostPerVisit)}
                note="on each visit with no repair"
                tone={result.shortOfCostPerVisit > 0 ? "negative" : undefined}
              />
              <ResultTile label="Visits with no repair" value={visits.toLocaleString("en-US")} note="a month" />
              <ResultTile label="Lost a month" value={money(result.lostPerMonth, 0)} note="on those visits" tone={result.lostPerMonth > 0 ? "negative" : undefined} />
              <ResultTile label="Lost a year" value={money(result.lostPerYear, 0)} note="at this pace" tone={result.lostPerYear > 0 ? "negative" : undefined} />
            </ResultTiles>
          </>
        ) : (
          <NoResult title="No fee yet" text="Enter your billable rate, your cost per billable hour and the hours the fee covers, each above 0." />
        )
      }
      analysis={<Analysis input={input} result={result} />}
    />
  );
}

/** "What this means": where today's fee sits against cost and against the rate, and what it adds up to. */
function Reading({ input, result, visits }: { readonly input: ServiceCallFeeInput; readonly result: ServiceCallFeeResult; readonly visits: number }) {
  const fee = input.currentFee;
  if (result.status === "below-cost") {
    return (
      <ResultReading
        tone="bad"
        title={
          fee === 0
            ? `A free service call costs you ${money(result.costFloor)} every time no repair follows.`
            : `At ${money(fee, 0)} you lose ${money(result.shortOfCostPerVisit)} on every visit that ends with no repair.`
        }
      >
        {input.callsPerMonth > 0 ? (
          <p>
            With about {visits.toLocaleString("en-US")} of those visits a month, that is {money(result.lostPerMonth, 0)} a month and{" "}
            {money(result.lostPerYear, 0)} a year. The repairs you do sell have to earn that back before they earn anything.
          </p>
        ) : (
          <p>Enter your service calls a month to see what that adds up to.</p>
        )}
        <p>
          A low fee can still be the right ad. If you keep it, raise the price of the repair that follows by the same{" "}
          {money(result.shortOfRatePerVisit, 0)}, or credit the fee toward the repair instead of waiving it.
        </p>
      </ResultReading>
    );
  }
  if (result.status === "below-rate") {
    return (
      <ResultReading tone="watch" title={`${money(fee, 0)} covers the visit, but is ${money(result.shortOfRatePerVisit)} under your rate.`}>
        <p>
          No visit loses money. Each one earns less than your target profit, so the gap rides on the repair. Raising the fee to{" "}
          {money(result.feeAtRate, 0)} closes it.
        </p>
      </ResultReading>
    );
  }
  return (
    <ResultReading tone="good" title={`${money(fee, 0)} covers the visit and your profit.`}>
      <p>
        A visit that ends with no repair still pays for itself. Check the hours again in a season when drive times are longer: the fee is only as
        good as the time it has to cover.
      </p>
    </ResultReading>
  );
}

function Analysis({ input, result }: { readonly input: ServiceCallFeeInput; readonly result: ServiceCallFeeResult | null }) {
  if (!result) {
    return (
      <AnalysisGrid>
        <AnalysisCard title="Your fee against cost and rate">
          <EmptyAnalysis />
        </AnalysisCard>
        <AnalysisCard title="What each fee does to a month">
          <EmptyAnalysis />
        </AnalysisCard>
      </AnalysisGrid>
    );
  }

  // A few fees to compare: free, a common low ad price, today's fee, the cost floor and the fee at the rate.
  const fees = Array.from(new Set([0, 49, 79, input.currentFee, Math.ceil(result.costFloor), Math.round(result.feeAtRate)]))
    .filter((fee) => fee >= 0)
    .sort((a, b) => a - b);

  return (
    <AnalysisGrid>
      <AnalysisCard title="Your fee against cost and rate" text="The same visit, three numbers: what you charge, what it costs you, and what it is worth at your rate.">
        <HBars
          ariaLabel="Your fee today, the cost floor and the fee at your rate"
          rows={[
            { key: "fee", label: "Your fee today", value: input.currentFee, display: money(input.currentFee), highlight: true, color: result.status === "below-cost" ? CHART.loss : CHART.ink },
            { key: "floor", label: "Cost floor", value: result.costFloor, display: money(result.costFloor), sub: `${hoursText(input.hoursCovered)} × ${money(input.costPerBillableHour)}`, color: CHART.light },
            { key: "rate", label: "Fee at your rate", value: result.feeAtRate, display: money(result.feeAtRate), sub: `${hoursText(input.hoursCovered)} × ${money(input.billableRate)}`, color: CHART.brass },
          ]}
        />
      </AnalysisCard>

      <AnalysisCard
        title="What each fee does to a month"
        text={
          input.callsPerMonth > 0
            ? `At ${input.callsPerMonth.toLocaleString("en-US")} calls a month with ${input.noRepairPercent}% ending in no repair.`
            : "Enter your service calls a month to fill this in."
        }
      >
        <WhatIfTable
          caption="Result per visit with no repair, and the loss per month and year, at different service call fees"
          corner="Fee"
          minWidth={420}
          columns={[
            { key: "v", label: "Per no-repair visit" },
            { key: "m", label: "Lost / mo" },
            { key: "y", label: "Lost / yr" },
          ]}
          rows={fees.map((fee) => {
            const res = calculateServiceCallFee({ ...input, currentFee: fee });
            const perVisit = res ? fee - res.costFloor : 0;
            return {
              key: String(fee),
              current: fee === input.currentFee,
              label: fee === 0 ? "Free" : money(fee, 0),
              cells: [
                { text: res ? `${perVisit < 0 ? "−" : "+"}${money(Math.abs(perVisit))}` : "–" },
                { text: res ? money(res.lostPerMonth, 0) : "–" },
                { text: res ? money(res.lostPerYear, 0) : "–" },
              ],
            };
          })}
        />
      </AnalysisCard>

      <AnalysisCard wide title="The formula, with your numbers">
        <YourMath
          note="Only visits that end with no repair are counted as a loss. On a call that becomes a repair, the repair's own price can make up a low fee; the job profitability calculator checks that."
          rows={[
            { label: "Fee at your rate", working: `${hoursText(input.hoursCovered)} × ${money(input.billableRate)}`, value: money(result.feeAtRate), strong: true },
            { label: "Cost floor", working: `${hoursText(input.hoursCovered)} × ${money(input.costPerBillableHour)}`, value: money(result.costFloor), strong: true },
            { label: "Short of cost per visit", working: `${money(result.costFloor)} − ${money(input.currentFee)}`, value: money(result.shortOfCostPerVisit) },
            { label: "Visits with no repair", working: `${input.callsPerMonth} × ${input.noRepairPercent}%`, value: result.noRepairVisitsPerMonth.toLocaleString("en-US", { maximumFractionDigits: 1 }) },
            { label: "Lost per month", working: `${result.noRepairVisitsPerMonth.toLocaleString("en-US", { maximumFractionDigits: 1 })} × ${money(result.shortOfCostPerVisit)}`, value: money(result.lostPerMonth) },
            { label: "Lost per year", working: `${money(result.lostPerMonth)} × 12`, value: money(result.lostPerYear) },
          ]}
        />
      </AnalysisCard>
    </AnalysisGrid>
  );
}
