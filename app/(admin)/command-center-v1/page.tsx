import {
  CelebrationBanner,
  HeroHeader,
  InsightCard,
  MetricCard,
  PriorityCard,
  PulseCard,
  WorkspaceSection,
} from "@/shared/design-system/components";

export default function CommandCenterV1Page() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-14 pb-16 sm:gap-16 lg:gap-20 lg:pb-20">
      <HeroHeader
        title="Good morning, Jeremiah ☀️"
        description="Today requires attention in 3 areas."
        primaryAction={{ label: "Review priorities", href: "#todays-focus" }}
        secondaryAction={{ label: "View schedule", href: "/dispatch" }}
        highlights={[
          { label: "Stalled jobs", value: "2 jobs", tone: "warning" },
          { label: "Overdue invoices", value: "3 invoices", tone: "danger" },
          { label: "Estimate follow-ups", value: "3 quotes", tone: "info" },
        ]}
        insight={{
          label: "Insight",
          text: "Clearing office priorities this morning could recover revenue this week.",
          tone: "info",
        }}
        className="p-6 sm:p-8 lg:p-10"
      />

      <WorkspaceSection
        title="Today's Focus"
        description="Operational items that deserve your attention before end of day."
        tone="warning"
        className="scroll-mt-6"
      >
        <div id="todays-focus" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

      <WorkspaceSection
        title="Business Pulse"
        description="How key areas of the company are performing right now."
        tone="info"
      >
        <div className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <PulseCard
              label="Dispatch"
              status="Healthy"
              tone="success"
              description="All scheduled jobs are assigned and on track for today."
              trend="14 jobs dispatched"
            />
            <PulseCard
              label="Billing"
              status="Needs attention"
              tone="warning"
              description="Overdue invoices and unsent drafts are slowing cash flow."
              trend="3 invoices past due"
            />
            <PulseCard
              label="Technician Performance"
              status="On track"
              tone="success"
              description="Crew completion rate is strong — 92% of today's jobs finished on schedule."
              trend="92% on-time"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        </div>
      </WorkspaceSection>

      <WorkspaceSection
        title="Growth Opportunities"
        description="Patterns and recommendations surfaced from business logic."
        tone="success"
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <InsightCard
            eyebrow="Revenue"
            tone="info"
            title="Estimate recovery opportunity"
            insight="Three sent estimates totaling $6,400 have had no response in over a week."
            recommendation="A brief check-in with these customers often moves stalled quotes forward."
            action={{ label: "Review estimates", href: "/estimates?status=sent" }}
          />
          <InsightCard
            eyebrow="Operations"
            tone="success"
            title="Technician efficiency improvement"
            insight="Average job completion time improved 8% over the last 30 days."
            recommendation="Consider scheduling additional capacity for high-demand service windows."
            action={{ label: "View labor report", href: "/reports" }}
          />
        </div>
      </WorkspaceSection>

      <WorkspaceSection
        title="Momentum"
        description="Wins happening today."
        tone="success"
      >
        <CelebrationBanner
          tone="success"
          title="Office queue clear"
          description="8 jobs completed · 4 invoices paid · dispatch and billing are moving forward today."
        />
      </WorkspaceSection>
    </div>
  );
}
