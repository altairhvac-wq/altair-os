"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { focusRing } from "@/shared/components/resources/tools/ToolControls";
import { writeCarried } from "@/shared/components/resources/calc/carry";
import {
  AnalysisCard,
  AnalysisGrid,
  CalculatorTool,
  Chips,
  EmptyAnalysis,
  InputGroup,
  NoResult,
  NumField,
  Panel,
  ResultHero,
  ResultReading,
  ResultTile,
  ResultTiles,
  WhatIfTable,
  YourMath,
  hours,
  money,
  pct,
} from "@/shared/components/resources/calc/CalculatorTool";
import { CHART, SplitBar } from "@/shared/components/resources/calc/charts";
import { num, useCalculatorTool, type CalcPreset } from "@/shared/components/resources/calc/useCalculatorTool";
import { CompactCalculator, CompactStat, withNumbers } from "@/shared/components/resources/calc/CompactCalculator";
import { LABOR_RATE_DEFAULTS as D, calculateLaborRate, type LaborRateInput, type LaborRateResult } from "@/shared/lib/resources/labor-rate";
import { calculatorPath } from "@/shared/lib/resources/catalog";
import { LABOR_WORKSPACE_PATH } from "@/shared/lib/resources/tool-hub";

const KEYS = ["hourlyWage", "burdenPercent", "billableHoursPerWeek", "nonBillableHoursPerWeek", "monthlyOverhead", "targetMarginPercent", "currentRate"] as const;
type K = (typeof KEYS)[number];

const EXAMPLE: Record<K, string> = {
  hourlyWage: String(D.hourlyWage),
  burdenPercent: String(D.burdenRate * 100),
  billableHoursPerWeek: String(D.billableHoursPerWeek),
  nonBillableHoursPerWeek: String(D.nonBillableHoursPerWeek),
  monthlyOverhead: String(D.monthlyOverhead),
  targetMarginPercent: String(D.targetNetMargin * 100),
  currentRate: "110",
};

const PRESETS: readonly CalcPreset<K>[] = [
  { id: "example", label: "Worked example", text: "$30 wage, 25% burden, 30 of 40 hours billed. The numbers in the guide below.", values: EXAMPLE },
  {
    id: "senior",
    label: "Senior technician",
    text: "$38 wage, 28% burden, 32 of 40 hours billed. Made-up numbers.",
    values: { hourlyWage: "38", burdenPercent: "28", billableHoursPerWeek: "32", nonBillableHoursPerWeek: "8", monthlyOverhead: "6000", targetMarginPercent: "20", currentRate: "125" },
  },
  {
    id: "blank",
    label: "Start blank",
    text: "Empty fields for one of your technicians.",
    values: { hourlyWage: "", burdenPercent: "", billableHoursPerWeek: "", nonBillableHoursPerWeek: "", monthlyOverhead: "", targetMarginPercent: "", currentRate: "" },
  },
];

function toInput(v: Record<K, string>): LaborRateInput {
  return {
    hourlyWage: num(v.hourlyWage),
    burdenRate: num(v.burdenPercent) / 100,
    billableHoursPerWeek: num(v.billableHoursPerWeek),
    nonBillableHoursPerWeek: num(v.nonBillableHoursPerWeek),
    monthlyOverhead: num(v.monthlyOverhead),
    targetNetMargin: num(v.targetMarginPercent) / 100,
  };
}

/**
 * The quick six-input version. The full crew version is the Labor Cost Workspace.
 * `compact`: the version built into an Insights article, with a link to this
 * full calculator and to the workspace.
 */
export function LaborRateTool({ compact = false }: { readonly compact?: boolean } = {}) {
  const tool = useCalculatorTool<K>({ slug: "labor-rate", keys: KEYS, presets: PRESETS });
  const input = toInput(tool.values);
  const result = calculateLaborRate(input);
  const marginBad = input.targetNetMargin >= 1 || input.targetNetMargin < 0;
  const currentRate = tool.values.currentRate.trim() === "" ? null : num(tool.values.currentRate);

  // Carry the result to the other calculators (this browser only), once the
  // visitor has typed or pressed something: never the untouched example.
  const billedRate = result?.billableHourlyRateRounded ?? 0;
  const costPerBilledHour = result?.costPerBillableHour ?? 0;
  const loadedLaborCost = result?.loadedHourlyCost ?? 0;
  const wage = input.hourlyWage;
  const { interacted } = tool;
  useEffect(() => {
    if (!interacted.current || billedRate <= 0 || wage <= 0) return;
    writeCarried({ source: "labor-rate", billedRate, costPerBilledHour, loadedLaborCost, averageWage: wage, monthlyOverhead: null, techCount: null });
  }, [billedRate, costPerBilledHour, loadedLaborCost, wage, interacted]);

  if (compact) {
    return (
      <CompactCalculator
        name="Labor Rate Calculator"
        text="One technician, six numbers. It opens with the example from the labor rate guide; change any of them."
        tool={tool}
        onReset={() => tool.loadPreset(PRESETS[0])}
        inputs={
          <>
            <NumField tool={tool} k="hourlyWage" label="Technician wage" prefix="$" suffix="/hr" />
            <NumField tool={tool} k="burdenPercent" label="Payroll costs (labor burden)" suffix="% of wage" hint="Payroll taxes, workers' comp, insurance, benefits." />
            <NumField tool={tool} k="billableHoursPerWeek" label="Hours billed to customers" suffix="hrs/wk" invalid={input.billableHoursPerWeek <= 0 && tool.values.billableHoursPerWeek !== ""} />
            <NumField tool={tool} k="nonBillableHoursPerWeek" label="Paid hours you can't bill" suffix="hrs/wk" hint="Drive, shop, training, free callbacks." />
            <NumField tool={tool} k="monthlyOverhead" label="Shop costs for this tech" prefix="$" suffix="/mo" hint="Monthly overhead ÷ field technicians." />
            <NumField tool={tool} k="targetMarginPercent" label="Profit to keep (net margin)" suffix="%" invalid={marginBad} />
          </>
        }
        results={
          result ? (
            <>
              <ResultHero
                label="Billable hourly rate"
                value={money(result.billableHourlyRate)}
                unit="per billed hour"
                note={
                  <>
                    Quote <span className="font-semibold text-[#e8d9ac]">{money(result.billableHourlyRateRounded, 0)}</span> rounded up, at a {pct(input.targetNetMargin)} net margin.
                  </>
                }
              />
              <dl className="space-y-2 rounded-xl border border-stone-200 bg-white p-3.5">
                <CompactStat label="Break-even rate" value={money(result.costPerBillableHour)} note="cost per billed hour" />
                <CompactStat label="Loaded hourly cost" value={money(result.loadedHourlyCost)} note="wage plus burden" />
                <CompactStat label="Weekly cost" value={money(result.weeklyTotalCost, 0)} note="labor plus overhead share" />
              </dl>
            </>
          ) : (
            <NoResult title="No rate yet" text={marginBad ? "Set a target margin from 0% to 99%." : "Enter more than 0 billable hours a week to see a rate."} />
          )
        }
        fullHref={withNumbers(calculatorPath("labor-rate"), tool.values)}
        fullLabel="Open the full calculator with these numbers"
        fullTrack="next-tool-labor-rate-embed"
        footnote={
          <>
            Once you change a number, this rate is offered to the other calculators, in this browser only. For a whole crew, use the{" "}
            <Link href={LABOR_WORKSPACE_PATH} className="font-medium text-[#77591B] hover:underline">
              Labor Cost Workspace
            </Link>
            .
          </>
        }
      />
    );
  }

  return (
    <CalculatorTool
      name="Quick Labor Rate Calculator"
      tool={tool}
      printTitle="Labor rate for one technician"
      mobile={{
        label: "Billable rate",
        value: result ? `${money(result.billableHourlyRate)}/hr` : "Check inputs",
        note: result ? `break-even ${money(result.costPerBillableHour)}` : undefined,
      }}
      printInputs={[
        { label: "Technician wage", value: money(input.hourlyWage) },
        { label: "Labor burden", value: pct(input.burdenRate) },
        { label: "Billable hours per week", value: hours(input.billableHoursPerWeek) },
        { label: "Paid non-billable hours per week", value: hours(input.nonBillableHoursPerWeek) },
        { label: "Overhead allocated per month", value: money(input.monthlyOverhead, 0) },
        { label: "Target net margin", value: pct(input.targetNetMargin) },
        ...(currentRate !== null ? [{ label: "Hourly rate now", value: money(currentRate) }] : []),
      ]}
      carry={
        <div className="flex flex-col gap-3 bg-stone-50/80 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6 print:hidden">
          <p className="max-w-xl text-[13px] leading-relaxed text-stone-600">
            <strong className="font-semibold text-stone-900">The quick version:</strong> one technician, six numbers. For a whole crew,
            itemized burden, a flat-rate price book and an after-hours rate card, use the full workspace.
          </p>
          <Link href={LABOR_WORKSPACE_PATH} className={`inline-flex shrink-0 items-center gap-1 rounded text-[13px] font-semibold text-[#77591B] hover:underline ${focusRing}`}>
            Open the Labor Cost Workspace <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
          </Link>
        </div>
      }
      inputs={
        <>
          <InputGroup title="The technician">
            <NumField tool={tool} k="hourlyWage" label="Technician wage" prefix="$" suffix="/hr" hint="Base hourly pay from the pay stub." find={FIND.hourlyWage} />
            <NumField tool={tool} k="burdenPercent" label="Payroll costs (labor burden)" suffix="% of wage" hint="Payroll taxes, workers' comp, insurance and benefits, as a share of the wage." find={FIND.burdenPercent} />
          </InputGroup>
          <InputGroup title="The week">
            <NumField tool={tool} k="billableHoursPerWeek" label="Hours billed to customers" suffix="hrs/wk" invalid={input.billableHoursPerWeek <= 0 && tool.values.billableHoursPerWeek !== ""} hint="Hours that end up on an invoice. The input that moves the rate most." find={FIND.billableHoursPerWeek} />
            <NumField tool={tool} k="nonBillableHoursPerWeek" label="Paid hours you can't bill" suffix="hrs/wk" hint="Drive, shop, training, free callbacks." find={FIND.nonBillableHoursPerWeek} />
          </InputGroup>
          <InputGroup title="Overhead and margin">
            <NumField tool={tool} k="monthlyOverhead" label="Shop costs for this technician (overhead)" prefix="$" suffix="/mo" hint="Your monthly overhead divided by the number of field technicians." find={FIND.monthlyOverhead} />
            <NumField tool={tool} k="targetMarginPercent" label="Profit to keep (net margin)" suffix="%" invalid={marginBad} hint="Profit as a share of the billed rate, after every cost." find={FIND.targetMarginPercent} />
            <div className="sm:col-span-2">
              <Chips tool={tool} k="targetMarginPercent" options={["10", "15", "20", "25", "30"]} suffix="%" />
            </div>
          </InputGroup>
          <InputGroup title="Compare with today" badge={<OptionalBadge />}>
            <NumField tool={tool} k="currentRate" label="Your hourly rate now" prefix="$" suffix="/hr" placeholder="Leave blank to skip" hint="What you charge per hour today, to see if it's enough." find={FIND.currentRate} />
          </InputGroup>
        </>
      }
      results={
        result ? (
          <>
            <ResultHero
              label="Billable hourly rate"
              value={money(result.billableHourlyRate)}
              unit="per billed hour"
              note={
                <>
                  Quote <span className="font-semibold text-[#e8d9ac]">{money(result.billableHourlyRateRounded, 0)}</span> rounded up, at a {pct(input.targetNetMargin)} net margin.
                </>
              }
            />
            <Reading input={input} result={result} currentRate={currentRate} />
            <ResultTiles>
              <ResultTile label="Break-even rate" value={money(result.costPerBillableHour)} note="cost per billed hour" strong />
              <ResultTile label="Loaded hourly cost" value={money(result.loadedHourlyCost)} note="wage plus burden, per paid hour" />
              <ResultTile label="Weekly cost" value={money(result.weeklyTotalCost, 0)} note="labor plus overhead share" />
              <ResultTile label="Share of paid hours billed" value={result.paidHoursPerWeek > 0 ? pct(input.billableHoursPerWeek / result.paidHoursPerWeek) : "–"} note={`of ${hours(result.paidHoursPerWeek)} paid`} />
              <ResultTile label="Markup on cost" value={result.costPerBillableHour > 0 ? pct(result.billableHourlyRate / result.costPerBillableHour - 1) : "–"} note={`the same as a ${pct(input.targetNetMargin)} margin`} />
              <ResultTile label="Billed per year" value={money(result.billableHourlyRate * input.billableHoursPerWeek * 52, 0)} note="this tech, 52 working weeks" />
            </ResultTiles>
            <Panel title="What one billed hour pays for">
              <SplitBar ariaLabel="The billable rate split by what it pays for" format={(n) => money(n)} slices={rateSlices(input, result)} />
            </Panel>
            <p className="flex items-start gap-2 text-xs leading-relaxed text-stone-600">
              <Check aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <span>
                Once you change a number, this rate is offered to the{" "}
                <Link href={calculatorPath("maintenance-agreement")} className="font-medium text-[#77591B] hover:underline">agreement</Link>,{" "}
                <Link href={calculatorPath("callback-cost")} className="font-medium text-[#77591B] hover:underline">callback</Link> and{" "}
                <Link href={calculatorPath("job-profitability")} className="font-medium text-[#77591B] hover:underline">job profit</Link> calculators,
                and to the workspace&apos;s price book, in this browser only.
              </span>
            </p>
          </>
        ) : (
          <NoResult title="No rate yet" text={marginBad ? "Set a target margin from 0% to 99%." : "Enter more than 0 billable hours a week to see a rate."} />
        )
      }
      analysis={<Analysis input={input} result={result} />}
    />
  );
}

const FIND: Record<K, React.ReactNode> = {
  hourlyWage: "Your payroll register, or this technician's latest pay stub. Use the regular hourly rate, not the overtime rate.",
  burdenPercent: (
    <>
      Add these up as a percent of wages: Social Security and Medicare (7.65%), federal and state unemployment, your workers&apos; comp rate (it&apos;s
      on your policy, per $100 of payroll), and health insurance or other benefits you pay. Your payroll provider&apos;s employer-cost or tax report
      adds up most of it.
    </>
  ),
  billableHoursPerWeek:
    "Add up the labor hours on this technician's invoices for the last month or two and divide by the number of weeks. If your software doesn't track it, use the hours on site at paying jobs from the timesheets.",
  nonBillableHoursPerWeek: "Hours on the timesheet each week, minus the billable hours. Drive time, shop time, meetings, training and unpaid callbacks all land here.",
  monthlyOverhead: (
    <>
      Open your Profit and Loss report for the last 12 months (in QuickBooks: Reports, then Profit and Loss). Take total expenses and subtract
      technician wages and the parts you bought for jobs. What&apos;s left is overhead: rent, trucks, fuel, insurance, office pay, software, and your own
      pay if you don&apos;t work in the field. Divide it by 12, then by the number of field technicians.
    </>
  ),
  targetMarginPercent:
    "Your choice. A 20% net margin means $20 of every $100 billed is profit after every cost. It isn't markup: a 20% margin is a 25% markup on cost.",
  currentRate:
    "The hourly labor rate in your price book. If you price flat rate, take a common repair's price minus its parts, and divide by the hours it usually takes.",
};

function OptionalBadge() {
  return <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-600">Optional</span>;
}

/** The rate read back in plain words, against the rate charged today when one is given. */
function Reading({ input, result, currentRate }: { readonly input: LaborRateInput; readonly result: LaborRateResult; readonly currentRate: number | null }) {
  const efficiency = result.paidHoursPerWeek > 0 ? input.billableHoursPerWeek / result.paidHoursPerWeek : 0;
  const efficiencyLine =
    efficiency < 0.65
      ? `Only ${pct(efficiency, 0)} of this technician's paid hours are billed. Every unbilled hour is paid for by the billed ones, so more billed hours lower the rate you need faster than anything else.`
      : null;
  if (currentRate === null || currentRate <= 0) {
    return (
      <ResultReading tone={efficiencyLine ? "watch" : "good"} title={`To cover this technician and keep ${pct(input.targetNetMargin)}, bill at least ${money(result.billableHourlyRateRounded, 0)} an hour.`}>
        <p>Below {money(result.costPerBillableHour)} an hour, every billed hour loses money. Enter the rate you charge now, under Compare with today, to see where you stand.</p>
        {efficiencyLine ? <p>{efficiencyLine}</p> : null}
      </ResultReading>
    );
  }
  const margin = (currentRate - result.costPerBillableHour) / currentRate;
  const perYear = (gap: number) => money(Math.abs(gap) * input.billableHoursPerWeek * 52, 0);
  if (currentRate < result.costPerBillableHour) {
    return (
      <ResultReading tone="bad" title={`At ${money(currentRate, 0)} an hour you lose ${money(result.costPerBillableHour - currentRate)} on every billed hour.`}>
        <p>
          That is about {perYear(result.costPerBillableHour - currentRate)} a year on this technician alone. Break-even is {money(result.costPerBillableHour)}; your
          target is {money(result.billableHourlyRateRounded, 0)}.
        </p>
        {efficiencyLine ? <p>{efficiencyLine}</p> : null}
      </ResultReading>
    );
  }
  if (currentRate < result.billableHourlyRate) {
    return (
      <ResultReading tone="watch" title={`${money(currentRate, 0)} an hour covers costs, but leaves only a ${pct(margin)} margin.`}>
        <p>
          To reach {pct(input.targetNetMargin)}, the rate goes up {money(result.billableHourlyRateRounded - currentRate, 0)}, to {money(result.billableHourlyRateRounded, 0)}. That gap
          is about {perYear(result.billableHourlyRate - currentRate)} a year on this technician.
        </p>
        {efficiencyLine ? <p>{efficiencyLine}</p> : null}
      </ResultReading>
    );
  }
  return (
    <ResultReading tone="good" title={`${money(currentRate, 0)} an hour meets your target: a ${pct(margin)} margin.`}>
      <p>You clear break-even ({money(result.costPerBillableHour)}) by {money(currentRate - result.costPerBillableHour)} an hour. Check again when wages, insurance or overhead go up.</p>
      {efficiencyLine ? <p>{efficiencyLine}</p> : null}
    </ResultReading>
  );
}

function rateSlices(input: LaborRateInput, r: LaborRateResult) {
  const billable = input.billableHoursPerWeek;
  return [
    { key: "billed", label: "Wage and burden for the billed hour", value: r.loadedHourlyCost, color: CHART.ink },
    { key: "unbilled", label: "Paid hours nobody is billed for", value: (r.loadedHourlyCost * input.nonBillableHoursPerWeek) / billable, color: CHART.stone },
    { key: "overhead", label: "Overhead", value: r.weeklyOverhead / billable, color: CHART.light },
    { key: "profit", label: "Profit", value: r.billableHourlyRate - r.costPerBillableHour, color: CHART.profit },
  ];
}

function Analysis({ input, result }: { readonly input: LaborRateInput; readonly result: LaborRateResult | null }) {
  if (!result) {
    return (
      <AnalysisGrid>
        <AnalysisCard title="Billable hours against the rate">
          <EmptyAnalysis />
        </AnalysisCard>
        <AnalysisCard title="The formula, with your numbers">
          <EmptyAnalysis />
        </AnalysisCard>
      </AnalysisGrid>
    );
  }
  const paid = result.paidHoursPerWeek;
  const billRows = Array.from(new Set([20, 24, 28, 30, 32, 34, 36, input.billableHoursPerWeek].filter((b) => b > 0 && b <= paid))).sort((a, b) => a - b);
  const margins = Array.from(new Set([0, 0.1, 0.2, 0.3, input.targetNetMargin])).filter((m) => m >= 0 && m < 1).sort((a, b) => a - b);

  return (
    <AnalysisGrid>
      <AnalysisCard
        title="Billable hours against the rate"
        text={`The same ${hours(paid)} paid a week, split differently between billed and unbilled time. 0% margin is the break-even rate.`}
      >
        <WhatIfTable
          caption="Billable rate by billable hours per week and target margin"
          corner="Billed of paid"
          minWidth={420}
          columns={margins.map((m) => ({ key: String(m), label: m === 0 ? "Break-even" : `${pct(m)} margin`, current: Math.abs(m - input.targetNetMargin) < 1e-9 }))}
          rows={billRows.map((b) => ({
            key: String(b),
            current: Math.abs(b - input.billableHoursPerWeek) < 1e-9,
            label: (
              <>
                {hours(b)} <span className="text-xs font-normal text-stone-500">· {pct(b / paid, 0)}</span>
              </>
            ),
            cells: margins.map((m) => {
              const r = calculateLaborRate({ ...input, billableHoursPerWeek: b, nonBillableHoursPerWeek: paid - b, targetNetMargin: m });
              return { text: r ? money(r.billableHourlyRate) : "–" };
            }),
          }))}
        />
      </AnalysisCard>
      <AnalysisCard title="The formula, with your numbers">
        <YourMath
          rows={[
            { label: "Loaded hourly cost", working: `${money(input.hourlyWage)} × (1 + ${pct(input.burdenRate)})`, value: money(result.loadedHourlyCost) },
            { label: "Weekly labor cost", working: `${money(result.loadedHourlyCost)} × ${hours(paid)}`, value: money(result.weeklyLaborCost) },
            { label: "Weekly overhead", working: `${money(input.monthlyOverhead, 0)} × 12 ÷ 52`, value: money(result.weeklyOverhead) },
            { label: "Cost per billable hour", working: `${money(result.weeklyTotalCost)} ÷ ${hours(input.billableHoursPerWeek)}`, value: money(result.costPerBillableHour), strong: true },
            { label: "Billable rate", working: `${money(result.costPerBillableHour)} ÷ (1 − ${pct(input.targetNetMargin)})`, value: money(result.billableHourlyRate), strong: true },
            { label: "Rounded up to quote", value: money(result.billableHourlyRateRounded, 0) },
          ]}
        />
      </AnalysisCard>
    </AnalysisGrid>
  );
}
