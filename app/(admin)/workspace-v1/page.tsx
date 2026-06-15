import Link from "next/link";
import {
  HeroHeader,
  PriorityCard,
  StatusPill,
  WorkspaceSection,
} from "@/shared/design-system/components";
import { AtmosphereBackground } from "@/shared/design-system/signature/AtmosphereBackground";
import { HorizonDivider } from "@/shared/design-system/signature/HorizonDivider";
import { MomentumStrip } from "@/shared/design-system/signature/MomentumStrip";

const softCard =
  "border-0 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.03)]";

const heroSubtext = [
  { label: "14 active jobs", tone: "neutral" as const },
  { label: "3 new leads", tone: "info" as const },
  { label: "6 estimates awaiting review", tone: "warning" as const },
  { label: "2 invoices overdue", tone: "danger" as const },
];

const continueWorking = [
  {
    customer: "Smith Residence",
    job: "AC replacement",
    status: "Estimate awaiting approval",
    tone: "info" as const,
    href: "/jobs/sample-smith",
  },
  {
    customer: "Johnson Property",
    job: "Maintenance agreement",
    status: "Invoice awaiting payment",
    tone: "warning" as const,
    href: "/jobs/sample-johnson",
  },
  {
    customer: "Westside Retail",
    job: "Technician dispatched",
    status: "Waiting on completion",
    tone: "neutral" as const,
    href: "/jobs/sample-westside",
  },
];

const needsAttention = [
  { label: "2 overdue invoices", tone: "danger" as const, href: "/invoices?status=overdue" },
  { label: "3 stale estimates", tone: "warning" as const, href: "/estimates?status=stale" },
  { label: "1 unscheduled job", tone: "info" as const, href: "/jobs?status=unscheduled" },
];

const quickAccess = [
  { label: "Customers", href: "/customers" },
  { label: "Jobs", href: "/jobs" },
  { label: "Leads", href: "/leads" },
  { label: "Invoices", href: "/invoices" },
  { label: "Estimates", href: "/estimates" },
  { label: "Expenses", href: "/expenses" },
];

const momentumItems = [
  { label: "8 jobs completed" },
  { label: "4 invoices paid" },
  { label: "Dispatch caught up" },
];

function WorkspaceCanvas() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50/95 via-white/80 to-sky-50/30" />
      <div className="absolute -left-12 top-8 h-48 w-48 rounded-full bg-sky-100/25 blur-3xl" />
      <div className="absolute right-[10%] top-0 h-full w-[45%] bg-gradient-to-l from-cyan-50/20 via-transparent to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white/90 via-slate-50/30 to-transparent" />
      <div className="absolute bottom-12 right-[28%] h-20 w-36 rounded-full bg-cyan-100/15 blur-2xl" />
    </div>
  );
}

function HeroSubtext() {
  return (
    <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
      {heroSubtext.map((item) => (
        <li key={item.label} className="inline-flex items-center gap-2 text-sm text-slate-600">
          <span
            className={`h-1 w-1 shrink-0 rounded-full ${
              item.tone === "danger"
                ? "bg-rose-400/70"
                : item.tone === "warning"
                  ? "bg-amber-400/70"
                  : item.tone === "info"
                    ? "bg-sky-400/70"
                    : "bg-slate-300/80"
            }`}
            aria-hidden="true"
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

export default function WorkspaceV1Page() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-16 pb-20 sm:gap-20 lg:gap-24 lg:pb-28">
      <div className="relative min-h-[320px] lg:min-h-[400px]">
        <WorkspaceCanvas />
        <div className="relative z-10 flex min-h-[320px] flex-col justify-center lg:min-h-[400px]">
          <HeroHeader
            title="Workspace"
            description="Resume the work that matters most today."
            primaryAction={{ label: "Continue working", href: "#continue-working" }}
            secondaryAction={{ label: "View all jobs", href: "/jobs" }}
            className="border-0 bg-white/55 p-8 shadow-[0_4px_32px_rgba(15,23,42,0.05)] backdrop-blur-[2px] sm:p-10 lg:p-12"
          />
          <div className="relative z-10 -mt-2 px-8 sm:px-10 lg:px-12">
            <HeroSubtext />
          </div>
        </div>
      </div>

      <WorkspaceSection
        title="Continue working"
        description="Pick up where you left off."
        tone="neutral"
        className="scroll-mt-6 gap-6 sm:gap-7"
      >
        <div id="continue-working" className="flex flex-col gap-4 sm:gap-5">
          {continueWorking.map((item) => (
            <PriorityCard
              key={item.customer}
              eyebrow={item.job}
              title={item.customer}
              description={item.status}
              tone={item.tone}
              action={{ label: "Continue", href: item.href }}
              className={`${softCard} bg-white/80 backdrop-blur-[1px]`}
            />
          ))}
        </div>
      </WorkspaceSection>

      <HorizonDivider variant="fade" className="opacity-60" />

      <WorkspaceSection
        title="Needs attention"
        description="Small items worth a quick look."
        tone="warning"
        className="gap-4 sm:gap-5"
      >
        <ul className="flex flex-col gap-3">
          {needsAttention.map((item) => (
            <li key={item.label}>
              <Link
                href={item.href}
                className="group inline-flex w-full items-center justify-between gap-4 rounded-xl px-1 py-1.5 transition-colors hover:bg-slate-50/80 sm:max-w-md"
              >
                <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">
                  {item.label}
                </span>
                <StatusPill tone={item.tone} size="sm">
                  Review
                </StatusPill>
              </Link>
            </li>
          ))}
        </ul>
      </WorkspaceSection>

      <HorizonDivider variant="fade" className="opacity-40" />

      <WorkspaceSection title="Quick access" tone="neutral" className="gap-4">
        <nav aria-label="Quick access">
          <ul className="flex flex-wrap gap-x-6 gap-y-3">
            {quickAccess.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className="text-sm font-medium text-slate-600 transition-colors hover:text-cyan-700"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </WorkspaceSection>

      <AtmosphereBackground tone="success" intensity="subtle" className="rounded-3xl px-2 py-6 sm:px-4 sm:py-8">
        <WorkspaceSection
          title="Momentum"
          description="Progress happening across the business."
          tone="success"
          className="relative z-10 gap-4"
        >
          <MomentumStrip items={momentumItems} />
        </WorkspaceSection>
      </AtmosphereBackground>
    </div>
  );
}
