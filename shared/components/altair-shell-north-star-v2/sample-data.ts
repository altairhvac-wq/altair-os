import type {
  JobInMotion,
  MoneyStage,
  OperatingSignal,
  PriorityAction,
  TechnicianPresence,
} from "@/shared/components/dashboard/north-star-v2/sample-data";

export type MissionInsight = {
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
  tone: "cyan" | "emerald" | "amber" | "slate";
};

export type PulseMetric = {
  id: string;
  label: string;
  value: string;
  delta: string;
  tone: "cyan" | "emerald" | "amber" | "violet";
};

export type MissionControlSampleData = {
  dayState: {
    greeting: string;
    dateLabel: string;
    shiftLabel: string;
    monitoringMessage: string;
    primaryFocus: string;
    opsScore: number;
  };
  signals: OperatingSignal[];
  priorityActions: PriorityAction[];
  insight: MissionInsight;
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
  systemHealth: {
    score: number;
    label: string;
    status: string;
    notifications: number;
  };
};

export const missionControlSampleData: MissionControlSampleData = {
  dayState: {
    greeting: "Jeremiah",
    dateLabel: "Tuesday · Jun 16",
    shiftLabel: "Morning ops window · 4 crew active",
    monitoringMessage: "Altair is monitoring your business today",
    primaryFocus: "3 overdue invoices need you first",
    opsScore: 82,
  },
  signals: [
    { label: "Jobs moving", value: "11", emphasis: "positive" },
    { label: "Ready to invoice", value: "$4.2k", emphasis: "neutral" },
    { label: "Overdue", value: "3", emphasis: "attention" },
    { label: "Unassigned", value: "1", emphasis: "attention" },
  ],
  priorityActions: [
    {
      id: "overdue",
      label: "Review overdue invoices",
      href: "/invoices?status=overdue",
      leverage: "primary",
      metric: "$3,840 · 3 past due",
    },
    {
      id: "ready-invoice",
      label: "Send ready invoices",
      href: "/invoices?status=ready",
      leverage: "secondary",
      metric: "$4,200 · 3 jobs",
    },
    {
      id: "assign",
      label: "Assign tomorrow job",
      href: "/dispatch",
      leverage: "secondary",
      metric: "Johnson · 7:00 AM",
    },
    {
      id: "estimates",
      label: "Follow up estimates",
      href: "/estimates?status=sent",
      leverage: "tertiary",
      metric: "$6,400 · 3 quotes",
    },
  ],
  insight: {
    id: "billing-leverage",
    headline: "Billing is your highest leverage right now",
    detail:
      "$8,040 is waiting across overdue and ready-to-send invoices. Clearing overdue first protects cash flow before noon dispatch.",
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
    },
    {
      id: "ready-to-invoice",
      title: "3 jobs ready to invoice",
      meta: "Completed work · waiting to send",
      urgency: "today",
      amount: "$4,200",
    },
    {
      id: "stalled-jobs",
      title: "2 stalled jobs",
      meta: "5+ days inactive · needs owner review",
      urgency: "today",
    },
    {
      id: "follow-ups",
      title: "3 quiet estimates",
      meta: "$6,400 · no response in 7+ days",
      urgency: "soon",
      amount: "$6,400",
    },
  ],
  officeQueue: [
    {
      id: "oq-1",
      title: "Approve estimate · Parkview HOA",
      meta: "$8,200 · sent 3d ago",
      type: "estimate",
    },
    {
      id: "oq-2",
      title: "Review invoice draft · Chen Residence",
      meta: "Ready to send · $640",
      type: "invoice",
    },
    {
      id: "oq-3",
      title: "Close job · Miller Home",
      meta: "Completed · needs final review",
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
      jobLabel: "Westside Retail",
    },
    {
      id: "tech-2",
      name: "Devon Reyes",
      initials: "DR",
      state: "on_job",
      jobLabel: "En route · Chen",
    },
    {
      id: "tech-3",
      name: "Alex Kim",
      initials: "AK",
      state: "available",
      jobLabel: "Next: Harbor Office",
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
      label: "Ready",
      amount: "$4,200",
      detail: "3 jobs",
      emphasis: "positive",
      fill: 22,
    },
    {
      id: "sent",
      label: "Sent",
      amount: "$8,840",
      detail: "5 open",
      emphasis: "neutral",
      fill: 46,
    },
    {
      id: "unpaid",
      label: "Unpaid",
      amount: "$12,680",
      detail: "8 invoices",
      emphasis: "neutral",
      fill: 66,
    },
    {
      id: "overdue",
      label: "Overdue",
      amount: "$3,840",
      detail: "3 past due",
      emphasis: "attention",
      fill: 20,
    },
    {
      id: "collected",
      label: "Collected",
      amount: "$1,240",
      detail: "today",
      emphasis: "positive",
      fill: 12,
    },
  ],
  expenseReview: {
    pendingCount: 4,
    pendingTotal: "$842",
  },
  leadOpportunity: {
    label: "Pipeline opportunity",
    value: "$31.6k",
    detail: "4 quoted leads · 2 viewed this week",
  },
  pulseMetrics: [
    { id: "revenue", label: "Revenue in motion", value: "$16.9k", delta: "+12% vs last week", tone: "cyan" },
    { id: "completion", label: "Completion rate", value: "91%", delta: "4 jobs done today", tone: "emerald" },
    { id: "backlog", label: "Cash waiting", value: "$29.7k", delta: "8 unpaid · 3 overdue", tone: "amber" },
    { id: "pipeline", label: "Lead pipeline", value: "$84.1k", delta: "12 active opportunities", tone: "violet" },
  ],
  activities: [
    { id: "a-1", title: "Invoice paid · Westside Retail", time: "12m ago", tone: "emerald" },
    { id: "a-2", title: "Estimate viewed · Parkview HOA", time: "1h ago", tone: "cyan" },
    { id: "a-3", title: "Job completed · Miller Home", time: "2h ago", tone: "emerald" },
    { id: "a-4", title: "Expense flagged · parts receipt", time: "3h ago", tone: "amber" },
  ],
  momentum: [
    "4 jobs completed today",
    "Dispatch caught up for morning crew",
    "2 invoices paid overnight",
  ],
  systemHealth: {
    score: 82,
    label: "Operations healthy",
    status: "All systems nominal",
    notifications: 2,
  },
};
