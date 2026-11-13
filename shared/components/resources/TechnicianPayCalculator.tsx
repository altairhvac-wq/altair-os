"use client";

import type { FieldSpec } from "@/shared/components/resources/CalculatorFields";
import { SummaryCalculator } from "@/shared/components/resources/SummaryCalculator";
import { TECHNICIAN_PAY_DEFAULTS } from "@/shared/lib/resources/technician-pay";

type Key =
  | "hourlyWage"
  | "hoursOnClock"
  | "bookHours"
  | "payPerBookHour"
  | "revenueProduced"
  | "commissionPercent";

const FIELDS: readonly FieldSpec<Key>[] = [
  {
    key: "hourlyWage",
    label: "Hourly wage",
    unit: "$",
    hint: "What the hourly plan pays per hour.",
  },
  {
    key: "hoursOnClock",
    label: "Hours on the clock this week",
    unit: "hrs",
    max: 168,
    hint: "All paid time: jobs, driving, shop time. Hours past 40 are counted as overtime on the hourly plan.",
  },
  {
    key: "bookHours",
    label: "Book hours turned this week",
    unit: "hrs",
    hint: "Flat-rate hours for the jobs completed, whatever they actually took.",
  },
  {
    key: "payPerBookHour",
    label: "Pay per book hour",
    unit: "$",
    hint: "What the flat-rate plan pays for each book hour.",
  },
  {
    key: "revenueProduced",
    label: "Revenue produced this week",
    unit: "$",
    hint: "What the technician's completed jobs billed, before tax.",
  },
  {
    key: "commissionPercent",
    label: "Commission",
    unit: "%",
    max: 100,
    hint: "The share of that revenue the commission plan pays.",
  },
];

const DEFAULTS: Record<Key, string> = {
  hourlyWage: String(TECHNICIAN_PAY_DEFAULTS.hourlyWage),
  hoursOnClock: String(TECHNICIAN_PAY_DEFAULTS.hoursOnClock),
  bookHours: String(TECHNICIAN_PAY_DEFAULTS.bookHours),
  payPerBookHour: String(TECHNICIAN_PAY_DEFAULTS.payPerBookHour),
  revenueProduced: String(TECHNICIAN_PAY_DEFAULTS.revenueProduced),
  commissionPercent: String(TECHNICIAN_PAY_DEFAULTS.commissionRate * 100),
};

export function TechnicianPayCalculator() {
  return (
    <SummaryCalculator
      slug="technician-pay"
      fields={FIELDS}
      defaults={DEFAULTS}
      invalidMessage="Enter no more than 168 hours for the week and a commission from 0 to 100% to compare the three."
    />
  );
}
