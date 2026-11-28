"use client";

import Link from "next/link";
import { calculatorPath } from "@/shared/lib/resources/catalog";
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
  "renewalPercent",
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
  renewalPercent: "80",
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
    values: { visitsPerYear: "", hoursPerVisit: "", costPerBillableHour: "", materialsPerVisit: "", officeCostPerYear: "", expectedRepairSpendPerYear: "", repairDiscountPercent: "", targetMarginPercent: "", members: "", regularRate: "", renewalPercent: "" },
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
  const renewal = v.renewalPercent.trim() === "" ? null : Math.min(0.99, Math.max(0, num(v.renewalPercent) / 100));

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
            <NumField tool={tool} k="visitsPerYear" label="Visits per year" suffix="visits" invalid={input.visitsPerYear <= 0} hint="Scheduled maintenance visits the agreement includes." find="What your agreement promises. Most plans are one cooling and one heating tune-up a year: 2 visits." />
            <NumField tool={tool} k="hoursPerVisit" label="Hours per visit" suffix="hrs" hint="Time on site plus the drive to it." find="Look at the timesheets for your last ten tune-ups: from leaving the previous job to finishing this one. Use the average." />
            <NumField
              tool={tool}
              k="costPerBillableHour"
              label="Cost per billable hour"
              prefix="$"
              suffix="/hr"
              invalid={input.costPerBillableHour <= 0}
              hint="Wage, burden, unbilled time and overhead for one hour: your break-even rate, not the wage."
              find={
                <>
                  This is the &ldquo;Break-even rate&rdquo; from the{" "}
                  <Link href={calculatorPath("labor-rate")} className="font-semibold text-[#77591B] underline underline-offset-2">
                    labor rate calculator
                  </Link>
                  . Work it out there once; after that, the bar at the top of this calculator offers to fill it in.
                </>
              }
            />
            <NumField tool={tool} k="materialsPerVisit" label="Materials per visit" prefix="$" hint="Filters, coil cleaner, anything used every time, at your cost." find="Your supply house prices for what a tune-up uses every time: the filter, coil cleaner, condensate tablets, at what you pay." />
          </InputGroup>
          <InputGroup title="Running the plan and member perks" badge={<SampleTag />}>
            <NumField
              tool={tool}
              k="officeCostPerYear"
              label="Extra cost to run each agreement"
              prefix="$"
              suffix="/yr"
              hint="Only what agreements add: reminders, booking the visits, card fees on monthly billing."
              find="Your cost per billable hour already covers general overhead, so count only what agreements add: an office person's time booking the visits and sending renewals, card fees on the monthly charge (about 3% of the price), and any plan software. Divide by the number of members."
            />
            <NumField tool={tool} k="expectedRepairSpendPerYear" label="Repairs a member buys" prefix="$" suffix="/yr" hint="What a typical member spends on repairs in a year, before the discount." find="In your job software, total the repair invoices for members over the last year and divide by the number of members. New program? Use your average repair ticket times how many repairs a customer buys a year." />
            <NumField
              tool={tool}
              k="repairDiscountPercent"
              label="Member repair discount"
              suffix="%"
              invalid={discountBad}
              hint="Enter 0 if members get no discount. The discount is a cost of the agreement."
              find="What your agreement promises on repairs, often 10% or 15%. Enter 0 if members get no discount."
            />
          </InputGroup>
          <InputGroup title="Margin">
            <NumField tool={tool} k="targetMarginPercent" label="Profit to keep (net margin)" suffix="%" invalid={marginBad} hint="Profit left from the price after its costs. A margin, not a markup." find="Your choice. 20% means $20 of every $100 a member pays is profit after the visits, materials and perks." />
            <Chips tool={tool} k="targetMarginPercent" options={["10", "15", "20", "25", "30"]} suffix="%" />
          </InputGroup>
          <InputGroup title="Optional: your program" text="For the program view below the results. Leave blank to skip." badge={<SampleTag />}>
            <NumField tool={tool} k="members" label="Members" suffix="agreements" hint="How many agreements you have, or want to have." find="Your active agreements today, from your job software's agreement or membership list." />
            <NumField tool={tool} k="renewalPercent" label="Members who renew each year" suffix="%" hint="Out of every 100 members, how many sign up again." find="Members at the start of last year who are still members today, divided by members at the start of last year. New program? Leave it blank until you have a year of renewals." />
            <NumField tool={tool} k="regularRate" label="Your regular labor rate" prefix="$" suffix="/hr" hint="To show what the same visits cost a customer without an agreement." find="The hourly labor rate in your price book, or the result of the labor rate calculator." />
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
            <Reading input={input} result={result} regularRate={regularRate} />
            <Panel title="Where the yearly price goes">
              <SplitBar ariaLabel="The yearly price split by cost" format={(n) => money(n)} slices={slices(input, result)} />
            </Panel>
            <ResultTiles>
              <ResultTile label="Cost to serve" value={money(result.costToServePerYear)} note="per agreement per year" strong />
              <ResultTile label="Left per agreement" value={money(result.profitPerAgreement)} note="per year" tone="positive" />
              <ResultTile label="Cost per visit" value={money(result.costPerVisit)} note="labor plus materials" />
              <ResultTile label="Repair discount given" value={money(result.repairDiscountGiven)} note="per member per year" />
              <ResultTile label="Price per visit" value={money(result.annualPrice / input.visitsPerYear)} note="what a member pays for each visit" />
              <ResultTile
                label="Profit over a member's life"
                value={renewal !== null && renewal < 1 ? money(result.profitPerAgreement / (1 - renewal), 0) : "–"}
                note={renewal !== null && renewal < 1 ? `about ${(1 / (1 - renewal)).toFixed(1)} years at ${pct(renewal, 0)} renewing` : "enter your renewal rate"}
              />
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

/** The price read back in plain words, against what the same visits cost a customer without an agreement. */
function Reading({ input, result, regularRate }: { readonly input: MaintenanceAgreementInput; readonly result: MaintenanceAgreementResult; readonly regularRate: number }) {
  const nonMember = input.visitsPerYear * (input.hoursPerVisit * regularRate + input.materialsPerVisit);
  const head = `Charge ${money(result.monthlyPrice)} a month (${money(result.annualPrice, 0)} a year) to keep ${money(result.profitPerAgreement, 0)} per member.`;
  if (input.costPerBillableHour <= 0) {
    return (
      <ResultReading tone="bad" title="Enter your cost per billable hour first.">
        <p>Without it the technician&apos;s time counts as free, and the price comes out far too low.</p>
      </ResultReading>
    );
  }
  if (regularRate <= 0) {
    return (
      <ResultReading tone="good" title={head}>
        <p>Enter your regular labor rate to see whether members save money against paying for the visits one at a time.</p>
      </ResultReading>
    );
  }
  if (result.annualPrice >= nonMember) {
    return (
      <ResultReading tone="watch" title={head}>
        <p>
          The same {input.visitsPerYear} visits cost a non-member about {money(nonMember, 0)} at your rate, so the agreement costs more than paying as they go. Sell it on priority
          service and the repair discount, or trim the visit time or the perks.
        </p>
      </ResultReading>
    );
  }
  return (
    <ResultReading tone="good" title={head}>
      <p>
        Members save about {money(nonMember - result.annualPrice, 0)} a year against paying {money(nonMember, 0)} for the same visits at your regular rate. That saving is the easy
        part of the sale.
      </p>
    </ResultReading>
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
