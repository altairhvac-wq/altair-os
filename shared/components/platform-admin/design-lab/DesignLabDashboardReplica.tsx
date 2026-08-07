"use client";

import {
  Briefcase,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Clock,
  CreditCard,
  FileText,
  History,
  Info,
  Receipt,
  Truck,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { DesignLabEditableTarget } from "@/shared/components/platform-admin/design-lab/DesignLabEditableTarget";
import { DesignLabTokenAnchor } from "@/shared/components/platform-admin/design-lab/DesignLabSpotlight";
import type { DesignLabEditTargetId } from "@/shared/components/platform-admin/design-lab/design-lab-edit-targets";
import { MissionControlV2NextRecommendedCard } from "@/shared/components/dashboard/mission-control-v2/MissionControlV2NextRecommendedCard";
import { altairMcCardPadClass } from "@/shared/design-system/components";
import {
  altairCanvasInkClass,
  altairCanvasInkLinkClass,
  altairSectionTitleAccentClass,
} from "@/shared/design-system/foundation";
import {
  getExceptionBucketUrgency,
  type DashboardExceptionBucketId,
  type DashboardExceptionBucketUrgency,
} from "@/shared/lib/dashboard-exception-board";

type DesignLabDashboardReplicaProps = {
  selectedTargetId: DesignLabEditTargetId | null;
  onSelectTarget: (id: DesignLabEditTargetId) => void;
};

type ReplicaBucketItem = {
  id: string;
  label: string;
  detail?: string;
};

type ReplicaBucket = {
  id: DashboardExceptionBucketId;
  title: string;
  count: number;
  detail: string;
  urgency: DashboardExceptionBucketUrgency;
  items: ReplicaBucketItem[];
};

/**
 * Design-tool sample board — always shows every bucket + every urgency tone
 * (low / medium / high) so founders can edit danger/warning/success chrome
 * without needing matching live data. Clearly labeled sample content.
 */
const EXCEPTION_FIXTURE: ReplicaBucket[] = [
  {
    id: "payments",
    title: "Payments",
    count: 1,
    detail: "1 card failure needing attention",
    urgency: getExceptionBucketUrgency(1),
    items: [
      {
        id: "pay-1",
        label: "Invoice INV-1847",
        detail: "$420.00",
      },
    ],
  },
  {
    id: "invoices",
    title: "Invoices",
    count: 3,
    detail: "3 past-due invoices · $2,840.00",
    urgency: getExceptionBucketUrgency(3),
    items: [
      {
        id: "inv-1",
        label: "INV-1831",
        detail: "Layton Residence · $1,240.00",
      },
      {
        id: "inv-2",
        label: "INV-1828",
        detail: "Ogden Plaza · $890.00",
      },
      {
        id: "inv-3",
        label: "INV-1819",
        detail: "Roy Family Trust · $710.00",
      },
    ],
  },
  {
    id: "dispatch",
    title: "Dispatch",
    count: 1,
    detail: "Technician has 2+ active jobs today",
    urgency: getExceptionBucketUrgency(1),
    items: [
      {
        id: "tech-1",
        label: "Sam Ortiz",
        detail: "2+ active jobs today",
      },
    ],
  },
  {
    id: "jobs",
    title: "Jobs",
    count: 2,
    detail: "2 unassigned jobs on today's board",
    urgency: getExceptionBucketUrgency(2),
    items: [
      {
        id: "job-1",
        label: "JOB-2041",
        detail: "Clearfield · AC diagnostic",
      },
      {
        id: "job-2",
        label: "JOB-2044",
        detail: "Roy · Furnace inspection",
      },
    ],
  },
  {
    id: "estimates",
    title: "Estimates",
    count: 1,
    detail: "Customer approved — assign or schedule the linked job",
    urgency: getExceptionBucketUrgency(1),
    items: [
      {
        id: "est-1",
        label: "EST-0912",
        detail: "Northside Dental · $3,450.00",
      },
    ],
  },
  {
    id: "leads",
    title: "Leads",
    count: 2,
    detail: "2 leads need contact or follow-up",
    urgency: getExceptionBucketUrgency(2),
    items: [
      {
        id: "lead-1",
        label: "Jordan Hale",
        detail: "Website form",
      },
      {
        id: "lead-2",
        label: "Summit Properties",
        detail: "Referral",
      },
    ],
  },
  {
    id: "team",
    title: "Team",
    count: 4,
    detail: "4 timesheets need review (sample high urgency)",
    urgency: getExceptionBucketUrgency(4),
    items: [
      { id: "team-1", label: "Alex Rivera", detail: "Missing Friday clock-out" },
      { id: "team-2", label: "Morgan Lee", detail: "Overtime pending" },
      { id: "team-3", label: "Casey Brooks", detail: "Unapproved hours" },
      { id: "team-4", label: "Riley Quinn", detail: "Job code missing" },
    ],
  },
  {
    id: "customers",
    title: "Customers",
    count: 5,
    detail: "5 customers need follow-up (sample high urgency)",
    urgency: getExceptionBucketUrgency(5),
    items: [
      { id: "cust-1", label: "Layton Residence", detail: "Callback requested" },
      { id: "cust-2", label: "Ogden Plaza", detail: "Warranty review" },
      { id: "cust-3", label: "Roy Family Trust", detail: "Quote follow-up" },
      { id: "cust-4", label: "Northside Dental", detail: "Maintenance due" },
      { id: "cust-5", label: "Summit Properties", detail: "New contact" },
    ],
  },
];

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

/** Soft light-card radius matching MissionControlV2View. */
const EXCEPTION_CARD_RADIUS = "rounded-xl";

/**
 * Soft light-card urgency chrome — same foundation tokens as live Dashboard
 * (cream / amber / danger surfaces). Not Dispatch graphite job-blocks.
 */
const EXCEPTION_URGENCY: Record<
  DashboardExceptionBucketUrgency,
  {
    shell: string;
    iconCircle: string;
    count: string;
    divider: string;
    shellToken:
      | "altairPaper"
      | "altairWarningSurface"
      | "altairDangerSurface";
    accentToken: "altairSuccess" | "altairWarning" | "altairDanger";
  }
> = {
  low: {
    shell: `${EXCEPTION_CARD_RADIUS} border border-altair-border/40 bg-altair-paper shadow-sm`,
    iconCircle: "bg-altair-success text-white",
    count: "text-altair-ink-on-paper",
    divider: "border-altair-border/40",
    shellToken: "altairPaper",
    accentToken: "altairSuccess",
  },
  medium: {
    shell: `${EXCEPTION_CARD_RADIUS} border border-altair-warning/25 bg-altair-warning-surface shadow-sm`,
    iconCircle: "bg-altair-warning text-white",
    count: "text-altair-warning-foreground",
    divider: "border-altair-warning/20",
    shellToken: "altairWarningSurface",
    accentToken: "altairWarning",
  },
  high: {
    shell: `${EXCEPTION_CARD_RADIUS} border border-altair-danger/25 bg-altair-danger-surface shadow-sm`,
    iconCircle: "bg-altair-danger text-white",
    count: "text-altair-danger",
    divider: "border-altair-danger/20",
    shellToken: "altairDangerSurface",
    accentToken: "altairDanger",
  },
};

/** Counts only — cards render collapsed like the live dashboard default. */
const SCHEDULE_COUNT = 3;
const ACTIVITY_COUNT = 3;

function ExceptionBucketCard({
  bucket,
  selectedTargetId,
  onSelectTarget,
}: {
  bucket: ReplicaBucket;
  selectedTargetId: DesignLabEditTargetId | null;
  onSelectTarget: (id: DesignLabEditTargetId) => void;
}) {
  const urgency = EXCEPTION_URGENCY[bucket.urgency];
  const Icon = EXCEPTION_BUCKET_ICON[bucket.id];
  const hasItems = bucket.items.length > 0;

  return (
    <DesignLabTokenAnchor tokenKey={urgency.shellToken} className="block">
      <DesignLabEditableTarget
        targetId="status-colors"
        selectedTargetId={selectedTargetId}
        onSelectTarget={onSelectTarget}
        aria-label={`Edit status colors · ${bucket.title} (${bucket.urgency})`}
        className={`!rounded-xl ${urgency.shell} ${altairMcCardPadClass}`}
      >
        <div className="flex items-center gap-3">
          <DesignLabTokenAnchor
            tokenKey={urgency.accentToken}
            as="span"
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${urgency.iconCircle}`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </DesignLabTokenAnchor>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="text-sm font-semibold text-altair-ink-on-paper">
                {bucket.title}
              </p>
              <span className="rounded-full bg-black/5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-altair-ink-on-paper-muted">
                Sample · {bucket.urgency}
              </span>
            </div>
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
                className="h-4 w-4 shrink-0 text-altair-ink-on-paper-muted opacity-70"
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
      </DesignLabEditableTarget>
    </DesignLabTokenAnchor>
  );
}

function NeedsAttentionHeader({
  totalCount,
  selectedTargetId,
  onSelectTarget,
}: {
  totalCount: number;
  selectedTargetId: DesignLabEditTargetId | null;
  onSelectTarget: (id: DesignLabEditTargetId) => void;
}) {
  return (
    <DesignLabEditableTarget
      targetId="section-title"
      selectedTargetId={selectedTargetId}
      onSelectTarget={onSelectTarget}
      as="header"
      aria-label="Edit section title · Needs attention"
      className="flex items-start gap-2.5"
    >
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
              className="inline-flex min-w-6 items-center justify-center rounded-full bg-altair-paper/20 px-2 py-0.5 text-[11px] font-bold tabular-nums leading-none text-altair-paper ring-1 ring-inset ring-altair-paper/35"
              aria-label={`${totalCount} items need attention`}
            >
              {totalCount}
            </span>
          ) : null}
        </div>
        <span
          className={`shrink-0 text-xs font-medium sm:text-[0.8125rem] ${altairCanvasInkLinkClass}`}
        >
          View all
        </span>
      </div>
    </DesignLabEditableTarget>
  );
}

function InformationalBucketShell({
  title,
  count,
  detail,
  icon: Icon,
  tone,
  selectedTargetId,
  onSelectTarget,
}: {
  title: string;
  count: number;
  detail: string;
  icon: LucideIcon;
  tone: "success" | "warning" | "information";
  selectedTargetId: DesignLabEditTargetId | null;
  onSelectTarget: (id: DesignLabEditTargetId) => void;
}) {
  const iconCircle =
    tone === "success"
      ? "bg-altair-success text-white"
      : tone === "warning"
        ? "bg-altair-warning text-white"
        : "bg-altair-information text-white";
  const accentToken =
    tone === "success"
      ? ("altairSuccess" as const)
      : tone === "warning"
        ? ("altairWarning" as const)
        : ("altairInformation" as const);

  return (
    <DesignLabTokenAnchor tokenKey="altairPaper" className="block">
      <DesignLabEditableTarget
        targetId="altair-materials"
        selectedTargetId={selectedTargetId}
        onSelectTarget={onSelectTarget}
        aria-label={`Edit Altair materials · ${title}`}
        className={`!rounded-xl ${EXCEPTION_CARD_RADIUS} border border-altair-border/40 bg-altair-paper shadow-sm ${altairMcCardPadClass}`}
      >
        <div className="flex items-center gap-3">
          <DesignLabTokenAnchor
            tokenKey={accentToken}
            as="span"
            className="inline-flex"
          >
            <DesignLabEditableTarget
              targetId="altair-status"
              selectedTargetId={selectedTargetId}
              onSelectTarget={onSelectTarget}
              as="span"
              aria-label={`Edit Altair status · ${title} icon`}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconCircle}`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
            </DesignLabEditableTarget>
          </DesignLabTokenAnchor>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="text-sm font-semibold text-altair-ink-on-paper">
                {title}
              </p>
              <span className="rounded-full bg-black/5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-altair-ink-on-paper-muted">
                Sample
              </span>
            </div>
            <p className="mt-0.5 text-xs leading-relaxed text-altair-ink-on-paper-secondary">
              {detail}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="text-2xl font-black leading-none tabular-nums tracking-tight text-altair-ink-on-paper">
              {count}
            </span>
            <ChevronDown
              className="h-4 w-4 shrink-0 text-altair-ink-on-paper-muted opacity-70"
              aria-hidden="true"
            />
          </div>
        </div>
      </DesignLabEditableTarget>
    </DesignLabTokenAnchor>
  );
}

/**
 * Structural replica of today's Mission Control v2 Dashboard:
 * soft light exception cards on sidebar-matched olive well, schedule / activity
 * informational cards, Next recommended — no style-showcase sections.
 */
export function DesignLabDashboardReplica({
  selectedTargetId,
  onSelectTarget,
}: DesignLabDashboardReplicaProps) {
  const totalAttention = EXCEPTION_FIXTURE.reduce(
    (sum, bucket) => sum + bucket.count,
    0,
  );

  return (
    <div className="mc-dashboard-olive-canvas flex min-w-0 flex-col bg-[var(--north-star-content-well)]">
      <div className="mc-dashboard-content-well flex flex-col bg-[var(--north-star-content-well)]">
        <div className="border-b border-[var(--north-star-section-divider)]/40 px-4 py-2.5 sm:px-5">
          <p className="rounded-md border border-dashed border-[rgba(201,164,77,0.45)] bg-[rgba(251,247,239,0.14)] px-2.5 py-1.5 text-[11px] leading-snug text-[var(--north-star-section-secondary)]">
            <span className="font-semibold text-[var(--north-star-champagne)]">
              Sample preview
            </span>
            {" — "}
            every bucket and urgency tone is forced visible for Design Lab
            editing. Not live company data.
          </p>
        </div>

        {/* Exception board */}
        <div className="border-b border-[var(--north-star-section-divider)]/40 px-4 py-4 sm:px-5">
          <section
            className="flex min-w-0 flex-col gap-3"
            aria-label="Needs attention cluster"
          >
            <NeedsAttentionHeader
              totalCount={totalAttention}
              selectedTargetId={selectedTargetId}
              onSelectTarget={onSelectTarget}
            />
            <div
              className="grid grid-cols-1 gap-3 md:grid-cols-2"
              role="list"
              aria-label="Needs attention"
            >
              {EXCEPTION_FIXTURE.map((bucket) => (
                <div key={bucket.id} role="listitem">
                  <ExceptionBucketCard
                    bucket={bucket}
                    selectedTargetId={selectedTargetId}
                    onSelectTarget={onSelectTarget}
                  />
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Informational buckets — success / warning / information status anchors */}
        <div className="border-b border-[var(--north-star-section-divider)]/40 px-4 py-4 sm:px-5">
          <section aria-label="Informational cluster">
            <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-3">
              <InformationalBucketShell
                title="Today's schedule"
                count={SCHEDULE_COUNT}
                detail={`${SCHEDULE_COUNT} jobs previewed for today`}
                icon={CalendarDays}
                tone="success"
                selectedTargetId={selectedTargetId}
                onSelectTarget={onSelectTarget}
              />

              <InformationalBucketShell
                title="Recent activity"
                count={ACTIVITY_COUNT}
                detail={`${ACTIVITY_COUNT} recent events`}
                icon={History}
                tone="warning"
                selectedTargetId={selectedTargetId}
                onSelectTarget={onSelectTarget}
              />

              <InformationalBucketShell
                title="Information"
                count={2}
                detail="2 sample info-tone items"
                icon={Info}
                tone="information"
                selectedTargetId={selectedTargetId}
                onSelectTarget={onSelectTarget}
              />
            </div>
          </section>
        </div>

        {/* Next recommended — soft card paper utilities alias to surface ladder */}
        <div className="px-4 py-4 sm:px-5">
          <DesignLabTokenAnchor tokenKey="surfaceSection" className="block">
            <DesignLabEditableTarget
              targetId="surface-hierarchy"
              selectedTargetId={selectedTargetId}
              onSelectTarget={onSelectTarget}
              aria-label="Edit surface hierarchy · Next recommended"
              className="block"
              style={{
                ["--color-altair-paper" as string]: "var(--surface-card)",
                ["--color-altair-paper-subtle" as string]: "var(--surface-muted)",
                ["--color-altair-paper-elevated" as string]: "var(--surface-tile)",
                backgroundColor: "var(--surface-section)",
                backgroundImage: "var(--surface-section--shine, none)",
                boxShadow:
                  "inset 0 0 0 1px color-mix(in srgb, var(--surface-panel) 80%, transparent)",
                padding: "0.5rem",
              }}
            >
              <MissionControlV2NextRecommendedCard />
            </DesignLabEditableTarget>
          </DesignLabTokenAnchor>
        </div>
      </div>
    </div>
  );
}
