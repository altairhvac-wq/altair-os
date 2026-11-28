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
  ResultReading,
  ResultTile,
  ResultTiles,
  WhatIfTable,
  YourMath,
  hours,
  money,
  pct,
} from "@/shared/components/resources/calc/CalculatorTool";
import { CHART, HBars, LineChart } from "@/shared/components/resources/calc/charts";
import { num, useCalculatorTool, type CalcPreset } from "@/shared/components/resources/calc/useCalculatorTool";
import {
  OVERTIME_THRESHOLD_HOURS,
  TECHNICIAN_PAY_DEFAULTS as D,
  calculateTechnicianPay,
  type PayPlan,
  type TechnicianPayResult,
} from "@/shared/lib/resources/technician-pay";

const KEYS = ["hourlyWage", "hoursOnClock", "bookHours", "payPerBookHour", "revenueProduced", "commissionPercent", "burdenPercent"] as const;
type K = (typeof KEYS)[number];

const PRESETS: readonly CalcPreset<K>[] = [
  {
    id: "example",
    label: "Worked example",
    text: "45 hours on the clock, 38 book hours, $7,500 produced. The numbers in the guide below.",
    values: {
      hourlyWage: String(D.hourlyWage),
      hoursOnClock: String(D.hoursOnClock),
      bookHours: String(D.bookHours),
      payPerBookHour: String(D.payPerBookHour),
      revenueProduced: String(D.revenueProduced),
      commissionPercent: String(D.commissionRate * 100),
      burdenPercent: "25",
    },
  },
  {
    id: "slow",
    label: "Slow week",
    text: "40 hours on the clock, 24 book hours, $4,700 produced. Made-up numbers.",
    values: { hourlyWage: "30", hoursOnClock: "40", bookHours: "24", payPerBookHour: "34", revenueProduced: "4700", commissionPercent: "12", burdenPercent: "25" },
  },
  {
    id: "busy",
    label: "Busy week",
    text: "50 hours on the clock, 52 book hours, $10,200 produced. Made-up numbers.",
    values: { hourlyWage: "30", hoursOnClock: "50", bookHours: "52", payPerBookHour: "34", revenueProduced: "10200", commissionPercent: "12", burdenPercent: "25" },
  },
  {
    id: "blank",
    label: "Start blank",
    text: "Empty fields for one real week of your own.",
    values: { hourlyWage: "", hoursOnClock: "", bookHours: "", payPerBookHour: "", revenueProduced: "", commissionPercent: "", burdenPercent: "" },
  },
];

const PLAN_NAME: Record<PayPlan, string> = { hourly: "Hourly", "flat-rate": "Flat rate", commission: "Commission" };
const PLAN_COLOR: Record<PayPlan, string> = { hourly: CHART.ink, "flat-rate": CHART.brass, commission: CHART.stone };

function payOf(r: TechnicianPayResult, plan: PayPlan): number {
  return plan === "hourly" ? r.hourlyPay : plan === "flat-rate" ? r.flatRatePay : r.commissionPay;
}

export function TechnicianPayTool() {
  const tool = useCalculatorTool<K>({ slug: "technician-pay", keys: KEYS, presets: PRESETS });
  const carried = useCarried();
  const v = tool.values;
  const input = {
    hourlyWage: num(v.hourlyWage),
    hoursOnClock: num(v.hoursOnClock),
    bookHours: num(v.bookHours),
    payPerBookHour: num(v.payPerBookHour),
    revenueProduced: num(v.revenueProduced),
    commissionRate: num(v.commissionPercent) / 100,
  };
  const r = calculateTechnicianPay(input);
  const burden = Math.max(0, num(v.burdenPercent) / 100);
  const empty = r !== null && r.hourlyPay === 0 && r.flatRatePay === 0 && r.commissionPay === 0;
  const result = r && !empty ? r : null;
  const problem =
    input.hoursOnClock > 168
      ? "A week has 168 hours. Enter the hours on the clock for one week."
      : input.commissionRate < 0 || input.commissionRate > 1
        ? "Enter a commission from 0% to 100%."
        : "Enter one week: hours on the clock and at least one plan's numbers.";

  const plans: PayPlan[] = ["hourly", "flat-rate", "commission"];

  return (
    <CalculatorTool
      name="Technician Pay Calculator"
      tool={tool}
      printTitle="Technician pay: one week, three ways"
      mobile={{
        label: "Highest pay this week",
        value: result ? `${PLAN_NAME[result.highest]} ${money(payOf(result, result.highest), 0)}` : "Check inputs",
      }}
      printInputs={[
        { label: "Hourly wage", value: money(input.hourlyWage) },
        { label: "Hours on the clock", value: hours(input.hoursOnClock) },
        { label: "Book hours turned", value: hours(input.bookHours) },
        { label: "Pay per book hour", value: money(input.payPerBookHour) },
        { label: "Revenue produced", value: money(input.revenueProduced) },
        { label: "Commission", value: pct(input.commissionRate) },
      ]}
      carry={
        <CarryBanner
          tool={tool}
          carried={carried}
          buttonLabel="Use my average wage from the"
          fields={[{ key: "hourlyWage", from: "averageWage", label: "Average wage", format: (n) => `${money(n)}/hr` }]}
          emptyText="Paying a crew? The Labor Cost Workspace works out your average wage and what each billed hour costs; this calculator can then use the wage."
        />
      }
      inputs={
        <>
          <InputGroup title="The week" text="Pick one real week. A slow week and a busy week give very different answers, so try both." badge={<SampleTag>sample week · use your own</SampleTag>}>
            <NumField
              tool={tool}
              k="hoursOnClock"
              label="Hours on the clock"
              suffix="hrs"
              invalid={input.hoursOnClock > 168}
              hint={`All paid time: jobs, driving, shop time. Hours past ${OVERTIME_THRESHOLD_HOURS} are overtime on the hourly plan.`}
              find="The technician's timesheet for the week, or the hours on their pay stub, overtime included."
            />
            <NumField
              tool={tool}
              k="revenueProduced"
              label="Revenue produced"
              prefix="$"
              hint="What the technician's completed jobs billed, before sales tax."
              find="In your job software, total the invoices for jobs this technician finished that week, before sales tax. Most have a sales-by-technician report."
            />
            <NumField
              tool={tool}
              k="burdenPercent"
              label="Payroll costs (labor burden)"
              suffix="% of pay"
              hint="Payroll taxes, workers' comp and benefits on top of pay, for the full cost to you."
              find="Social Security and Medicare are 7.65% of pay. Add unemployment insurance, your workers' comp rate (on the policy, per $100 of payroll) and benefits you pay, as a percent of pay. Your payroll provider's employer-cost report adds most of it up."
            />
          </InputGroup>
          <div className="grid gap-3 xl:grid-cols-3">
            <PlanCard plan="hourly" pay={result ? money(result.hourlyPay, 0) : "–"}>
              <NumField tool={tool} k="hourlyWage" label="Hourly wage" prefix="$" suffix="/hr" hint="Time and a half past 40 hours." find="The technician's regular hourly rate from the pay stub or your payroll provider." />
            </PlanCard>
            <PlanCard plan="flat-rate" pay={result ? money(result.flatRatePay, 0) : "–"}>
              <NumField tool={tool} k="bookHours" label="Book hours turned" suffix="hrs" hint="From your price book, whatever the jobs took." find="Each flat-rate task in your price book has set hours. Add them up for every job the technician finished that week, however long the jobs really took." />
              <NumField tool={tool} k="payPerBookHour" label="Pay per book hour" prefix="$" hint="What the technician earns for each book hour." find="Your flat-rate pay plan, or the rate on a flat-rate technician's pay stub. Leave the flat-rate fields blank if you don't pay this way." />
            </PlanCard>
            <PlanCard plan="commission" pay={result ? money(result.commissionPay, 0) : "–"}>
              <NumField
                tool={tool}
                k="commissionPercent"
                label="Commission"
                suffix="% of revenue"
                invalid={input.commissionRate < 0 || input.commissionRate > 1}
                hint="Paid on the revenue produced above."
                find="Your commission pay plan. If you pay commission after parts, enter the rate that gives the same dollars on total revenue."
              />
            </PlanCard>
          </div>
        </>
      }
      results={
        result ? (
          <>
            <ResultHero
              label="Highest pay this week"
              value={money(payOf(result, result.highest))}
              unit={`on ${PLAN_NAME[result.highest].toLowerCase()}`}
              note={
                <>
                  {plans
                    .filter((plan) => plan !== result.highest)
                    .map((plan) => `${PLAN_NAME[plan]} pays ${money(payOf(result, result.highest) - payOf(result, plan))} less`)
                    .join(" · ")}
                  .
                </>
              }
            />
            <Panel title="The same week, paid three ways">
              <HBars
                ariaLabel="Pay for this week on each plan"
                rows={plans.map((plan) => ({
                  key: plan,
                  label: PLAN_NAME[plan],
                  value: payOf(result, plan),
                  display: money(payOf(result, plan)),
                  sub: result.effectiveHourly[plan] === null ? undefined : `${money(result.effectiveHourly[plan] ?? 0)}/clock hr`,
                  highlight: plan === result.highest,
                  color: PLAN_COLOR[plan],
                }))}
              />
            </Panel>
            <Reading result={result} revenue={input.revenueProduced} burden={burden} />
            <ResultTiles>
              <ResultTile label="Flat rate matches hourly at" value={result.bookHoursToMatchHourly === null ? "–" : hours(result.bookHoursToMatchHourly)} note="book hours this week" strong />
              <ResultTile label="Commission matches hourly at" value={result.revenueToMatchHourly === null ? "–" : money(result.revenueToMatchHourly, 0)} note="revenue produced" strong />
              <ResultTile label="Overtime hours" value={hours(result.overtimeHours)} note="at time and a half, hourly plan" />
              <ResultTile
                label="Book hours / clock hours"
                value={input.hoursOnClock > 0 ? pct(input.bookHours / input.hoursOnClock) : "–"}
                note="flat-rate productivity"
              />
              <ResultTile
                label="Full cost to you"
                value={money(payOf(result, result.highest) * (1 + burden), 0)}
                note={`${PLAN_NAME[result.highest].toLowerCase()} pay plus ${pct(burden, 0)} burden`}
              />
              <ResultTile
                label="Labor cost of revenue"
                value={input.revenueProduced > 0 ? pct((payOf(result, result.highest) * (1 + burden)) / input.revenueProduced) : "–"}
                note="full cost ÷ revenue produced"
              />
            </ResultTiles>
          </>
        ) : (
          <NoResult text={problem} />
        )
      }
      analysis={<Analysis input={input} result={result} />}
    />
  );
}

/** The week read back in plain words: who comes out ahead, and what it costs the shop in full. */
function Reading({ result, revenue, burden }: { readonly result: TechnicianPayResult; readonly revenue: number; readonly burden: number }) {
  const top = payOf(result, result.highest);
  const full = top * (1 + burden);
  const low = Math.min(result.hourlyPay, result.flatRatePay > 0 ? result.flatRatePay : Infinity, result.commissionPay > 0 ? result.commissionPay : Infinity);
  const swing = Number.isFinite(low) && low > 0 ? (top - low) / low : 0;
  const matches = [
    result.bookHoursToMatchHourly !== null ? `flat rate pays the same as hourly at ${hours(result.bookHoursToMatchHourly)} of book time` : null,
    result.revenueToMatchHourly !== null ? `commission pays the same at ${money(result.revenueToMatchHourly, 0)} produced` : null,
  ].filter(Boolean);
  return (
    <ResultReading tone={swing > 0.2 ? "watch" : "good"} title={`${PLAN_NAME[result.highest]} pays the technician most this week: ${money(top, 0)}.`}>
      <p>
        With {pct(burden, 0)} for payroll taxes, workers&apos; comp and benefits, that week costs you {money(full, 0)}
        {revenue > 0 ? `, ${pct(full / revenue, 0)} of the ${money(revenue, 0)} the technician produced` : ""}.
      </p>
      {matches.length ? (
        <p>
          This week, {matches.join(", and ")}. Busier weeks than that favor the technician on those plans; slower weeks favor hourly.
        </p>
      ) : null}
      {swing > 0.2 ? <p>The plans differ by {pct(swing, 0)} on the same week, so switching a technician between them changes their pay a lot. Try a slow and a busy week before deciding.</p> : null}
    </ResultReading>
  );
}

function PlanCard({ plan, pay, children }: { readonly plan: PayPlan; readonly pay: string; readonly children: React.ReactNode }) {
  return (
    <fieldset className="min-w-0 rounded-xl border border-stone-200 bg-stone-50/50 p-4">
      <legend className="sr-only">{PLAN_NAME[plan]} plan</legend>
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-[15px] font-semibold text-stone-900">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: PLAN_COLOR[plan] }} />
          {PLAN_NAME[plan]}
        </span>
        <span className="text-sm font-semibold tabular-nums text-stone-700">{pay}</span>
      </div>
      <div className="space-y-4">{children}</div>
    </fieldset>
  );
}

function Analysis({
  input,
  result,
}: {
  readonly input: { hourlyWage: number; hoursOnClock: number; bookHours: number; payPerBookHour: number; revenueProduced: number; commissionRate: number };
  readonly result: TechnicianPayResult | null;
}) {
  if (!result) {
    return (
      <AnalysisGrid>
        <AnalysisCard title="Slow week to busy week" text="How each plan pays as the book hours change.">
          <EmptyAnalysis />
        </AnalysisCard>
        <AnalysisCard title="What each plan costs the shop">
          <EmptyAnalysis />
        </AnalysisCard>
      </AnalysisGrid>
    );
  }

  const revenuePerBookHour = input.bookHours > 0 ? input.revenueProduced / input.bookHours : 0;
  const commissionAt = (book: number) => (input.bookHours > 0 ? book * revenuePerBookHour * input.commissionRate : result.commissionPay);
  const commissionCross =
    input.bookHours > 0 && revenuePerBookHour * input.commissionRate > 0 ? result.hourlyPay / (revenuePerBookHour * input.commissionRate) : null;
  const xMax = Math.max(10, input.bookHours * 1.5, (result.bookHoursToMatchHourly ?? 0) * 1.2, Math.min(commissionCross ?? 0, 200) * 1.2);
  const line = (fn: (x: number) => number) =>
    Array.from({ length: 21 }, (_, i) => {
      const x = (xMax * i) / 20;
      return [x, fn(x)] as const;
    });

  const markers = [
    ...(result.bookHoursToMatchHourly !== null && result.bookHoursToMatchHourly <= xMax
      ? [{ key: "flat", x: result.bookHoursToMatchHourly, y: result.hourlyPay, label: `Flat rate passes hourly: ${hours(result.bookHoursToMatchHourly)}`, tone: "muted" as const }]
      : []),
    ...(commissionCross !== null && commissionCross <= xMax
      ? [{ key: "com", x: commissionCross, y: result.hourlyPay, label: `Commission passes hourly: ${hours(commissionCross)}`, tone: "muted" as const }]
      : []),
  ];

  const scenarios = [0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2];
  const clock = input.hoursOnClock;
  const scenarioRows = clock > 0 ? scenarios.map((share) => ({ share, book: share * clock })) : [];
  const currentShare = clock > 0 ? input.bookHours / clock : null;
  if (currentShare !== null && !scenarioRows.some((row) => Math.abs(row.book - input.bookHours) < 0.05)) {
    scenarioRows.push({ share: currentShare, book: input.bookHours });
  }
  scenarioRows.sort((a, b) => a.book - b.book);

  const plans: PayPlan[] = ["hourly", "flat-rate", "commission"];
  const pay = (plan: PayPlan) => payOf(result, plan);

  return (
    <div className="space-y-5">
      <AnalysisGrid>
        <AnalysisCard
          wide
          title="Slow week to busy week"
          text={
            input.bookHours > 0 ? (
              <>
                Pay against book hours, with the hours on the clock held at {hours(clock)} and revenue growing at this
                week&apos;s {money(revenuePerBookHour)} per book hour. Where a line crosses the hourly line, that plan
                starts paying more.
              </>
            ) : (
              "Enter book hours to see how flat rate and commission move with a busier or slower week."
            )
          }
        >
          <LineChart
            ariaLabel="Weekly pay on each plan against book hours turned"
            xMax={xMax}
            xLabel="Book hours turned in the week"
            formatX={(x) => `${Math.round(x)}`}
            formatY={(y) => (Math.abs(y) >= 1000 ? `$${(y / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })}k` : `$${Math.round(y)}`)}
            series={[
              { key: "hourly", label: `Hourly (${hours(clock)} on the clock)`, color: PLAN_COLOR.hourly, points: line(() => result.hourlyPay) },
              { key: "flat", label: `Flat rate at ${money(input.payPerBookHour)}/book hr`, color: PLAN_COLOR["flat-rate"], points: line((x) => x * input.payPerBookHour) },
              { key: "com", label: `Commission at ${pct(input.commissionRate)}`, color: PLAN_COLOR.commission, points: line(commissionAt), dashed: true },
            ]}
            guides={input.bookHours > 0 ? [{ key: "week", x: input.bookHours, label: `This week: ${hours(input.bookHours)}` }] : []}
            markers={markers}
          />
        </AnalysisCard>

        <AnalysisCard title="What each plan costs the shop" text="The owner's side of the same week: pay per hour on the clock, per book hour, and as a share of the revenue produced.">
          <div className="mt-3 overflow-x-auto rounded-xl border border-stone-200">
            <table className="w-full min-w-[420px] text-sm">
              <caption className="sr-only">Pay per hour and share of revenue for each plan</caption>
              <thead className="bg-stone-50 text-[11px] uppercase tracking-wide text-stone-500">
                <tr>
                  <th scope="col" className="px-3 py-2.5 text-left font-semibold">Plan</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">Per clock hr</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">Per book hr</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">Of revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {plans.map((plan) => (
                  <tr key={plan} className={plan === result.highest ? "bg-amber-50/70 font-semibold" : ""}>
                    <th scope="row" className="px-3 py-2 text-left font-medium text-stone-800">{PLAN_NAME[plan]}</th>
                    <td className="px-3 py-2 text-right tabular-nums">{clock > 0 ? money(pay(plan) / clock) : "–"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{input.bookHours > 0 ? money(pay(plan) / input.bookHours) : "–"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{input.revenueProduced > 0 ? pct(pay(plan) / input.revenueProduced) : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-stone-500">
            Gross pay only. Payroll taxes, workers&apos; comp and benefits come on top; the Labor Cost Workspace adds them.
          </p>
        </AnalysisCard>

        <AnalysisCard title="The formula, with your numbers">
          <YourMath
            rows={[
              {
                label: "Hourly",
                working: `${money(input.hourlyWage)} × ${hours(result.regularHours)}${result.overtimeHours > 0 ? ` + ${money(input.hourlyWage)} × 1.5 × ${hours(result.overtimeHours)}` : ""}`,
                value: money(result.hourlyPay),
              },
              { label: "Flat rate", working: `${hours(input.bookHours)} × ${money(input.payPerBookHour)}`, value: money(result.flatRatePay) },
              { label: "Commission", working: `${money(input.revenueProduced, 0)} × ${pct(input.commissionRate)}`, value: money(result.commissionPay) },
              {
                label: "Flat rate matches hourly",
                working: `${money(result.hourlyPay)} ÷ ${money(input.payPerBookHour)}`,
                value: result.bookHoursToMatchHourly === null ? "–" : hours(result.bookHoursToMatchHourly),
                strong: true,
              },
              {
                label: "Commission matches hourly",
                working: `${money(result.hourlyPay)} ÷ ${pct(input.commissionRate)}`,
                value: result.revenueToMatchHourly === null ? "–" : money(result.revenueToMatchHourly),
                strong: true,
              },
            ]}
          />
        </AnalysisCard>
      </AnalysisGrid>

      {scenarioRows.length > 0 ? (
        <section aria-labelledby="pay-whatif" className="border-t border-stone-200 pt-6">
          <h3 id="pay-whatif" className="text-base font-semibold text-stone-900">What if the week were slower or busier?</h3>
          <p className="mt-1 text-sm text-stone-600">
            Book hours as a share of the {hours(clock)} on the clock, revenue at {money(revenuePerBookHour)} per book hour.
            The plan that pays most in each row is darker.
          </p>
          <WhatIfTable
            caption="Weekly pay on each plan at different book hours"
            corner="Book hours"
            columns={plans.map((plan) => ({ key: plan, label: PLAN_NAME[plan] }))}
            rows={scenarioRows.map((row) => {
              const values: Record<PayPlan, number> = {
                hourly: result.hourlyPay,
                "flat-rate": row.book * input.payPerBookHour,
                commission: commissionAt(row.book),
              };
              const best = Math.max(...plans.map((plan) => values[plan]));
              return {
                key: row.book.toFixed(2),
                current: Math.abs(row.book - input.bookHours) < 0.05,
                label: (
                  <>
                    {hours(row.book)} <span className="text-xs font-normal text-stone-500">· {pct(row.share, 0)}</span>
                  </>
                ),
                cells: plans.map((plan) => ({ text: money(values[plan], 0), tone: values[plan] === best ? ("strong" as const) : ("muted" as const) })),
              };
            })}
          />
        </section>
      ) : null}
    </div>
  );
}
