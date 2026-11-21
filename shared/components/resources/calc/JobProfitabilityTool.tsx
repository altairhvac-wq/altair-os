"use client";

import { SampleTag } from "@/shared/components/resources/tools/ToolControls";
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
import { Waterfall } from "@/shared/components/resources/calc/charts";
import { num, useCalculatorTool, type CalcPreset } from "@/shared/components/resources/calc/useCalculatorTool";
import { CompactCalculator, CompactStat, withNumbers } from "@/shared/components/resources/calc/CompactCalculator";
import { calculatorPath } from "@/shared/lib/resources/catalog";
import {
  JOB_PROFITABILITY_DEFAULTS as D,
  calculateJobProfitability,
  type JobProfitabilityInput,
  type JobProfitabilityResult,
} from "@/shared/lib/resources/job-profitability";

const KEYS = ["revenue", "laborHours", "loadedLaborRate", "materialsCost", "subcontractCost", "overheadPercent", "targetMarginPercent", "billedRate"] as const;
type K = (typeof KEYS)[number];

const EXAMPLE: Record<K, string> = {
  revenue: String(D.revenue),
  laborHours: String(D.laborHours),
  loadedLaborRate: String(D.loadedLaborRate),
  materialsCost: String(D.materialsCost),
  subcontractCost: String(D.subcontractCost),
  overheadPercent: String(D.overheadAllocationRate * 100),
  targetMarginPercent: "20",
  billedRate: "121",
};

const PRESETS: readonly CalcPreset<K>[] = [
  { id: "example", label: "Worked example", text: "A $2,500 job, 6 hours, $900 of materials. The numbers in the guide below.", values: EXAMPLE },
  {
    id: "small",
    label: "Small repair that came back",
    text: "A $289 capacitor call that needed a second trip. Made-up numbers.",
    values: { ...EXAMPLE, revenue: "289", laborHours: "3", materialsCost: "24", subcontractCost: "0" },
  },
  {
    id: "blank",
    label: "Start blank",
    text: "Empty fields for one of your own finished jobs.",
    values: { revenue: "", laborHours: "", loadedLaborRate: "", materialsCost: "", subcontractCost: "", overheadPercent: "", targetMarginPercent: "", billedRate: "" },
  },
];

function toInput(v: Record<K, string>): JobProfitabilityInput {
  return {
    revenue: num(v.revenue),
    laborHours: num(v.laborHours),
    loadedLaborRate: num(v.loadedLaborRate),
    materialsCost: num(v.materialsCost),
    subcontractCost: num(v.subcontractCost),
    overheadAllocationRate: num(v.overheadPercent) / 100,
  };
}

/** The price that leaves the target net margin after direct costs and the overhead share; null when the two shares reach 100%. */
function priceForMargin(directCost: number, overheadRate: number, margin: number): number | null {
  const left = 1 - overheadRate - margin;
  return left > 0 ? directCost / left : null;
}

/** `compact`: the version built into an Insights article (one job's five numbers, and a link to this full tool with them filled in). */
export function JobProfitabilityTool({ compact = false }: { readonly compact?: boolean } = {}) {
  const tool = useCalculatorTool<K>({ slug: "job-profitability", keys: KEYS, presets: PRESETS });
  const carried = useCarried();
  const v = tool.values;
  const input = toInput(v);
  const r = calculateJobProfitability(input);
  const result = input.revenue > 0 ? r : null;
  const target = num(v.targetMarginPercent) / 100;
  const billedRate = num(v.billedRate);
  const targetPrice = priceForMargin(r.directCost, input.overheadAllocationRate, target);
  const laborBilled = input.laborHours > 0 ? (input.revenue - input.materialsCost - input.subcontractCost) / input.laborHours : null;

  if (compact) {
    return (
      <CompactCalculator
        name="Job Profitability Calculator"
        text="One finished job. It opens with the article's install example; put in one of your own."
        tool={tool}
        onReset={() => tool.loadPreset(PRESETS[0])}
        carry={
          carried ? (
            <CarryBanner
              tool={tool}
              carried={carried}
              buttonLabel="Use my labor cost from the"
              fields={[{ key: "loadedLaborRate", from: "loadedLaborCost", label: "Loaded labor cost", format: (n) => `${money(n)}/paid hr` }]}
              emptyText=""
            />
          ) : undefined
        }
        inputs={
          <>
            <NumField tool={tool} k="revenue" label="Job revenue" prefix="$" invalid={input.revenue <= 0 && v.revenue !== ""} hint="What the customer paid, before tax." />
            <NumField tool={tool} k="materialsCost" label="Materials" prefix="$" hint="Parts and supplies at cost." />
            <NumField tool={tool} k="laborHours" label="Labor hours" suffix="hrs" hint="Every paid hour, return trips included." />
            <NumField tool={tool} k="loadedLaborRate" label="Loaded labor cost" prefix="$" suffix="/hr" hint="Wage plus burden: your cost, not your rate." />
            <div className="sm:col-span-2">
              <NumField tool={tool} k="overheadPercent" label="Overhead share" suffix="% of revenue" hint="Last year's overhead ÷ last year's revenue." />
            </div>
          </>
        }
        results={
          result ? (
            <>
              <ResultHero
                label="Net profit on this job"
                value={money(result.netProfit)}
                note={
                  <>
                    {pct(result.netMargin)} net · {pct(result.grossMargin)} gross
                    {result.netProfit < 0 ? <span className="mt-1 block font-semibold text-[#f0a58f]">This job lost money once overhead is counted.</span> : null}
                  </>
                }
              />
              <dl className="space-y-2 rounded-xl border border-stone-200 bg-white p-3.5">
                <CompactStat label="Direct cost" value={money(result.directCost)} note="labor, materials, subcontract" />
                <CompactStat label="Gross profit" value={money(result.grossProfit)} tone={result.grossProfit < 0 ? "negative" : "neutral"} />
                <CompactStat label="Overhead share" value={money(result.overheadAllocated)} />
              </dl>
            </>
          ) : (
            <NoResult text="Enter the job revenue to see its profit and margins." />
          )
        }
        fullHref={withNumbers(calculatorPath("job-profitability"), tool.values)}
        fullLabel="Open the full calculator with these numbers"
        fullTrack="next-tool-job-profitability-embed"
        footnote="The full calculator adds subcontract costs, the price for your target margin, a chart and print."
      />
    );
  }

  return (
    <CalculatorTool
      name="Job Profitability Calculator"
      tool={tool}
      printTitle="Job profitability worksheet"
      mobile={{
        label: "Net profit on this job",
        value: result ? money(result.netProfit) : "Check inputs",
        note: result ? `${pct(result.netMargin)} net` : undefined,
      }}
      printInputs={[
        { label: "Job revenue, before tax", value: money(input.revenue) },
        { label: "Labor hours", value: hours(input.laborHours) },
        { label: "Loaded labor cost per hour", value: money(input.loadedLaborRate) },
        { label: "Materials at cost", value: money(input.materialsCost) },
        { label: "Subcontract", value: money(input.subcontractCost) },
        { label: "Overhead allocation", value: pct(input.overheadAllocationRate) },
      ]}
      carry={
        <CarryBanner
          tool={tool}
          carried={carried}
          fields={[
            { key: "loadedLaborRate", from: "loadedLaborCost", label: "Loaded labor cost", format: (n) => `${money(n)}/paid hr` },
            { key: "billedRate", from: "billedRate", label: "Labor rate", format: (n) => `${money(n, 0)}/hr` },
          ]}
          emptyText="Labor here is your cost (wage plus burden), not the rate you bill. The Labor Cost Workspace works out both and hands them to this calculator."
        />
      }
      inputs={
        <>
          <InputGroup title="The job" text="Pick a recent, finished job so the numbers are real, not estimated.">
            <NumField tool={tool} k="revenue" label="Job revenue" prefix="$" invalid={input.revenue <= 0 && v.revenue !== ""} hint="What the customer paid, before sales tax." />
            <NumField tool={tool} k="laborHours" label="Labor hours" suffix="hrs" hint="Every paid hour on the job: drive time and return trips included." />
            <NumField tool={tool} k="loadedLaborRate" label="Loaded labor cost" prefix="$" suffix="/hr" hint="Wage plus payroll taxes, insurance and benefits: your cost, not your billed rate." />
            <NumField tool={tool} k="materialsCost" label="Materials" prefix="$" hint="Parts and supplies at what you paid." />
            <NumField tool={tool} k="subcontractCost" label="Subcontract" prefix="$" hint="Anything you paid someone else to do on this job." />
            <NumField tool={tool} k="overheadPercent" label="Overhead allocation" suffix="% of revenue" hint="Last year's overhead divided by last year's revenue." />
          </InputGroup>
          <InputGroup title="Your targets" text="Optional. For the price check below." badge={<SampleTag />}>
            <NumField tool={tool} k="targetMarginPercent" label="Target net margin" suffix="%" hint="The net margin you want on every job." />
            <NumField tool={tool} k="billedRate" label="Your labor rate" prefix="$" suffix="/hr" hint="What you bill per hour, to compare with what this job billed." />
          </InputGroup>
        </>
      }
      results={
        result ? (
          <>
            <ResultHero
              label="Net profit on this job"
              value={money(result.netProfit)}
              note={
                <>
                  {pct(result.netMargin)} net margin · {pct(result.grossMargin)} gross margin
                  {result.netProfit < 0 ? <span className="mt-1 block font-semibold text-[#f0a58f]">This job lost money once overhead is counted.</span> : null}
                </>
              }
            />
            <Panel title="From revenue to profit">
              <Waterfall
                ariaLabel="Job revenue stepping down to net profit"
                steps={[
                  { key: "rev", label: "Revenue", kind: "total", value: input.revenue, display: money(input.revenue, 0) },
                  { key: "labor", label: "Labor", kind: "less", value: result.laborCost, display: money(result.laborCost, 0) },
                  { key: "mat", label: "Materials", kind: "less", value: input.materialsCost, display: money(input.materialsCost, 0) },
                  ...(input.subcontractCost > 0 ? [{ key: "sub", label: "Subcontract", kind: "less" as const, value: input.subcontractCost, display: money(input.subcontractCost, 0) }] : []),
                  { key: "gross", label: "Gross profit", kind: "total", value: result.grossProfit, display: money(result.grossProfit, 0) },
                  { key: "ovh", label: "Overhead share", kind: "less", value: result.overheadAllocated, display: money(result.overheadAllocated, 0) },
                  { key: "net", label: "Net profit", kind: "total", value: result.netProfit, display: money(result.netProfit, 0) },
                ]}
              />
            </Panel>
            <ResultTiles>
              <ResultTile label="Gross profit" value={money(result.grossProfit)} note={`${pct(result.grossMargin)} of revenue`} tone={result.grossProfit < 0 ? "negative" : "neutral"} />
              <ResultTile label="Direct cost" value={money(result.directCost)} note="labor, materials, subcontract" />
              <ResultTile
                label={target > 0 ? `Price for ${pct(target, 0)} net` : "Price for your target"}
                value={targetPrice === null ? "–" : money(targetPrice)}
                note={targetPrice === null ? "overhead + margin reach 100%" : `${targetPrice > input.revenue ? "+" : "−"}${money(Math.abs(targetPrice - input.revenue))} vs. what it billed`}
                strong
              />
              <ResultTile
                label="Labor billed at"
                value={laborBilled === null ? "–" : `${money(laborBilled)}/hr`}
                note={billedRate > 0 && laborBilled !== null ? `your rate is ${money(billedRate, 0)}/hr` : "revenue less parts, per hour"}
                tone={billedRate > 0 && laborBilled !== null && laborBilled < billedRate ? "negative" : "neutral"}
              />
            </ResultTiles>
          </>
        ) : (
          <NoResult text="Enter the job revenue to see its profit and margins." />
        )
      }
      analysis={<Analysis input={input} result={result} target={target} targetPrice={targetPrice} />}
    />
  );
}

function Analysis({
  input,
  result,
  target,
  targetPrice,
}: {
  readonly input: JobProfitabilityInput;
  readonly result: JobProfitabilityResult | null;
  readonly target: number;
  readonly targetPrice: number | null;
}) {
  if (!result) {
    return (
      <AnalysisGrid>
        <AnalysisCard title="What if it ran long, or was priced differently?">
          <EmptyAnalysis />
        </AnalysisCard>
        <AnalysisCard title="The formula, with your numbers">
          <EmptyAnalysis />
        </AnalysisCard>
      </AnalysisGrid>
    );
  }

  const prices = [-0.1, 0, 0.1, 0.2];
  const h = input.laborHours;
  const hourRows = Array.from(new Set([h - 2, h - 1, h, h + 1, h + 2, h + 4].map((x) => Math.round(x * 100) / 100))).filter((x) => x > 0);

  return (
    <AnalysisGrid>
      <AnalysisCard
        title="What if it ran long, or was priced differently?"
        text="Net profit on the same job with more or fewer labor hours, at the price it billed and at higher or lower prices. Losses are red."
      >
        <WhatIfTable
          caption="Net profit by labor hours and price"
          corner="Labor hours"
          minWidth={420}
          columns={prices.map((p) => ({ key: String(p), label: p === 0 ? money(input.revenue, 0) : `${p > 0 ? "+" : "−"}${Math.abs(p * 100)}%`, current: p === 0 }))}
          rows={hourRows.map((hrs) => ({
            key: String(hrs),
            current: Math.abs(hrs - h) < 1e-9,
            label: hours(hrs),
            cells: prices.map((p) => {
              const res = calculateJobProfitability({ ...input, laborHours: hrs, revenue: input.revenue * (1 + p) });
              return { text: money(res.netProfit, 0), tone: res.netProfit < 0 ? ("negative" as const) : undefined };
            }),
          }))}
        />
      </AnalysisCard>

      <AnalysisCard title="The formula, with your numbers">
        <YourMath
          rows={[
            { label: "Labor cost", working: `${hours(input.laborHours)} × ${money(input.loadedLaborRate)}`, value: money(result.laborCost) },
            { label: "Direct cost", working: `${money(result.laborCost)} + ${money(input.materialsCost)} + ${money(input.subcontractCost)}`, value: money(result.directCost) },
            { label: "Gross profit", working: `${money(input.revenue)} − ${money(result.directCost)}`, value: money(result.grossProfit) },
            { label: "Overhead share", working: `${money(input.revenue)} × ${pct(input.overheadAllocationRate)}`, value: money(result.overheadAllocated) },
            { label: "Net profit", working: `${money(result.grossProfit)} − ${money(result.overheadAllocated)}`, value: money(result.netProfit), strong: true },
            { label: "Net margin", working: `${money(result.netProfit)} ÷ ${money(input.revenue)}`, value: pct(result.netMargin), strong: true },
            ...(targetPrice !== null && target > 0
              ? [{ label: `Price for ${pct(target, 0)} net`, working: `${money(result.directCost)} ÷ (1 − ${pct(input.overheadAllocationRate)} − ${pct(target)})`, value: money(targetPrice) }]
              : []),
          ]}
        />
      </AnalysisCard>
    </AnalysisGrid>
  );
}
