"use client";

import type { FieldSpec } from "@/shared/components/resources/CalculatorFields";
import { SummaryCalculator } from "@/shared/components/resources/SummaryCalculator";
import { CALLBACK_COST_DEFAULTS } from "@/shared/lib/resources/callback-cost";

type Key =
  | "callbacksPerMonth"
  | "jobsPerMonth"
  | "hoursPerCallback"
  | "costPerBillableHour"
  | "partsPerCallback"
  | "billableRate";

const FIELDS: readonly FieldSpec<Key>[] = [
  {
    key: "callbacksPerMonth",
    label: "Callbacks per month",
    unit: "callbacks",
    hint: "Return trips to a finished job that the customer did not pay for.",
  },
  {
    key: "jobsPerMonth",
    label: "Jobs completed per month",
    unit: "jobs",
    hint: "All jobs in the same month, so the callback rate can be worked out.",
  },
  {
    key: "hoursPerCallback",
    label: "Hours per callback",
    unit: "hrs",
    hint: "Time on site plus the drive there and back.",
  },
  {
    key: "costPerBillableHour",
    label: "Cost per billable hour",
    unit: "$",
    hint: "Labor, burden and overhead for one hour. The labor rate calculator gives you this number.",
  },
  {
    key: "partsPerCallback",
    label: "Parts given away per callback",
    unit: "$",
    hint: "Parts and materials used on a typical callback, at your cost.",
  },
  {
    key: "billableRate",
    label: "Your billable hourly rate",
    unit: "$",
    hint: "What you charge for an hour, to show what the lost hours would have billed.",
  },
];

const DEFAULTS: Record<Key, string> = {
  callbacksPerMonth: String(CALLBACK_COST_DEFAULTS.callbacksPerMonth),
  jobsPerMonth: String(CALLBACK_COST_DEFAULTS.jobsPerMonth),
  hoursPerCallback: String(CALLBACK_COST_DEFAULTS.hoursPerCallback),
  costPerBillableHour: String(CALLBACK_COST_DEFAULTS.costPerBillableHour),
  partsPerCallback: String(CALLBACK_COST_DEFAULTS.partsPerCallback),
  billableRate: String(CALLBACK_COST_DEFAULTS.billableRate),
};

export function CallbackCostCalculator() {
  return (
    <SummaryCalculator
      slug="callback-cost"
      fields={FIELDS}
      defaults={DEFAULTS}
      invalidMessage="Callbacks cannot be more than the jobs completed in the same month. Check that both numbers are for the same month."
    />
  );
}
