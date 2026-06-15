import {
  CelebrationBanner,
  HeroHeader,
  InsightCard,
  MetricCard,
  PriorityCard,
  PulseCard,
  WorkspaceSection,
} from "@/shared/design-system/components";

const softCard =
  "border-0 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.03)]";

const momentumItems = [
  "8 jobs completed",
  "4 invoices paid",
  "3 estimates sent",
  "Dispatch caught up",
];

function HeroCanvas() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50/90 via-white/70 to-cyan-50/40" />

      <div className="absolute -right-8 top-0 h-full w-[58%] bg-gradient-to-l from-sky-100/35 via-cyan-50/15 to-transparent" />

      <div className="absolute right-[18%] top-0 h-full w-24 -skew-x-6 bg-gradient-to-b from-amber-100/25 via-white/10 to-transparent blur-sm" />

      <div className="absolute bottom-0 right-0 h-44 w-[72%] bg-gradient-to-t from-slate-300/25 via-slate-200/10 to-transparent [clip-path:polygon(18%_100%,38%_42%,52%_58%,68%_28%,82%_46%,100%_18%,100%_100%)]" />

      <div className="absolute bottom-0 right-[8%] h-32 w-[48%] bg-gradient-to-t from-slate-400/15 via-slate-300/8 to-transparent [clip-path:polygon(0%_100%,22%_55%,40%_72%,58%_38%,78%_60%,100%_45%,100%_100%)]" />

      <div className="absolute bottom-0 left-[35%] right-0 h-28 bg-gradient-to-t from-white/90 via-slate-50/35 to-transparent" />

      <div className="absolute bottom-16 right-[22%] h-16 w-40 rounded-full bg-cyan-100/20 blur-2xl" />
    </div>
  );
}

function PulseLines() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
      <div className="absolute left-[8%] right-[8%] top-[18%] h-px bg-gradient-to-r from-transparent via-cyan-200/35 to-transparent" />
      <div className="absolute left-[12%] right-[12%] top-[38%] h-px bg-gradient-to-r from-transparent via-sky-200/30 to-transparent" />
      <div className="absolute left-[6%] right-[6%] top-[58%] h-px bg-gradient-to-r from-transparent via-emerald-200/25 to-transparent" />
      <div className="absolute left-[10%] right-[10%] top-[78%] h-px bg-gradient-to-r from-transparent via-slate-200/40 to-transparent" />
      <div className="absolute left-1/2 top-[22%] h-2 w-2 -translate-x-1/2 rounded-full bg-cyan-300/40" />
      <div className="absolute left-[62%] top-[56%] h-1.5 w-1.5 rounded-full bg-emerald-300/35" />
    </div>
  );
}

function GrowthAtmosphere() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
      <div className="absolute -right-12 top-8 h-40 w-40 rounded-full bg-emerald-100/30 blur-3xl" />
      <div className="absolute -left-8 bottom-4 h-32 w-32 rounded-full bg-sky-100/25 blur-3xl" />
      <div className="absolute right-[30%] top-1/2 h-px w-24 -translate-y-1/2 bg-gradient-to-r from-transparent via-emerald-200/30 to-transparent" />
    </div>
  );
}

function MomentumStrip() {
  return (
    <div className="mt-5 flex flex-wrap gap-x-8 gap-y-3 border-t border-emerald-100/60 pt-5">
      {momentumItems.map((item) => (
        <span
          key={item}
          className="inline-flex items-center gap-2 text-sm font-medium text-emerald-800/90"
        >
          <span className="text-emerald-600/80" aria-hidden="true">
            ✓
          </span>
          {item}
        </span>
      ))}
    </div>
  );
}

export default function CommandCenterV1Page() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-20 pb-20 sm:gap-24 lg:gap-28 lg:pb-28">
      <div className="relative min-h-[350px] lg:min-h-[420px]">
        <HeroCanvas />
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
          className="relative z-10 flex min-h-[350px] flex-col justify-center border-0 bg-white/55 p-8 shadow-[0_4px_32px_rgba(15,23,42,0.06)] backdrop-blur-[2px] sm:p-10 lg:min-h-[420px] lg:p-12 [&_div.rounded-xl.border]:border-0 [&_div.rounded-xl.border]:shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
        />
      </div>

      <div className="rounded-3xl bg-gradient-to-b from-amber-50/35 to-transparent px-1 py-2 sm:px-2 sm:py-4">
        <WorkspaceSection
          title="Today's Focus"
          description="Operational items that deserve your attention before end of day."
          tone="warning"
          className="scroll-mt-6 gap-6 sm:gap-7"
        >
          <div id="todays-focus" className="grid gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            <PriorityCard
              eyebrow="Operations"
              tone="warning"
              title="2 jobs are stalled."
              description="No activity in over 3 days — crews may be waiting on parts or customer approval."
              meta="Oldest: 5 days inactive"
              action={{ label: "Review stalled jobs", href: "/jobs?focus=stalled" }}
              className={softCard}
            />
            <PriorityCard
              eyebrow="Billing"
              tone="danger"
              title="3 invoices are overdue."
              description="Customers have not responded to payment reminders sent last week."
              meta="Oldest: 12 days past due"
              action={{ label: "Review invoices", href: "/invoices?status=overdue" }}
              className={softCard}
            />
            <PriorityCard
              eyebrow="Estimates"
              tone="info"
              title="Estimate follow-up due on 3 quotes."
              description="Sent estimates with no response in over 7 days — a brief check-in often moves quotes forward."
              meta="$6,400 awaiting response"
              action={{ label: "Review estimates", href: "/estimates?status=sent" }}
              className={softCard}
            />
          </div>
        </WorkspaceSection>
      </div>

      <div className="relative rounded-3xl bg-gradient-to-br from-slate-50/80 via-white to-sky-50/30 px-2 py-6 sm:px-4 sm:py-8">
        <PulseLines />
        <WorkspaceSection
          title="Business Pulse"
          description="How key areas of the company are performing right now."
          tone="info"
          className="relative z-10 gap-7 sm:gap-8"
        >
          <div className="flex flex-col gap-8">
            <div className="grid gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
              <PulseCard
                label="Dispatch"
                status="Healthy"
                tone="success"
                description="All scheduled jobs are assigned and on track for today."
                trend="14 jobs dispatched"
                className={softCard}
              />
              <PulseCard
                label="Billing"
                status="Needs attention"
                tone="warning"
                description="Overdue invoices and unsent drafts are slowing cash flow."
                trend="3 invoices past due"
                className={softCard}
              />
              <PulseCard
                label="Technician Performance"
                status="On track"
                tone="success"
                description="Crew completion rate is strong — 92% of today's jobs finished on schedule."
                trend="92% on-time"
                className={softCard}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
              <MetricCard
                label="Ready to invoice"
                value="$4,200"
                trend="3 completed jobs"
                tone="success"
                description="Completed work waiting for office review."
                className={softCard}
              />
              <MetricCard
                label="Unpaid total"
                value="$12,680"
                trend="8 open invoices"
                tone="neutral"
                description="Outstanding balance across active customers."
                className={softCard}
              />
              <MetricCard
                label="Lead follow-ups"
                value="5 due"
                trend="2 scheduled today"
                tone="info"
                description="Prospects waiting on your next touchpoint."
                className={softCard}
              />
              <MetricCard
                label="Estimate recovery"
                value="$6,400"
                trend="3 stale quotes"
                tone="warning"
                description="Sent estimates with no response in over a week."
                className={softCard}
              />
            </div>
          </div>
        </WorkspaceSection>
      </div>

      <div className="relative rounded-3xl bg-gradient-to-br from-emerald-50/25 via-white to-sky-50/20 px-2 py-6 sm:px-4 sm:py-8">
        <GrowthAtmosphere />
        <WorkspaceSection
          title="Growth Opportunities"
          description="Patterns and recommendations surfaced from business logic."
          tone="success"
          className="relative z-10 gap-6 sm:gap-7"
        >
          <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
            <InsightCard
              eyebrow="Revenue"
              tone="info"
              title="Estimate recovery opportunity"
              insight="Three sent estimates totaling $6,400 have had no response in over a week."
              recommendation="A brief check-in with these customers often moves stalled quotes forward."
              action={{ label: "Review estimates", href: "/estimates?status=sent" }}
              className={`${softCard} bg-white/70 backdrop-blur-[1px]`}
            />
            <InsightCard
              eyebrow="Operations"
              tone="success"
              title="Technician efficiency improvement"
              insight="Average job completion time improved 8% over the last 30 days."
              recommendation="Consider scheduling additional capacity for high-demand service windows."
              action={{ label: "View labor report", href: "/reports" }}
              className={`${softCard} bg-white/70 backdrop-blur-[1px]`}
            />
          </div>
        </WorkspaceSection>
      </div>

      <div className="rounded-3xl bg-gradient-to-b from-emerald-50/40 to-transparent px-1 py-2 sm:px-2 sm:py-4">
        <WorkspaceSection
          title="Momentum"
          description="Wins happening today."
          tone="success"
          className="gap-6 sm:gap-7"
        >
          <CelebrationBanner
            tone="success"
            title="Office queue clear"
            description="Billing and dispatch are moving forward today."
            className="border-0 bg-emerald-50/60 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(16,185,129,0.06)]"
          />
          <MomentumStrip />
        </WorkspaceSection>
      </div>
    </div>
  );
}
