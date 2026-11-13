"use client";

import type { FieldSpec } from "@/shared/components/resources/CalculatorFields";
import { SummaryCalculator } from "@/shared/components/resources/SummaryCalculator";
import { MAINTENANCE_AGREEMENT_DEFAULTS } from "@/shared/lib/resources/maintenance-agreement";

type Key =
  | "visitsPerYear"
  | "hoursPerVisit"
  | "costPerBillableHour"
  | "materialsPerVisit"
  | "officeCostPerYear"
  | "expectedRepairSpendPerYear"
  | "repairDiscountPercent"
  | "targetMarginPercent";

const FIELDS: readonly FieldSpec<Key>[] = [
  {
    key: "visitsPerYear",
    label: "Visits per year",
    unit: "visits",
    hint: "Scheduled maintenance visits the agreement includes.",
  },
  {
    key: "hoursPerVisit",
    label: "Hours per visit",
    unit: "hrs",
    hint: "Time on site plus the drive there.",
  },
  {
    key: "costPerBillableHour",
    label: "Cost per billable hour",
    unit: "$",
    hint: "Labor, burden and overhead for one hour. The labor rate calculator gives you this number.",
  },
  {
    key: "materialsPerVisit",
    label: "Materials per visit",
    unit: "$",
    hint: "Filters, cleaner and anything else used every time.",
  },
  {
    key: "officeCostPerYear",
    label: "Office cost per agreement",
    unit: "$",
    hint: "Booking, reminders and billing for one agreement over a year.",
  },
  {
    key: "expectedRepairSpendPerYear",
    label: "Repairs a member buys per year",
    unit: "$",
    hint: "What a typical member spends on repairs in a year, before any discount.",
  },
  {
    key: "repairDiscountPercent",
    label: "Member repair discount",
    unit: "%",
    max: 100,
    hint: "The discount members get on repairs. Enter 0 if there is none.",
  },
  {
    key: "targetMarginPercent",
    label: "Target net margin",
    unit: "%",
    max: 99,
    hint: "Profit you want left from the agreement price after its costs.",
  },
];

const DEFAULTS: Record<Key, string> = {
  visitsPerYear: String(MAINTENANCE_AGREEMENT_DEFAULTS.visitsPerYear),
  hoursPerVisit: String(MAINTENANCE_AGREEMENT_DEFAULTS.hoursPerVisit),
  costPerBillableHour: String(MAINTENANCE_AGREEMENT_DEFAULTS.costPerBillableHour),
  materialsPerVisit: String(MAINTENANCE_AGREEMENT_DEFAULTS.materialsPerVisit),
  officeCostPerYear: String(MAINTENANCE_AGREEMENT_DEFAULTS.officeCostPerYear),
  expectedRepairSpendPerYear: String(MAINTENANCE_AGREEMENT_DEFAULTS.expectedRepairSpendPerYear),
  repairDiscountPercent: String(MAINTENANCE_AGREEMENT_DEFAULTS.repairDiscountRate * 100),
  targetMarginPercent: String(MAINTENANCE_AGREEMENT_DEFAULTS.targetNetMargin * 100),
};

export function MaintenanceAgreementCalculator() {
  return (
    <SummaryCalculator
      slug="maintenance-agreement"
      fields={FIELDS}
      defaults={DEFAULTS}
      invalidMessage="Enter at least one visit per year, a discount from 0 to 100% and a margin below 100% to see a price."
    />
  );
}
