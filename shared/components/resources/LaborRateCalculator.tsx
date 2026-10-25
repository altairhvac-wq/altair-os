"use client";

import {
  CalculatorLayout,
  NumberField,
  ResultsPanel,
  formatCurrency,
  parseNumber,
  useCalculatorFields,
  type FieldSpec,
} from "@/shared/components/resources/CalculatorFields";
import {
  LABOR_RATE_DEFAULTS,
  calculateLaborRate,
} from "@/shared/lib/resources/labor-rate";

type Key =
  | "hourlyWage"
  | "burdenPercent"
  | "nonBillableHoursPerWeek"
  | "billableHoursPerWeek"
  | "monthlyOverhead"
  | "targetMarginPercent";

const FIELDS: readonly FieldSpec<Key>[] = [
  { key: "hourlyWage", label: "Technician wage", unit: "$", hint: "Base hourly pay." },
  {
    key: "burdenPercent",
    label: "Labor burden",
    unit: "%",
    hint: "Payroll taxes, workers' comp, insurance and benefits as a % of wage.",
  },
  {
    key: "billableHoursPerWeek",
    label: "Billable hours per week",
    unit: "hrs/wk",
    hint: "Hours actually charged to customers.",
  },
  {
    key: "nonBillableHoursPerWeek",
    label: "Paid non-billable hours per week",
    unit: "hrs/wk",
    hint: "Drive time, shop time, training, callbacks you do not charge for.",
  },
  {
    key: "monthlyOverhead",
    label: "Overhead allocated per month",
    unit: "$",
    hint: "This technician's share of rent, office pay, vehicles, insurance, software.",
  },
  {
    key: "targetMarginPercent",
    label: "Target net margin",
    unit: "%",
    max: 99,
    hint: "Profit you want left after all costs, as a % of the billed rate.",
  },
];

const DEFAULTS: Record<Key, string> = {
  hourlyWage: String(LABOR_RATE_DEFAULTS.hourlyWage),
  burdenPercent: String(LABOR_RATE_DEFAULTS.burdenRate * 100),
  nonBillableHoursPerWeek: String(LABOR_RATE_DEFAULTS.nonBillableHoursPerWeek),
  billableHoursPerWeek: String(LABOR_RATE_DEFAULTS.billableHoursPerWeek),
  monthlyOverhead: String(LABOR_RATE_DEFAULTS.monthlyOverhead),
  targetMarginPercent: String(LABOR_RATE_DEFAULTS.targetNetMargin * 100),
};

export function LaborRateCalculator() {
  const { values, setField, reset } = useCalculatorFields<Key>(DEFAULTS);

  const result = calculateLaborRate({
    hourlyWage: parseNumber(values.hourlyWage),
    burdenRate: parseNumber(values.burdenPercent) / 100,
    nonBillableHoursPerWeek: parseNumber(values.nonBillableHoursPerWeek),
    billableHoursPerWeek: parseNumber(values.billableHoursPerWeek),
    monthlyOverhead: parseNumber(values.monthlyOverhead),
    targetNetMargin: parseNumber(values.targetMarginPercent) / 100,
  });

  return (
    <CalculatorLayout
      onReset={reset}
      fields={FIELDS.map((spec) => (
        <NumberField key={spec.key} spec={spec} value={values[spec.key]} onChange={setField} />
      ))}
      results={
        <ResultsPanel
          headlineLabel="Billable hourly rate"
          headlineValue={result ? formatCurrency(result.billableHourlyRate) : null}
          headlineNote={
            result
              ? `About ${formatCurrency(result.billableHourlyRateRounded)} rounded up to the next dollar.`
              : undefined
          }
          invalidMessage="Enter more than 0 billable hours and a target margin below 100% to see a rate."
          lines={
            result
              ? [
                  { label: "Loaded hourly cost", value: formatCurrency(result.loadedHourlyCost) },
                  { label: "Paid hours per week", value: result.paidHoursPerWeek.toFixed(1) },
                  { label: "Weekly labor cost", value: formatCurrency(result.weeklyLaborCost) },
                  { label: "Weekly overhead", value: formatCurrency(result.weeklyOverhead) },
                  {
                    label: "Cost per billable hour",
                    value: formatCurrency(result.costPerBillableHour),
                    emphasis: true,
                  },
                ]
              : []
          }
        />
      }
    />
  );
}
