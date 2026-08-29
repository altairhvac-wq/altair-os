import Link from "next/link";
import type { ReactNode } from "react";
import {
  Briefcase,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  CreditCard,
  FileText,
  History,
  Receipt,
  Truck,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { JobScheduleRow } from "@/shared/components/jobs/JobScheduleRow";
import {
  altairMcCardPadClass,
  altairMcListRowClass,
} from "@/shared/design-system/components";
import {
  altairCanvasInkClass,
  altairCanvasInkLinkClass,
  altairSectionTitleAccentClass,
  altairSemanticIndicatorClass,
} from "@/shared/design-system/foundation";
import {
  buildDashboardExceptionBuckets,
  getExceptionBucketUrgency,
  type DashboardExceptionBucket,
  type DashboardExceptionBucketId,
  type DashboardExceptionBucketUrgency,
} from "@/shared/lib/dashboard-exception-board";
import { buildMissionControlV2ActivityRows } from "@/shared/lib/dashboard-mission-control-v2-activity";
import {
  buildMissionControlV2ScheduleRows,
  MISSION_CONTROL_V2_SCHEDULE_FULL_HREF,
  MISSION_CONTROL_V2_SCHEDULE_JOBS_HREF,
} from "@/shared/lib/dashboard-mission-control-v2-schedule";
import type { DashboardData } from "@/shared/types/dashboard";
import type { DemoDataStatus } from "@/shared/types/demo-data";
import type { OnboardingChecklist } from "@/shared/types/onboarding";
import { MissionControlV2NextRecommendedCard } from "./MissionControlV2NextRecommendedCard";
import {
  missionControlV2SampleData,
  type MissionControlV2ActivityRow,
  type MissionControlV2ScheduleRow,
} from "./sample-data";

export type MissionControlV2ViewProps = {
  /** Live dashboard payload — when set, section mappers run unless overridden. */
  data?: DashboardData;
  userDisplayName?: string;
  demoDataStatus?: DemoDataStatus | null;
  companyTimeZone?: string;
  /**
   * Onboarding checklist for "Next recommended" (same source as DashboardActivationHero).
   * When omitted, sample placeholders are used for layout review.
   */
  onboardingChecklist?: OnboardingChecklist;
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
};

/** Soft light-card radius — Design Lab `--radius-panel` (default 0.875rem). */
const EXCEPTION_CARD_RADIUS = "rounded-[var(--radius-panel)]";

const EXCEPTION_BUCKET_ICON: Record<DashboardExceptionBucketId, LucideIcon> = {
  payments: CreditCard,
  invoices: Receipt,
  dispatch: Truck,
  jobs: Briefcase,
  estimates: FileText,
  leads: Users,
  team: Clock,
  customers: UserRound,
};

/**
 * Soft light-card urgency chrome.
 * Low = cream + calm green circle; medium = amber tint; high = danger tint.
 * Urgency is expressed via full-card background tint + icon-circle color (not border).
 */
const EXCEPTION_URGENCY: Record<
  DashboardExceptionBucketUrgency,
  {
    shell: string;
    iconCircle: string;
    count: string;
    link: string;
    divider: string;
    rowHover: string;
  }
> = {
  low: {
    shell: `${EXCEPTION_CARD_RADIUS} border border-altair-border/40 bg-altair-paper shadow-[var(--elev-hairline),var(--elev-2)]`,
    iconCircle: "altair-icon-well bg-altair-success text-white",
    count: "text-altair-ink-on-paper",
    link: "text-altair-success-foreground",
    divider: "border-altair-border/40",
    rowHover: "hover:bg-black/[0.03]",
  },
  medium: {
    shell: `${EXCEPTION_CARD_RADIUS} border border-altair-warning/25 bg-altair-warning-surface shadow-[var(--elev-hairline),var(--elev-2)]`,
    iconCircle: "altair-icon-well bg-altair-warning text-white",
    count: "text-altair-warning-foreground",
    link: "text-altair-warning-foreground",
    divider: "border-altair-warning/20",
    rowHover: "hover:bg-altair-warning/10",
  },
  high: {
    shell: `${EXCEPTION_CARD_RADIUS} border border-altair-danger/25 bg-altair-danger-surface shadow-[var(--elev-hairline),var(--elev-2)]`,
    iconCircle: "altair-icon-well bg-altair-danger text-white",
    count: "text-altair-danger",
    link: "text-altair-danger",
    divider: "border-altair-danger/20",
    rowHover: "hover:bg-altair-danger/10",
  },
};

export function MissionControlV2ExceptionBoardClear() {
  return (
    <div
      className={`${EXCEPTION_CARD_RADIUS} border border-altair-success/30 bg-altair-success-surface shadow-sm ${altairMcCardPadClass}`}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-altair-success text-white">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-altair-ink-on-paper">
            Everything is running smoothly
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-altair-ink-on-paper-secondary">
            No payments, invoices, dispatch, jobs, estimates, leads, team, or
            customers need attention right now.
          </p>
        </div>
      </div>
    </div>
  );
}

export function MissionControlV2ExceptionBucketCard({
  bucket,
}: {
  bucket: DashboardExceptionBucket;
}) {
  const urgency =
    EXCEPTION_URGENCY[
      bucket.urgency ?? getExceptionBucketUrgency(bucket.count)
    ];
  const hasItems = bucket.items.length > 0;
  const Icon = EXCEPTION_BUCKET_ICON[bucket.id];

  const header = (
    <div className="flex items-center gap-3">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${urgency.iconCircle}`}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-altair-ink-on-paper">
          {bucket.title}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-altair-ink-on-paper-secondary">
          {bucket.detail}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <span
          className={`text-2xl font-black leading-none tabular-nums tracking-tight ${urgency.count}`}
        >
          {bucket.count}
        </span>
        {hasItems ? (
          <ChevronDown
            className="h-4 w-4 shrink-0 text-altair-ink-on-paper-muted opacity-70 transition-transform group-open:rotate-180"
            aria-hidden="true"
          />
        ) : (
          <ChevronRight
            className="h-4 w-4 shrink-0 text-altair-ink-on-paper-muted opacity-70"
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );

  if (!hasItems) {
    return (
      <Link
        href={bucket.href}
        className={`block ${urgency.shell} ${altairMcCardPadClass} transition-colors ${urgency.rowHover} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-altair-brass/40`}
      >
        {header}
      </Link>
    );
  }

  return (
    <div className={urgency.shell}>
      <details className="group">
        <summary
          className={`${altairMcCardPadClass} cursor-pointer list-none marker:content-none transition-colors ${urgency.rowHover} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-altair-brass/40 [&::-webkit-details-marker]:hidden`}
        >
          {header}
        </summary>
        <div className={`border-t px-3.5 pb-3.5 pt-1 sm:px-4 ${urgency.divider}`}>
          <ul className={`divide-y ${urgency.divider}`}>
            {bucket.items.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={`flex items-start justify-between gap-3 py-2.5 transition-colors ${urgency.rowHover} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-altair-brass/40`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-altair-ink-on-paper">
                      {item.label}
                    </p>
                    {item.detail ? (
                      <p className="mt-0.5 text-xs leading-relaxed text-altair-ink-on-paper-secondary">
                        {item.detail}
                      </p>
                    ) : null}
                  </div>
                  <ChevronRight
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-altair-ink-on-paper-muted opacity-60"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
          {bucket.count > bucket.items.length ? (
            <Link
              href={bucket.href}
              className={`mt-1.5 inline-flex text-xs font-medium underline-offset-2 hover:underline ${urgency.link}`}
            >
              View all {bucket.count}
            </Link>
          ) : (
            <Link
              href={bucket.href}
              className={`mt-1.5 inline-flex text-xs font-medium underline-offset-2 hover:underline ${urgency.link}`}
            >
              Open {bucket.title.toLowerCase()}
            </Link>
          )}
        </div>
      </details>
    </div>
  );
}

export function MissionControlV2NeedsAttentionHeader({
  totalCount,
  viewAllHref,
}: {
  totalCount: number;
  viewAllHref?: string;
}) {
  return (
    <header className="flex items-start gap-2.5">
      <span aria-hidden="true" className={altairSectionTitleAccentClass} />
      <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <h2
            className={`text-sm font-bold tracking-tight sm:text-base ${altairCanvasInkClass}`}
          >
            Needs attention
          </h2>
          {totalCount > 0 ? (
            <span
              /* PRESTIGE: was paper-on-paper (light ink + light fill), which
               * was invisible once the canvas became light parchment. A count
               * chip is quiet metadata, so it reads as recessed neutral. */
              className="inline-flex min-w-6 items-center justify-center rounded-full bg-[var(--surface-recessed)] px-2 py-0.5 text-[11px] font-bold tabular-nums leading-none text-[var(--ink-secondary)] ring-1 ring-inset ring-[var(--border-strong)]"
              aria-label={`${totalCount} items need attention`}
            >
              {totalCount}
            </span>
          ) : null}
        </div>
        {viewAllHref ? (
          <Link
            href={viewAllHref}
            className={`shrink-0 text-xs font-medium underline-offset-2 transition hover:underline sm:text-[0.8125rem] ${altairCanvasInkLinkClass}`}
          >
            View all
          </Link>
        ) : null}
      </div>
    </header>
  );
}

export function MissionControlV2ExceptionBoard({
  buckets,
}: {
  buckets: DashboardExceptionBucket[];
}) {
  if (buckets.length === 0) {
    return <MissionControlV2ExceptionBoardClear />;
  }

  return (
    <div
      className="grid grid-cols-1 gap-3 md:grid-cols-2"
      role="list"
      aria-label="Needs attention"
    >
      {buckets.map((bucket) => (
        <div key={bucket.id} role="listitem">
          <MissionControlV2ExceptionBucketCard bucket={bucket} />
        </div>
      ))}
    </div>
  );
}

/** Compose-only exception cluster — no lab props or selection chrome. */
export function MissionControlV2ExceptionCluster({
  buckets,
  totalCount,
  viewAllHref,
}: {
  buckets: DashboardExceptionBucket[];
  totalCount: number;
  viewAllHref?: string;
}) {
  return (
    <section
      className="flex min-w-0 flex-col gap-3"
      aria-label="Needs attention cluster"
    >
      <MissionControlV2NeedsAttentionHeader
        totalCount={totalCount}
        viewAllHref={viewAllHref}
      />
      <MissionControlV2ExceptionBoard buckets={buckets} />
    </section>
  );
}

type InformationalBucketTone = "success" | "warning";

const INFORMATIONAL_BUCKET_TONE: Record<
  InformationalBucketTone,
  { iconCircle: string; link: string; muted: string }
> = {
  success: {
    iconCircle: "altair-icon-well bg-altair-success text-white",
    link: "text-altair-success-foreground",
    muted: "text-altair-ink-on-paper-muted",
  },
  warning: {
    iconCircle: "altair-icon-well bg-altair-warning text-white",
    link: "text-altair-warning-foreground",
    muted: "text-altair-ink-on-paper-muted",
  },
};

function InformationalBucketShell({
  title,
  count,
  detail,
  icon: Icon,
  tone,
  footerHref,
  footerLabel,
  children,
}: {
  title: string;
  count: number;
  detail: string;
  icon: LucideIcon;
  tone: InformationalBucketTone;
  footerHref?: string;
  footerLabel?: string;
  children: ReactNode;
}) {
  const toneChrome = INFORMATIONAL_BUCKET_TONE[tone];

  return (
    <details
      className={`group ${EXCEPTION_CARD_RADIUS} border border-altair-border/40 bg-altair-paper shadow-[var(--elev-hairline),var(--elev-2)]`}
    >
      <summary
        className={`${altairMcCardPadClass} cursor-pointer list-none marker:content-none transition-colors hover:bg-black/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-altair-brass/40 [&::-webkit-details-marker]:hidden`}
      >
        <div className="flex items-center gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${toneChrome.iconCircle}`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-altair-ink-on-paper">
              {title}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-altair-ink-on-paper-secondary">
              {detail}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="text-2xl font-black leading-none tabular-nums tracking-tight text-altair-ink-on-paper">
              {count}
            </span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 opacity-70 transition-transform group-open:rotate-180 ${toneChrome.muted}`}
              aria-hidden="true"
            />
          </div>
        </div>
      </summary>
      <div className="border-t border-altair-border/40">
        {children}
        {footerHref && footerLabel ? (
          <div
            className={`border-t border-altair-border/40 ${altairMcListRowClass}`}
          >
            <Link
              href={footerHref}
              className={`text-xs font-medium underline-offset-2 transition hover:underline sm:text-[0.8125rem] ${toneChrome.link}`}
            >
              {footerLabel}
            </Link>
          </div>
        ) : null}
      </div>
    </details>
  );
}

export function MissionControlV2ScheduleBucketCard({
  rows,
}: {
  rows: MissionControlV2ScheduleRow[];
}) {
  return (
    <InformationalBucketShell
      title="Today's schedule"
      count={rows.length}
      detail={
        rows.length === 0
          ? "No jobs on today's board yet"
          : `${rows.length} ${rows.length === 1 ? "job" : "jobs"} previewed for today`
      }
      icon={CalendarDays}
      tone="success"
      footerHref={MISSION_CONTROL_V2_SCHEDULE_FULL_HREF}
      footerLabel="View full schedule"
    >
      {rows.length === 0 ? (
        <div className={altairMcListRowClass}>
          <p className="text-sm font-semibold text-altair-ink-on-paper">
            No jobs scheduled today
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-altair-ink-on-paper-muted">
            Jobs on today&apos;s board will show up here once they&apos;re
            scheduled.
          </p>
          <Link
            href={MISSION_CONTROL_V2_SCHEDULE_JOBS_HREF}
            className="mt-2 inline-flex text-xs font-medium text-altair-success-foreground underline-offset-2 hover:underline"
          >
            View all jobs
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-altair-border/50 overflow-hidden">
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
    </InformationalBucketShell>
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

export function MissionControlV2ActivityBucketCard({
  rows,
}: {
  rows: MissionControlV2ActivityRow[];
}) {
  return (
    <InformationalBucketShell
      title="Recent activity"
      count={rows.length}
      detail={
        rows.length === 0
          ? "No recent events yet"
          : `${rows.length} recent ${rows.length === 1 ? "event" : "events"}`
      }
      icon={History}
      tone="warning"
    >
      {rows.length === 0 ? (
        <div className={altairMcListRowClass}>
          <p className="text-sm font-semibold text-altair-ink-on-paper">
            No recent activity yet
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-altair-ink-on-paper-muted">
            Invoice, job, and customer events will appear here as work happens.
          </p>
        </div>
      ) : (
        <ol className="overflow-hidden">
          {rows.map((row) => {
            const Icon = resolveActivityIcon(row);
            const indicatorTone =
              row.tone === "neutral"
                ? null
                : (row.tone as "success" | "warning" | "danger");

            const body = (
              <div
                className={`${altairMcListRowClass} flex items-start gap-3 border-b border-altair-border/50 last:border-b-0`}
              >
                <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-altair-paper-subtle text-altair-ink-muted">
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
          })}
        </ol>
      )}
    </InformationalBucketShell>
  );
}

/** Compose-only informational cluster — no lab props or selection chrome. */
export function MissionControlV2InformationalCluster({
  scheduleRows,
  activityRows,
}: {
  scheduleRows: MissionControlV2ScheduleRow[];
  activityRows: MissionControlV2ActivityRow[];
}) {
  return (
    <section aria-label="Informational cluster">
      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-2">
        <MissionControlV2ScheduleBucketCard rows={scheduleRows} />
        <MissionControlV2ActivityBucketCard rows={activityRows} />
      </div>
    </section>
  );
}

/**
 * Mission Control v2 — live owner dashboard.
 * Exception board (management-by-exception buckets) is the primary surface.
 * Schedule / activity are informational bucket cards after exceptions.
 * Next recommended stays as secondary activation context.
 *
 * Section pieces below are compose-only exports so Design Lab can wrap them
 * without lab props leaking into this production composition.
 */
export function MissionControlV2View({
  data,
  demoDataStatus,
  companyTimeZone,
  onboardingChecklist,
  scheduleRows,
  activityRows,
}: MissionControlV2ViewProps = {}) {
  const sample = missionControlV2SampleData;
  const exceptionBuckets = data ? buildDashboardExceptionBuckets(data) : [];
  const totalAttentionCount = exceptionBuckets.reduce(
    (sum, bucket) => sum + bucket.count,
    0,
  );
  const viewAllHref = exceptionBuckets[0]?.href;
  const resolvedScheduleRows =
    scheduleRows ??
    (data
      ? buildMissionControlV2ScheduleRows(data, { timeZone: companyTimeZone })
      : sample.schedule);
  const resolvedActivityRows =
    activityRows ??
    (data ? buildMissionControlV2ActivityRows(data) : sample.activity);
  const showSampleDataDiscovery = Boolean(
    demoDataStatus?.canSetupDemoData && !demoDataStatus.hasDemoData,
  );

  return (
    <div className="mc-dashboard-olive-canvas flex min-w-0 flex-col">
      <div className="mc-dashboard-content-well flex flex-col bg-[var(--north-star-content-well)]">
        {showSampleDataDiscovery ? (
          <p
            className={`border-b border-[var(--north-star-section-divider)] px-4 py-3 text-sm text-altair-paper/70 sm:px-5`}
          >
            Need example data?{" "}
            <Link
              href="/settings/company"
              className="font-medium text-altair-paper underline underline-offset-2 transition hover:text-altair-brass"
            >
              Load it from Settings
            </Link>
            .
          </p>
        ) : null}

        {/* Exception board — severity-ranked buckets only when they need attention */}
        <div className="border-b border-[var(--north-star-section-divider)]/40 px-4 py-4 sm:px-5">
          <MissionControlV2ExceptionCluster
            buckets={exceptionBuckets}
            totalCount={totalAttentionCount}
            viewAllHref={viewAllHref}
          />
        </div>

        {/* Informational buckets — schedule / activity, not in critical order */}
        <div className="border-b border-[var(--north-star-section-divider)]/40 px-4 py-4 sm:px-5">
          <MissionControlV2InformationalCluster
            scheduleRows={resolvedScheduleRows}
            activityRows={resolvedActivityRows}
          />
        </div>

        {/* Next recommended — functional onboarding content only */}
        <div className="px-4 py-4 sm:px-5">
          <MissionControlV2NextRecommendedCard checklist={onboardingChecklist} />
        </div>
      </div>
    </div>
  );
}
