import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CreditCard,
  FileText,
  History,
  Receipt,
  Users,
  type LucideIcon,
} from "lucide-react";
import { JobScheduleRow } from "@/shared/components/jobs/JobScheduleRow";
import {
  SectionHeader,
  altairMcCardPadClass,
  altairMcGridGapClass,
  altairMcListClass,
  altairMcListRowClass,
} from "@/shared/design-system/components";
import {
  altairCanvasInkLinkClass,
  altairCanvasInkMutedClass,
  altairSemanticIndicatorClass,
  altairSemanticSurfaceClass,
  altairSemanticValueClass,
} from "@/shared/design-system/foundation";
import {
  buildDashboardExceptionBuckets,
  type DashboardExceptionBucket,
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

function ExceptionBoardClear() {
  return (
    <div
      className={`rounded-none border border-[var(--north-star-border)] ${altairMcCardPadClass} ${altairSemanticSurfaceClass.success}`}
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
            No payments, invoices, dispatch, estimates, leads, team, or
            customers need attention right now.
          </p>
        </div>
      </div>
    </div>
  );
}

function ExceptionBucketCard({ bucket }: { bucket: DashboardExceptionBucket }) {
  const surfaceClass = altairSemanticSurfaceClass[bucket.tone];
  const valueClass = altairSemanticValueClass[bucket.tone];
  const hasItems = bucket.items.length > 0;

  const header = (
    <div className="flex items-start gap-3">
      <AlertTriangle
        className={`mt-0.5 h-4 w-4 shrink-0 ${valueClass}`}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <p className={`text-sm font-semibold ${valueClass}`}>{bucket.title}</p>
          <p
            className={`text-lg font-black leading-none tabular-nums ${valueClass}`}
          >
            {bucket.count}
          </p>
        </div>
        <p className={`mt-0.5 text-xs leading-relaxed opacity-80 ${valueClass}`}>
          {bucket.detail}
        </p>
      </div>
      {hasItems ? (
        <ChevronDown
          className={`mt-0.5 h-4 w-4 shrink-0 opacity-70 transition-transform group-open:rotate-180 ${valueClass}`}
          aria-hidden="true"
        />
      ) : (
        <ChevronRight
          className={`mt-0.5 h-4 w-4 shrink-0 opacity-70 ${valueClass}`}
          aria-hidden="true"
        />
      )}
    </div>
  );

  if (!hasItems) {
    return (
      <Link
        href={bucket.href}
        className={`block rounded-none border border-[var(--north-star-border)] ${altairMcCardPadClass} ${surfaceClass} transition-colors hover:brightness-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-altair-brass/40`}
      >
        {header}
      </Link>
    );
  }

  return (
    <details
      className={`group rounded-none border border-[var(--north-star-border)] ${surfaceClass}`}
    >
      <summary
        className={`${altairMcCardPadClass} cursor-pointer list-none marker:content-none transition-colors hover:brightness-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-altair-brass/40 [&::-webkit-details-marker]:hidden`}
      >
        {header}
      </summary>
      <div className="border-t border-[var(--north-star-border)]/50 px-3 pb-3 pt-1 sm:px-4">
        <ul className="divide-y divide-[var(--north-star-border)]/40">
          {bucket.items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="flex items-start justify-between gap-3 py-2 transition-colors hover:bg-altair-brass/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-altair-brass/40"
              >
                <div className="min-w-0">
                  <p className={`text-sm font-medium ${valueClass}`}>
                    {item.label}
                  </p>
                  {item.detail ? (
                    <p
                      className={`mt-0.5 text-xs leading-relaxed opacity-75 ${valueClass}`}
                    >
                      {item.detail}
                    </p>
                  ) : null}
                </div>
                <ChevronRight
                  className={`mt-0.5 h-3.5 w-3.5 shrink-0 opacity-60 ${valueClass}`}
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
        {bucket.count > bucket.items.length ? (
          <Link
            href={bucket.href}
            className={`mt-1 inline-flex text-xs font-medium underline-offset-2 hover:underline ${valueClass}`}
          >
            View all {bucket.count}
          </Link>
        ) : (
          <Link
            href={bucket.href}
            className={`mt-1 inline-flex text-xs font-medium underline-offset-2 hover:underline ${valueClass}`}
          >
            Open {bucket.title.toLowerCase()}
          </Link>
        )}
      </div>
    </details>
  );
}

function ExceptionBoard({ buckets }: { buckets: DashboardExceptionBucket[] }) {
  if (buckets.length === 0) {
    return <ExceptionBoardClear />;
  }

  return (
    <div
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
      role="list"
      aria-label="Needs attention"
    >
      {buckets.map((bucket) => (
        <div key={bucket.id} role="listitem">
          <ExceptionBucketCard bucket={bucket} />
        </div>
      ))}
    </div>
  );
}

function InformationalBucketShell({
  title,
  count,
  detail,
  icon: Icon,
  footerHref,
  footerLabel,
  children,
}: {
  title: string;
  count: number;
  detail: string;
  icon: LucideIcon;
  footerHref?: string;
  footerLabel?: string;
  children: ReactNode;
}) {
  return (
    <details className="group rounded-none border border-[var(--north-star-border)] bg-[var(--surface-card)]">
      <summary
        className={`${altairMcCardPadClass} cursor-pointer list-none marker:content-none transition-colors hover:bg-altair-brass/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-altair-brass/40 [&::-webkit-details-marker]:hidden`}
      >
        <div className="flex items-start gap-3">
          <Icon
            className="mt-0.5 h-4 w-4 shrink-0 text-altair-ink-on-paper-secondary"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <p className="text-sm font-semibold text-altair-ink-on-paper">
                {title}
              </p>
              <p className="text-lg font-black leading-none tabular-nums text-altair-ink-on-paper">
                {count}
              </p>
            </div>
            <p className="mt-0.5 text-xs leading-relaxed text-altair-ink-on-paper-secondary">
              {detail}
            </p>
          </div>
          <ChevronDown
            className="mt-0.5 h-4 w-4 shrink-0 text-altair-ink-on-paper-muted opacity-70 transition-transform group-open:rotate-180"
            aria-hidden="true"
          />
        </div>
      </summary>
      <div className="border-t border-[var(--north-star-border)]/50">
        {children}
        {footerHref && footerLabel ? (
          <div
            className={`border-t border-altair-border/60 ${altairMcListRowClass}`}
          >
            <Link
              href={footerHref}
              className={`text-xs font-medium underline-offset-2 transition hover:underline sm:text-[0.8125rem] ${altairCanvasInkLinkClass}`}
            >
              {footerLabel}
            </Link>
          </div>
        ) : null}
      </div>
    </details>
  );
}

function ScheduleBucketCard({ rows }: { rows: MissionControlV2ScheduleRow[] }) {
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
            className={`mt-2 inline-flex text-xs font-medium underline-offset-2 hover:underline ${altairCanvasInkLinkClass}`}
          >
            View all jobs
          </Link>
        </div>
      ) : (
        <ul className={`divide-y divide-altair-border/60 ${altairMcListClass}`}>
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

function ActivityBucketCard({ rows }: { rows: MissionControlV2ActivityRow[] }) {
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
        <ol className={altairMcListClass}>
          {rows.map((row) => {
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
          })}
        </ol>
      )}
    </InformationalBucketShell>
  );
}

/**
 * Mission Control v2 — live owner dashboard.
 * Exception board (management-by-exception buckets) is the primary surface.
 * Schedule / activity are informational bucket cards after exceptions.
 * Next recommended stays as secondary activation context.
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
    <div className="mc-dashboard-greige-trial flex min-w-0 flex-col">
      <div className="mc-dashboard-content-well flex flex-col bg-[var(--north-star-content-well)]">
        {showSampleDataDiscovery ? (
          <p
            className={`border-b border-[var(--north-star-border)] px-4 py-3 text-sm sm:px-5 ${altairCanvasInkMutedClass}`}
          >
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

        {/* Exception board — severity-ranked buckets only when they need attention */}
        <div className="border-b border-[var(--north-star-border)] px-4 py-3 sm:px-5">
          <section className="flex min-w-0 flex-col gap-2">
            <SectionHeader title="Needs attention" />
            <ExceptionBoard buckets={exceptionBuckets} />
          </section>
        </div>

        {/* Informational buckets — schedule / activity, not in critical order */}
        <div className="border-b border-[var(--north-star-border)] px-4 py-3 sm:px-5">
          <div
            className={`grid grid-cols-1 items-start lg:grid-cols-2 ${altairMcGridGapClass}`}
          >
            <ScheduleBucketCard rows={resolvedScheduleRows} />
            <ActivityBucketCard rows={resolvedActivityRows} />
          </div>
        </div>

        {/* Next recommended — unchanged */}
        <div className="px-4 py-3 sm:px-5">
          <MissionControlV2NextRecommendedCard checklist={onboardingChecklist} />
        </div>
      </div>
    </div>
  );
}
