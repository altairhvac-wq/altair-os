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
  ResultHero,
  ResultTile,
  ResultTiles,
  WhatIfTable,
  YourMath,
  money,
  pct,
} from "@/shared/components/resources/calc/CalculatorTool";
import { CHART, LineChart } from "@/shared/components/resources/calc/charts";
import { num, useCalculatorTool, type CalcPreset } from "@/shared/components/resources/calc/useCalculatorTool";
import { CompactCalculator, CompactStat, withNumbers } from "@/shared/components/resources/calc/CompactCalculator";
import { calculatorPath } from "@/shared/lib/resources/catalog";
import { BREAK_EVEN_DEFAULTS as D, calculateBreakEven, type BreakEvenResult } from "@/shared/lib/resources/break-even";

const KEYS = ["fixedMonthlyCosts", "averageJobRevenue", "variableCostPercent", "targetProfit", "techs", "jobsPerTechPerDay", "workDays"] as const;
type K = (typeof KEYS)[number];

const EXAMPLE: Record<K, string> = {
  fixedMonthlyCosts: String(D.fixedMonthlyCosts),
  averageJobRevenue: String(D.averageJobRevenue),
  variableCostPercent: String(D.variableCostRate * 100),
  targetProfit: "8000",
  techs: "3",
  jobsPerTechPerDay: "2",
  workDays: "21",
};

const PRESETS: readonly CalcPreset<K>[] = [
  { id: "example", label: "Worked example", text: "$18,000 fixed a month, $650 average job, 35% variable. The numbers in the guide below.", values: EXAMPLE },
  {
    id: "solo",
    label: "Owner-operator",
    text: "One truck: $6,500 fixed, $480 average job, 40% variable. Made-up numbers.",
    values: { fixedMonthlyCosts: "6500", averageJobRevenue: "480", variableCostPercent: "40", targetProfit: "4000", techs: "1", jobsPerTechPerDay: "3", workDays: "21" },
  },
  {
    id: "blank",
    label: "Start blank",
    text: "Empty fields for your own month.",
    values: { fixedMonthlyCosts: "", averageJobRevenue: "", variableCostPercent: "", targetProfit: "", techs: "", jobsPerTechPerDay: "", workDays: "" },
  },
];

const WEEKS_PER_MONTH = 52 / 12;
const int = (n: number) => Math.round(n).toLocaleString("en-US");

/** `compact`: the version built into an Insights article (the three numbers that set the break-even, and a link to this full tool with them filled in). */
export function BreakEvenTool({ compact = false }: { readonly compact?: boolean } = {}) {
  const tool = useCalculatorTool<K>({ slug: "break-even", keys: KEYS, presets: PRESETS });
  const carried = useCarried();
  const v = tool.values;
  const fixed = num(v.fixedMonthlyCosts);
  const avg = num(v.averageJobRevenue);
  const variableRate = num(v.variableCostPercent) / 100;
  const target = Math.max(0, num(v.targetProfit));
  const capacity = Math.max(0, num(v.techs)) * Math.max(0, num(v.jobsPerTechPerDay)) * Math.max(0, num(v.workDays));
  const result = calculateBreakEven({ fixedMonthlyCosts: fixed, averageJobRevenue: avg, variableCostRate: variableRate });
  const targetJobs = result ? Math.ceil((fixed + target) / result.contributionPerJob) : null;
  const problem = avg <= 0 ? "Enter an average job revenue above $0." : "Set variable costs from 0% to 99% of revenue.";

  if (compact) {
    return (
      <CompactCalculator
        name="Break-Even Calculator"
        text="Your month in three numbers. It opens with the article's example; change any of them."
        tool={tool}
        onReset={() => tool.loadPreset(PRESETS[0])}
        carry={
          carried?.monthlyOverhead ? (
            <CarryBanner
              tool={tool}
              carried={carried}
              buttonLabel="Use my overhead from the"
              fields={[{ key: "fixedMonthlyCosts", from: "monthlyOverhead", label: "Monthly overhead", format: (n) => money(n, 0) }]}
              emptyText=""
            />
          ) : undefined
        }
        inputs={
          <>
            <div className="sm:col-span-2">
              <NumField tool={tool} k="fixedMonthlyCosts" label="Fixed monthly costs" prefix="$" suffix="/mo" hint="Rent, insurance, office pay, truck and loan payments, software." />
            </div>
            <NumField tool={tool} k="averageJobRevenue" label="Average job revenue" prefix="$" invalid={avg <= 0} hint="Revenue ÷ jobs, last 3 to 6 months." />
            <NumField
              tool={tool}
              k="variableCostPercent"
              label="Variable costs"
              suffix="% of revenue"
              invalid={variableRate >= 1 || variableRate < 0}
              hint="Parts, field labor, permits, card fees."
            />
          </>
        }
        results={
          result ? (
            <>
              <ResultHero
                label="Break-even point"
                value={String(result.breakEvenJobs)}
                unit="jobs a month"
                note={<>About {result.breakEvenJobsPerWeek.toFixed(1)} a week. Every job past that adds {money(result.contributionPerJob)} of profit.</>}
              />
              <dl className="space-y-2 rounded-xl border border-stone-200 bg-white p-3.5">
                <CompactStat label="Each job leaves" value={money(result.contributionPerJob)} note="toward fixed costs" />
                <CompactStat label="Break-even revenue" value={money(result.breakEvenRevenue, 0)} note="a month" />
                <CompactStat label="Exactly" value={`${result.breakEvenJobsExact.toFixed(1)} jobs`} note="before rounding up" />
              </dl>
            </>
          ) : (
            <NoResult title="No break-even yet" text={problem} />
          )
        }
        fullHref={withNumbers(calculatorPath("break-even"), tool.values)}
        fullLabel="Open the full calculator with these numbers"
        fullTrack="next-tool-break-even-embed"
        footnote="The full calculator adds a chart, a profit goal, crew capacity, a what-if table and print."
      />
    );
  }

  return (
    <CalculatorTool
      name="Break-Even Calculator"
      tool={tool}
      printTitle="Break-even: jobs a month to cover the costs"
      mobile={{
        label: "Break-even",
        value: result ? `${result.breakEvenJobs} jobs/mo` : "Check inputs",
        note: result ? `${money(result.breakEvenRevenue, 0)}` : undefined,
      }}
      printInputs={[
        { label: "Fixed monthly costs", value: money(fixed, 0) },
        { label: "Average job revenue", value: money(avg, 0) },
        { label: "Variable costs", value: pct(variableRate) },
        { label: "Target monthly profit", value: money(target, 0) },
        { label: "Crew capacity", value: `${v.techs || 0} techs × ${v.jobsPerTechPerDay || 0} jobs a day × ${v.workDays || 0} days = ${int(capacity)} jobs` },
      ]}
      carry={
        <CarryBanner
          tool={tool}
          carried={carried}
          buttonLabel="Use my overhead and crew from the"
          fields={[
            { key: "fixedMonthlyCosts", from: "monthlyOverhead", label: "Monthly overhead", format: (n) => money(n, 0) },
            { key: "techs", from: "techCount", label: "Technicians", format: (n) => String(n) },
          ]}
          emptyText="Fixed costs are your monthly overhead. If you have built your rate in the Labor Cost Workspace, it can fill in your overhead and crew size here."
        />
      }
      inputs={
        <>
          <InputGroup title="The month" text="Fixed costs arrive whether or not a truck rolls. Variable costs come with each job.">
            <NumField
              tool={tool}
              k="fixedMonthlyCosts"
              label="Fixed monthly costs"
              prefix="$"
              suffix="/mo"
              hint="Rent, insurance, office pay, truck and loan payments, software. Field wages paid per job go in variable costs."
            />
            <NumField tool={tool} k="averageJobRevenue" label="Average job revenue" prefix="$" invalid={avg <= 0} hint="Revenue divided by jobs over the last three to six months." />
            <NumField
              tool={tool}
              k="variableCostPercent"
              label="Variable costs"
              suffix="% of revenue"
              invalid={variableRate >= 1 || variableRate < 0}
              hint="Parts, field labor for the job, permits and card fees. A $1,000 job that uses $350 of these is 35%."
            />
          </InputGroup>
          <InputGroup title="Goal and capacity" text="Optional. How far past break-even you want to be, and how many jobs your crew can run." badge={<SampleTag />}>
            <NumField tool={tool} k="targetProfit" label="Monthly profit you want" prefix="$" hint="After every fixed cost, including your own pay if it is in fixed costs." />
            <NumField tool={tool} k="techs" label="Technicians running calls" suffix="techs" />
            <NumField tool={tool} k="jobsPerTechPerDay" label="Jobs per technician per day" suffix="jobs" hint="A realistic average, not your best day." />
            <NumField tool={tool} k="workDays" label="Working days in the month" suffix="days" />
          </InputGroup>
        </>
      }
      results={
        result ? (
          <>
            <ResultHero
              label="Break-even point"
              value={String(result.breakEvenJobs)}
              unit="jobs a month"
              note={
                <>
                  {result.breakEvenJobsExact.toFixed(1)} exactly, rounded up · about {result.breakEvenJobsPerWeek.toFixed(1)} a week ·{" "}
                  <span className="font-semibold text-[#e8d9ac]">{money(result.breakEvenRevenue, 0)}</span> of revenue.
                </>
              }
            />
            <ResultTiles>
              <ResultTile label="Each job leaves" value={money(result.contributionPerJob)} note="toward fixed costs" strong />
              <ResultTile label="Contribution margin" value={pct(result.contributionMarginRate)} note="of every dollar billed" />
              <ResultTile label={`Jobs for ${money(target, 0)} profit`} value={targetJobs === null ? "–" : String(targetJobs)} note={targetJobs === null ? "" : `${money(targetJobs * avg, 0)} of revenue`} />
              <ResultTile
                label="Capacity used at break-even"
                value={capacity > 0 ? pct(result.breakEvenJobs / capacity, 0) : "–"}
                note={capacity > 0 ? `of ${int(capacity)} jobs a month` : "enter crew capacity"}
                tone={capacity > 0 && result.breakEvenJobs > capacity ? "negative" : "neutral"}
              />
            </ResultTiles>
            {capacity > 0 && result.breakEvenJobs > capacity ? (
              <NoResult title="Past your crew's capacity" text="Break-even needs more jobs than the crew can run. Raise the average ticket, lower variable costs or fixed costs, or add capacity." />
            ) : null}
          </>
        ) : (
          <NoResult title="No break-even yet" text={problem} />
        )
      }
      analysis={<Analysis fixed={fixed} avg={avg} variableRate={variableRate} target={target} targetJobs={targetJobs} capacity={capacity} result={result} />}
    />
  );
}

function Analysis({
  fixed,
  avg,
  variableRate,
  target,
  targetJobs,
  capacity,
  result,
}: {
  readonly fixed: number;
  readonly avg: number;
  readonly variableRate: number;
  readonly target: number;
  readonly targetJobs: number | null;
  readonly capacity: number;
  readonly result: BreakEvenResult | null;
}) {
  if (!result) {
    return (
      <AnalysisGrid>
        <AnalysisCard title="Revenue against costs">
          <EmptyAnalysis />
        </AnalysisCard>
        <AnalysisCard title="Which lever moves it most">
          <EmptyAnalysis />
        </AnalysisCard>
      </AnalysisGrid>
    );
  }

  const xMax = Math.max(10, Math.ceil(Math.max(result.breakEvenJobsExact * 2, capacity * 1.05, (targetJobs ?? 0) * 1.15)));
  const revenue = (x: number) => x * avg;
  const cost = (x: number) => fixed + x * avg * variableRate;
  const be = result.breakEvenJobsExact;
  const tickets = [-0.2, -0.1, 0, 0.1, 0.2];
  const variableSteps = Array.from(new Set([variableRate - 0.1, variableRate - 0.05, variableRate, variableRate + 0.05].map((r) => Math.round(r * 1000) / 1000))).filter((r) => r >= 0 && r < 1);
  const levels = capacity > 0 ? [0.5, 0.75, 1] : [];

  return (
    <div className="space-y-5">
      <AnalysisGrid>
        <AnalysisCard
          wide
          title="Revenue against costs"
          text="Every job adds its revenue and its variable costs. Below the break-even point the gap is a loss (red); past it, every job is profit (green)."
        >
          <LineChart
            ariaLabel="Monthly revenue and total costs by number of jobs"
            xMax={xMax}
            xLabel="Jobs in the month"
            formatX={(x) => `${Math.round(x)}`}
            formatY={(y) => (Math.abs(y) >= 1000 ? `$${(y / 1000).toLocaleString("en-US", { maximumFractionDigits: 0 })}k` : `$${Math.round(y)}`)}
            series={[
              { key: "rev", label: "Revenue", color: CHART.ink, points: [[0, 0], [xMax, revenue(xMax)]] },
              { key: "cost", label: "Total costs (fixed + variable)", color: CHART.brass, points: [[0, cost(0)], [xMax, cost(xMax)]] },
              { key: "fixed", label: "Fixed costs", color: CHART.light, points: [[0, fixed], [xMax, fixed]], dashed: true },
            ]}
            areas={[
              { key: "loss", color: CHART.loss, points: [[0, 0], [0, cost(0)], [Math.min(be, xMax), cost(Math.min(be, xMax))], [Math.min(be, xMax), revenue(Math.min(be, xMax))]] },
              ...(be < xMax ? [{ key: "profit", color: CHART.profit, points: [[be, revenue(be)] as const, [xMax, revenue(xMax)] as const, [xMax, cost(xMax)] as const] }] : []),
            ]}
            markers={[{ key: "be", x: be, y: revenue(be), label: `Break-even: ${result.breakEvenJobs} jobs`, tone: "strong" }]}
            guides={[
              ...(capacity > 0 ? [{ key: "cap", x: capacity, label: `Crew capacity ${int(capacity)}` }] : []),
              ...(targetJobs !== null && target > 0 ? [{ key: "goal", x: targetJobs, label: `Goal ${targetJobs}` }] : []),
            ]}
          />
        </AnalysisCard>

        <AnalysisCard title="Which lever moves it most" text="Break-even jobs a month if the average ticket or the variable cost share changed. Your month is highlighted.">
          <WhatIfTable
            caption="Break-even jobs by average job revenue and variable cost share"
            corner="Average job"
            minWidth={400}
            columns={variableSteps.map((r) => ({ key: String(r), label: `${pct(r)} var.`, current: Math.abs(r - variableRate) < 1e-9 }))}
            rows={tickets.map((change) => {
              const ticket = avg * (1 + change);
              return {
                key: String(change),
                current: change === 0,
                label: (
                  <>
                    {money(ticket, 0)}
                    {change !== 0 ? <span className="ml-1 text-xs font-normal text-stone-500">{change > 0 ? "+" : "−"}{Math.abs(change * 100)}%</span> : null}
                  </>
                ),
                cells: variableSteps.map((r) => {
                  const res = calculateBreakEven({ fixedMonthlyCosts: fixed, averageJobRevenue: ticket, variableCostRate: r });
                  return { text: res ? `${res.breakEvenJobs} jobs` : "–" };
                }),
              };
            })}
          />
        </AnalysisCard>

        <AnalysisCard title="Profit at your crew's pace" text={capacity > 0 ? `Monthly profit if the crew runs part or all of its ${int(capacity)} jobs.` : "Enter technicians, jobs a day and working days to see profit at your crew's pace."}>
          {levels.length > 0 ? (
            <dl className="mt-3 grid gap-2.5 sm:grid-cols-3">
              {levels.map((level) => {
                const jobs = Math.floor(capacity * level);
                const profit = jobs * result.contributionPerJob - fixed;
                return <ResultTile key={level} label={`${Math.round(level * 100)}% · ${int(jobs)} jobs`} value={money(profit, 0)} note="profit a month" tone={profit < 0 ? "negative" : "positive"} />;
              })}
            </dl>
          ) : (
            <EmptyAnalysis text="No capacity entered." />
          )}
        </AnalysisCard>

        <AnalysisCard wide title="The formula, with your numbers">
          <YourMath
            rows={[
              { label: "Each job leaves", working: `${money(avg)} × (1 − ${pct(variableRate)})`, value: money(result.contributionPerJob) },
              { label: "Break-even jobs", working: `${money(fixed, 0)} ÷ ${money(result.contributionPerJob)} = ${result.breakEvenJobsExact.toFixed(2)}, rounded up`, value: String(result.breakEvenJobs), strong: true },
              { label: "Break-even revenue", working: `${money(fixed, 0)} ÷ (1 − ${pct(variableRate)})`, value: money(result.breakEvenRevenue), strong: true },
              { label: "Jobs per week", working: `${result.breakEvenJobsExact.toFixed(2)} ÷ (52 ÷ 12)`, value: (result.breakEvenJobsExact / WEEKS_PER_MONTH).toFixed(1) },
              ...(targetJobs !== null ? [{ label: "Jobs for your profit goal", working: `(${money(fixed, 0)} + ${money(target, 0)}) ÷ ${money(result.contributionPerJob)}, rounded up`, value: String(targetJobs) }] : []),
            ]}
          />
        </AnalysisCard>
      </AnalysisGrid>
    </div>
  );
}
