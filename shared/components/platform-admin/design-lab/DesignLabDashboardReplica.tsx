"use client";

import { useMemo } from "react";
import {
  ArrowRight,
  AlertTriangle,
  Bell,
  ChevronRight,
  DollarSign,
  Receipt,
  ShieldCheck,
  Target,
  Truck,
  Users,
} from "lucide-react";
import { DesignLabSurfaceTarget } from "@/shared/components/platform-admin/design-lab/DesignLabSurfaceContext";
import { DesignLabEditableTarget } from "@/shared/components/platform-admin/design-lab/DesignLabEditableTarget";
import { DESIGN_LAB_DASHBOARD_FIXTURE } from "@/shared/components/platform-admin/design-lab/design-lab-dashboard-fixture";
import type { DesignLabEditTargetId } from "@/shared/components/platform-admin/design-lab/design-lab-edit-targets";
import {
  metricChipSurfaceId,
  moneyRowSurfaceId,
  pulseMetricSurfaceId,
  queueRowSurfaceId,
  workMetricSurfaceId,
  type DashboardSurfaceId,
} from "@/shared/components/platform-admin/design-lab/design-lab-dashboard-surfaces";
import { northStarTokens as t } from "@/shared/design-system/north-star/tokens";
import { MasterContentStack, MasterPageCanvas, MasterShellPage } from "@/shared/design-system/shell";
import { buildNorthStarBoardContent } from "@/shared/lib/dashboard-north-star-board";
import {
  buildNorthStarHeroContent,
  formatNorthStarImpactCategoryLabel,
  formatNorthStarRecommendationMetric,
} from "@/shared/lib/dashboard-north-star-hero";
import { buildNorthStarSupportingBandsContent } from "@/shared/lib/dashboard-north-star-supporting-bands";
import type { NorthStarBoardRow } from "@/shared/lib/dashboard-north-star-board";

type DesignLabDashboardReplicaProps = {
  selectedTargetId: DesignLabEditTargetId | null;
  onSelectTarget: (id: DesignLabEditTargetId) => void;
};

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function severityBadgeTarget(
  severity: NorthStarBoardRow["severity"],
): DesignLabEditTargetId {
  if (severity === "critical") {
    return "danger-badge";
  }
  if (severity === "warning") {
    return "warning-badge";
  }
  return "success-badge";
}

function severityDotClass(severity: NorthStarBoardRow["severity"]): string {
  switch (severity) {
    case "critical":
      return "bg-red-500";
    case "warning":
      return "bg-amber-500";
    default:
      return "bg-slate-400";
  }
}

function progressBarClass(severity: NorthStarBoardRow["severity"]): string {
  switch (severity) {
    case "critical":
      return "bg-gradient-to-r from-red-500 to-red-600";
    case "warning":
      return "bg-gradient-to-r from-amber-500 to-amber-600";
    default:
      return "bg-gradient-to-r from-slate-400 to-slate-500";
  }
}

function dispatchPressureTone(
  severity: "healthy" | "warning" | "critical",
): string {
  switch (severity) {
    case "critical":
      return "bg-red-500";
    case "warning":
      return "bg-amber-500";
    default:
      return "bg-emerald-500";
  }
}

function SeverityDot({
  severity,
  selectedTargetId,
  onSelectTarget,
}: {
  severity: NorthStarBoardRow["severity"];
  selectedTargetId: DesignLabEditTargetId | null;
  onSelectTarget: (id: DesignLabEditTargetId) => void;
}) {
  const targetId = severityBadgeTarget(severity);

  return (
    <DesignLabEditableTarget
      targetId={targetId}
      selectedTargetId={selectedTargetId}
      onSelectTarget={onSelectTarget}
      as="span"
      className={`h-2 w-2 shrink-0 rounded-full ${severityDotClass(severity)}`}
      aria-hidden
    >
      <span className="sr-only">Severity</span>
    </DesignLabEditableTarget>
  );
}

function BoardRow({
  row,
  variant,
  surfaceId,
  selectedTargetId,
  onSelectGlobal,
}: {
  row: NorthStarBoardRow;
  variant: "action" | "money";
  surfaceId: DashboardSurfaceId;
  selectedTargetId: DesignLabEditTargetId | null;
  onSelectGlobal: (id: DesignLabEditTargetId) => void;
}) {
  const progress = row.progress ?? 0;
  const onSelectTarget = onSelectGlobal;

  return (
    <DesignLabSurfaceTarget surfaceId={surfaceId} className={t.row}>{variant === "action" ? (
        <>
          <SeverityDot
            severity={row.severity}
            selectedTargetId={selectedTargetId}
            onSelectTarget={onSelectTarget}
          />
          <div className="min-w-0 flex-1">
            <DesignLabEditableTarget
              targetId="body-text"
              selectedTargetId={selectedTargetId}
              onSelectTarget={onSelectTarget}
              as="p"
              className="truncate text-sm font-semibold"
              style={{ color: "var(--dl-body-text)" }}
            >
              {row.title}
            </DesignLabEditableTarget>
            <DesignLabEditableTarget
              targetId="muted-text"
              selectedTargetId={selectedTargetId}
              onSelectTarget={onSelectTarget}
              as="p"
              className="mt-0.5 truncate text-[10px]"
              style={{ color: "var(--dl-muted-text)" }}
            >
              {row.meta}
            </DesignLabEditableTarget>
          </div>
          {row.featured ? (
            <DesignLabEditableTarget
              targetId="warning-badge"
              selectedTargetId={selectedTargetId}
              onSelectTarget={onSelectTarget}
              as="span"
              className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
              style={{
                backgroundColor: "var(--dl-warning-bg)",
                color: "var(--dl-body-text)",
              }}
            >
              Top priority
            </DesignLabEditableTarget>
          ) : null}
        </>
      ) : (
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <DesignLabEditableTarget
              targetId="body-text"
              selectedTargetId={selectedTargetId}
              onSelectTarget={onSelectTarget}
              as="span"
              className="text-sm font-semibold"
              style={{ color: "var(--dl-body-text)" }}
            >
              {row.title}
            </DesignLabEditableTarget>
            {row.amount ? (
              <DesignLabEditableTarget
                targetId="body-text"
                selectedTargetId={selectedTargetId}
                onSelectTarget={onSelectTarget}
                as="span"
                className="text-sm font-bold tabular-nums"
                style={{ color: "var(--dl-body-text)" }}
              >
                {row.amount}
              </DesignLabEditableTarget>
            ) : null}
          </div>
          {progress > 0 ? (
            <div className={`mt-1.5 h-1 overflow-hidden rounded-full ${t.moneyTrack}`}>
              <div
                className={`h-full rounded-full ${progressBarClass(row.severity)}`}
                style={{ width: `${progress}%` }}
                aria-hidden="true"
              />
            </div>
          ) : null}
          <DesignLabEditableTarget
            targetId="muted-text"
            selectedTargetId={selectedTargetId}
            onSelectTarget={onSelectTarget}
            as="p"
            className="mt-0.5 text-[10px]"
            style={{ color: "var(--dl-muted-text)" }}
          >
            {row.meta}
          </DesignLabEditableTarget>
        </div>
      )}
    </DesignLabSurfaceTarget>
  );
}

function SystemHealthDock({
  score,
  label,
  statusText,
  notificationText,
  selectedTargetId,
  onSelectGlobal,
}: {
  score: number;
  label: string;
  statusText: string;
  notificationText: string;
  selectedTargetId: DesignLabEditTargetId | null;
  onSelectGlobal: (id: DesignLabEditTargetId) => void;
}) {
  const circumference = 2 * Math.PI * 20;
  const dashOffset = circumference - (score / 100) * circumference;
  const onSelectTarget = onSelectGlobal;

  return (
    <DesignLabSurfaceTarget
      surfaceId="system-health-dock"
      className={`${t.footerSection} ${t.footerPanel} ${t.footerDock} flex items-center gap-4 border-t px-4 py-4 lg:border-l lg:border-t-0 lg:px-5 ${t.columnDivider}`}
    >
      <div className="relative h-11 w-11 shrink-0">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 48 48" aria-hidden="true">
          <circle cx="24" cy="24" r="20" fill="none" stroke={t.healthScoreTrack} strokeWidth="3" />
          <circle
            cx="24"
            cy="24"
            r="20"
            fill="none"
            stroke={`url(#${t.healthScoreGradientId}-dl)`}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
          <defs>
            <linearGradient id={`${t.healthScoreGradientId}-dl`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={t.healthScoreGradientStart} />
              <stop offset="100%" stopColor={t.healthScoreGradientEnd} />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={t.healthScoreValue}>{score}</span>
        </div>
      </div>
      <div className="min-w-0">
        <DesignLabEditableTarget
          targetId="muted-text"
          selectedTargetId={selectedTargetId}
          onSelectTarget={onSelectTarget}
          as="p"
          className="text-[10px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: "var(--dl-muted-text)" }}
        >
          System health
        </DesignLabEditableTarget>
        <DesignLabEditableTarget
          targetId="body-text"
          selectedTargetId={selectedTargetId}
          onSelectTarget={onSelectTarget}
          as="p"
          className="mt-1 text-xs font-semibold"
          style={{ color: "var(--dl-body-text)" }}
        >
          {label}
        </DesignLabEditableTarget>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className={t.systemStatusText}>
            <ShieldCheck className="h-3 w-3" aria-hidden="true" />
            {statusText}
          </span>
          <span className={t.systemNotificationText}>
            <Bell className="h-3 w-3" aria-hidden="true" />
            {notificationText}
          </span>
        </div>
      </div>
    </DesignLabSurfaceTarget>
  );
}

export function DesignLabDashboardReplica({
  selectedTargetId,
  onSelectTarget,
}: DesignLabDashboardReplicaProps) {
  const data = DESIGN_LAB_DASHBOARD_FIXTURE;
  const dateLabel = formatDateLabel(new Date());
  const hero = useMemo(() => buildNorthStarHeroContent(data), [data]);
  const board = useMemo(() => buildNorthStarBoardContent(data), [data]);
  const bands = useMemo(() => buildNorthStarSupportingBandsContent(data), [data]);

  return (
    <MasterShellPage density="compact">
      <MasterPageCanvas width="wide">
        <MasterContentStack density="compact" className="hidden lg:flex">
          <section aria-label="Business command">
          <DesignLabSurfaceTarget surfaceId="operating-center" className={t.heroShell}>
            <div aria-hidden="true" className={t.heroAccentRail} />

            <div className={t.heroHeader}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <DesignLabEditableTarget
                      targetId="muted-text"
                      selectedTargetId={selectedTargetId}
                      onSelectTarget={onSelectTarget}
                      as="span"
                      className={t.eyebrowAccent}
                      style={{ color: "var(--dl-primary-bg)" }}
                    >
                      Operating center
                    </DesignLabEditableTarget>
                    <span className={`text-[11px] ${t.darkSurfaceMuted}`}>·</span>
                    <DesignLabEditableTarget
                      targetId="muted-text"
                      selectedTargetId={selectedTargetId}
                      onSelectTarget={onSelectTarget}
                      as="span"
                      className={t.eyebrowLight}
                      style={{ color: "var(--dl-muted-text)" }}
                    >
                      {dateLabel}
                    </DesignLabEditableTarget>
                    <DesignLabEditableTarget
                      targetId="success-badge"
                      selectedTargetId={selectedTargetId}
                      onSelectTarget={onSelectTarget}
                      as="span"
                      className={t.liveBadge}
                      style={{
                        backgroundColor: "var(--dl-success-bg)",
                        color: "var(--dl-body-text)",
                        borderColor: "var(--dl-card-border)",
                      }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                        aria-hidden="true"
                      />
                      Field ops live
                    </DesignLabEditableTarget>
                  </div>
                  <DesignLabEditableTarget
                    targetId="header-text"
                    selectedTargetId={selectedTargetId}
                    onSelectTarget={onSelectTarget}
                    as="h3"
                    className={`mt-2 ${t.heroTitle}`}
                    style={{ color: "var(--dl-heading-text)" }}
                  >
                    {hero.title}
                  </DesignLabEditableTarget>
                  <DesignLabEditableTarget
                    targetId="body-text"
                    selectedTargetId={selectedTargetId}
                    onSelectTarget={onSelectTarget}
                    as="p"
                    className={`mt-1.5 max-w-2xl ${t.bodySecondary}`}
                    style={{ color: "var(--dl-heading-text)" }}
                  >
                    {hero.operatingMessage}
                  </DesignLabEditableTarget>
                </div>

                <DesignLabSurfaceTarget surfaceId="ops-score-card" className={t.opsScoreInline}>
                  <DesignLabEditableTarget
                    targetId="muted-text"
                    selectedTargetId={selectedTargetId}
                    onSelectTarget={onSelectTarget}
                    as="span"
                    className={t.opsScoreLabel}
                    style={{ color: "var(--dl-muted-text)" }}
                  >
                    Ops score
                  </DesignLabEditableTarget>
                  <DesignLabEditableTarget
                    targetId="header-text"
                    selectedTargetId={selectedTargetId}
                    onSelectTarget={onSelectTarget}
                    as="span"
                    className={t.opsScoreValue}
                    style={{ color: "var(--dl-heading-text)" }}
                  >
                    {hero.opsScore}
                  </DesignLabEditableTarget>
                  <div className={t.opsScoreDivider} aria-hidden="true" />
                  <div className={t.opsScoreTrack}>
                    <DesignLabEditableTarget
                      targetId="primary-action"
                      selectedTargetId={selectedTargetId}
                      onSelectTarget={onSelectTarget}
                      className={t.opsScoreFill}
                      style={{
                        width: `${hero.opsScore}%`,
                        backgroundColor: "var(--dl-primary-bg)",
                      }}
                    >
                      <span className="sr-only">Ops score progress</span>
                    </DesignLabEditableTarget>
                  </div>
                </DesignLabSurfaceTarget>
              </div>
            </div>

            <div className={t.heroBody}>
              {hero.primary ? (
                <DesignLabSurfaceTarget surfaceId="priority-card" className={t.primaryAction}>
                  <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <DesignLabEditableTarget
                          targetId="warning-badge"
                          selectedTargetId={selectedTargetId}
                          onSelectTarget={onSelectTarget}
                          as="span"
                          className={t.accentBadge}
                          style={{
                            backgroundColor: "var(--dl-warning-bg)",
                            color: "var(--dl-body-text)",
                          }}
                        >
                          Do this first
                        </DesignLabEditableTarget>
                        <span className={`text-[11px] font-medium ${t.darkSurfaceMuted}`}>
                          {formatNorthStarImpactCategoryLabel(hero.primary.impactCategory)}
                        </span>
                      </div>
                      <p className="mt-2 text-lg font-semibold leading-snug sm:text-xl">
                        {hero.primary.title}
                      </p>
                      {formatNorthStarRecommendationMetric(hero.primary) ? (
                        <p className={t.primaryActionMetric}>
                          {formatNorthStarRecommendationMetric(hero.primary)}
                        </p>
                      ) : null}
                      <p className={`mt-2 ${t.darkSurfaceText}`}>
                        {hero.primary.description}
                      </p>
                      <p className={`mt-1 line-clamp-2 ${t.metaDark}`}>
                        {hero.primary.reason}
                      </p>
                    </div>
                    <DesignLabEditableTarget
                      targetId="primary-action"
                      selectedTargetId={selectedTargetId}
                      onSelectTarget={onSelectTarget}
                      as="span"
                      className={t.accentCta}
                      style={{
                        backgroundColor: "var(--dl-primary-bg)",
                        color: "var(--dl-primary-text)",
                      }}
                    >
                      Start now
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </DesignLabEditableTarget>
                  </div>
                </DesignLabSurfaceTarget>
              ) : null}

              <DesignLabSurfaceTarget
                surfaceId="then-handle-row"
                className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start lg:gap-6"
              >
                <div className="flex flex-col gap-3">
                  <div>
                    <DesignLabEditableTarget
                      targetId="muted-text"
                      selectedTargetId={selectedTargetId}
                      onSelectTarget={onSelectTarget}
                      as="p"
                      className={t.eyebrowLight}
                      style={{ color: "var(--dl-muted-text)" }}
                    >
                      Then handle
                    </DesignLabEditableTarget>
                    {hero.secondary.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {hero.secondary.map((recommendation) => (
                          <DesignLabEditableTarget
                            key={recommendation.id}
                            targetId="secondary-action"
                            selectedTargetId={selectedTargetId}
                            onSelectTarget={onSelectTarget}
                            className={t.secondaryAction}
                            style={{
                              backgroundColor: "var(--dl-secondary-bg)",
                              color: "var(--dl-secondary-text)",
                              borderColor: "var(--dl-card-border)",
                            }}
                          >
                            <span className={t.secondaryActionIndex}>
                              {recommendation.priority}
                            </span>
                            <span className={t.darkSurfaceText}>{recommendation.title}</span>
                            <ChevronRight
                              className={`h-3.5 w-3.5 ${t.darkSurfaceMuted}`}
                              aria-hidden="true"
                            />
                          </DesignLabEditableTarget>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {hero.insight ? (
                    <DesignLabSurfaceTarget surfaceId="insight-card" className={t.insightSurface}>
                      <DesignLabEditableTarget
                        targetId="body-text"
                        selectedTargetId={selectedTargetId}
                        onSelectTarget={onSelectTarget}
                        as="p"
                        className="text-sm font-medium leading-snug"
                        style={{ color: "var(--dl-body-text)" }}
                      >
                        {hero.insight.title}
                      </DesignLabEditableTarget>
                      <DesignLabEditableTarget
                        targetId="muted-text"
                        selectedTargetId={selectedTargetId}
                        onSelectTarget={onSelectTarget}
                        as="p"
                        className={`mt-1 ${t.meta}`}
                        style={{ color: "var(--dl-muted-text)" }}
                      >
                        {hero.insight.detail}
                      </DesignLabEditableTarget>
                    </DesignLabSurfaceTarget>
                  ) : null}
                </div>

                {hero.signalChips.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-[20rem] lg:grid-cols-2">
                    {hero.signalChips.map((signal, index) => (
                      <DesignLabSurfaceTarget
                        key={signal.label}
                        surfaceId={metricChipSurfaceId(signal.label, index)}
                        className={t.signalChip}
                      >
                        <span
                          className="text-base font-semibold tabular-nums leading-none"
                          style={{ color: "var(--dl-surface-text)" }}
                        >
                          {signal.value}
                        </span>
                        <span
                          className={t.signalLabel}
                          style={{ color: "var(--dl-surface-text)" }}
                        >
                          {signal.label}
                        </span>
                      </DesignLabSurfaceTarget>
                    ))}
                  </div>
                ) : null}
              </DesignLabSurfaceTarget>
            </div>

            <div aria-hidden="true" className={t.heroFooter}>
              <div className={t.accentLine} />
            </div>
          </DesignLabSurfaceTarget>
          </section>

          <section aria-label="Operating board">
          <DesignLabSurfaceTarget surfaceId="operating-board" className={t.operatingBoard}>
            <div aria-hidden="true" className={t.boardTopAccent} />

            <div className={t.boardHeader}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <DesignLabEditableTarget
                    targetId="muted-text"
                    selectedTargetId={selectedTargetId}
                    onSelectTarget={onSelectTarget}
                    as="p"
                    className={t.eyebrowAccent}
                    style={{ color: "var(--dl-primary-bg)" }}
                  >
                    Operating board
                  </DesignLabEditableTarget>
                  <DesignLabEditableTarget
                    targetId="header-text"
                    selectedTargetId={selectedTargetId}
                    onSelectTarget={onSelectTarget}
                    as="h3"
                    className={`mt-1 ${t.boardTitle}`}
                    style={{ color: "var(--dl-heading-text)" }}
                  >
                    Action · Work · Money
                  </DesignLabEditableTarget>
                  <DesignLabEditableTarget
                    targetId="muted-text"
                    selectedTargetId={selectedTargetId}
                    onSelectTarget={onSelectTarget}
                    as="p"
                    className={`mt-1 max-w-2xl ${t.darkSurfaceMuted}`}
                    style={{ color: "var(--dl-muted-text)" }}
                  >
                    Live operating loop from today&apos;s dispatch, office queues, and
                    billing rollups.
                  </DesignLabEditableTarget>
                </div>
                {board.connections.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {board.connections.map((link) => (
                      <DesignLabSurfaceTarget
                        key={link.id}
                        surfaceId="connection-chip"
                        className={t.connectionChip}
                        style={{ color: "var(--dl-surface-text)" }}
                      >
                        <span>{link.from}</span>
                        <ArrowRight className={t.connectionArrow} aria-hidden="true" />
                        <span>{link.to}</span>
                      </DesignLabSurfaceTarget>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid lg:grid-cols-3">
              <DesignLabSurfaceTarget
                surfaceId="action-column"
                className={`relative flex flex-col gap-4 p-4 sm:p-5 lg:p-6 lg:pr-7 ${t.columnWell}`}
              >
                <div aria-hidden="true" className={t.columnRail} />
                <DesignLabSurfaceTarget surfaceId="blocker-card" className={t.columnHeader}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600" aria-hidden="true" />
                        <DesignLabEditableTarget
                          targetId="muted-text"
                          selectedTargetId={selectedTargetId}
                          onSelectTarget={onSelectTarget}
                          as="p"
                          className={t.lightCardLabel}
                          style={{ color: "var(--dl-muted-text)" }}
                        >
                          Action
                        </DesignLabEditableTarget>
                      </div>
                      <DesignLabEditableTarget
                        targetId="body-text"
                        selectedTargetId={selectedTargetId}
                        onSelectTarget={onSelectTarget}
                        as="h3"
                        className={`mt-1 ${t.workspaceSubheading}`}
                        style={{ color: "var(--dl-body-text)" }}
                      >
                        Blockers and follow-ups
                      </DesignLabEditableTarget>
                      <DesignLabEditableTarget
                        targetId="muted-text"
                        selectedTargetId={selectedTargetId}
                        onSelectTarget={onSelectTarget}
                        as="p"
                        className={t.lightSurfaceMuted}
                        style={{ color: "var(--dl-muted-text)" }}
                      >
                        Office queues that need attention before work or billing moves
                      </DesignLabEditableTarget>
                    </div>
                    <span className={`shrink-0 ${t.link}`}>View all</span>
                  </div>
                </DesignLabSurfaceTarget>
                <ul className="flex flex-col gap-2">
                  {board.action.rows.map((row) => (
                    <li key={row.id}>
                      <BoardRow
                        row={row}
                        variant="action"
                        surfaceId={queueRowSurfaceId(row.id)}
                        selectedTargetId={selectedTargetId}
                        onSelectGlobal={onSelectTarget}
                      />
                    </li>
                  ))}
                </ul>
                {board.action.officeFollowUps.length > 0 ? (
                  <div className={`mt-auto border-t ${t.columnDivider} pt-3`}>
                    <DesignLabEditableTarget
                      targetId="muted-text"
                      selectedTargetId={selectedTargetId}
                      onSelectTarget={onSelectTarget}
                      as="p"
                      className={t.eyebrowLight}
                      style={{ color: "var(--dl-muted-text)" }}
                    >
                      Office follow-ups
                    </DesignLabEditableTarget>
                    <ul className="mt-2 flex flex-col gap-1">
                      {board.action.officeFollowUps.map((item) => (
                        <li key={item.id}>
                          <div className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs ${t.officeHover}`}>
                            <DesignLabEditableTarget
                              targetId="body-text"
                              selectedTargetId={selectedTargetId}
                              onSelectTarget={onSelectTarget}
                              as="span"
                              className="min-w-0 flex-1 truncate font-medium"
                              style={{ color: "var(--dl-heading-text)" }}
                            >
                              {item.title}
                            </DesignLabEditableTarget>
                            <DesignLabEditableTarget
                              targetId="muted-text"
                              selectedTargetId={selectedTargetId}
                              onSelectTarget={onSelectTarget}
                              as="span"
                              className="shrink-0"
                              style={{ color: "var(--dl-muted-text)" }}
                            >
                              {item.meta}
                            </DesignLabEditableTarget>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </DesignLabSurfaceTarget>

              <DesignLabSurfaceTarget
                surfaceId="work-column"
                className={`relative flex flex-col gap-4 border-t ${t.columnDivider} p-4 sm:p-5 lg:border-t-0 lg:p-6 lg:px-7 ${t.columnWell}`}
              >
                <div aria-hidden="true" className={t.columnRail} />
                <DesignLabSurfaceTarget surfaceId="field-work-card" className={t.columnHeader}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-slate-600" aria-hidden="true" />
                        <DesignLabEditableTarget
                          targetId="muted-text"
                          selectedTargetId={selectedTargetId}
                          onSelectTarget={onSelectTarget}
                          as="p"
                          className={t.lightCardLabel}
                          style={{ color: "var(--dl-muted-text)" }}
                        >
                          Work
                        </DesignLabEditableTarget>
                      </div>
                      <DesignLabEditableTarget
                        targetId="body-text"
                        selectedTargetId={selectedTargetId}
                        onSelectTarget={onSelectTarget}
                        as="h3"
                        className={`mt-1 ${t.workspaceSubheading}`}
                        style={{ color: "var(--dl-body-text)" }}
                      >
                        Today&apos;s field work
                      </DesignLabEditableTarget>
                      <DesignLabEditableTarget
                        targetId="muted-text"
                        selectedTargetId={selectedTargetId}
                        onSelectTarget={onSelectTarget}
                        as="p"
                        className={t.lightSurfaceMuted}
                        style={{ color: "var(--dl-muted-text)" }}
                      >
                        {board.work.summary}
                      </DesignLabEditableTarget>
                    </div>
                    <span className={`shrink-0 ${t.link}`}>Dispatch</span>
                  </div>
                </DesignLabSurfaceTarget>

                {board.work.dispatchPressure &&
                board.work.dispatchPressure.severity !== "healthy" ? (
                  <DesignLabSurfaceTarget surfaceId="dispatch-pressure-card" className={t.row}>
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${dispatchPressureTone(board.work.dispatchPressure.severity)}`}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <DesignLabEditableTarget
                        targetId="body-text"
                        selectedTargetId={selectedTargetId}
                        onSelectTarget={onSelectTarget}
                        as="p"
                        className="truncate text-sm font-semibold"
                        style={{ color: "var(--dl-body-text)" }}
                      >
                        {board.work.dispatchPressure.label}
                      </DesignLabEditableTarget>
                      <DesignLabEditableTarget
                        targetId="muted-text"
                        selectedTargetId={selectedTargetId}
                        onSelectTarget={onSelectTarget}
                        as="p"
                        className="mt-0.5 truncate text-[10px]"
                        style={{ color: "var(--dl-muted-text)" }}
                      >
                        {board.work.dispatchPressure.meta}
                      </DesignLabEditableTarget>
                    </div>
                  </DesignLabSurfaceTarget>
                ) : null}

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {board.work.statusMetrics.map((metric) => (
                    <DesignLabSurfaceTarget
                      key={metric.label}
                      surfaceId={workMetricSurfaceId(metric.label)}
                      className="rounded-lg border border-slate-200/85 px-2.5 py-2 text-center shadow-[0_2px_6px_rgba(0,0,0,0.10)]"
                    >
                      <DesignLabEditableTarget
                        targetId="header-text"
                        selectedTargetId={selectedTargetId}
                        onSelectTarget={onSelectTarget}
                        as="p"
                        className={`text-base font-bold tabular-nums ${t.workspaceSubheading}`}
                        style={{ color: "var(--dl-heading-text)" }}
                      >
                        {metric.value}
                      </DesignLabEditableTarget>
                      <DesignLabEditableTarget
                        targetId="muted-text"
                        selectedTargetId={selectedTargetId}
                        onSelectTarget={onSelectTarget}
                        as="p"
                        className={t.lightCardMeta}
                        style={{ color: "var(--dl-muted-text)" }}
                      >
                        {metric.label}
                      </DesignLabEditableTarget>
                    </DesignLabSurfaceTarget>
                  ))}
                </div>

                {board.work.unassignedRow ? (
                  <BoardRow
                    row={board.work.unassignedRow}
                    variant="action"
                    surfaceId={queueRowSurfaceId(board.work.unassignedRow.id)}
                    selectedTargetId={selectedTargetId}
                    onSelectGlobal={onSelectTarget}
                  />
                ) : null}

                <ul className="flex flex-col gap-2">
                  {board.work.jobRows.map((job) => (
                    <li key={job.id}>
                      <DesignLabSurfaceTarget surfaceId={queueRowSurfaceId(job.id)} className={`flex items-center gap-3 ${t.row}`}>
                        <DesignLabEditableTarget
                          targetId="muted-text"
                          selectedTargetId={selectedTargetId}
                          onSelectTarget={onSelectTarget}
                          as="span"
                          className={`w-10 shrink-0 tabular-nums font-semibold ${t.lightSurfaceSecondary}`}
                          style={{ color: "var(--dl-muted-text)" }}
                        >
                          {job.time}
                        </DesignLabEditableTarget>
                        <span className="h-2 w-2 shrink-0 rounded-full bg-slate-400" aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                          <DesignLabEditableTarget
                            targetId="body-text"
                            selectedTargetId={selectedTargetId}
                            onSelectTarget={onSelectTarget}
                            as="p"
                            className="truncate text-sm font-semibold"
                            style={{ color: "var(--dl-body-text)" }}
                          >
                            {job.customer}
                          </DesignLabEditableTarget>
                          <DesignLabEditableTarget
                            targetId="muted-text"
                            selectedTargetId={selectedTargetId}
                            onSelectTarget={onSelectTarget}
                            as="p"
                            className="truncate text-[10px]"
                            style={{ color: "var(--dl-muted-text)" }}
                          >
                            {job.detail}
                          </DesignLabEditableTarget>
                        </div>
                        <DesignLabEditableTarget
                          targetId="success-badge"
                          selectedTargetId={selectedTargetId}
                          onSelectTarget={onSelectTarget}
                          as="span"
                          className="shrink-0 text-[10px] font-semibold uppercase tracking-wide"
                          style={{
                            backgroundColor: "var(--dl-success-bg)",
                            color: "var(--dl-body-text)",
                          }}
                        >
                          {job.status}
                        </DesignLabEditableTarget>
                      </DesignLabSurfaceTarget>
                    </li>
                  ))}
                </ul>

                {board.work.technicians.length > 0 ? (
                  <div className={`mt-auto border-t ${t.columnDivider} pt-3`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Users className={`h-3.5 w-3.5 ${t.darkSurfaceMuted}`} aria-hidden="true" />
                        <DesignLabEditableTarget
                          targetId="muted-text"
                          selectedTargetId={selectedTargetId}
                          onSelectTarget={onSelectTarget}
                          as="p"
                          className={t.eyebrowLight}
                          style={{ color: "var(--dl-muted-text)" }}
                        >
                          Crew load
                        </DesignLabEditableTarget>
                      </div>
                      <span className={t.link}>Time</span>
                    </div>
                    <ul className="mt-2 grid grid-cols-2 gap-2">
                      {board.work.technicians.map((tech) => (
                        <li
                          key={tech.id}
                          className={`flex items-center gap-2 ${t.surfaceInset} bg-gradient-to-r from-slate-50 to-white ring-1 ring-slate-200`}
                        >
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[9px] font-semibold ${t.workspaceSubheading} ${t.techAvatarBg}`}
                          >
                            {tech.initials}
                          </span>
                          <div className="min-w-0">
                            <DesignLabEditableTarget
                              targetId="body-text"
                              selectedTargetId={selectedTargetId}
                              onSelectTarget={onSelectTarget}
                              as="p"
                              className="truncate text-[11px] font-semibold"
                              style={{ color: "var(--dl-body-text)" }}
                            >
                              {tech.name}
                            </DesignLabEditableTarget>
                            <DesignLabEditableTarget
                              targetId="muted-text"
                              selectedTargetId={selectedTargetId}
                              onSelectTarget={onSelectTarget}
                              as="p"
                              className="truncate text-[10px]"
                              style={{ color: "var(--dl-muted-text)" }}
                            >
                              {tech.jobLabel}
                            </DesignLabEditableTarget>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </DesignLabSurfaceTarget>

              <DesignLabSurfaceTarget
                surfaceId="money-column"
                className={`relative flex flex-col gap-4 border-t ${t.columnDivider} p-4 sm:p-5 lg:border-t-0 lg:p-6 lg:pl-7 ${t.columnWell}`}
              >
                <DesignLabSurfaceTarget surfaceId="billing-pressure-card" className={t.columnHeader}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-amber-700" aria-hidden="true" />
                        <DesignLabEditableTarget
                          targetId="muted-text"
                          selectedTargetId={selectedTargetId}
                          onSelectTarget={onSelectTarget}
                          as="p"
                          className={t.lightCardLabel}
                          style={{ color: "var(--dl-muted-text)" }}
                        >
                          Money
                        </DesignLabEditableTarget>
                      </div>
                      <DesignLabEditableTarget
                        targetId="body-text"
                        selectedTargetId={selectedTargetId}
                        onSelectTarget={onSelectTarget}
                        as="h3"
                        className={`mt-1 ${t.workspaceSubheading}`}
                        style={{ color: "var(--dl-body-text)" }}
                      >
                        Billing pressure
                      </DesignLabEditableTarget>
                      <DesignLabEditableTarget
                        targetId="muted-text"
                        selectedTargetId={selectedTargetId}
                        onSelectTarget={onSelectTarget}
                        as="p"
                        className={t.lightSurfaceMuted}
                        style={{ color: "var(--dl-muted-text)" }}
                      >
                        Receivables, collections, and review queues
                      </DesignLabEditableTarget>
                    </div>
                    <span className={`shrink-0 ${t.link}`}>Billing</span>
                  </div>
                </DesignLabSurfaceTarget>

                <div className="flex flex-col gap-2">
                  {board.money.rows.map((row) => (
                    <BoardRow
                      key={row.id}
                      row={row}
                      variant="money"
                      surfaceId={moneyRowSurfaceId(row.id)}
                      selectedTargetId={selectedTargetId}
                      onSelectGlobal={onSelectTarget}
                    />
                  ))}
                </div>

                {board.money.expenseInset || board.money.leadOpportunityInset ? (
                  <div
                    className={`mt-auto grid gap-2 border-t ${t.columnDivider} pt-3 ${
                      board.money.expenseInset && board.money.leadOpportunityInset
                        ? "grid-cols-2"
                        : "grid-cols-1"
                    }`}
                  >
                    {board.money.expenseInset ? (
                      <DesignLabSurfaceTarget surfaceId="expense-inset-card" className={t.surfaceInset}>
                        <div className="flex items-center gap-1.5">
                          <Receipt className={`h-3.5 w-3.5 ${t.intelligenceAccent}`} aria-hidden="true" />
                          <DesignLabEditableTarget
                            targetId="muted-text"
                            selectedTargetId={selectedTargetId}
                            onSelectTarget={onSelectTarget}
                            as="span"
                            className={t.lightCardLabel}
                            style={{ color: "var(--dl-muted-text)" }}
                          >
                            {board.money.expenseInset.label}
                          </DesignLabEditableTarget>
                        </div>
                        <DesignLabEditableTarget
                          targetId="body-text"
                          selectedTargetId={selectedTargetId}
                          onSelectTarget={onSelectTarget}
                          as="p"
                          className={`mt-1 text-base font-bold tabular-nums ${t.workspaceSubheading}`}
                          style={{ color: "var(--dl-body-text)" }}
                        >
                          {board.money.expenseInset.amount}
                        </DesignLabEditableTarget>
                        <DesignLabEditableTarget
                          targetId="muted-text"
                          selectedTargetId={selectedTargetId}
                          onSelectTarget={onSelectTarget}
                          as="p"
                          className={t.lightCardMeta}
                          style={{ color: "var(--dl-muted-text)" }}
                        >
                          {board.money.expenseInset.meta}
                        </DesignLabEditableTarget>
                      </DesignLabSurfaceTarget>
                    ) : null}
                    {board.money.leadOpportunityInset ? (
                      <DesignLabSurfaceTarget surfaceId="lead-opportunity-inset-card" className={`border-l-2 ${t.moneyLeadBorder} ${t.surfaceInset}`}>
                        <div className="flex items-center gap-1.5">
                          <Target className={`h-3.5 w-3.5 ${t.intelligenceAccent}`} aria-hidden="true" />
                          <DesignLabEditableTarget
                            targetId="muted-text"
                            selectedTargetId={selectedTargetId}
                            onSelectTarget={onSelectTarget}
                            as="span"
                            className={t.lightCardLabel}
                            style={{ color: "var(--dl-muted-text)" }}
                          >
                            {board.money.leadOpportunityInset.label}
                          </DesignLabEditableTarget>
                        </div>
                        <DesignLabEditableTarget
                          targetId="body-text"
                          selectedTargetId={selectedTargetId}
                          onSelectTarget={onSelectTarget}
                          as="p"
                          className={`mt-1 text-base font-bold tabular-nums ${t.workspaceSubheading}`}
                          style={{ color: "var(--dl-body-text)" }}
                        >
                          {board.money.leadOpportunityInset.amount}
                        </DesignLabEditableTarget>
                        <DesignLabEditableTarget
                          targetId="muted-text"
                          selectedTargetId={selectedTargetId}
                          onSelectTarget={onSelectTarget}
                          as="p"
                          className={t.lightCardMeta}
                          style={{ color: "var(--dl-muted-text)" }}
                        >
                          {board.money.leadOpportunityInset.meta}
                        </DesignLabEditableTarget>
                      </DesignLabSurfaceTarget>
                    ) : null}
                  </div>
                ) : null}
              </DesignLabSurfaceTarget>
            </div>
          </DesignLabSurfaceTarget>
          </section>

          <footer aria-label="Supporting metrics and status">
          <DesignLabSurfaceTarget surfaceId="business-pulse" className={t.footer}>
            <div aria-hidden="true" className={t.footerTopAccent} />

            <div className={`${t.footerSection} px-2 pb-2 pt-4 sm:px-3 sm:pb-3`}>
              <DesignLabEditableTarget
                targetId="muted-text"
                selectedTargetId={selectedTargetId}
                onSelectTarget={onSelectTarget}
                as="p"
                className={`px-2 sm:px-3 ${t.eyebrowLight}`}
                style={{ color: "var(--dl-muted-text)" }}
              >
                Business pulse
              </DesignLabEditableTarget>
              <div className="mt-2 grid sm:grid-cols-4">
                {bands.pulseMetrics.map((metric) => (
                  <DesignLabSurfaceTarget
                    key={metric.id}
                    surfaceId={pulseMetricSurfaceId(metric.id)}
                    className={t.footerMetric}
                  >
                    <DesignLabEditableTarget
                      targetId="muted-text"
                      selectedTargetId={selectedTargetId}
                      onSelectTarget={onSelectTarget}
                      as="p"
                      className={t.metricLabel}
                      style={{ color: "var(--dl-muted-text)" }}
                    >
                      {metric.label}
                    </DesignLabEditableTarget>
                    <DesignLabEditableTarget
                      targetId="body-text"
                      selectedTargetId={selectedTargetId}
                      onSelectTarget={onSelectTarget}
                      as="p"
                      className={`mt-0.5 text-lg font-bold tabular-nums ${t.workspaceSubheading}`}
                      style={{ color: "var(--dl-body-text)" }}
                    >
                      {metric.value}
                    </DesignLabEditableTarget>
                    <DesignLabEditableTarget
                      targetId="muted-text"
                      selectedTargetId={selectedTargetId}
                      onSelectTarget={onSelectTarget}
                      as="p"
                      className={t.metricDelta}
                      style={{ color: "var(--dl-muted-text)" }}
                    >
                      {metric.delta}
                    </DesignLabEditableTarget>
                  </DesignLabSurfaceTarget>
                ))}
              </div>
            </div>

            <div className="grid lg:grid-cols-[1fr_auto]">
              <div className={`${t.footerSection} grid gap-3 p-3 sm:p-4 lg:grid-cols-[1.2fr_0.8fr]`}>
                <DesignLabSurfaceTarget surfaceId="field-activity-card" className={`${t.footerPanel} px-4 py-4 lg:px-5`}>
                  <DesignLabEditableTarget
                    targetId="muted-text"
                    selectedTargetId={selectedTargetId}
                    onSelectTarget={onSelectTarget}
                    as="p"
                    className={t.lightCardLabel}
                    style={{ color: "var(--dl-muted-text)" }}
                  >
                    Field activity
                  </DesignLabEditableTarget>
                  <ul className="mt-3 space-y-2">
                    {bands.activities.map((item) => (
                      <li key={item.id} className="flex items-baseline gap-2.5">
                        <span className={t.momentumDot} aria-hidden="true" />
                        <DesignLabEditableTarget
                          targetId="body-text"
                          selectedTargetId={selectedTargetId}
                          onSelectTarget={onSelectTarget}
                          as="span"
                          className={t.activityTitle}
                          style={{ color: "var(--dl-body-text)" }}
                        >
                          {item.title}
                        </DesignLabEditableTarget>
                        <DesignLabEditableTarget
                          targetId="muted-text"
                          selectedTargetId={selectedTargetId}
                          onSelectTarget={onSelectTarget}
                          as="span"
                          className={t.activityTime}
                          style={{ color: "var(--dl-muted-text)" }}
                        >
                          {item.time}
                        </DesignLabEditableTarget>
                      </li>
                    ))}
                  </ul>
                </DesignLabSurfaceTarget>

                <DesignLabSurfaceTarget surfaceId="momentum-card" className={`${t.footerPanel} px-4 py-4 lg:px-5`}>
                  <DesignLabEditableTarget
                    targetId="muted-text"
                    selectedTargetId={selectedTargetId}
                    onSelectTarget={onSelectTarget}
                    as="p"
                    className={t.lightCardLabel}
                    style={{ color: "var(--dl-muted-text)" }}
                  >
                    Today&apos;s momentum
                  </DesignLabEditableTarget>
                  <ul className="mt-3 space-y-1.5">
                    {bands.momentumLines.map((line) => (
                      <li
                        key={line.id}
                        className={`flex items-start gap-2 ${t.lightSurfaceMuted}`}
                      >
                        <span className={t.momentumDot} aria-hidden="true" />
                        <DesignLabEditableTarget
                          targetId="body-text"
                          selectedTargetId={selectedTargetId}
                          onSelectTarget={onSelectTarget}
                          as="span"
                          className="text-sm leading-snug"
                          style={{ color: "var(--dl-body-text)" }}
                        >
                          {line.text}
                        </DesignLabEditableTarget>
                      </li>
                    ))}
                  </ul>
                </DesignLabSurfaceTarget>
              </div>

              <SystemHealthDock
                score={bands.systemDock.score}
                label={bands.systemDock.label}
                statusText={bands.systemDock.statusText}
                notificationText={bands.systemDock.notificationText}
                selectedTargetId={selectedTargetId}
                onSelectGlobal={onSelectTarget}
              />
            </div>
          </DesignLabSurfaceTarget>
          </footer>
        </MasterContentStack>

        <DesignLabEditableTarget
          targetId="muted-text"
          selectedTargetId={selectedTargetId}
          onSelectTarget={onSelectTarget}
          as="p"
          className="mt-4 text-center text-[11px] lg:hidden"
          style={{ color: "var(--dl-muted-text)" }}
        >
          Dashboard shell uses desktop layout. Widen the canvas for the full M2 board.
        </DesignLabEditableTarget>
      </MasterPageCanvas>
    </MasterShellPage>
  );
}
