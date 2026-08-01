/**
 * Static placeholder content for Mission Control v2 layout review.
 * Glance, business health, schedule, recent activity, and the KPI strip accept
 * live mappers; remaining sections stay placeholder until wired.
 */

import type { JobStatus } from "@/shared/types/job";
import type {
  OperationalActivityEventType,
  OperationalActivitySource,
} from "@/shared/types/operational-activity";

export type MissionControlV2GlanceStat = {
  id: string;
  label: string;
  value: string;
  detail: string;
};

export type MissionControlV2ScheduleRow = {
  id: string;
  time: string;
  title: string;
  address: string;
  assigneeName: string;
  assigneeInitials: string;
  status: JobStatus;
  /** Optional deep link to the job detail page. */
  href?: string;
};

export type MissionControlV2ActivityRow = {
  id: string;
  title: string;
  detail: string;
  timestamp: string;
  amount?: string;
  tone: "neutral" | "success" | "warning" | "danger";
  /** Optional deep link to the related record. */
  href?: string;
  source: OperationalActivitySource;
  eventType: OperationalActivityEventType;
};

export type MissionControlV2KpiCard = {
  id: string;
  label: string;
  value: string;
  comparison: string;
  comparisonPositive: boolean;
  /** Current-period sparkline bucket values (daily or weekly). */
  sparkline: number[];
};

export const missionControlV2SampleData = {
  companyName: "Summit Field Services",
  userName: "Jordan Lee",
  userInitials: "JL",
  greeting: "Good morning, Summit Field Services",
  dateLabel: "Friday, July 31, 2026",
  notificationCount: 3,
  glanceStats: [
    {
      id: "revenue",
      label: "Revenue",
      value: "$4,280",
      detail: "+12% vs yesterday",
    },
    {
      id: "jobs",
      label: "Jobs",
      value: "14",
      detail: "9 active · 5 done",
    },
    {
      id: "technicians",
      label: "Technicians",
      value: "6",
      detail: "5 on site · 1 dispatched",
    },
    {
      id: "leads",
      label: "Leads",
      value: "3",
      detail: "Created today",
    },
  ] satisfies MissionControlV2GlanceStat[],
  businessHealthStats: [
    {
      id: "outstanding",
      label: "Outstanding",
      value: "$18,450",
      detail: "12 open invoices",
    },
    {
      id: "past-due",
      label: "Past due",
      value: "$6,200",
      detail: "4 past due",
    },
    {
      id: "monthly-revenue",
      label: "Monthly revenue",
      value: "$72,100",
      detail: "On pace for $84k",
    },
    {
      id: "collections",
      label: "Collections",
      value: "94%",
      detail: "+3 pts vs last month",
    },
  ] satisfies MissionControlV2GlanceStat[],
  nextRecommended: {
    headline: "Invite your first technician",
    subtext: "Get the field team onto jobs so dispatch stays live.",
  },
  promo: {
    headline: "Explore Pro",
    subtext:
      "For established operations managing multiple crews or locations.",
  },
  schedule: [
    {
      id: "s1",
      time: "8:00 AM",
      title: "Annual HVAC tune-up",
      address: "412 Maple Ave",
      assigneeName: "Sam Ortiz",
      assigneeInitials: "SO",
      status: "in_progress",
    },
    {
      id: "s2",
      time: "10:30 AM",
      title: "Water heater install",
      address: "88 Harbor Rd",
      assigneeName: "Alex Kim",
      assigneeInitials: "AK",
      status: "dispatched",
    },
    {
      id: "s3",
      time: "1:00 PM",
      title: "Drain cleaning",
      address: "15 Cedar Ct",
      assigneeName: "Riley Chen",
      assigneeInitials: "RC",
      status: "scheduled",
    },
    {
      id: "s4",
      time: "3:30 PM",
      title: "Thermostat replacement",
      address: "902 Lakeview Dr",
      assigneeName: "Sam Ortiz",
      assigneeInitials: "SO",
      status: "scheduled",
    },
  ] satisfies MissionControlV2ScheduleRow[],
  activity: [
    {
      id: "a1",
      title: "Payment recorded",
      detail: "via Card · Invoice INV-1842",
      timestamp: "12m ago",
      amount: "$1,240.00",
      tone: "success",
      source: "invoice",
      eventType: "payment_recorded",
    },
    {
      id: "a2",
      title: "Estimate approved",
      detail: "Draft → Approved",
      timestamp: "48m ago",
      tone: "success",
      source: "estimate",
      eventType: "estimate_approved",
    },
    {
      id: "a3",
      title: "Work completed",
      detail: "In progress → Completed",
      timestamp: "1h ago",
      tone: "success",
      source: "job",
      eventType: "work_completed",
    },
    {
      id: "a4",
      title: "Invoice sent",
      detail: "Email sent to customer · Invoice INV-1850",
      timestamp: "2h ago",
      tone: "warning",
      source: "invoice",
      eventType: "invoice_sent",
    },
    {
      id: "a5",
      title: "Customer created",
      detail: "Northside Dental Group",
      timestamp: "3h ago",
      tone: "neutral",
      source: "customer",
      eventType: "customer_created",
    },
  ] satisfies MissionControlV2ActivityRow[],
  kpis: [
    {
      id: "jobs-completed",
      label: "Jobs completed",
      value: "128",
      comparison: "Up 8% vs previous period",
      comparisonPositive: true,
      sparkline: [3, 5, 4, 6, 5, 7, 4, 8, 6, 5, 7, 9],
    },
    {
      id: "avg-ticket",
      label: "Avg. ticket",
      value: "$412",
      comparison: "Up $12 vs previous period",
      comparisonPositive: true,
      sparkline: [380, 400, 390, 420, 410, 430, 405, 440, 415, 425, 400, 412],
    },
    {
      id: "close-rate",
      label: "Estimate close rate",
      value: "61%",
      comparison: "Down 2% vs previous period",
      comparisonPositive: false,
      sparkline: [55, 58, 60, 52, 64, 61, 59, 63, 57, 66, 60, 61],
    },
  ] satisfies MissionControlV2KpiCard[],
};
