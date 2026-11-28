"use client";

import Link from "next/link";
import { calculatorPath } from "@/shared/lib/resources/catalog";
import {
  AnalysisCard,
  AnalysisGrid,
  CalculatorTool,
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
  money,
} from "@/shared/components/resources/calc/CalculatorTool";
import { CHART, HBars } from "@/shared/components/resources/calc/charts";
import { num, useCalculatorTool, type CalcPreset } from "@/shared/components/resources/calc/useCalculatorTool";
import { TRUCK_COST_DEFAULTS as D, calculateTruckCost, type TruckCostInput, type TruckCostResult } from "@/shared/lib/resources/truck-cost";

/**
 * The truck cost calculator at /resources/calculators/truck-cost.
 *
 * What one service truck costs a month, then the same money per working
 * day, per billed hour and per job, and what a day with the truck parked
 * still costs. It explains a number the labor rate tools already ask for
 * ("vehicle and tools"); it is not a second charge to add on top.
 */

const KEYS = [
  "paymentPerMonth",
  "insurancePerMonth",
  "fuelPerMonth",
  "maintenancePerMonth",
  "otherPerYear",
  "workingDaysPerMonth",
  "billedHoursPerDay",
  "jobsPerDay",
] as const;
type K = (typeof KEYS)[number];

const EXAMPLE: Record<K, string> = {
  paymentPerMonth: String(D.paymentPerMonth),
  insurancePerMonth: String(D.insurancePerMonth),
  fuelPerMonth: String(D.fuelPerMonth),
  maintenancePerMonth: String(D.maintenancePerMonth),
  otherPerYear: String(D.otherPerYear),
  workingDaysPerMonth: String(D.workingDaysPerMonth),
  billedHoursPerDay: String(D.billedHoursPerDay),
  jobsPerDay: String(D.jobsPerDay),
};

const PRESETS: readonly CalcPreset<K>[] = [
  { id: "example", label: "Worked example", text: "A financed service truck: $650 payment, $450 of fuel, 21 working days. The numbers in the guide below.", values: EXAMPLE },
  {
    id: "paid-off",
    label: "A paid-off older truck",
    text: "No payment, more repairs. Made-up numbers.",
    values: { ...EXAMPLE, paymentPerMonth: "0", maintenancePerMonth: "380", fuelPerMonth: "520" },
  },
  {
    id: "blank",
    label: "Start blank",
    text: "Empty fields for your own truck.",
    values: { paymentPerMonth: "", insurancePerMonth: "", fuelPerMonth: "", maintenancePerMonth: "", otherPerYear: "", workingDaysPerMonth: "21", billedHoursPerDay: "", jobsPerDay: "" },
  },
];

function toInput(v: Record<K, string>): TruckCostInput {
  return {
    paymentPerMonth: num(v.paymentPerMonth),
    insurancePerMonth: num(v.insurancePerMonth),
    fuelPerMonth: num(v.fuelPerMonth),
    maintenancePerMonth: num(v.maintenancePerMonth),
    otherPerYear: num(v.otherPerYear),
    workingDaysPerMonth: num(v.workingDaysPerMonth),
    billedHoursPerDay: num(v.billedHoursPerDay),
    jobsPerDay: num(v.jobsPerDay),
  };
}

const link = "font-semibold text-[#77591B] underline underline-offset-2";

export function TruckCostCalculator() {
  const tool = useCalculatorTool<K>({ slug: "truck-cost", keys: KEYS, presets: PRESETS });
  const input = toInput(tool.values);
  const result = calculateTruckCost(input);
  const daysBad = input.workingDaysPerMonth <= 0 || input.workingDaysPerMonth > 31;

  return (
    <CalculatorTool
      name="Truck Cost Calculator"
      tool={tool}
      printTitle="What one truck costs"
      mobile={{
        label: "Truck costs",
        value: result ? `${money(result.perWorkingDay)}/day` : "Check inputs",
        note: result ? `${money(result.perMonth, 0)}/mo` : undefined,
      }}
      printInputs={[
        { label: "Payment per month", value: money(input.paymentPerMonth) },
        { label: "Insurance per month", value: money(input.insurancePerMonth) },
        { label: "Fuel per month", value: money(input.fuelPerMonth) },
        { label: "Maintenance, tires and repairs per month", value: money(input.maintenancePerMonth) },
        { label: "Registration and other, per year", value: money(input.otherPerYear) },
        { label: "Working days per month", value: String(input.workingDaysPerMonth) },
        { label: "Billed hours per day", value: String(input.billedHoursPerDay) },
        { label: "Jobs per day", value: String(input.jobsPerDay) },
      ]}
      inputs={
        <>
          <InputGroup title="What the truck costs" text="One truck. If you run several, do your typical one, or each in turn.">
            <NumField
              tool={tool}
              k="paymentPerMonth"
              label="Payment"
              prefix="$"
              suffix="/mo"
              hint="Loan or lease payment. Enter 0 if it is paid off."
              find="Your loan or lease statement. Bought it outright? Divide what you paid by the months you expect to keep it, so the truck's replacement is being saved for: $36,000 over 6 years is $500 a month."
            />
            <NumField
              tool={tool}
              k="insurancePerMonth"
              label="Insurance"
              prefix="$"
              suffix="/mo"
              hint="This truck's share of the commercial auto policy."
              find="Your commercial auto policy lists a premium per vehicle. Divide the yearly figure by 12. If it only shows a total, divide by the number of vehicles."
            />
            <NumField
              tool={tool}
              k="fuelPerMonth"
              label="Fuel"
              prefix="$"
              suffix="/mo"
              hint="An average month for this truck."
              find="The fuel card statement for this truck, averaged over the last three months. No fuel card? Add up the fuel receipts for one month."
            />
            <NumField
              tool={tool}
              k="maintenancePerMonth"
              label="Maintenance, tires and repairs"
              prefix="$"
              suffix="/mo"
              hint="Averaged over a year, so a big repair is spread out."
              find="Last year's repair, tire and oil-change bills for this truck from your accounting software, divided by 12."
            />
            <NumField
              tool={tool}
              k="otherPerYear"
              label="Registration and other"
              prefix="$"
              suffix="/yr"
              hint="Registration, inspection, GPS, lettering: what comes once a year."
              find="The registration renewal, the inspection, a GPS or tracking subscription for a year, and lettering or a wrap divided by the years it lasts."
            />
          </InputGroup>
          <InputGroup title="How the truck is used" text="Used to spread the month over the days it works, the hours it bills and the jobs it runs.">
            <NumField
              tool={tool}
              k="workingDaysPerMonth"
              label="Working days a month"
              suffix="days"
              invalid={daysBad}
              hint="Days the truck goes out. Five days a week is about 21."
              find="Count the days this truck ran jobs last month. Five days a week is about 21 or 22; six days is about 26."
            />
            <NumField
              tool={tool}
              k="billedHoursPerDay"
              label="Billed hours a day"
              suffix="hrs"
              hint="Hours that end up on invoices, not hours on the road."
              find={
                <>
                  The billed hours a week from the{" "}
                  <Link href={calculatorPath("labor-rate")} className={link}>
                    labor rate calculator
                  </Link>
                  , divided by the days worked. 30 billed hours over 5 days is 6.
                </>
              }
            />
            <NumField
              tool={tool}
              k="jobsPerDay"
              label="Jobs a day"
              suffix="jobs"
              hint="A normal day for this truck."
              find="Last month's finished jobs for this truck's technician, divided by the days worked."
            />
          </InputGroup>
        </>
      }
      results={
        result ? (
          <>
            <ResultHero
              label="This truck costs"
              value={money(result.perWorkingDay)}
              unit="every working day"
              note={
                <>
                  <span className="font-semibold text-[#e8d9ac]">{money(result.perMonth, 0)}</span> a month, {money(result.perYear, 0)} a year.
                </>
              }
            />
            <Reading input={input} result={result} />
            <ResultTiles>
              <ResultTile label="Per month" value={money(result.perMonth, 0)} note="everything, averaged" strong />
              <ResultTile label="Per year" value={money(result.perYear, 0)} note="at this pace" />
              <ResultTile label="Per billed hour" value={result.perBilledHour === null ? "–" : money(result.perBilledHour)} note={result.perBilledHour === null ? "enter billed hours" : "rides on every hour you bill"} />
              <ResultTile label="Per job" value={result.perJob === null ? "–" : money(result.perJob)} note={result.perJob === null ? "enter jobs a day" : "before a tool is lifted"} />
              <ResultTile label="A parked day" value={money(result.parkedDay)} note="payment, insurance and registration still run" tone="negative" />
              <ResultTile label="Fuel and upkeep" value={money((input.fuelPerMonth + input.maintenancePerMonth) / input.workingDaysPerMonth)} note="per day it goes out" />
            </ResultTiles>
          </>
        ) : daysBad && tool.values.workingDaysPerMonth.trim() !== "" ? (
          <NoResult title="Check the working days" text="Enter the days a month the truck goes out, from 1 to 31." />
        ) : (
          <NoResult text="Enter what the truck costs a month and the days it works." />
        )
      }
      analysis={<Analysis input={input} result={result} />}
    />
  );
}

/** "What this means": the daily cost in the owner's terms, the parked day, and counting it once. */
function Reading({ input, result }: { readonly input: TruckCostInput; readonly result: TruckCostResult }) {
  const pieces = [
    result.perBilledHour !== null ? `${money(result.perBilledHour)} of every billed hour` : null,
    result.perJob !== null ? `${money(result.perJob)} of every job` : null,
  ].filter(Boolean);
  return (
    <ResultReading tone="watch" title={`Before the technician earns a dollar, this truck has cost ${money(result.perWorkingDay, 0)} for the day.`}>
      {pieces.length > 0 ? <p>That is {pieces.join(" and ")}.</p> : null}
      <p>
        A working day with the truck parked still costs {money(result.parkedDay, 0)}: a sick day, a slow day, a day waiting on a repair.
        {input.paymentPerMonth === 0 ? " With no payment entered, nothing is being put aside to replace this truck." : ""}
      </p>
      <p>
        Count it once. If your labor rate already includes the truck (vehicle and tools in the{" "}
        <Link href={calculatorPath("labor-rate")} className={link}>
          labor rate calculator
        </Link>
        ), it is paid for there. If it does not, {result.perBilledHour !== null ? `${money(result.perBilledHour)} an hour` : "this"} is what is missing.
      </p>
    </ResultReading>
  );
}

function Analysis({ input, result }: { readonly input: TruckCostInput; readonly result: TruckCostResult | null }) {
  if (!result) {
    return (
      <AnalysisGrid>
        <AnalysisCard title="Where the month goes">
          <EmptyAnalysis />
        </AnalysisCard>
        <AnalysisCard title="If the truck works more or fewer days">
          <EmptyAnalysis />
        </AnalysisCard>
      </AnalysisGrid>
    );
  }

  const otherPerMonth = input.otherPerYear / 12;
  const parts = [
    { key: "payment", label: "Payment", value: input.paymentPerMonth, color: CHART.ink },
    { key: "fuel", label: "Fuel", value: input.fuelPerMonth, color: CHART.brass },
    { key: "insurance", label: "Insurance", value: input.insurancePerMonth, color: CHART.stone },
    { key: "maintenance", label: "Maintenance, tires, repairs", value: input.maintenancePerMonth, color: CHART.light },
    { key: "other", label: "Registration and other", value: otherPerMonth, color: CHART.brassLight },
  ].filter((part) => part.value > 0);
  const days = Array.from(new Set([15, 18, 20, 21, 22, 26, input.workingDaysPerMonth].filter((value) => value > 0 && value <= 31))).sort((a, b) => a - b);

  return (
    <AnalysisGrid>
      <AnalysisCard title="Where the month goes" text={`${money(result.perMonth, 0)} a month, largest first.`}>
        <HBars
          ariaLabel="Monthly truck cost by kind"
          rows={[...parts]
            .sort((a, b) => b.value - a.value)
            .map((part) => ({
              key: part.key,
              label: part.label,
              value: part.value,
              display: money(part.value, 0),
              sub: `${Math.round((part.value / result.perMonth) * 100)}%`,
              color: part.color,
            }))}
        />
      </AnalysisCard>

      <AnalysisCard title="If the truck works more or fewer days" text="The month costs about the same either way, so fewer working days makes each one dearer.">
        <WhatIfTable
          caption="Truck cost per working day and per billed hour at different working days a month"
          corner="Days / mo"
          minWidth={380}
          columns={[
            { key: "d", label: "Per day" },
            { key: "h", label: "Per billed hr" },
            { key: "j", label: "Per job" },
          ]}
          rows={days.map((count) => {
            const res = calculateTruckCost({ ...input, workingDaysPerMonth: count });
            return {
              key: String(count),
              current: count === input.workingDaysPerMonth,
              label: `${count} days`,
              cells: [
                { text: res ? money(res.perWorkingDay) : "–" },
                { text: res && res.perBilledHour !== null ? money(res.perBilledHour) : "–" },
                { text: res && res.perJob !== null ? money(res.perJob) : "–" },
              ],
            };
          })}
        />
      </AnalysisCard>

      <AnalysisCard wide title="The formula, with your numbers">
        <YourMath
          note="Fuel is held the same in the table above; in practice a truck that works more days burns a little more. A parked day leaves out fuel and maintenance, which mostly stop when the truck does."
          rows={[
            {
              label: "Cost per month",
              working: `${money(input.paymentPerMonth, 0)} + ${money(input.insurancePerMonth, 0)} + ${money(input.fuelPerMonth, 0)} + ${money(input.maintenancePerMonth, 0)} + ${money(input.otherPerYear, 0)} ÷ 12`,
              value: money(result.perMonth),
              strong: true,
            },
            { label: "Cost per working day", working: `${money(result.perMonth)} ÷ ${input.workingDaysPerMonth}`, value: money(result.perWorkingDay), strong: true },
            ...(result.perBilledHour !== null ? [{ label: "Cost per billed hour", working: `${money(result.perWorkingDay)} ÷ ${input.billedHoursPerDay}`, value: money(result.perBilledHour) }] : []),
            ...(result.perJob !== null ? [{ label: "Cost per job", working: `${money(result.perWorkingDay)} ÷ ${input.jobsPerDay}`, value: money(result.perJob) }] : []),
            {
              label: "A parked day",
              working: `(${money(input.paymentPerMonth, 0)} + ${money(input.insurancePerMonth, 0)} + ${money(otherPerMonth, 0)}) ÷ ${input.workingDaysPerMonth}`,
              value: money(result.parkedDay),
            },
          ]}
        />
      </AnalysisCard>
    </AnalysisGrid>
  );
}
