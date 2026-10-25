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
  JOB_PROFITABILITY_DEFAULTS,
  calculateJobProfitability,
} from "@/shared/lib/resources/job-profitability";

type Key =
  | "revenue"
  | "laborHours"
  | "loadedLaborRate"
  | "materialsCost"
  | "subcontractCost"
  | "overheadPercent";

const FIELDS: readonly FieldSpec<Key>[] = [
  { key: "revenue", label: "Job revenue", unit: "$", hint: "What the customer pays, before tax." },
  {
    key: "laborHours",
    label: "Labor hours",
    unit: "hrs",
    hint: "All paid technician hours on the job, including drive time.",
  },
  {
    key: "loadedLaborRate",
    label: "Loaded labor cost per hour",
    unit: "$",
    hint: "Wage plus burden (taxes, insurance, benefits) — your cost, not your billed rate.",
  },
  { key: "materialsCost", label: "Materials", unit: "$", hint: "Parts and supplies at your cost." },
  { key: "subcontractCost", label: "Subcontract", unit: "$", hint: "Anything you paid someone else to do." },
  {
    key: "overheadPercent",
    label: "Overhead allocation",
    unit: "%",
    hint: "Annual overhead divided by annual revenue, as a %.",
  },
];

const DEFAULTS: Record<Key, string> = {
  revenue: String(JOB_PROFITABILITY_DEFAULTS.revenue),
  laborHours: String(JOB_PROFITABILITY_DEFAULTS.laborHours),
  loadedLaborRate: String(JOB_PROFITABILITY_DEFAULTS.loadedLaborRate),
  materialsCost: String(JOB_PROFITABILITY_DEFAULTS.materialsCost),
  subcontractCost: String(JOB_PROFITABILITY_DEFAULTS.subcontractCost),
  overheadPercent: String(JOB_PROFITABILITY_DEFAULTS.overheadAllocationRate * 100),
};

export function JobProfitabilityCalculator() {
  const { values, setField, reset } = useCalculatorFields<Key>(DEFAULTS);

  const result = calculateJobProfitability({
    revenue: parseNumber(values.revenue),
    laborHours: parseNumber(values.laborHours),
    loadedLaborRate: parseNumber(values.loadedLaborRate),
    materialsCost: parseNumber(values.materialsCost),
    subcontractCost: parseNumber(values.subcontractCost),
    overheadAllocationRate: parseNumber(values.overheadPercent) / 100,
  });
  const valid = result.netMargin !== null;

  return (
    <CalculatorLayout
      onReset={reset}
      fields={FIELDS.map((spec) => (
        <NumberField key={spec.key} spec={spec} value={values[spec.key]} onChange={setField} />
      ))}
      results={
        <ResultsPanel
          headlineLabel="Net profit on this job"
          headlineValue={valid ? formatCurrency(result.netProfit) : null}
          headlineNote={valid ? `Net margin ${formatPercent(result.netMargin)}` : undefined}
          invalidMessage="Enter the job revenue to see its profit and margins."
          lines={[
            { label: "Labor cost", value: formatCurrency(result.laborCost) },
            { label: "Direct cost (labor + materials + sub)", value: formatCurrency(result.directCost) },
            {
              label: "Gross profit",
              value: formatCurrency(result.grossProfit),
              emphasis: true,
              tone: result.grossProfit < 0 ? "negative" : "neutral",
            },
            { label: "Gross margin", value: formatPercent(result.grossMargin) },
            { label: "Overhead allocated", value: formatCurrency(result.overheadAllocated) },
            {
              label: "Net profit",
              value: formatCurrency(result.netProfit),
              emphasis: true,
              tone: result.netProfit < 0 ? "negative" : "neutral",
            },
            { label: "Net margin", value: formatPercent(result.netMargin) },
          ]}
        />
      }
    />
  );
}
