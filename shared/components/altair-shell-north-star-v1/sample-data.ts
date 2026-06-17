import type {
  AttentionRail,
  JobInMotion,
  MoneyStage,
  OperatingLink,
  OperatingNode,
  OperatingSignal,
  PriorityAction,
  TechnicianPresence,
} from "@/shared/components/dashboard/north-star-v2/sample-data";

export type OperationalHealthMetric = {
  id: string;
  label: string;
  value: string;
  trend?: string;
  tone: "cyan" | "emerald" | "amber" | "slate";
};

export type ExpenseReviewItem = {
  id: string;
  label: string;
  amount: string;
  meta: string;
  status: "pending" | "flagged";
};

export type LeadStage = {
  id: string;
  label: string;
  count: number;
  value: string;
  fill: number;
};

export type OfficeQueueItem = {
  id: string;
  title: string;
  meta: string;
  type: "estimate" | "invoice" | "job" | "lead";
};

export type NotificationItem = {
  id: string;
  title: string;
  time: string;
  unread: boolean;
};

export type RecommendationItem = {
  id: string;
  title: string;
  detail: string;
  href: string;
  priority: "high" | "medium" | "low";
};

export type FeatureCoverageEntry = {
  feature: string;
  location: string;
  productionSection?: string;
};

export type ShellNorthStarSampleData = {
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
  operationalHealth: {
    score: number;
    label: string;
    metrics: OperationalHealthMetric[];
  };
  jobsInMotion: JobInMotion[];
  technicians: TechnicianPresence[];
  moneyStages: MoneyStage[];
  expenseReview: {
    pendingCount: number;
    pendingTotal: string;
    items: ExpenseReviewItem[];
  };
  attentionRails: AttentionRail[];
  officeQueue: OfficeQueueItem[];
  notifications: NotificationItem[];
  leadPipeline: LeadStage[];
  recommendations: RecommendationItem[];
  momentum: string[];
  systemStatus: {
    health: string;
    notifications: string;
  };
  featureCoverage: FeatureCoverageEntry[];
};

export const shellNorthStarSampleData: ShellNorthStarSampleData = {
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
  operationalHealth: {
    score: 82,
    label: "Operations healthy",
    metrics: [
      { id: "completion", label: "Completion rate", value: "91%", trend: "+4% vs last week", tone: "emerald" },
      { id: "dispatch", label: "Dispatch pressure", value: "Low", trend: "1 unassigned", tone: "cyan" },
      { id: "backlog", label: "Stalled jobs", value: "2", trend: "5+ days inactive", tone: "amber" },
      { id: "utilization", label: "Crew utilization", value: "78%", trend: "4 of 5 active", tone: "cyan" },
    ],
  },
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
    items: [
      { id: "exp-1", label: "Fuel · Devon R.", amount: "$68", meta: "Submitted today", status: "pending" },
      { id: "exp-2", label: "Parts · Westside job", amount: "$214", meta: "Needs receipt", status: "flagged" },
      { id: "exp-3", label: "Mileage · Alex K.", amount: "$42", meta: "Submitted yesterday", status: "pending" },
    ],
  },
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
    {
      id: "oq-4",
      title: "Qualify lead · Riverside Medical",
      meta: "New · $12k potential",
      type: "lead",
    },
  ],
  notifications: [
    { id: "n-1", title: "Invoice paid · Westside Retail", time: "12m ago", unread: true },
    { id: "n-2", title: "Estimate viewed · Parkview HOA", time: "1h ago", unread: true },
    { id: "n-3", title: "Job completed · Miller Home", time: "2h ago", unread: false },
  ],
  leadPipeline: [
    { id: "new", label: "New", count: 3, value: "$18.4k", fill: 25 },
    { id: "contacted", label: "Contacted", count: 5, value: "$24.1k", fill: 42 },
    { id: "quoted", label: "Quoted", count: 4, value: "$31.6k", fill: 58 },
    { id: "won", label: "Won", count: 2, value: "$9.8k", fill: 35 },
    { id: "lost", label: "Lost", count: 1, value: "$2.4k", fill: 12 },
  ],
  recommendations: [
    {
      id: "rec-1",
      title: "Send 3 ready invoices before noon",
      detail: "$4,200 in billing waiting · highest leverage",
      href: "/invoices?status=ready",
      priority: "high",
    },
    {
      id: "rec-2",
      title: "Assign Johnson job for tomorrow",
      detail: "Only unassigned slot · dispatch risk",
      href: "/dispatch",
      priority: "high",
    },
    {
      id: "rec-3",
      title: "Review flagged expense receipt",
      detail: "Parts purchase missing documentation",
      href: "/expenses",
      priority: "medium",
    },
    {
      id: "rec-4",
      title: "Follow up Parkview HOA estimate",
      detail: "Viewed but no response · 3 days",
      href: "/estimates",
      priority: "medium",
    },
  ],
  momentum: [
    "4 jobs completed today",
    "Dispatch caught up for morning crew",
    "2 invoices paid overnight",
  ],
  systemStatus: {
    health: "Operations healthy · score 82",
    notifications: "2 unread notifications",
  },
  featureCoverage: [
    { feature: "Command strip / key signals", location: "Command deck signal tiles", productionSection: "DashboardCommandStrip" },
    { feature: "Operational health", location: "Work system · health band", productionSection: "Operational health" },
    { feature: "Today's work", location: "Work system · field route rail", productionSection: "Today's work" },
    { feature: "Technician status", location: "Work system · crew dock", productionSection: "Technician status" },
    { feature: "Revenue and billing", location: "Money system · pipeline", productionSection: "Revenue and billing" },
    { feature: "Expense review", location: "Money system · review strip", productionSection: "Expense review" },
    { feature: "Needs attention", location: "Attention system · radar rails", productionSection: "Needs attention" },
    { feature: "Lead pipeline", location: "Growth pipeline band", productionSection: "Lead pipeline" },
    { feature: "Office review queue", location: "Attention system · queue pane", productionSection: "Office review queue" },
    { feature: "Notifications", location: "Attention system · notification strip", productionSection: "Notifications" },
    { feature: "Recommendations / next actions", location: "Recommendations band + priority dock", productionSection: "Next steps" },
    { feature: "Live ops map", location: "Command deck · operating map", productionSection: "Command strip groups" },
  ],
};
