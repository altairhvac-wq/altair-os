"use client";

import {
  CalculatorLayout,
  NumberField,
  ResultsPanel,
  formatCurrency,
  formatPercent,
  parseNumber,
  useCalculatorFields,
  type FieldSpec,
} from "@/shared/components/resources/CalculatorFields";
import {
  BREAK_EVEN_DEFAULTS,
  calculateBreakEven,
} from "@/shared/lib/resources/break-even";

type Key = "fixedMonthlyCosts" | "averageJobRevenue" | "variableCostPercent";

const FIELDS: readonly FieldSpec<Key>[] = [
  {
    key: "fixedMonthlyCosts",
    label: "Fixed monthly costs",
    unit: "$",
    hint: "Costs that arrive whether or not a truck rolls: rent, insurance, office pay, vehicles, software, loan payments.",
  },
  {
    key: "averageJobRevenue",
    label: "Average job revenue",
    unit: "$",
    hint: "Total revenue divided by number of jobs over a recent period.",
  },
  {
    key: "variableCostPercent",
    label: "Variable costs",
    unit: "%",
    max: 99,
    hint: "Costs that scale with each job (parts, field labor, permits, card fees) as a % of revenue.",
  },
];

const DEFAULTS: Record<Key, string> = {
  fixedMonthlyCosts: String(BREAK_EVEN_DEFAULTS.fixedMonthlyCosts),
  averageJobRevenue: String(BREAK_EVEN_DEFAULTS.averageJobRevenue),
  variableCostPercent: String(BREAK_EVEN_DEFAULTS.variableCostRate * 100),
};

export function BreakEvenCalculator() {
  const { values, setField, reset } = useCalculatorFields<Key>(DEFAULTS);

  const result = calculateBreakEven({
    fixedMonthlyCosts: parseNumber(values.fixedMonthlyCosts),
    averageJobRevenue: parseNumber(values.averageJobRevenue),
    variableCostRate: parseNumber(values.variableCostPercent) / 100,
  });

  return (
    <CalculatorLayout
      onReset={reset}
      fields={FIELDS.map((spec) => (
        <NumberField key={spec.key} spec={spec} value={values[spec.key]} onChange={setField} />
      ))}
      results={
        <ResultsPanel
          headlineLabel="Break-even jobs per month"
          headlineValue={result ? String(result.breakEvenJobs) : null}
          headlineNote={
            result
              ? `${result.breakEvenJobsExact.toFixed(1)} jobs exactly, rounded up. About ${result.breakEvenJobsPerWeek.toFixed(1)} per week.`
              : undefined
          }
          invalidMessage="Enter an average job revenue above 0 and variable costs below 100% to see a break-even point."
          lines={
            result
              ? [
                  {
                    label: "Break-even revenue per month",
                    value: formatCurrency(result.breakEvenRevenue),
                    emphasis: true,
                  },
                  { label: "Contribution per job", value: formatCurrency(result.contributionPerJob) },
                  { label: "Contribution margin", value: formatPercent(result.contributionMarginRate) },
                ]
              : []
          }
        />
      }
    />
  );
}
