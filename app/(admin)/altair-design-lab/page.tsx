import type { ReactNode } from "react";
import {
  ActionCard,
  CelebrationBanner,
  EmptyState,
  HeroHeader,
  InsightCard,
  MetricCard,
  PriorityCard,
  PulseCard,
  StatusPill,
  WorkspaceSection,
} from "@/shared/design-system/components";

type LabSectionProps = {
  name: string;
  description: string;
  children: ReactNode;
};

function LabSection({ name, description, children }: LabSectionProps) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 border-b border-slate-200/70 pb-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          Component
        </p>
        <h2 className="text-base font-semibold tracking-tight text-slate-800 sm:text-lg">
          {name}
        </h2>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-500">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}

export default function AltairDesignLabPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 pb-12 sm:gap-12 lg:gap-14">
      <header className="flex flex-col gap-3 pt-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          Internal · V2 Design System
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Altair Design Lab
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
          Private component workshop for reviewing Altair OS V2 surfaces together.
          Sample content reflects real operational scenarios — dispatch, billing,
          leads, and office priorities — without live data or production wiring.
        </p>
      </header>

      <LabSection
        name="HeroHeader"
        description="Command Center hero. Answers: what should I do next?"
      >
        <HeroHeader
          eyebrow="Command Center"
          title="Today requires attention in 3 areas."
          description="Dispatch, billing, and estimate follow-ups need a quick review before the afternoon crew heads out."
          primaryAction={{ label: "Review priorities", href: "/dispatch" }}
          secondaryAction={{ label: "View schedule", href: "/dispatch?view=schedule" }}
          highlights={[
            { label: "Stalled jobs", value: "2 jobs", tone: "warning" },
            { label: "Overdue invoices", value: "$3,840", tone: "danger" },
            { label: "Estimate follow-up", value: "3 quotes", tone: "info" },
          ]}
          insight={{
            label: "Recommendation",
            text: "Clearing the office queue and following up on stalled estimates could recover revenue this week.",
            tone: "info",
          }}
        />
      </LabSection>

      <LabSection
        name="CelebrationBanner"
        description="Calm acknowledgment when priorities are caught up."
      >
        <CelebrationBanner
          tone="success"
          title="Office queue is clear."
          description="Dispatch assignments, billing drafts, and lead follow-ups are caught up for today."
          action={{ label: "Return to command center", href: "/" }}
        />
      </LabSection>

      <LabSection
        name="WorkspaceSection + PriorityCard"
        description="Today's Focus — grouped priorities that need attention."
      >
        <WorkspaceSection
          title="Today's Focus"
          description="Operational items that deserve your attention before end of day."
          tone="warning"
          action={{ label: "View office queue", href: "/" }}
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <PriorityCard
              eyebrow="Operations"
              tone="warning"
              title="2 jobs are stalled."
              description="No activity in over 3 days — crews may be waiting on parts or customer approval."
              meta="Oldest: 5 days inactive"
              action={{ label: "Review stalled jobs", href: "/jobs?focus=stalled" }}
            />
            <PriorityCard
              eyebrow="Billing"
              tone="danger"
              title="3 invoices are overdue."
              description="Customers have not responded to payment reminders sent last week."
              meta="Oldest: 12 days past due"
              action={{ label: "Review invoices", href: "/invoices?status=overdue" }}
            />
            <PriorityCard
              eyebrow="Estimates"
              tone="info"
              title="Estimate follow-up due on 3 quotes."
              description="Sent estimates with no response in over 7 days — a brief check-in often moves quotes forward."
              meta="$6,400 awaiting response"
              action={{ label: "Review estimates", href: "/estimates?status=sent" }}
            />
          </div>
        </WorkspaceSection>
      </LabSection>

      <LabSection
        name="WorkspaceSection + PulseCard + MetricCard"
        description="Business Pulse — health signals and supporting metrics."
      >
        <WorkspaceSection
          title="Business Pulse"
          description="How key areas of the company are performing right now."
          tone="info"
          action={{ label: "Open reports", href: "/reports" }}
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <PulseCard
              label="Dispatch"
              status="Healthy"
              tone="success"
              description="All scheduled jobs are assigned and on track for today."
              trend="14 jobs dispatched"
              meta="Updated just now"
            />
            <PulseCard
              label="Billing"
              status="Needs attention"
              tone="warning"
              description="Overdue invoices and unsent drafts are slowing cash flow."
              trend="$3,840 overdue"
              meta="3 invoices past due"
            />
            <PulseCard
              label="Technician performance"
              status="On track"
              tone="success"
              description="Crew completion rate is strong — 92% of today's jobs finished on schedule."
              trend="92% on-time"
              meta="4 technicians active"
            />
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Ready to invoice"
              value="$4,200"
              trend="3 completed jobs"
              tone="success"
              description="Completed work waiting for office review."
            />
            <MetricCard
              label="Unpaid total"
              value="$12,680"
              trend="8 open invoices"
              tone="neutral"
              description="Outstanding balance across active customers."
            />
            <MetricCard
              label="Lead follow-ups"
              value="5 due"
              trend="2 scheduled today"
              tone="info"
              description="Prospects waiting on your next touchpoint."
            />
            <MetricCard
              label="Estimate recovery"
              value="$6,400"
              trend="3 stale quotes"
              tone="warning"
              description="Sent estimates with no response in over a week."
            />
          </div>
        </WorkspaceSection>
      </LabSection>

      <LabSection
        name="WorkspaceSection + InsightCard"
        description="Growth Opportunities — intelligence surfaced from business logic."
      >
        <WorkspaceSection
          title="Growth Opportunities"
          description="Patterns and recommendations that could improve revenue and operations."
          tone="success"
        >
          <div className="grid gap-3 lg:grid-cols-2">
            <InsightCard
              eyebrow="Intelligence"
              tone="info"
              title="Estimate follow-ups could recover stalled revenue."
              insight="Three sent estimates have had no response in over a week."
              recommendation="A brief check-in with these customers often moves stalled quotes forward."
              action={{ label: "Review estimates", href: "/estimates?status=sent" }}
            />
            <InsightCard
              eyebrow="Technician performance"
              tone="success"
              title="Crew efficiency is trending up."
              insight="Average job completion time improved 8% over the last 30 days."
              recommendation="Consider scheduling additional capacity for high-demand service windows."
              action={{ label: "View labor report", href: "/reports" }}
            />
          </div>
        </WorkspaceSection>
      </LabSection>

      <LabSection
        name="ActionCard"
        description="Clear next actions with primary CTA emphasis."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <ActionCard
            eyebrow="Billing"
            tone="warning"
            title="Send 2 draft invoices before end of day."
            description="Completed jobs are waiting for office review and billing."
            meta="Oldest draft: 3 days"
            action={{ label: "Review drafts", href: "/invoices?status=draft" }}
          />
          <ActionCard
            eyebrow="Dispatch"
            tone="info"
            title="Assign 1 unassigned job for tomorrow."
            description="Morning crew starts at 7:00 AM — assignment needed tonight."
            meta="1 job unassigned"
            action={{ label: "Open dispatch", href: "/dispatch" }}
          />
        </div>
      </LabSection>

      <LabSection
        name="StatusPill"
        description="Tone-aware status badges used across cards and lists."
      >
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm">
          <StatusPill tone="neutral">Draft</StatusPill>
          <StatusPill tone="success">Paid</StatusPill>
          <StatusPill tone="warning">Overdue</StatusPill>
          <StatusPill tone="danger">Stalled</StatusPill>
          <StatusPill tone="info">Sent</StatusPill>
          <StatusPill tone="success" size="sm">
            Healthy
          </StatusPill>
          <StatusPill tone="warning" size="sm">
            Needs attention
          </StatusPill>
        </div>
      </LabSection>

      <LabSection
        name="EmptyState"
        description="Helpful guidance when a workspace has no content yet."
      >
        <EmptyState
          title="No stalled jobs right now."
          description="When jobs go inactive for several days, they will appear here for office review."
          action={{ label: "View all jobs", href: "/jobs" }}
          secondaryAction={{ label: "Open dispatch", href: "/dispatch" }}
          tone="neutral"
        />
      </LabSection>
    </div>
  );
}
