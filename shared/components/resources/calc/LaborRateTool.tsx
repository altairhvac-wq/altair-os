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
import { LABOR_RATE_DEFAULTS as D, calculateLaborRate, type LaborRateInput, type LaborRateResult } from "@/shared/lib/resources/labor-rate";
import { calculatorPath } from "@/shared/lib/resources/catalog";
import { LABOR_WORKSPACE_PATH } from "@/shared/lib/resources/tool-hub";

const KEYS = ["hourlyWage", "burdenPercent", "billableHoursPerWeek", "nonBillableHoursPerWeek", "monthlyOverhead", "targetMarginPercent"] as const;
type K = (typeof KEYS)[number];

const EXAMPLE: Record<K, string> = {
  hourlyWage: String(D.hourlyWage),
  burdenPercent: String(D.burdenRate * 100),
  billableHoursPerWeek: String(D.billableHoursPerWeek),
  nonBillableHoursPerWeek: String(D.nonBillableHoursPerWeek),
  monthlyOverhead: String(D.monthlyOverhead),
  targetMarginPercent: String(D.targetNetMargin * 100),
};

const PRESETS: readonly CalcPreset<K>[] = [
  { id: "example", label: "Worked example", text: "$30 wage, 25% burden, 30 of 40 hours billed. The numbers in the guide below.", values: EXAMPLE },
  {
    id: "senior",
    label: "Senior technician",
    text: "$38 wage, 28% burden, 32 of 40 hours billed. Made-up numbers.",
    values: { hourlyWage: "38", burdenPercent: "28", billableHoursPerWeek: "32", nonBillableHoursPerWeek: "8", monthlyOverhead: "6000", targetMarginPercent: "20" },
  },
  {
    id: "blank",
    label: "Start blank",
    text: "Empty fields for one of your technicians.",
    values: { hourlyWage: "", burdenPercent: "", billableHoursPerWeek: "", nonBillableHoursPerWeek: "", monthlyOverhead: "", targetMarginPercent: "" },
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

/** The quick six-input version. The full crew version is the Labor Cost Workspace. */
export function LaborRateTool() {
  const tool = useCalculatorTool<K>({ slug: "labor-rate", keys: KEYS, presets: PRESETS });
  const input = toInput(tool.values);
  const result = calculateLaborRate(input);
  const marginBad = input.targetNetMargin >= 1 || input.targetNetMargin < 0;

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
            <NumField tool={tool} k="hourlyWage" label="Technician wage" prefix="$" suffix="/hr" hint="Base hourly pay from the pay stub." />
            <NumField tool={tool} k="burdenPercent" label="Labor burden" suffix="% of wage" hint="Payroll taxes, workers' comp, insurance and benefits. Your payroll provider can give you this." />
          </InputGroup>
          <InputGroup title="The week">
            <NumField tool={tool} k="billableHoursPerWeek" label="Billable hours" suffix="hrs/wk" invalid={input.billableHoursPerWeek <= 0 && tool.values.billableHoursPerWeek !== ""} hint="Hours that end up on an invoice. The input that moves the rate most." />
            <NumField tool={tool} k="nonBillableHoursPerWeek" label="Paid, not billable" suffix="hrs/wk" hint="Drive, shop, training, free callbacks." />
          </InputGroup>
          <InputGroup title="Overhead and margin">
            <NumField tool={tool} k="monthlyOverhead" label="Overhead for this technician" prefix="$" suffix="/mo" hint="Monthly overhead divided by the number of field technicians." />
            <NumField tool={tool} k="targetMarginPercent" label="Target net margin" suffix="%" invalid={marginBad} hint="Profit as a share of the billed rate." />
            <div className="sm:col-span-2">
              <Chips tool={tool} k="targetMarginPercent" options={["10", "15", "20", "25", "30"]} suffix="%" />
            </div>
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
            <ResultTiles>
              <ResultTile label="Break-even rate" value={money(result.costPerBillableHour)} note="cost per billed hour" strong />
              <ResultTile label="Loaded hourly cost" value={money(result.loadedHourlyCost)} note="wage plus burden, per paid hour" />
              <ResultTile label="Weekly cost" value={money(result.weeklyTotalCost, 0)} note="labor plus overhead share" />
              <ResultTile label="Billable efficiency" value={result.paidHoursPerWeek > 0 ? pct(input.billableHoursPerWeek / result.paidHoursPerWeek) : "–"} note={`of ${hours(result.paidHoursPerWeek)} paid`} />
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
