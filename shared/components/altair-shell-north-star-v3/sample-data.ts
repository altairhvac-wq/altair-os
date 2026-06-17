import type {
  JobInMotion,
  MoneyStage,
  OperatingSignal,
  PriorityAction,
  TechnicianPresence,
} from "@/shared/components/dashboard/north-star-v2/sample-data";

export type V3Insight = {
  id: string;
  headline: string;
  detail: string;
  action: string;
  href: string;
  confidence: "high" | "medium";
};

export type ActionQueueItem = {
  id: string;
  title: string;
  meta: string;
  urgency: "now" | "today" | "soon";
  amount?: string;
  impact?: string;
};

export type OfficeQueueItem = {
  id: string;
  title: string;
  meta: string;
  type: "estimate" | "invoice" | "job" | "lead";
};

export type ActivityItem = {
  id: string;
  title: string;
  time: string;
  tone: "slate" | "emerald" | "amber";
};

export type PulseMetric = {
  id: string;
  label: string;
  value: string;
  delta: string;
  tone: "slate" | "emerald" | "amber";
};

export type SystemConnection = {
  id: string;
  from: string;
  to: string;
  note: string;
};

export type V3SampleData = {
  dayState: {
    operatorName: string;
    dateLabel: string;
    shiftLabel: string;
    monitoringMessage: string;
    primaryFocus: string;
    primaryImpact: string;
    opsScore: number;
  };
  signals: OperatingSignal[];
  priorityActions: PriorityAction[];
  insight: V3Insight;
  actionQueue: ActionQueueItem[];
  officeQueue: OfficeQueueItem[];
  jobsInMotion: JobInMotion[];
  technicians: TechnicianPresence[];
  moneyStages: MoneyStage[];
  expenseReview: {
    pendingCount: number;
    pendingTotal: string;
  };
  leadOpportunity: {
    label: string;
    value: string;
    detail: string;
  };
  pulseMetrics: PulseMetric[];
  activities: ActivityItem[];
  momentum: string[];
  systemConnections: SystemConnection[];
  systemHealth: {
    score: number;
    label: string;
    status: string;
    notifications: number;
  };
};

export const v3SampleData: V3SampleData = {
  dayState: {
    operatorName: "Jeremiah",
    dateLabel: "Tuesday · Jun 16",
    shiftLabel: "Morning dispatch · 4 techs on route · HVAC peak season",
    monitoringMessage: "Altair is watching jobs, invoices, and crew load",
    primaryFocus: "3 overdue invoices blocking $3,840 in collected cash",
    primaryImpact:
      "Westside Retail, Chen Residence, and Harbor Office Park are past due — follow up before noon dispatch.",
    opsScore: 82,
  },
  signals: [
    { label: "Jobs on board", value: "11", emphasis: "positive" },
    { label: "Ready to invoice", value: "$4.2k", emphasis: "neutral" },
    { label: "Overdue AR", value: "3", emphasis: "attention" },
    { label: "Unassigned", value: "1", emphasis: "attention" },
  ],
  priorityActions: [
    {
      id: "overdue",
      label: "Collect overdue invoices",
      href: "/invoices?status=overdue",
      leverage: "primary",
      metric: "$3,840 · 3 accounts past due",
    },
    {
      id: "ready-invoice",
      label: "Invoice completed jobs",
      href: "/invoices?status=ready",
      leverage: "secondary",
      metric: "$4,200 · Miller, Parkview, Chen",
    },
    {
      id: "assign",
      label: "Dispatch tomorrow's call",
      href: "/dispatch",
      leverage: "secondary",
      metric: "Johnson AC · 7:00 AM · unassigned",
    },
    {
      id: "estimates",
      label: "Revive quiet quotes",
      href: "/estimates?status=sent",
      leverage: "tertiary",
      metric: "$6,400 · 3 HVAC estimates",
    },
  ],
  insight: {
    id: "billing-leverage",
    headline: "Completed work is waiting to become cash",
    detail:
      "Miller Home closed this morning — that's $640 ready to invoice. 3 overdue accounts are slowing the pipeline. Clear AR first, then send ready invoices before crew dispatch.",
    action: "Open billing queue",
    href: "/invoices",
    confidence: "high",
  },
  actionQueue: [
    {
      id: "overdue-invoices",
      title: "3 overdue invoices",
      meta: "Oldest 12 days · Westside, Chen, Harbor",
      urgency: "now",
      amount: "$3,840",
      impact: "Blocks cash · 3 commercial accounts at risk",
    },
    {
      id: "ready-to-invoice",
      title: "3 jobs ready to invoice",
      meta: "Completed HVAC work · invoice not sent",
      urgency: "today",
      amount: "$4,200",
      impact: "Miller Home just closed · $640 unlocks today",
    },
    {
      id: "stalled-jobs",
      title: "2 stalled service calls",
      meta: "5+ days idle · parts or approval hold",
      urgency: "today",
      impact: "Parkview HOA · Chen duct job stuck on estimate",
    },
    {
      id: "follow-ups",
      title: "3 quiet HVAC estimates",
      meta: "$6,400 · no response in 7+ days",
      urgency: "soon",
      amount: "$6,400",
      impact: "Seasonal replacement window closing",
    },
  ],
  officeQueue: [
    {
      id: "oq-1",
      title: "Approve estimate · Parkview HOA",
      meta: "$8,200 rooftop package · sent 3d ago",
      type: "estimate",
    },
    {
      id: "oq-2",
      title: "Send invoice · Chen Residence",
      meta: "Duct cleaning complete · $640",
      type: "invoice",
    },
    {
      id: "oq-3",
      title: "Close job · Miller Home",
      meta: "Thermostat install done · ready for invoice",
      type: "job",
    },
  ],
  jobsInMotion: [
    {
      id: "job-1",
      customer: "Westside Retail",
      job: "Rooftop unit service",
      time: "8:00",
      status: "in_progress",
      technician: "Marcus T.",
    },
    {
      id: "job-2",
      customer: "Chen Residence",
      job: "Duct cleaning",
      time: "9:30",
      status: "en_route",
      technician: "Devon R.",
    },
    {
      id: "job-3",
      customer: "Harbor Office Park",
      job: "Preventive maintenance",
      time: "11:00",
      status: "scheduled",
      technician: "Alex K.",
    },
    {
      id: "job-4",
      customer: "Miller Home",
      job: "Thermostat install",
      time: "1:15",
      status: "completed",
      technician: "Marcus T.",
    },
  ],
  technicians: [
    {
      id: "tech-1",
      name: "Marcus Thompson",
      initials: "MT",
      state: "on_job",
      jobLabel: "Westside Retail · RTU",
    },
    {
      id: "tech-2",
      name: "Devon Reyes",
      initials: "DR",
      state: "on_job",
      jobLabel: "En route · Chen duct",
    },
    {
      id: "tech-3",
      name: "Alex Kim",
      initials: "AK",
      state: "available",
      jobLabel: "Next: Harbor PM",
    },
    {
      id: "tech-4",
      name: "Jordan Lee",
      initials: "JL",
      state: "break",
      jobLabel: "Back at 12:30",
    },
  ],
  moneyStages: [
    {
      id: "ready",
      label: "Ready to send",
      amount: "$4,200",
      detail: "3 completed jobs",
      emphasis: "positive",
      fill: 22,
    },
    {
      id: "sent",
      label: "Sent · awaiting pay",
      amount: "$8,840",
      detail: "5 open invoices",
      emphasis: "neutral",
      fill: 46,
    },
    {
      id: "unpaid",
      label: "Outstanding AR",
      amount: "$12,680",
      detail: "8 invoices open",
      emphasis: "neutral",
      fill: 66,
    },
    {
      id: "overdue",
      label: "Overdue",
      amount: "$3,840",
      detail: "3 past due · action now",
      emphasis: "attention",
      fill: 20,
    },
    {
      id: "collected",
      label: "Collected today",
      amount: "$1,240",
      detail: "2 payments in",
      emphasis: "positive",
      fill: 12,
    },
  ],
  expenseReview: {
    pendingCount: 4,
    pendingTotal: "$842",
  },
  leadOpportunity: {
    label: "Replacement pipeline",
    value: "$31.6k",
    detail: "4 quoted installs · 2 viewed this week",
  },
  pulseMetrics: [
    {
      id: "revenue",
      label: "Revenue in motion",
      value: "$16.9k",
      delta: "+12% vs last week",
      tone: "slate",
    },
    {
      id: "completion",
      label: "Jobs completed",
      value: "4 today",
      delta: "91% close rate this week",
      tone: "emerald",
    },
    {
      id: "backlog",
      label: "Cash waiting",
      value: "$29.7k",
      delta: "8 unpaid · 3 overdue",
      tone: "amber",
    },
    {
      id: "pipeline",
      label: "Quoted pipeline",
      value: "$84.1k",
      delta: "12 active HVAC leads",
      tone: "slate",
    },
  ],
  activities: [
    { id: "a-1", title: "Payment received · Westside Retail", time: "12m ago", tone: "emerald" },
    { id: "a-2", title: "Estimate opened · Parkview HOA", time: "1h ago", tone: "slate" },
    { id: "a-3", title: "Job closed · Miller Home thermostat", time: "2h ago", tone: "emerald" },
    { id: "a-4", title: "Parts receipt flagged · Devon R.", time: "3h ago", tone: "amber" },
  ],
  momentum: [
    "4 service calls completed today",
    "Morning crew dispatch on schedule",
    "2 invoices paid overnight",
  ],
  systemConnections: [
    {
      id: "complete-to-invoice",
      from: "Jobs complete",
      to: "Ready to invoice",
      note: "Miller Home → $640 waiting",
    },
    {
      id: "stall-to-action",
      from: "Stalled jobs",
      to: "Action queue",
      note: "2 calls need owner decision",
    },
    {
      id: "overdue-to-cash",
      from: "Overdue AR",
      to: "Cash pipeline",
      note: "$3,840 blocking collection",
    },
    {
      id: "crew-to-dispatch",
      from: "Crew load",
      to: "Dispatch pressure",
      note: "1 unassigned · Johnson 7 AM",
    },
  ],
  systemHealth: {
    score: 82,
    label: "Field ops healthy",
    status: "Dispatch, billing, and crew sync nominal",
    notifications: 2,
  },
};
