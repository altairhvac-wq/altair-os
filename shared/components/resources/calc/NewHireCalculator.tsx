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
  money,
  pct,
} from "@/shared/components/resources/calc/CalculatorTool";
import { CHART, HBars } from "@/shared/components/resources/calc/charts";
import { num, useCalculatorTool, type CalcPreset } from "@/shared/components/resources/calc/useCalculatorTool";
import { NEW_HIRE_DEFAULTS as D, calculateNewHire, type NewHireInput, type NewHireResult } from "@/shared/lib/resources/new-hire";

/**
 * "Can I afford another technician?" at /resources/calculators/hiring-a-technician.
 *
 * One number first: the billed hours a week at which the hire pays for
 * itself. Then what is left once the technician is busy, and the cash the
 * first weeks take while they get there. It counts only what the hire adds
 * (wage, payroll costs, the truck), and says what it leaves out.
 */

const KEYS = ["hourlyWage", "burdenPercent", "paidHoursPerWeek", "truckPerMonth", "billableRate", "billedHoursPerWeek", "rampWeeks"] as const;
type K = (typeof KEYS)[number];

const EXAMPLE: Record<K, string> = {
  hourlyWage: String(D.hourlyWage),
  burdenPercent: String(D.burdenPercent),
  paidHoursPerWeek: String(D.paidHoursPerWeek),
  truckPerMonth: String(D.truckPerMonth),
  billableRate: String(D.billableRate),
  billedHoursPerWeek: String(D.billedHoursPerWeek),
  rampWeeks: String(D.rampWeeks),
};

const PRESETS: readonly CalcPreset<K>[] = [
  { id: "example", label: "Worked example", text: "A $28 technician with a truck, billing 28 hours a week after 8 weeks. The numbers in the guide below.", values: EXAMPLE },
  {
    id: "helper",
    label: "A helper, no truck",
    text: "An $18 helper riding along, billing 15 hours a week. Made-up numbers.",
    values: { ...EXAMPLE, hourlyWage: "18", truckPerMonth: "150", billedHoursPerWeek: "15", rampWeeks: "4" },
  },
  {
    id: "blank",
    label: "Start blank",
    text: "Empty fields for your own numbers.",
    values: { hourlyWage: "", burdenPercent: "", paidHoursPerWeek: "40", truckPerMonth: "", billableRate: "", billedHoursPerWeek: "", rampWeeks: "" },
  },
];

function toInput(v: Record<K, string>): NewHireInput {
  return {
    hourlyWage: num(v.hourlyWage),
    burdenPercent: num(v.burdenPercent),
    paidHoursPerWeek: num(v.paidHoursPerWeek),
    truckPerMonth: num(v.truckPerMonth),
    billableRate: num(v.billableRate),
    billedHoursPerWeek: num(v.billedHoursPerWeek),
    rampWeeks: num(v.rampWeeks),
  };
}

const link = "font-semibold text-[#77591B] underline underline-offset-2";
const hrs = (value: number) => `${value.toLocaleString("en-US", { maximumFractionDigits: 1 })} ${value === 1 ? "hour" : "hours"}`;

export function NewHireCalculator() {
  const tool = useCalculatorTool<K>({ slug: "hiring-a-technician", keys: KEYS, presets: PRESETS });
  const carried = useCarried();
  const input = toInput(tool.values);
  const result = calculateNewHire(input);
  const tooManyBilled = input.paidHoursPerWeek > 0 && input.billedHoursPerWeek > input.paidHoursPerWeek;

  return (
    <CalculatorTool
      name="Hiring Calculator"
      tool={tool}
      printTitle="Can I afford another technician?"
      mobile={{
        label: "Pays for itself at",
        value: result ? `${result.breakEvenHoursPerWeek.toFixed(1)} hrs/wk` : "Check inputs",
        note: result ? `${money(result.monthlyCost, 0)}/mo cost` : undefined,
      }}
      printInputs={[
        { label: "Hourly wage", value: money(input.hourlyWage) },
        { label: "Payroll costs on top of the wage", value: `${input.burdenPercent}%` },
        { label: "Paid hours a week", value: String(input.paidHoursPerWeek) },
        { label: "Truck and tools a month", value: money(input.truckPerMonth) },
        { label: "Billable hourly rate", value: money(input.billableRate) },
        { label: "Billed hours a week once busy", value: String(input.billedHoursPerWeek) },
        { label: "Weeks until that busy", value: String(input.rampWeeks) },
      ]}
      carry={
        <CarryBanner
          tool={tool}
          carried={carried}
          fields={[
            { key: "billableRate", from: "billedRate", label: "Labor rate", format: (n) => `${money(n, 0)}/hr` },
            { key: "hourlyWage", from: "averageWage", label: "Average wage", format: (n) => `${money(n)}/hr` },
          ]}
          emptyText="The hire is weighed against your labor rate. The Labor Cost Workspace works that out and hands it to this calculator."
        />
      }
      inputs={
        <>
          <InputGroup title="What the hire costs" text="Only what this one person adds: the wage, the costs on top of it, and the truck.">
            <NumField
              tool={tool}
              k="hourlyWage"
              label="Hourly wage"
              prefix="$"
              suffix="/hr"
              invalid={input.hourlyWage <= 0}
              hint="What you would offer, before taxes and benefits."
              find="The wage in your job ad, or what your current technicians with the same experience earn. Paying a salary? Divide the yearly salary by 2,080."
            />
            <NumField
              tool={tool}
              k="burdenPercent"
              label="Payroll costs (labor burden)"
              suffix="% of wage"
              hint="Payroll taxes, workers' comp, insurance and benefits on top of the wage."
              find={
                <>
                  The same percentage you used in the{" "}
                  <Link href={calculatorPath("labor-rate")} className={link}>
                    labor rate calculator
                  </Link>
                  . Or ask your payroll provider for last year&apos;s employer costs and divide them by gross wages.
                </>
              }
            />
            <NumField
              tool={tool}
              k="paidHoursPerWeek"
              label="Paid hours a week"
              suffix="hrs"
              invalid={input.paidHoursPerWeek <= 0}
              hint="Hours you pay for, drive and shop time included."
              find="For a full-time technician this is usually 40. Use the hours on the offer."
            />
            <NumField
              tool={tool}
              k="truckPerMonth"
              label="Truck and tools"
              prefix="$"
              suffix="/mo"
              hint="Truck payment, fuel, insurance, tools and phone for this technician."
              find="What one of your current trucks costs a month: the payment, the fuel card, that truck's share of the vehicle insurance, plus tools and the phone. A helper who rides along needs only tools and a phone."
            />
          </InputGroup>
          <InputGroup title="What the hire brings in" text="Labor only. Parts margin on the jobs they run comes on top.">
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
              k="billedHoursPerWeek"
              label="Billed hours a week, once busy"
              suffix="hrs"
              invalid={tooManyBilled}
              hint="Hours that end up on invoices. Not the hours on the clock."
              find="What your current technicians bill: the hours on last month's invoices divided by the weeks and the technicians. Be honest about whether you have that much extra work waiting."
            />
            <NumField
              tool={tool}
              k="rampWeeks"
              label="Weeks until that busy"
              suffix="weeks"
              hint="How long before they bill that many hours. Enter 0 if they will from week one."
              find="How long your last hire took to run calls alone, or how long it took to fill their schedule. An experienced technician stepping into a full schedule is shorter; a trainee is longer."
            />
          </InputGroup>
        </>
      }
      results={
        result ? (
          <>
            <ResultHero
              label="Pays for itself at"
              value={result.breakEvenHoursPerWeek.toFixed(1)}
              unit="billed hours a week"
              note={
                <>
                  That is {pct(result.breakEvenShare, 0)} of the {input.paidHoursPerWeek} hours you pay for. The hire costs{" "}
                  <span className="font-semibold text-[#e8d9ac]">{money(result.monthlyCost, 0)}</span> a month.
                </>
              }
            />
            <Reading input={input} result={result} />
            <ResultTiles>
              <ResultTile label="Cost a month" value={money(result.monthlyCost, 0)} note="wage, payroll costs, truck" strong />
              <ResultTile label="Cost a year" value={money(result.yearlyCost, 0)} note="at these hours" />
              <ResultTile label="Billed a week" value={money(result.weeklyRevenue, 0)} note={`${hrs(input.billedHoursPerWeek)} at ${money(input.billableRate, 0)}`} />
              <ResultTile
                label="Left over a month"
                value={money(result.monthlyLeftOver, 0)}
                note="once busy, before parts margin"
                tone={result.monthlyLeftOver < 0 ? "negative" : "positive"}
              />
              <ResultTile label="Cash to carry the hire" value={money(result.cashToCarry, 0)} note="through the weeks that cost more than they bring in" />
              <ResultTile
                label="First week in the black"
                value={input.rampWeeks <= 0 ? (result.pays ? "Week 1" : "–") : result.firstWeekInTheBlack === null ? "–" : `Week ${result.firstWeekInTheBlack}`}
                note={result.pays ? "billing grows evenly until then" : "not at these hours"}
              />
            </ResultTiles>
          </>
        ) : tooManyBilled ? (
          <NoResult title="Check the hours" text="Billed hours cannot be more than paid hours. Billed hours are the ones that end up on an invoice." />
        ) : (
          <NoResult text="Enter a wage, the paid hours and your billable rate, each above 0." />
        )
      }
      analysis={<Analysis input={input} result={result} />}
    />
  );
}

/** "What this means": does the hire pay, how much work it needs, and what the first weeks take. */
function Reading({ input, result }: { readonly input: NewHireInput; readonly result: NewHireResult }) {
  const need = hrs(Math.round(result.breakEvenHoursPerWeek * 10) / 10);
  if (!result.pays) {
    return (
      <ResultReading tone="bad" title={`At ${hrs(input.billedHoursPerWeek)} a week this hire loses ${money(-result.monthlyLeftOver, 0)} a month.`}>
        <p>
          It takes {need} of billed work a week to pay for the wage, the payroll costs and the truck. Either the work has to be there, or the
          hire has to cost less: a helper without a truck is the usual way.
        </p>
      </ResultReading>
    );
  }
  const thin = result.breakEvenHoursPerWeek > input.billedHoursPerWeek * 0.8;
  return (
    <ResultReading
      tone={thin ? "watch" : "good"}
      title={
        thin
          ? `It pays, but only just: ${need} to break even against ${hrs(input.billedHoursPerWeek)} billed.`
          : `It pays for itself at ${need} a week, and you expect ${hrs(input.billedHoursPerWeek)}.`
      }
    >
      <p>
        Once busy, the hire leaves about {money(result.monthlyLeftOver, 0)} a month ({money(result.yearlyLeftOver, 0)} a year) after its own cost,
        before the margin on parts.
        {result.cashToCarry > 0
          ? ` Getting there takes about ${money(result.cashToCarry, 0)} of cash over the first weeks, while the schedule fills.`
          : ""}
      </p>
      <p>
        The question that decides it is the work, not the wage: do you have {need} a week of jobs you are turning away, booking more than a
        week out, or covering with overtime?
      </p>
    </ResultReading>
  );
}

function Analysis({ input, result }: { readonly input: NewHireInput; readonly result: NewHireResult | null }) {
  if (!result) {
    return (
      <AnalysisGrid>
        <AnalysisCard title="A week of the hire">
          <EmptyAnalysis />
        </AnalysisCard>
        <AnalysisCard title="If they bill more or fewer hours">
          <EmptyAnalysis />
        </AnalysisCard>
      </AnalysisGrid>
    );
  }

  const paid = input.paidHoursPerWeek;
  const steps = Array.from(new Set([10, 15, 20, 25, 30, 35, input.billedHoursPerWeek].filter((value) => value > 0 && value <= paid))).sort((a, b) => a - b);

  return (
    <AnalysisGrid>
      <AnalysisCard title="A week of the hire" text="What one week costs, what it takes to cover that, and what you expect them to bill.">
        <HBars
          ariaLabel="Weekly cost of the hire against expected weekly billing"
          rows={[
            { key: "cost", label: "Costs a week", value: result.weeklyCost, display: money(result.weeklyCost, 0), sub: "wage, payroll costs, truck", color: CHART.light },
            {
              key: "bills",
              label: "Bills a week, once busy",
              value: result.weeklyRevenue,
              display: money(result.weeklyRevenue, 0),
              sub: `${hrs(input.billedHoursPerWeek)} × ${money(input.billableRate, 0)}`,
              highlight: true,
              color: result.pays ? CHART.profit : CHART.loss,
            },
          ]}
        />
      </AnalysisCard>

      <AnalysisCard title="If they bill more or fewer hours" text={`At a ${money(input.hourlyWage)} wage and a ${money(input.billableRate, 0)} rate. Your own number is marked.`}>
        <WhatIfTable
          caption="What the hire leaves a month and a year at different billed hours a week"
          corner="Billed / wk"
          minWidth={400}
          columns={[
            { key: "m", label: "Left over / mo" },
            { key: "y", label: "Left over / yr" },
          ]}
          rows={steps.map((billed) => {
            const res = calculateNewHire({ ...input, billedHoursPerWeek: billed });
            return {
              key: String(billed),
              current: billed === input.billedHoursPerWeek,
              label: `${billed} hrs`,
              cells: [
                { text: res ? `${res.monthlyLeftOver < 0 ? "−" : "+"}${money(Math.abs(res.monthlyLeftOver), 0)}` : "–" },
                { text: res ? `${res.yearlyLeftOver < 0 ? "−" : "+"}${money(Math.abs(res.yearlyLeftOver), 0)}` : "–" },
              ],
            };
          })}
        />
      </AnalysisCard>

      <AnalysisCard wide title="The formula, with your numbers">
        <YourMath
          note="Only what the hire adds is counted. Your existing overhead is already paid by the technicians you have, and parts margin on the new technician's jobs comes on top of the result."
          rows={[
            {
              label: "Cost a week",
              working: `${money(input.hourlyWage)} × ${(1 + input.burdenPercent / 100).toFixed(2)} × ${input.paidHoursPerWeek} + ${money(input.truckPerMonth, 0)} × 12 ÷ 52`,
              value: money(result.weeklyCost),
              strong: true,
            },
            { label: "Billed hours to break even", working: `${money(result.weeklyCost)} ÷ ${money(input.billableRate)}`, value: result.breakEvenHoursPerWeek.toFixed(1), strong: true },
            { label: "Bills a week, once busy", working: `${input.billedHoursPerWeek} × ${money(input.billableRate)}`, value: money(result.weeklyRevenue) },
            { label: "Left over a month", working: `(${money(result.weeklyRevenue)} − ${money(result.weeklyCost)}) × 52 ÷ 12`, value: money(result.monthlyLeftOver) },
            { label: "Cash to carry the hire", working: `weeks 1 to ${Math.max(0, Math.round(input.rampWeeks))} that cost more than they bill, added up`, value: money(result.cashToCarry) },
          ]}
        />
      </AnalysisCard>
    </AnalysisGrid>
  );
}
