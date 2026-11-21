"use client";

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
  Panel,
  ResultHero,
  ResultTile,
  ResultTiles,
  WhatIfTable,
  YourMath,
  hours,
  money,
  pct,
} from "@/shared/components/resources/calc/CalculatorTool";
import { CHART, HBars, SplitBar } from "@/shared/components/resources/calc/charts";
import { num, useCalculatorTool, type CalcPreset } from "@/shared/components/resources/calc/useCalculatorTool";
import {
  CALLBACK_COST_DEFAULTS as D,
  calculateCallbackCost,
  type CallbackCostInput,
  type CallbackCostResult,
} from "@/shared/lib/resources/callback-cost";

const KEYS = ["callbacksPerMonth", "jobsPerMonth", "hoursPerCallback", "costPerBillableHour", "partsPerCallback", "billableRate"] as const;
type K = (typeof KEYS)[number];

const EXAMPLE: Record<K, string> = {
  callbacksPerMonth: String(D.callbacksPerMonth),
  jobsPerMonth: String(D.jobsPerMonth),
  hoursPerCallback: String(D.hoursPerCallback),
  costPerBillableHour: String(D.costPerBillableHour),
  partsPerCallback: String(D.partsPerCallback),
  billableRate: String(D.billableRate),
};

const PRESETS: readonly CalcPreset<K>[] = [
  { id: "example", label: "Worked example", text: "6 callbacks in 120 jobs, 1.5 hours each. The numbers in the guide below.", values: EXAMPLE },
  {
    id: "rough",
    label: "A rough summer month",
    text: "14 callbacks in 160 jobs. Made-up numbers.",
    values: { ...EXAMPLE, callbacksPerMonth: "14", jobsPerMonth: "160", hoursPerCallback: "1.75", partsPerCallback: "35" },
  },
  {
    id: "blank",
    label: "Start blank",
    text: "Empty fields for last month's real numbers.",
    values: { callbacksPerMonth: "", jobsPerMonth: "", hoursPerCallback: "", costPerBillableHour: "", partsPerCallback: "", billableRate: "" },
  },
];

function toInput(v: Record<K, string>): CallbackCostInput {
  return {
    callbacksPerMonth: num(v.callbacksPerMonth),
    jobsPerMonth: num(v.jobsPerMonth),
    hoursPerCallback: num(v.hoursPerCallback),
    costPerBillableHour: num(v.costPerBillableHour),
    partsPerCallback: num(v.partsPerCallback),
    billableRate: num(v.billableRate),
  };
}

export function CallbackCostTool() {
  const tool = useCalculatorTool<K>({ slug: "callback-cost", keys: KEYS, presets: PRESETS });
  const carried = useCarried();
  const input = toInput(tool.values);
  const r = calculateCallbackCost(input);
  const result = r && input.callbacksPerMonth > 0 ? r : null;
  const tooMany = r === null;

  return (
    <CalculatorTool
      name="Callback Cost Calculator"
      tool={tool}
      printTitle="What callbacks cost"
      mobile={{
        label: "Callbacks cost",
        value: result ? `${money(result.costPerMonth, 0)}/mo` : "Check inputs",
        note: result ? `${money(result.costPerYear, 0)}/yr` : undefined,
      }}
      printInputs={[
        { label: "Callbacks per month", value: String(input.callbacksPerMonth) },
        { label: "Jobs completed per month", value: String(input.jobsPerMonth) },
        { label: "Hours per callback, drive included", value: hours(input.hoursPerCallback) },
        { label: "Cost per billable hour", value: money(input.costPerBillableHour) },
        { label: "Parts per callback, at cost", value: money(input.partsPerCallback) },
        { label: "Billable hourly rate", value: money(input.billableRate) },
      ]}
      carry={
        <CarryBanner
          tool={tool}
          carried={carried}
          fields={[
            { key: "costPerBillableHour", from: "costPerBilledHour", label: "Cost per billed hour", format: (n) => money(n) },
            { key: "billableRate", from: "billedRate", label: "Labor rate", format: (n) => `${money(n, 0)}/hr` },
          ]}
          emptyText="A callback hour costs what any billed hour costs you. The Labor Cost Workspace works out that number and hands it to this calculator."
        />
      }
      inputs={
        <>
          <InputGroup title="Last month" text="Count return trips to a finished job that nobody paid for, and every job completed in the same month.">
            <NumField tool={tool} k="callbacksPerMonth" label="Callbacks" suffix="callbacks" invalid={tooMany} hint="Unpaid return trips to finished jobs." />
            <NumField tool={tool} k="jobsPerMonth" label="Jobs completed" suffix="jobs" invalid={tooMany} hint="All jobs in the same month, for the callback rate." />
            <NumField tool={tool} k="hoursPerCallback" label="Hours per callback" suffix="hrs" hint="Time on site plus the drive there and back." />
            <NumField tool={tool} k="partsPerCallback" label="Parts given away per callback" prefix="$" hint="At your cost, on a typical callback." />
          </InputGroup>
          <InputGroup title="Your hourly numbers">
            <NumField tool={tool} k="costPerBillableHour" label="Cost per billable hour" prefix="$" suffix="/hr" hint="Wage, burden, unbilled time and overhead for one hour: your break-even rate." />
            <NumField tool={tool} k="billableRate" label="Your billable rate" prefix="$" suffix="/hr" hint="What an hour bills on paying work." />
          </InputGroup>
        </>
      }
      results={
        result ? (
          <>
            <ResultHero
              label="Callbacks cost"
              value={money(result.costPerMonth)}
              unit="a month"
              note={
                <>
                  <span className="font-semibold text-[#e8d9ac]">{money(result.costPerYear, 0)}</span> a year at this pace.
                </>
              }
            />
            <Panel title="What a month of callbacks uses up">
              <SplitBar
                ariaLabel="Monthly callback cost split into technician time and parts"
                format={(n) => money(n)}
                slices={[
                  { key: "time", label: "Technician time, at cost", value: result.hoursLostPerMonth * input.costPerBillableHour, color: CHART.ink },
                  { key: "parts", label: "Parts given away", value: input.callbacksPerMonth * input.partsPerCallback, color: CHART.brass },
                ]}
              />
            </Panel>
            <ResultTiles>
              <ResultTile label="Callback rate" value={pct(result.callbackRate)} note={result.callbackRate === null ? "enter jobs completed" : "of jobs completed"} strong />
              <ResultTile label="Cost per callback" value={money(result.costPerCallback)} note="time plus parts" />
              <ResultTile label="Hours lost" value={hours(result.hoursLostPerMonth)} note="per month" />
              <ResultTile label="Those hours would bill" value={money(result.revenueNotBilledPerMonth, 0)} note="a month, on paying work" />
            </ResultTiles>
          </>
        ) : tooMany ? (
          <NoResult title="Check the two counts" text="Callbacks cannot be more than the jobs completed in the same month. Check that both numbers are for the same month." />
        ) : (
          <NoResult text="Enter last month's callbacks to see what they cost." />
        )
      }
      analysis={<Analysis input={input} result={result} />}
    />
  );
}

function Analysis({ input, result }: { readonly input: CallbackCostInput; readonly result: CallbackCostResult | null }) {
  if (!result) {
    return (
      <AnalysisGrid>
        <AnalysisCard title="What cutting callbacks is worth">
          <EmptyAnalysis />
        </AnalysisCard>
        <AnalysisCard title="Callback rate against cost">
          <EmptyAnalysis />
        </AnalysisCard>
      </AnalysisGrid>
    );
  }

  const cuts = [
    { key: "now", label: "Now", share: 1 },
    { key: "quarter", label: "A quarter fewer", share: 0.75 },
    { key: "half", label: "Half as many", share: 0.5 },
    { key: "most", label: "Three quarters fewer", share: 0.25 },
  ];
  const rates = input.jobsPerMonth > 0 ? Array.from(new Set([0.01, 0.02, 0.03, 0.05, 0.08, result.callbackRate ?? 0])).filter((x) => x > 0).sort((a, b) => a - b) : [];
  const yearHours = result.hoursLostPerMonth * 12;

  return (
    <AnalysisGrid>
      <AnalysisCard
        title="What cutting callbacks is worth"
        text={`A year of callbacks at your pace, and what fewer would save. ${hours(yearHours)} a year is about ${(yearHours / 40).toFixed(1)} forty-hour weeks of a technician's time.`}
      >
        <HBars
          ariaLabel="Yearly callback cost now and with fewer callbacks"
          rows={cuts.map((cut) => {
            const cost = result.costPerYear * cut.share;
            return {
              key: cut.key,
              label: `${cut.label} · ${(input.callbacksPerMonth * cut.share).toLocaleString("en-US", { maximumFractionDigits: 1 })}/mo`,
              value: cost,
              display: `${money(cost, 0)}/yr`,
              sub: cut.share < 1 ? `saves ${money(result.costPerYear - cost, 0)}` : undefined,
              highlight: cut.share === 1,
              color: cut.share === 1 ? CHART.ink : CHART.light,
            };
          })}
        />
      </AnalysisCard>

      <AnalysisCard title="Callback rate against cost" text={input.jobsPerMonth > 0 ? `At ${input.jobsPerMonth.toLocaleString("en-US")} jobs a month, with your hours, parts and cost per hour.` : "Enter jobs completed to compare callback rates."}>
        {rates.length > 0 ? (
          <WhatIfTable
            caption="Monthly and yearly callback cost at different callback rates"
            corner="Callback rate"
            minWidth={400}
            columns={[
              { key: "n", label: "Callbacks / mo" },
              { key: "m", label: "Cost / mo" },
              { key: "y", label: "Cost / yr" },
            ]}
            rows={rates.map((rate) => {
              const callbacks = rate * input.jobsPerMonth;
              const res = calculateCallbackCost({ ...input, callbacksPerMonth: callbacks });
              return {
                key: String(rate),
                current: Math.abs(rate - (result.callbackRate ?? -1)) < 1e-9,
                label: pct(rate),
                cells: [
                  { text: callbacks.toLocaleString("en-US", { maximumFractionDigits: 1 }) },
                  { text: res ? money(res.costPerMonth, 0) : "–" },
                  { text: res ? money(res.costPerYear, 0) : "–" },
                ],
              };
            })}
          />
        ) : (
          <EmptyAnalysis text="No jobs entered." />
        )}
      </AnalysisCard>

      <AnalysisCard wide title="The formula, with your numbers">
        <YourMath
          note="The cost and the revenue those hours would have billed are shown side by side, not added. The second only applies if paying work was waiting for those hours."
          rows={[
            { label: "Callback rate", working: `${input.callbacksPerMonth} ÷ ${input.jobsPerMonth}`, value: pct(result.callbackRate) },
            { label: "Cost per callback", working: `${hours(input.hoursPerCallback)} × ${money(input.costPerBillableHour)} + ${money(input.partsPerCallback)}`, value: money(result.costPerCallback) },
            { label: "Cost per month", working: `${input.callbacksPerMonth} × ${money(result.costPerCallback)}`, value: money(result.costPerMonth), strong: true },
            { label: "Cost per year", working: `${money(result.costPerMonth)} × 12`, value: money(result.costPerYear), strong: true },
            { label: "Hours lost per month", working: `${input.callbacksPerMonth} × ${hours(input.hoursPerCallback)}`, value: hours(result.hoursLostPerMonth) },
            { label: "Revenue those hours would bill", working: `${hours(result.hoursLostPerMonth)} × ${money(input.billableRate)}`, value: money(result.revenueNotBilledPerMonth) },
          ]}
        />
      </AnalysisCard>
    </AnalysisGrid>
  );
}
