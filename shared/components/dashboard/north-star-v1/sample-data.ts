export type OperatingSignal = {
  label: string;
  emphasis?: "neutral" | "attention" | "positive";
};

export type AttentionItem = {
  id: string;
  title: string;
  context: string;
  meta?: string;
  urgency: "now" | "today" | "soon";
};

export type AttentionGroup = {
  id: string;
  question: string;
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

export type MoneyLane = {
  id: string;
  label: string;
  amount: string;
  detail: string;
  emphasis?: "neutral" | "attention" | "positive";
};

export type NorthStarSampleData = {
  greeting: string;
  operatingSentence: string;
  primaryAction: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
  signals: OperatingSignal[];
  attentionGroups: AttentionGroup[];
  jobsInMotion: JobInMotion[];
  technicians: TechnicianPresence[];
  moneyLanes: MoneyLane[];
  momentum: string[];
  systemStatus: {
    health: string;
    notifications: string;
  };
};

export const northStarSampleData: NorthStarSampleData = {
  greeting: "Good morning, Jeremiah",
  operatingSentence:
    "Billing follow-up is the highest-leverage move today — crews are on track, but cash is waiting on three overdue invoices.",
  primaryAction: {
    label: "Review overdue invoices",
    href: "/invoices?status=overdue",
  },
  secondaryAction: {
    label: "Open dispatch",
    href: "/dispatch",
  },
  signals: [
    { label: "11 jobs moving today", emphasis: "positive" },
    { label: "$4,200 ready to invoice", emphasis: "neutral" },
    { label: "3 invoices overdue", emphasis: "attention" },
    { label: "1 job unassigned tomorrow", emphasis: "attention" },
  ],
  attentionGroups: [
    {
      id: "revenue",
      question: "What is blocking revenue?",
      items: [
        {
          id: "overdue-invoices",
          title: "3 invoices overdue — $3,840",
          context: "Payment reminders sent last week with no response.",
          meta: "Oldest: 12 days past due",
          urgency: "now",
        },
        {
          id: "ready-to-invoice",
          title: "3 completed jobs waiting for invoice",
          context: "Office review needed before billing can go out.",
          meta: "$4,200 total",
          urgency: "today",
        },
      ],
    },
    {
      id: "schedule",
      question: "What is blocking the schedule?",
      items: [
        {
          id: "unassigned-job",
          title: "1 job unassigned for tomorrow morning",
          context: "Crew starts at 7:00 AM — assignment needed tonight.",
          meta: "Johnson Property · maintenance",
          urgency: "today",
        },
        {
          id: "stalled-job",
          title: "2 jobs stalled with no recent activity",
          context: "Crews may be waiting on parts or customer approval.",
          meta: "Oldest inactive: 5 days",
          urgency: "soon",
        },
      ],
    },
    {
      id: "customer",
      question: "Who needs a follow-up?",
      items: [
        {
          id: "stale-estimates",
          title: "3 sent estimates with no response",
          context: "Quotes totaling $6,400 have been quiet for over a week.",
          meta: "Brief check-ins often move these forward",
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
      time: "8:00 AM",
      status: "in_progress",
      technician: "Marcus T.",
    },
    {
      id: "job-2",
      customer: "Chen Residence",
      job: "Duct cleaning",
      time: "9:30 AM",
      status: "en_route",
      technician: "Devon R.",
    },
    {
      id: "job-3",
      customer: "Harbor Office Park",
      job: "Preventive maintenance",
      time: "11:00 AM",
      status: "scheduled",
      technician: "Alex K.",
    },
    {
      id: "job-4",
      customer: "Miller Home",
      job: "Thermostat install",
      time: "1:15 PM",
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
  moneyLanes: [
    {
      id: "ready",
      label: "Ready to invoice",
      amount: "$4,200",
      detail: "3 completed jobs",
      emphasis: "positive",
    },
    {
      id: "unpaid",
      label: "Unpaid",
      amount: "$12,680",
      detail: "8 open invoices",
      emphasis: "neutral",
    },
    {
      id: "overdue",
      label: "Overdue",
      amount: "$3,840",
      detail: "3 past due",
      emphasis: "attention",
    },
    {
      id: "collected",
      label: "Collected today",
      amount: "$1,240",
      detail: "2 payments",
      emphasis: "positive",
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
