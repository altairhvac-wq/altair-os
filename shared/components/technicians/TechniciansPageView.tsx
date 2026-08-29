import Link from "next/link";
import { MembershipStatusBadge } from "@/shared/components/settings/MembershipStatusBadge";
import { CopyMemberShareCodeButton } from "@/shared/components/technicians/CopyMemberShareCodeButton";
import {
  EmptyState,
  SectionHeader,
  altairMcGridGapClass,
  altairMcListClass,
  altairMcListRowClass,
  altairMcMetricLabelClass,
  altairMcMetricValueClass,
  altairMcTileClass,
} from "@/shared/design-system/components";
import { MasterPageHeader } from "@/shared/design-system/shell";
import { TECHNICIAN_TIME_STATE_DOT_CLASS } from "@/shared/lib/dispatch-technician-time-state";
import type {
  TechnicianRosterRow,
  TechnicianTimeStatusCounts,
} from "@/shared/lib/technicians/technician-roster-time-status";
import {
  formatTeamMemberRole,
  getTeamMemberInitials,
} from "@/shared/types/team-member";
import {
  TECHNICIAN_TIME_STATE_LABELS,
  type TechnicianTimeState,
} from "@/shared/types/time-entry";

const STATUS_STRIP_ORDER: TechnicianTimeState[] = [
  "clocked_in",
  "working_job",
  "on_break",
  "off_clock",
];

const STATUS_STRIP_LABELS: Record<TechnicianTimeState, string> = {
  clocked_in: "Clocked in",
  working_job: "On job",
  on_break: "On break",
  off_clock: "Off clock",
};

type TechniciansPageViewProps = {
  technicians: TechnicianRosterRow[];
  statusCounts: TechnicianTimeStatusCounts;
  loadError?: string;
  /**
   * When true, omit MasterPageHeader — Team hub hosts page chrome.
   */
  embedded?: boolean;
};

export function TechniciansPageView({
  technicians,
  statusCounts,
  loadError,
  embedded = false,
}: TechniciansPageViewProps) {
  return (
    <div className="space-y-4">
      {embedded ? null : (
        <MasterPageHeader
          title="Technicians"
          subtitle="Field roster, live time-clock status, and share codes"
          density="compact"
          surfaceVariant="northStar"
        />
      )}

      {loadError ? (
        <EmptyState
          title="Couldn’t load technicians"
          description={loadError}
          tone="danger"
        />
      ) : null}

      <section className="space-y-2">
        <SectionHeader title="Time-clock status" />
        <div
          className={`grid grid-cols-2 ${altairMcGridGapClass} lg:grid-cols-4`}
        >
          {STATUS_STRIP_ORDER.map((state) => (
            <div key={state} className={altairMcTileClass}>
              <p className={altairMcMetricLabelClass}>
                {STATUS_STRIP_LABELS[state]}
              </p>
              <p className={altairMcMetricValueClass}>{statusCounts[state]}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <SectionHeader
          title="Roster"
          action={
            technicians.length > 0
              ? { label: `${technicians.length} technicians` }
              : undefined
          }
        />

        {technicians.length === 0 && !loadError ? (
          <EmptyState
            title="No technicians yet"
            description="Invite teammates with the Technician role from Settings → Users."
            action={{ label: "Open team settings", href: "/settings/users" }}
          />
        ) : (
          <div className={altairMcListClass}>
            <div className="hidden border-b border-[var(--north-star-plate-border)] px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-altair-ink-on-paper-muted sm:grid sm:grid-cols-[minmax(0,1.4fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,1fr)_minmax(0,1fr)] sm:gap-3">
              <span>Name</span>
              <span>Role</span>
              <span>Status</span>
              <span>Rating</span>
              <span>Share code</span>
            </div>
            <ul className="divide-y divide-[var(--north-star-plate-border)]">
              {technicians.map((technician) => (
                <li key={technician.id} className={altairMcListRowClass}>
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,1fr)_minmax(0,1fr)] sm:items-center sm:gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-altair-ink-on-paper text-[11px] font-bold text-altair-paper">
                        {getTeamMemberInitials(technician.name)}
                      </span>
                      <div className="min-w-0">
                        <Link
                          href={`/team/${technician.id}`}
                          className="block truncate text-sm font-semibold text-altair-ink-on-paper underline-offset-2 hover:underline"
                        >
                          {technician.name}
                        </Link>
                        <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-altair-ink-on-paper-muted sm:hidden">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${TECHNICIAN_TIME_STATE_DOT_CLASS[technician.timeState]}`}
                            aria-hidden="true"
                          />
                          {TECHNICIAN_TIME_STATE_LABELS[technician.timeState]}
                        </p>
                      </div>
                    </div>

                    <p className="text-sm text-altair-ink-on-paper-secondary">
                      <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-altair-ink-on-paper-muted sm:hidden">
                        Role
                      </span>
                      {formatTeamMemberRole(technician.role)}
                    </p>

                    <div className="flex items-center gap-2">
                      <MembershipStatusBadge status={technician.status} />
                      <span className="hidden items-center gap-1 text-[11px] text-altair-ink-on-paper-muted sm:inline-flex">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${TECHNICIAN_TIME_STATE_DOT_CLASS[technician.timeState]}`}
                          aria-hidden="true"
                        />
                        {TECHNICIAN_TIME_STATE_LABELS[technician.timeState]}
                      </span>
                    </div>

                    <p className="text-sm text-altair-ink-on-paper-muted">
                      <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide sm:hidden">
                        Rating
                      </span>
                      No reviews yet
                    </p>

                    <div>
                      {technician.memberShareCode ? (
                        <CopyMemberShareCodeButton
                          code={technician.memberShareCode}
                        />
                      ) : (
                        <span className="text-sm text-altair-ink-on-paper-muted">
                          —
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
