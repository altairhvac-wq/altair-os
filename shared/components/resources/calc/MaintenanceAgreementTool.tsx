"use client";

import { SampleTag } from "@/shared/components/resources/tools/ToolControls";
import { useCarried } from "@/shared/components/resources/calc/carry";
import {
  AnalysisCard,
  AnalysisGrid,
  CalculatorTool,
  CarryBanner,
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
import {
  MAINTENANCE_AGREEMENT_DEFAULTS as D,
  calculateMaintenanceAgreement,
  type MaintenanceAgreementInput,
  type MaintenanceAgreementResult,
} from "@/shared/lib/resources/maintenance-agreement";

const KEYS = [
  "visitsPerYear",
  "hoursPerVisit",
  "costPerBillableHour",
  "materialsPerVisit",
  "officeCostPerYear",
  "expectedRepairSpendPerYear",
  "repairDiscountPercent",
  "targetMarginPercent",
  "members",
  "regularRate",
] as const;
type K = (typeof KEYS)[number];

const EXAMPLE: Record<K, string> = {
  visitsPerYear: String(D.visitsPerYear),
  hoursPerVisit: String(D.hoursPerVisit),
  costPerBillableHour: String(D.costPerBillableHour),
  materialsPerVisit: String(D.materialsPerVisit),
  officeCostPerYear: String(D.officeCostPerYear),
  expectedRepairSpendPerYear: String(D.expectedRepairSpendPerYear),
  repairDiscountPercent: String(D.repairDiscountRate * 100),
  targetMarginPercent: String(D.targetNetMargin * 100),
  members: "150",
  regularRate: "121",
};

const PRESETS: readonly CalcPreset<K>[] = [
  { id: "example", label: "Worked example", text: "Two visits a year, 1.5 hours each, $96 cost per hour. The numbers in the guide below.", values: EXAMPLE },
  {
    id: "premium",
    label: "Two-system home",
    text: "Two systems, four visits a year, 20% repair discount. Made-up numbers.",
    values: { ...EXAMPLE, visitsPerYear: "4", hoursPerVisit: "1.25", materialsPerVisit: "20", officeCostPerYear: "30", expectedRepairSpendPerYear: "450", repairDiscountPercent: "20" },
  },
  {
    id: "blank",
    label: "Start blank",
    text: "Empty fields for your own agreement.",
    values: { visitsPerYear: "", hoursPerVisit: "", costPerBillableHour: "", materialsPerVisit: "", officeCostPerYear: "", expectedRepairSpendPerYear: "", repairDiscountPercent: "", targetMarginPercent: "", members: "", regularRate: "" },
  },
];

function toInput(v: Record<K, string>, override: Partial<MaintenanceAgreementInput> = {}): MaintenanceAgreementInput {
  return {
    visitsPerYear: num(v.visitsPerYear),
    hoursPerVisit: num(v.hoursPerVisit),
    costPerBillableHour: num(v.costPerBillableHour),
    materialsPerVisit: num(v.materialsPerVisit),
    officeCostPerYear: num(v.officeCostPerYear),
    expectedRepairSpendPerYear: num(v.expectedRepairSpendPerYear),
    repairDiscountRate: num(v.repairDiscountPercent) / 100,
    targetNetMargin: num(v.targetMarginPercent) / 100,
    ...override,
  };
}

export function MaintenanceAgreementTool() {
  const tool = useCalculatorTool<K>({ slug: "maintenance-agreement", keys: KEYS, presets: PRESETS });
  const carried = useCarried();
  const v = tool.values;
  const input = toInput(v);
  const result = calculateMaintenanceAgreement(input);
  const marginBad = input.targetNetMargin >= 1 || input.targetNetMargin < 0;
  const discountBad = input.repairDiscountRate < 0 || input.repairDiscountRate > 1;
  const problem =
    input.visitsPerYear <= 0
      ? "Enter at least one visit a year to price the agreement."
      : marginBad
        ? "Set a target margin from 0% to 99%."
        : "Enter a member discount from 0% to 100%.";
  const regularRate = num(v.regularRate);

  return (
    <CalculatorTool
      name="Maintenance Agreement Pricing"
      tool={tool}
      printTitle="Maintenance agreement price worksheet"
      mobile={{
        label: "Agreement price",
        value: result ? `${money(result.monthlyPrice)}/mo` : "Check inputs",
        note: result ? `${money(result.annualPrice, 0)}/yr` : undefined,
      }}
      printInputs={[
        { label: "Visits per year", value: String(input.visitsPerYear) },
        { label: "Hours per visit, drive included", value: hours(input.hoursPerVisit) },
        { label: "Cost per billable hour", value: money(input.costPerBillableHour) },
        { label: "Materials per visit", value: money(input.materialsPerVisit) },
        { label: "Office cost per agreement per year", value: money(input.officeCostPerYear) },
        { label: "Repairs a member buys per year", value: money(input.expectedRepairSpendPerYear) },
        { label: "Member repair discount", value: pct(input.repairDiscountRate) },
        { label: "Target net margin", value: pct(input.targetNetMargin) },
      ]}
      carry={
        <CarryBanner
          tool={tool}
          carried={carried}
          fields={[
            { key: "costPerBillableHour", from: "costPerBilledHour", label: "Cost per billed hour", format: (n) => money(n) },
            { key: "regularRate", from: "billedRate", label: "Labor rate", format: (n) => `${money(n, 0)}/hr` },
          ]}
          emptyText="The visit cost comes from your cost per billed hour. The Labor Cost Workspace works it out and hands it to this calculator."
        />
      }
      inputs={
        <>
          <InputGroup title="The visits" text="What it costs you to keep the promise to show up.">
            <NumField tool={tool} k="visitsPerYear" label="Visits per year" suffix="visits" invalid={input.visitsPerYear <= 0} hint="Scheduled maintenance visits the agreement includes." />
            <NumField tool={tool} k="hoursPerVisit" label="Hours per visit" suffix="hrs" hint="Time on site plus the drive there." />
            <NumField
              tool={tool}
              k="costPerBillableHour"
              label="Cost per billable hour"
              prefix="$"
              suffix="/hr"
              hint="Wage, burden, unbilled time and overhead for one hour: your break-even rate, not the wage."
            />
            <NumField tool={tool} k="materialsPerVisit" label="Materials per visit" prefix="$" hint="Filters, coil cleaner, anything used every time, at your cost." />
          </InputGroup>
          <InputGroup title="Running the plan and member perks" badge={<SampleTag />}>
            <NumField tool={tool} k="officeCostPerYear" label="Office cost per agreement" prefix="$" suffix="/yr" hint="Booking, reminders and billing for one agreement over a year." />
            <NumField tool={tool} k="expectedRepairSpendPerYear" label="Repairs a member buys" prefix="$" suffix="/yr" hint="What a typical member spends on repairs in a year, before the discount." />
            <NumField
              tool={tool}
              k="repairDiscountPercent"
              label="Member repair discount"
              suffix="%"
              invalid={discountBad}
              hint="Enter 0 if members get no discount. The discount is a cost of the agreement."
            />
          </InputGroup>
          <InputGroup title="Margin">
            <NumField tool={tool} k="targetMarginPercent" label="Target net margin" suffix="%" invalid={marginBad} hint="Profit left from the price after its costs. A margin, not a markup." />
            <Chips tool={tool} k="targetMarginPercent" options={["10", "15", "20", "25", "30"]} suffix="%" />
          </InputGroup>
          <InputGroup title="Optional: your program" text="For the program view below the results. Leave blank to skip." badge={<SampleTag />}>
            <NumField tool={tool} k="members" label="Members" suffix="agreements" hint="How many agreements you have, or want to have." />
            <NumField tool={tool} k="regularRate" label="Your regular labor rate" prefix="$" suffix="/hr" hint="To show what the same visits cost a customer without an agreement." />
          </InputGroup>
        </>
      }
      results={
        result ? (
          <>
            <ResultHero
              label="Agreement price"
              value={money(result.monthlyPrice)}
              unit="per month"
              note={
                <>
                  <span className="font-semibold text-[#e8d9ac]">{money(result.annualPrice)}</span> a year at a {pct(input.targetNetMargin)} net margin.
                </>
              }
            />
            <Panel title="Where the yearly price goes">
              <SplitBar ariaLabel="The yearly price split by cost" format={(n) => money(n)} slices={slices(input, result)} />
            </Panel>
            <ResultTiles>
              <ResultTile label="Cost to serve" value={money(result.costToServePerYear)} note="per agreement per year" strong />
              <ResultTile label="Left per agreement" value={money(result.profitPerAgreement)} note="per year" tone="positive" />
              <ResultTile label="Cost per visit" value={money(result.costPerVisit)} note="labor plus materials" />
              <ResultTile label="Repair discount given" value={money(result.repairDiscountGiven)} note="per member per year" />
            </ResultTiles>
          </>
        ) : (
          <NoResult title="No price yet" text={problem} />
        )
      }
      analysis={<Analysis v={v} input={input} result={result} members={num(v.members)} regularRate={regularRate} />}
    />
  );
}

function slices(input: MaintenanceAgreementInput, r: MaintenanceAgreementResult) {
  return [
    { key: "labor", label: "Technician time", value: input.visitsPerYear * input.hoursPerVisit * input.costPerBillableHour, color: CHART.ink },
    { key: "materials", label: "Materials", value: input.visitsPerYear * input.materialsPerVisit, color: CHART.stone },
    { key: "office", label: "Office time", value: input.officeCostPerYear, color: CHART.light },
    { key: "discount", label: "Member repair discount", value: r.repairDiscountGiven, color: CHART.brass },
    { key: "profit", label: "Profit", value: r.profitPerAgreement, color: CHART.profit },
  ];
}

function Analysis({
  v,
  input,
  result,
  members,
  regularRate,
}: {
  readonly v: Record<K, string>;
  readonly input: MaintenanceAgreementInput;
  readonly result: MaintenanceAgreementResult | null;
  readonly members: number;
  readonly regularRate: number;
}) {
  if (!result) {
    return (
      <AnalysisGrid>
        <AnalysisCard title="Price by visits and margin">
          <EmptyAnalysis />
        </AnalysisCard>
        <AnalysisCard title="Your agreement program">
          <EmptyAnalysis />
        </AnalysisCard>
      </AnalysisGrid>
    );
  }

  const margins = Array.from(new Set([0.1, 0.2, 0.3, input.targetNetMargin])).filter((m) => m >= 0 && m < 1).sort((a, b) => a - b);
  const visitRows = Array.from(new Set([1, 2, 3, 4, input.visitsPerYear])).filter((n) => n > 0).sort((a, b) => a - b);
  const nonMember = input.visitsPerYear * (input.hoursPerVisit * regularRate + input.materialsPerVisit);

  return (
    <div className="space-y-5">
      <AnalysisGrid>
        <AnalysisCard title="Price by visits and margin" text="Monthly price for the same visit, materials, office and discount numbers. Your agreement is highlighted.">
          <WhatIfTable
            caption="Monthly agreement price by visits per year and target margin"
            corner="Visits / yr"
            minWidth={380}
            columns={margins.map((m) => ({ key: String(m), label: `${pct(m)} margin`, current: Math.abs(m - input.targetNetMargin) < 1e-9 }))}
            rows={visitRows.map((visits) => ({
              key: String(visits),
              current: visits === input.visitsPerYear,
              label: `${visits} ${visits === 1 ? "visit" : "visits"}`,
              cells: margins.map((m) => {
                const r = calculateMaintenanceAgreement({ ...input, visitsPerYear: visits, targetNetMargin: m });
                return { text: r ? `${money(r.monthlyPrice)}/mo` : "–" };
              }),
            }))}
          />
        </AnalysisCard>

        <AnalysisCard
          title="Your agreement program"
          text={members > 0 ? `${members.toLocaleString("en-US")} members at this price, over a year.` : "Enter a number of members above to see the program as a whole."}
        >
          {members > 0 ? (
            <dl className="mt-3 grid grid-cols-2 gap-2.5">
              <ResultTile label="Agreement revenue" value={money(result.annualPrice * members, 0)} note="per year" strong />
              <ResultTile label="Left after costs" value={money(result.profitPerAgreement * members, 0)} note="per year" tone="positive" />
              <ResultTile label="Visits to run" value={Math.round(input.visitsPerYear * members).toLocaleString("en-US")} note="per year" />
              <ResultTile label="Technician hours" value={Math.round(input.visitsPerYear * input.hoursPerVisit * members).toLocaleString("en-US")} note="per year, drive included" />
            </dl>
          ) : (
            <EmptyAnalysis text="No members entered." />
          )}
          {regularRate > 0 ? (
            <p className="mt-3 rounded-lg bg-stone-50 px-3 py-2.5 text-[13px] leading-relaxed text-stone-700 ring-1 ring-inset ring-stone-200">
              Without an agreement, the same {v.visitsPerYear || 0} visits at your {money(regularRate, 0)} rate plus materials at cost come to{" "}
              <strong className="tabular-nums text-stone-900">{money(nonMember)}</strong> a year. A member pays{" "}
              <strong className="tabular-nums text-stone-900">{money(result.annualPrice)}</strong>
              {result.repairDiscountGiven > 0 ? (
                <>
                  {" "}and gets about {money(result.repairDiscountGiven)} back in repair discounts, so{" "}
                  <strong className="tabular-nums text-stone-900">{money(result.annualPrice - result.repairDiscountGiven)}</strong> net
                </>
              ) : null}
              . Perks like priority scheduling are not priced here.
            </p>
          ) : null}
        </AnalysisCard>

        <AnalysisCard wide title="The formula, with your numbers">
          <YourMath
            note="The agreement is priced on its own cost. Repair and replacement work members buy later is not counted as income."
            rows={[
              { label: "Cost per visit", working: `${hours(input.hoursPerVisit)} × ${money(input.costPerBillableHour)} + ${money(input.materialsPerVisit)}`, value: money(result.costPerVisit) },
              { label: "Visits per year, at cost", working: `${input.visitsPerYear} × ${money(result.costPerVisit)}`, value: money(result.visitCostPerYear) },
              { label: "Repair discount given", working: `${money(input.expectedRepairSpendPerYear)} × ${pct(input.repairDiscountRate)}`, value: money(result.repairDiscountGiven) },
              {
                label: "Cost to serve",
                working: `${money(result.visitCostPerYear)} + ${money(input.officeCostPerYear)} + ${money(result.repairDiscountGiven)}`,
                value: money(result.costToServePerYear),
              },
              { label: "Yearly price", working: `${money(result.costToServePerYear)} ÷ (1 − ${pct(input.targetNetMargin)})`, value: money(result.annualPrice), strong: true },
              { label: "Monthly price", working: `${money(result.annualPrice)} ÷ 12`, value: money(result.monthlyPrice), strong: true },
            ]}
          />
        </AnalysisCard>
      </AnalysisGrid>
    </div>
  );
}
