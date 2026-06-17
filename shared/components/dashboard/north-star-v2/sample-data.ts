export type OperatingSignal = {
  label: string;
  value: string;
  emphasis?: "neutral" | "attention" | "positive";
};

export type PriorityAction = {
  id: string;
  label: string;
  href: string;
  leverage: "primary" | "secondary" | "tertiary";
  metric?: string;
};

export type AttentionItem = {
  id: string;
  title: string;
  meta: string;
  urgency: "now" | "today" | "soon";
};

export type AttentionRail = {
  id: string;
  label: string;
  items: AttentionItem[];
};

export type JobInMotion = {
  id: string;
  customer: string;
  job: string;
  time: string;
  status: "scheduled" | "en_route" | "in_progress" | "completed";
  technician?: string;
};

export type TechnicianPresence = {
  id: string;
  name: string;
  initials: string;
  state: "on_job" | "available" | "break";
  jobLabel?: string;
};

export type MoneyStage = {
  id: string;
  label: string;
  amount: string;
  detail: string;
  emphasis?: "neutral" | "attention" | "positive";
  fill: number;
};

export type OperatingNode = {
  id: string;
  label: string;
  value: string;
  sublabel: string;
  tone: "cyan" | "sky" | "amber" | "emerald" | "slate";
  x: number;
  y: number;
};

export type OperatingLink = {
  from: string;
  to: string;
};

export type NorthStarV2SampleData = {
  dayState: {
    greeting: string;
    dateLabel: string;
    shiftLabel: string;
    focusLabel: string;
    progress: number;
  };
  signals: OperatingSignal[];
  priorityActions: PriorityAction[];
  operatingNodes: OperatingNode[];
  operatingLinks: OperatingLink[];
  attentionRails: AttentionRail[];
  jobsInMotion: JobInMotion[];
  technicians: TechnicianPresence[];
  moneyStages: MoneyStage[];
  momentum: string[];
  systemStatus: {
    health: string;
    notifications: string;
  };
};

export const northStarV2SampleData: NorthStarV2SampleData = {
  dayState: {
    greeting: "Jeremiah",
    dateLabel: "Tuesday · Jun 16",
    shiftLabel: "Morning ops window",
    focusLabel: "Billing follow-up",
    progress: 38,
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
  operatingNodes: [
    {
      id: "jobs",
      label: "Jobs",
      value: "11",
      sublabel: "moving today",
      tone: "cyan",
      x: 18,
      y: 52,
    },
    {
      id: "revenue",
      label: "Revenue",
      value: "$16.9k",
      sublabel: "in motion",
      tone: "sky",
      x: 50,
      y: 28,
    },
    {
      id: "attention",
      label: "Attention",
      value: "4",
      sublabel: "need you",
      tone: "amber",
      x: 82,
      y: 52,
    },
    {
      id: "team",
      label: "Crew",
      value: "4",
      sublabel: "on field",
      tone: "emerald",
      x: 50,
      y: 78,
    },
  ],
  operatingLinks: [
    { from: "jobs", to: "revenue" },
    { from: "jobs", to: "team" },
    { from: "revenue", to: "attention" },
    { from: "team", to: "attention" },
  ],
  attentionRails: [
    {
      id: "revenue",
      label: "Revenue blockers",
      items: [
        {
          id: "overdue-invoices",
          title: "3 overdue invoices",
          meta: "$3,840 · oldest 12d",
          urgency: "now",
        },
        {
          id: "ready-to-invoice",
          title: "3 jobs ready to invoice",
          meta: "$4,200 waiting",
          urgency: "today",
        },
      ],
    },
    {
      id: "schedule",
      label: "Schedule blockers",
      items: [
        {
          id: "unassigned-job",
          title: "Tomorrow unassigned",
          meta: "Johnson · 7:00 AM",
          urgency: "today",
        },
        {
          id: "stalled-job",
          title: "2 stalled jobs",
          meta: "5 days inactive",
          urgency: "soon",
        },
      ],
    },
    {
      id: "customer",
      label: "Follow-ups",
      items: [
        {
          id: "stale-estimates",
          title: "3 quiet estimates",
          meta: "$6,400 · 7+ days",
          urgency: "today",
        },
      ],
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
  momentum: [
    "4 jobs completed today",
    "Dispatch caught up for morning crew",
    "2 invoices paid overnight",
  ],
  systemStatus: {
    health: "Operations healthy",
    notifications: "2 unread notifications",
  },
};
