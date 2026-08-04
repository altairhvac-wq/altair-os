import Link from "next/link";
import {
  Bell,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  FileText,
  History,
  Plus,
  Receipt,
  Rocket,
  Search,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { CompanyBillingAccess } from "@/lib/saas-billing/types";
import { KpiSparkline } from "@/shared/components/charts/KpiSparkline";
import { JobScheduleRow } from "@/shared/components/jobs/JobScheduleRow";
import {
  SectionHeader,
  altairMcCardClass,
  altairMcCardPadClass,
  altairMcGridGapClass,
  altairMcListClass,
  altairMcListRowClass,
  altairMcMetricLabelClass,
  altairMcMetricValueClass,
  altairMcTileClass,
} from "@/shared/design-system/components";
import {
  altairCanvasInkClass,
  altairCanvasInkLinkClass,
  altairCanvasInkMutedClass,
  altairCanvasInkSecondaryClass,
  altairSemanticIndicatorClass,
  altairSemanticSurfaceClass,
} from "@/shared/design-system/foundation";
import {
  buildMissionControlContent,
  type MissionControlQuickAction,
} from "@/shared/lib/dashboard-mission-control";
import { buildMissionControlV2ActivityRows } from "@/shared/lib/dashboard-mission-control-v2-activity";
import { buildMissionControlV2BusinessHealthStats } from "@/shared/lib/dashboard-mission-control-v2-business-health";
import { buildMissionControlV2GlanceStats } from "@/shared/lib/dashboard-mission-control-v2-glance";
import {
  buildMissionControlV2ScheduleRows,
  MISSION_CONTROL_V2_SCHEDULE_FULL_HREF,
  MISSION_CONTROL_V2_SCHEDULE_JOBS_HREF,
} from "@/shared/lib/dashboard-mission-control-v2-schedule";
import type { DashboardData } from "@/shared/types/dashboard";
import type { DemoDataStatus } from "@/shared/types/demo-data";
import type { OnboardingChecklist } from "@/shared/types/onboarding";
import { getTeamMemberInitials } from "@/shared/types/team-member";
import { MissionControlV2NextRecommendedCard } from "./MissionControlV2NextRecommendedCard";
import {
  missionControlV2SampleData,
  type MissionControlV2ActivityRow,
  type MissionControlV2GlanceStat,
  type MissionControlV2KpiCard,
  type MissionControlV2ScheduleRow,
} from "./sample-data";
import {
  getMissionControlUpgradeCardModel,
  type MissionControlUpgradeCardModel,
} from "./upgrade-card-model";

export type MissionControlV2ViewProps = {
  /** Live dashboard payload — when set, section mappers run unless overridden. */
  data?: DashboardData;
  userDisplayName?: string;
  demoDataStatus?: DemoDataStatus | null;
  /** Company display name for the greeting; falls back to the user first name. */
  companyName?: string;
  companyTimeZone?: string;
  /**
   * Real "Today at a glance" stats from getDashboardData.
   * When omitted with live `data`, built from the mapper; else sample placeholders.
   */
  glanceStats?: MissionControlV2GlanceStat[];
  /**
   * Real "Business health" stats from getDashboardData / cash-flow cards.
   * When omitted with live `data`, built from the mapper; else sample placeholders.
   */
  businessHealthStats?: MissionControlV2GlanceStat[];
  /**
   * Primary create shortcuts from buildMissionControlContent (same as legacy MC).
   * When omitted with live `data`, built from content; else sample placeholders.
   */
  primaryQuickActions?: MissionControlQuickAction[];
  /**
   * Onboarding checklist for "Next recommended" (same source as DashboardActivationHero).
   * When omitted, sample placeholders are used for layout review.
   */
  onboardingChecklist?: OnboardingChecklist;
  /**
   * Same CompanyBillingAccess the shell subscription banner uses.
   * When omitted, the Upgrade card falls back to sample placeholder copy.
   */
  billingAccess?: CompanyBillingAccess;
  /**
   * Real "Today's schedule" rows from getDashboardData operations.todayJobs.
   * When omitted with live `data`, built from the mapper; else sample placeholders.
   */
  scheduleRows?: MissionControlV2ScheduleRow[];
  /**
   * Real "Recent activity" rows from getDashboardData.recentActivity.
   * When omitted with live `data`, built from the mapper; else sample placeholders.
   */
  activityRows?: MissionControlV2ActivityRow[];
  /**
   * Real bottom KPI strip (jobs completed, avg. ticket, estimate close rate).
   * When omitted, sample placeholders are used for layout review.
   */
  kpiCards?: MissionControlV2KpiCard[];
};

function getTimeOfDayGreeting(reference = new Date()): string {
  const hour = reference.getHours();
  if (hour < 12) {
    return "Good morning";
  }
  if (hour < 17) {
    return "Good afternoon";
  }
  return "Good evening";
}

function getGreetingName(
  companyName: string | undefined,
  userDisplayName: string | undefined,
): string {
  const company = companyName?.trim();
  if (company) {
    return company;
  }

  const trimmed = userDisplayName?.trim();
  if (!trimmed) {
    return "there";
  }

  const first = trimmed.split(/\s+/)[0] ?? trimmed;
  return first.charAt(0).toUpperCase() + first.slice(1);
}

function formatDateLabel(reference = new Date()): string {
  return reference.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function TopBar({
  greeting,
  dateLabel,
  userName,
  userInitials,
  notificationCount,
}: {
  greeting: string;
  dateLabel: string;
  userName: string;
  userInitials: string;
  notificationCount: number;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <h1
          className={`text-2xl font-bold tracking-tight sm:text-3xl ${altairCanvasInkClass}`}
        >
          {greeting}
        </h1>
        <p className={`mt-1 text-sm ${altairCanvasInkMutedClass}`}>{dateLabel}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:justify-end sm:gap-2.5">
        <label className="relative min-w-0 flex-1 sm:w-56 sm:flex-none">
          <span className="sr-only">Search</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-altair-ink-on-paper-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Search…"
            readOnly
            className="h-10 w-full rounded-lg border border-altair-border bg-altair-paper py-2 pl-9 pr-10 text-sm text-altair-ink-on-paper placeholder:text-altair-ink-on-paper-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-altair-brass/40"
          />
          <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-altair-border bg-altair-paper-subtle px-1.5 py-0.5 text-[10px] font-medium text-altair-ink-on-paper-muted sm:inline">
            /
          </kbd>
        </label>

        <button
          type="button"
          aria-label="Quick create"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-altair-brass text-altair-graphite transition hover:bg-altair-brass-interactive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-altair-brass/50"
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
        </button>

        <button
          type="button"
          aria-label={
            notificationCount > 0
              ? `Notifications, ${notificationCount} unread`
              : "Notifications"
          }
          className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-altair-border bg-altair-paper text-altair-ink-on-paper-secondary transition hover:bg-altair-paper-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-altair-brass/40"
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
          {notificationCount > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-altair-danger px-1 text-[10px] font-bold leading-none text-altair-paper">
              {notificationCount}
            </span>
          ) : null}
        </button>

        <button
          type="button"
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-altair-border bg-altair-paper py-1.5 pl-1.5 pr-2.5 text-altair-ink-on-paper transition hover:bg-altair-paper-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-altair-brass/40"
          aria-haspopup="menu"
          aria-label={`Account menu for ${userName}`}
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-altair-graphite text-[10px] font-semibold text-altair-paper">
            {userInitials}
          </span>
          <span className="hidden max-w-[8rem] truncate text-sm font-medium sm:inline">
            {userName}
          </span>
          <ChevronDown
            className="hidden h-4 w-4 text-altair-ink-on-paper-muted sm:block"
            aria-hidden="true"
          />
        </button>
      </div>
    </header>
  );
}

function StatGrid({ stats }: { stats: MissionControlV2GlanceStat[] }) {
  return (
    <div className={`${altairMcCardClass} ${altairMcCardPadClass}`}>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        {stats.map((stat) => (
          <div key={stat.id} className="min-w-0">
            <p className={altairMcMetricLabelClass}>{stat.label}</p>
            <p className={altairMcMetricValueClass}>{stat.value}</p>
            <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-altair-ink-on-paper-muted">
              {stat.detail}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function NeedsAttentionClear() {
  return (
    <div
      className={`rounded-lg border ${altairMcCardPadClass} ${altairSemanticSurfaceClass.success}`}
    >
      <div className="flex items-start gap-3">
        <CheckCircle2
          className="mt-0.5 h-4 w-4 shrink-0 text-altair-success"
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-altair-success-foreground">
            Everything is running smoothly
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-altair-success-foreground/80">
            No overdue jobs, billing gaps, or dispatch pressure detected.
          </p>
        </div>
      </div>
    </div>
  );
}

/** Layout-only fallback when primaryQuickActions is not passed. */
const SAMPLE_QUICK_ACTIONS: MissionControlQuickAction[] = [
  {
    id: "new-customer",
    label: "New Customer",
    shortLabel: "Customer",
    href: "/customers",
    description: "Add a customer profile",
    icon: UserPlus,
  },
  {
    id: "new-job",
    label: "New Job",
    shortLabel: "Job",
    href: "/work?create=1",
    description: "Schedule field work",
    icon: Briefcase,
  },
  {
    id: "new-estimate",
    label: "New Estimate",
    shortLabel: "Estimate",
    href: "/estimates?create=1",
    description: "Send a quote",
    icon: FileText,
  },
  {
    id: "create-invoice",
    label: "Create Invoice",
    shortLabel: "Invoice",
    href: "/invoices?create=1",
    description: "Bill completed work",
    icon: Receipt,
  },
];

function QuickActionsCard({
  actions,
}: {
  actions: MissionControlQuickAction[];
}) {
  return (
    <section className="flex h-full min-w-0 flex-col gap-3">
      <SectionHeader title="Quick actions" />
      <div className={`flex flex-1 flex-col ${altairMcCardClass} ${altairMcCardPadClass}`}>
        {actions.length > 0 ? (
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Quick actions"
          >
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.id}
                  href={action.href}
                  className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-altair-ink-on-paper-secondary transition-colors hover:bg-altair-brass/10 hover:text-altair-ink-on-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-altair-brass/40"
                >
                  <Icon
                    className="h-3.5 w-3.5 text-altair-brass"
                    aria-hidden="true"
                  />
                  <span>+ {action.shortLabel ?? action.label}</span>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="text-xs leading-relaxed text-altair-ink-on-paper-muted">
            No create actions available for your role.
          </p>
        )}
      </div>
    </section>
  );
}

function ScheduleCard({ rows }: { rows: MissionControlV2ScheduleRow[] }) {
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <SectionHeader
        title="Today's schedule"
        action={{
          label: "View full schedule",
          href: MISSION_CONTROL_V2_SCHEDULE_FULL_HREF,
        }}
      />
      <div className={altairMcListClass}>
        {rows.length === 0 ? (
          <div className={altairMcListRowClass}>
            <p className="text-sm font-semibold text-altair-ink-on-paper">
              No jobs scheduled today
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-altair-ink-on-paper-muted">
              Jobs on today&apos;s board will show up here once they&apos;re
              scheduled.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-altair-border/60">
            {rows.map((row) => (
              <li key={row.id}>
                <JobScheduleRow
                  row={{
                    ...row,
                    isUnassigned: row.assigneeName === "Unassigned",
                  }}
                />
              </li>
            ))}
          </ul>
        )}
        <div className={`border-t border-altair-border/60 ${altairMcListRowClass}`}>
          <Link
            href={MISSION_CONTROL_V2_SCHEDULE_JOBS_HREF}
            className={`text-xs font-medium underline-offset-2 transition hover:underline sm:text-[0.8125rem] ${altairCanvasInkLinkClass}`}
          >
            View all jobs
          </Link>
        </div>
      </div>
    </section>
  );
}

/** Same source/event icon mapping as MissionControlActivityTimelineSection. */
function resolveActivityIcon(row: MissionControlV2ActivityRow): LucideIcon {
  if (
    row.eventType === "payment_recorded" ||
    row.eventType === "invoice_paid"
  ) {
    return CreditCard;
  }

  switch (row.source) {
    case "customer":
      return Users;
    case "job":
      return Briefcase;
    case "estimate":
      return FileText;
    case "invoice":
      return Receipt;
    case "expense":
      return Receipt;
    default:
      return History;
  }
}

function ActivityCard({ rows }: { rows: MissionControlV2ActivityRow[] }) {
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <SectionHeader title="Recent activity" />
      <ol className={altairMcListClass}>
        {rows.length === 0 ? (
          <li className={altairMcListRowClass}>
            <p className="text-sm font-semibold text-altair-ink-on-paper">
              No recent activity yet
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-altair-ink-on-paper-muted">
              Invoice, job, and customer events will appear here as work happens.
            </p>
          </li>
        ) : (
          rows.map((row) => {
            const Icon = resolveActivityIcon(row);
            const indicatorTone =
              row.tone === "neutral"
                ? null
                : (row.tone as "success" | "warning" | "danger");

            const body = (
              <div
                className={`${altairMcListRowClass} flex items-start gap-3 border-b border-altair-border/60 last:border-b-0`}
              >
                <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-altair-paper-subtle text-altair-ink-muted">
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {indicatorTone ? (
                    <span
                      aria-hidden="true"
                      className={`absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full ${altairSemanticIndicatorClass[indicatorTone]}`}
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <p className="text-sm font-semibold text-altair-ink-on-paper">
                      {row.title}
                    </p>
                    <div className="flex shrink-0 items-baseline gap-2">
                      {row.amount ? (
                        <span className="text-xs font-semibold tabular-nums text-altair-ink-on-paper">
                          {row.amount}
                        </span>
                      ) : null}
                      <time className="text-xs text-altair-ink-on-paper-muted">
                        {row.timestamp}
                      </time>
                    </div>
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-altair-ink-on-paper-secondary sm:text-sm">
                    {row.detail}
                  </p>
                </div>
              </div>
            );

            return (
              <li key={row.id}>
                {row.href ? (
                  <Link
                    href={row.href}
                    className="block transition-colors hover:bg-altair-brass/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-altair-brass/40"
                  >
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </li>
            );
          })
        )}
      </ol>
    </section>
  );
}

function KpiCard({ kpi }: { kpi: MissionControlV2KpiCard }) {
  return (
    <div className={altairMcTileClass}>
      <p className={altairMcMetricLabelClass}>{kpi.label}</p>
      <p className={altairMcMetricValueClass}>{kpi.value}</p>
      <p
        className={`mt-1 text-[11px] leading-snug ${
          kpi.comparisonPositive
            ? "text-altair-success-foreground"
            : altairCanvasInkSecondaryClass
        }`}
      >
        {kpi.comparison}
      </p>
      <KpiSparkline values={kpi.sparkline} />
    </div>
  );
}

function UpgradeCardBody({
  model,
}: {
  model: MissionControlUpgradeCardModel;
}) {
  const iconWrapClass =
    model.emphasis === "cta"
      ? "bg-altair-brass text-altair-graphite"
      : "bg-altair-brass/15 text-altair-brass";
  const cardChromeClass =
    model.emphasis === "cta"
      ? "rounded-lg border border-altair-brass/25 bg-[var(--surface-section)]"
      : `${altairMcCardClass}`;

  const content = (
    <div className="flex items-start gap-3">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${iconWrapClass}`}
      >
        <Rocket className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-altair-ink-on-paper">
          {model.headline}
        </p>
        {model.description ? (
          <p className="mt-0.5 text-xs leading-relaxed text-altair-ink-on-paper-secondary">
            {model.description}
          </p>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className={`flex flex-1 flex-col ${cardChromeClass} ${altairMcCardPadClass}`}>
      {model.href ? (
        <Link
          href={model.href}
          className="rounded-md transition-colors hover:bg-altair-brass/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-altair-brass/40"
        >
          {content}
        </Link>
      ) : (
        content
      )}
    </div>
  );
}

function UpgradeCard({
  billingAccess,
}: {
  billingAccess?: CompanyBillingAccess;
}) {
  if (!billingAccess) {
    const sample = missionControlV2SampleData.promo;
    return (
      <section className="flex h-full min-w-0 flex-col gap-3">
        <SectionHeader title="Upgrade" />
        <UpgradeCardBody
          model={{
            variant: "explore_pro",
            sectionTitle: "Upgrade",
            headline: sample.headline,
            description: sample.subtext,
            href: "/pricing",
            emphasis: "cta",
          }}
        />
      </section>
    );
  }

  const model = getMissionControlUpgradeCardModel(billingAccess);

  return (
    <section className="flex h-full min-w-0 flex-col gap-3">
      <SectionHeader title={model.sectionTitle} />
      <UpgradeCardBody model={model} />
    </section>
  );
}

/**
 * Mission Control v2 — live owner dashboard.
 * Glance, business health, quick actions, next recommended, Upgrade, today's
 * schedule, recent activity, and the KPI strip accept real data; Needs
 * attention and top-bar chrome (search / notifications) still use placeholders
 * where not yet wired.
 */
export function MissionControlV2View({
  data,
  userDisplayName,
  demoDataStatus,
  companyName,
  companyTimeZone,
  glanceStats,
  businessHealthStats,
  primaryQuickActions,
  onboardingChecklist,
  billingAccess,
  scheduleRows,
  activityRows,
  kpiCards,
}: MissionControlV2ViewProps = {}) {
  const sample = missionControlV2SampleData;
  const isLive = Boolean(data);
  const missionControl = data
    ? buildMissionControlContent(data, userDisplayName ?? "User")
    : null;

  const greetingName = getGreetingName(companyName, userDisplayName);
  const greeting = `${getTimeOfDayGreeting()}, ${greetingName}`;
  const dateLabel = isLive ? formatDateLabel() : sample.dateLabel;
  const userName = userDisplayName?.trim() || sample.userName;
  const userInitials = userDisplayName?.trim()
    ? getTeamMemberInitials(userDisplayName)
    : sample.userInitials;
  const notificationCount = isLive ? 0 : sample.notificationCount;

  const resolvedGlanceStats =
    glanceStats ??
    (data ? buildMissionControlV2GlanceStats(data) : sample.glanceStats);
  const resolvedBusinessHealthStats =
    businessHealthStats ??
    (data
      ? buildMissionControlV2BusinessHealthStats(data)
      : sample.businessHealthStats);
  const resolvedQuickActions =
    primaryQuickActions ??
    missionControl?.primaryQuickActions ??
    SAMPLE_QUICK_ACTIONS;
  const resolvedScheduleRows =
    scheduleRows ??
    (data
      ? buildMissionControlV2ScheduleRows(data, { timeZone: companyTimeZone })
      : sample.schedule);
  const resolvedActivityRows =
    activityRows ??
    (data ? buildMissionControlV2ActivityRows(data) : sample.activity);
  const resolvedKpiCards = kpiCards ?? sample.kpis;
  const showSampleDataDiscovery = Boolean(
    demoDataStatus?.canSetupDemoData && !demoDataStatus.hasDemoData,
  );

  return (
    <div className="space-y-3">
      <TopBar
        greeting={greeting}
        dateLabel={dateLabel}
        userName={userName}
        userInitials={userInitials}
        notificationCount={notificationCount}
      />

      {showSampleDataDiscovery ? (
        <p className={`text-sm ${altairCanvasInkMutedClass}`}>
          Need example data?{" "}
          <Link
            href="/settings/company"
            className={`font-medium underline underline-offset-2 transition ${altairCanvasInkLinkClass}`}
          >
            Load it from Settings
          </Link>
          .
        </p>
      ) : null}

      {/* Row: Today at a glance · Business health · Needs attention (~2fr 2fr 1.5fr) */}
      <div
        className={`grid grid-cols-1 items-start md:grid-cols-2 lg:grid-cols-[2fr_2fr_1.5fr] ${altairMcGridGapClass}`}
      >
        <section className="flex min-w-0 flex-col gap-3">
          <SectionHeader title="Today at a glance" />
          <StatGrid stats={resolvedGlanceStats} />
        </section>

        <section className="flex min-w-0 flex-col gap-3">
          <SectionHeader title="Business health" />
          <StatGrid stats={resolvedBusinessHealthStats} />
        </section>

        <section className="flex min-w-0 flex-col gap-3 self-start md:col-span-2 lg:col-span-1">
          <SectionHeader title="Needs attention" />
          <NeedsAttentionClear />
        </section>
      </div>

      {/* Row: Quick actions · Next recommended · Promo — stretch so card bodies match height */}
      <div
        className={`grid grid-cols-1 items-stretch md:grid-cols-2 lg:grid-cols-3 ${altairMcGridGapClass}`}
      >
        <QuickActionsCard actions={resolvedQuickActions} />
        <MissionControlV2NextRecommendedCard checklist={onboardingChecklist} />
        <UpgradeCard billingAccess={billingAccess} />
      </div>

      {/* Row: Today's schedule (wider) · Recent activity (narrower) */}
      <div
        className={`grid grid-cols-1 items-start lg:grid-cols-[minmax(0,2fr)_minmax(0,1.15fr)] ${altairMcGridGapClass}`}
      >
        <ScheduleCard rows={resolvedScheduleRows} />
        <ActivityCard rows={resolvedActivityRows} />
      </div>

      {/* Bottom KPI strip — three month-level metrics */}
      <div className={`grid grid-cols-1 sm:grid-cols-3 ${altairMcGridGapClass}`}>
        {resolvedKpiCards.map((kpi) => (
          <KpiCard key={kpi.id} kpi={kpi} />
        ))}
      </div>
    </div>
  );
}
