"use client";

import { useMemo } from "react";
import { ArrowRight, AlertTriangle, Briefcase, DollarSign } from "lucide-react";
import { DesignLabEditableTarget } from "@/shared/components/platform-admin/design-lab/DesignLabEditableTarget";
import { DESIGN_LAB_DASHBOARD_FIXTURE } from "@/shared/components/platform-admin/design-lab/design-lab-dashboard-fixture";
import type { DesignLabEditTargetId } from "@/shared/components/platform-admin/design-lab/design-lab-edit-targets";
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
      className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
      style={{
        backgroundColor:
          targetId === "danger-badge"
            ? "var(--dl-danger-bg)"
            : targetId === "warning-badge"
              ? "var(--dl-warning-bg)"
              : "var(--dl-success-bg)",
      }}
      aria-hidden
    >
      <span className="sr-only">Severity</span>
    </DesignLabEditableTarget>
  );
}

function BoardRow({
  row,
  variant,
  selectedTargetId,
  onSelectTarget,
}: {
  row: NorthStarBoardRow;
  variant: "action" | "money";
  selectedTargetId: DesignLabEditTargetId | null;
  onSelectTarget: (id: DesignLabEditTargetId) => void;
}) {
  return (
    <DesignLabEditableTarget
      targetId="card-surface"
      selectedTargetId={selectedTargetId}
      onSelectTarget={onSelectTarget}
      className="flex items-start gap-2.5 rounded-lg border px-3 py-2.5"
      style={{
        backgroundColor: "var(--dl-card-bg)",
        borderColor: "var(--dl-card-border)",
      }}
    >
      {variant === "action" ? (
        <SeverityDot
          severity={row.severity}
          selectedTargetId={selectedTargetId}
          onSelectTarget={onSelectTarget}
        />
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <DesignLabEditableTarget
            targetId="body-text"
            selectedTargetId={selectedTargetId}
            onSelectTarget={onSelectTarget}
            as="p"
            className="truncate text-sm font-medium"
            style={{ color: "var(--dl-body-text)" }}
          >
            {row.title}
          </DesignLabEditableTarget>
          {variant === "money" && row.amount ? (
            <DesignLabEditableTarget
              targetId="body-text"
              selectedTargetId={selectedTargetId}
              onSelectTarget={onSelectTarget}
              as="span"
              className="shrink-0 text-sm font-bold tabular-nums"
              style={{ color: "var(--dl-body-text)" }}
            >
              {row.amount}
            </DesignLabEditableTarget>
          ) : null}
        </div>
        <DesignLabEditableTarget
          targetId="muted-text"
          selectedTargetId={selectedTargetId}
          onSelectTarget={onSelectTarget}
          as="p"
          className="mt-0.5 truncate text-[11px]"
          style={{ color: "var(--dl-muted-text)" }}
        >
          {row.meta}
        </DesignLabEditableTarget>
        {row.featured ? (
          <DesignLabEditableTarget
            targetId="warning-badge"
            selectedTargetId={selectedTargetId}
            onSelectTarget={onSelectTarget}
            as="span"
            className="mt-1 inline-block rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
            style={{
              backgroundColor: "var(--dl-warning-bg)",
              color: "var(--dl-body-text)",
            }}
          >
            Top priority
          </DesignLabEditableTarget>
        ) : null}
      </div>
    </DesignLabEditableTarget>
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
          <DesignLabEditableTarget
            targetId="card-surface"
            selectedTargetId={selectedTargetId}
            onSelectTarget={onSelectTarget}
            className="overflow-hidden rounded-[1rem] border"
            style={{
              backgroundColor: "var(--dl-card-bg)",
              borderColor: "var(--dl-card-border)",
            }}
          >
            <div
              className="border-b px-5 py-5 sm:px-6 sm:py-6"
              style={{ borderColor: "var(--dl-card-border)" }}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <DesignLabEditableTarget
                      targetId="muted-text"
                      selectedTargetId={selectedTargetId}
                      onSelectTarget={onSelectTarget}
                      as="span"
                      className="text-[10px] font-semibold uppercase tracking-[0.14em]"
                      style={{ color: "var(--dl-muted-text)" }}
                    >
                      Operating center
                    </DesignLabEditableTarget>
                    <span className="text-[11px]" style={{ color: "var(--dl-muted-text)" }}>
                      ·
                    </span>
                    <DesignLabEditableTarget
                      targetId="muted-text"
                      selectedTargetId={selectedTargetId}
                      onSelectTarget={onSelectTarget}
                      as="span"
                      className="text-[11px]"
                      style={{ color: "var(--dl-muted-text)" }}
                    >
                      {dateLabel}
                    </DesignLabEditableTarget>
                    <DesignLabEditableTarget
                      targetId="success-badge"
                      selectedTargetId={selectedTargetId}
                      onSelectTarget={onSelectTarget}
                      as="span"
                      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{
                        backgroundColor: "var(--dl-success-bg)",
                        color: "var(--dl-body-text)",
                      }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: "var(--dl-body-text)" }}
                        aria-hidden
                      />
                      Field ops live
                    </DesignLabEditableTarget>
                  </div>
                  <DesignLabEditableTarget
                    targetId="header-text"
                    selectedTargetId={selectedTargetId}
                    onSelectTarget={onSelectTarget}
                    as="h3"
                    className="mt-2 text-2xl font-bold sm:text-3xl"
                    style={{ color: "var(--dl-heading-text)" }}
                  >
                    {hero.title}
                  </DesignLabEditableTarget>
                  <DesignLabEditableTarget
                    targetId="body-text"
                    selectedTargetId={selectedTargetId}
                    onSelectTarget={onSelectTarget}
                    as="p"
                    className="mt-1.5 max-w-2xl text-sm"
                    style={{ color: "var(--dl-body-text)" }}
                  >
                    {hero.operatingMessage}
                  </DesignLabEditableTarget>
                </div>

                <DesignLabEditableTarget
                  targetId="card-surface"
                  selectedTargetId={selectedTargetId}
                  onSelectTarget={onSelectTarget}
                  className="flex shrink-0 items-center gap-3 rounded-xl border px-4 py-3"
                  style={{
                    backgroundColor: "var(--dl-page-bg)",
                    borderColor: "var(--dl-card-border)",
                  }}
                >
                  <DesignLabEditableTarget
                    targetId="muted-text"
                    selectedTargetId={selectedTargetId}
                    onSelectTarget={onSelectTarget}
                    as="span"
                    className="text-[10px] font-semibold uppercase tracking-wide"
                    style={{ color: "var(--dl-muted-text)" }}
                  >
                    Ops score
                  </DesignLabEditableTarget>
                  <DesignLabEditableTarget
                    targetId="header-text"
                    selectedTargetId={selectedTargetId}
                    onSelectTarget={onSelectTarget}
                    as="span"
                    className="text-2xl font-bold tabular-nums"
                    style={{ color: "var(--dl-heading-text)" }}
                  >
                    {hero.opsScore}
                  </DesignLabEditableTarget>
                  <div
                    className="h-8 w-px"
                    style={{ backgroundColor: "var(--dl-card-border)" }}
                    aria-hidden
                  />
                  <div className="w-24">
                    <div
                      className="h-1.5 overflow-hidden rounded-full"
                      style={{ backgroundColor: "var(--dl-card-border)" }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${hero.opsScore}%`,
                          backgroundColor: "var(--dl-primary-bg)",
                        }}
                      />
                    </div>
                  </div>
                </DesignLabEditableTarget>
              </div>
            </div>

            <div className="space-y-4 px-5 py-5 sm:px-6 sm:py-6">
              {hero.primary ? (
                <DesignLabEditableTarget
                  targetId="primary-action"
                  selectedTargetId={selectedTargetId}
                  onSelectTarget={onSelectTarget}
                  as="div"
                  className="rounded-xl px-4 py-4 sm:px-5 sm:py-5"
                  style={{
                    backgroundColor: "var(--dl-primary-bg)",
                    color: "var(--dl-primary-text)",
                  }}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <DesignLabEditableTarget
                          targetId="warning-badge"
                          selectedTargetId={selectedTargetId}
                          onSelectTarget={onSelectTarget}
                          as="span"
                          className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
                          style={{
                            backgroundColor: "var(--dl-warning-bg)",
                            color: "var(--dl-body-text)",
                          }}
                        >
                          Do this first
                        </DesignLabEditableTarget>
                        <span className="text-[11px] opacity-80">
                          {formatNorthStarImpactCategoryLabel(hero.primary.impactCategory)}
                        </span>
                      </div>
                      <p className="mt-2 text-lg font-semibold leading-snug sm:text-xl">
                        {hero.primary.title}
                      </p>
                      {formatNorthStarRecommendationMetric(hero.primary) ? (
                        <p className="mt-1 text-sm opacity-90">
                          {formatNorthStarRecommendationMetric(hero.primary)}
                        </p>
                      ) : null}
                      <p className="mt-2 text-sm opacity-90">{hero.primary.description}</p>
                      <p className="mt-1 line-clamp-2 text-xs opacity-75">
                        {hero.primary.reason}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold">
                      Start now
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </span>
                  </div>
                </DesignLabEditableTarget>
              ) : null}

              <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start lg:gap-6">
                <div className="flex flex-col gap-3">
                  <div>
                    <DesignLabEditableTarget
                      targetId="muted-text"
                      selectedTargetId={selectedTargetId}
                      onSelectTarget={onSelectTarget}
                      as="p"
                      className="text-[10px] font-semibold uppercase tracking-[0.12em]"
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
                            as="button"
                            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium"
                            style={{
                              backgroundColor: "var(--dl-secondary-bg)",
                              color: "var(--dl-secondary-text)",
                            }}
                          >
                            <span className="text-xs opacity-70">{recommendation.priority}</span>
                            <span>{recommendation.title}</span>
                          </DesignLabEditableTarget>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {hero.insight ? (
                    <DesignLabEditableTarget
                      targetId="card-surface"
                      selectedTargetId={selectedTargetId}
                      onSelectTarget={onSelectTarget}
                      className="rounded-lg border px-4 py-3"
                      style={{
                        backgroundColor: "var(--dl-page-bg)",
                        borderColor: "var(--dl-card-border)",
                      }}
                    >
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
                        className="mt-1 text-xs"
                        style={{ color: "var(--dl-muted-text)" }}
                      >
                        {hero.insight.detail}
                      </DesignLabEditableTarget>
                    </DesignLabEditableTarget>
                  ) : null}
                </div>

                {hero.signalChips.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-[20rem] lg:grid-cols-2">
                    {hero.signalChips.map((signal) => (
                      <DesignLabEditableTarget
                        key={signal.label}
                        targetId="card-surface"
                        selectedTargetId={selectedTargetId}
                        onSelectTarget={onSelectTarget}
                        className="rounded-lg border px-3 py-2.5"
                        style={{
                          backgroundColor: "var(--dl-page-bg)",
                          borderColor: "var(--dl-card-border)",
                        }}
                      >
                        <DesignLabEditableTarget
                          targetId="header-text"
                          selectedTargetId={selectedTargetId}
                          onSelectTarget={onSelectTarget}
                          as="span"
                          className="text-base font-semibold tabular-nums leading-none"
                          style={{ color: "var(--dl-heading-text)" }}
                        >
                          {signal.value}
                        </DesignLabEditableTarget>
                        <DesignLabEditableTarget
                          targetId="muted-text"
                          selectedTargetId={selectedTargetId}
                          onSelectTarget={onSelectTarget}
                          as="span"
                          className="mt-1 block text-[10px]"
                          style={{ color: "var(--dl-muted-text)" }}
                        >
                          {signal.label}
                        </DesignLabEditableTarget>
                      </DesignLabEditableTarget>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </DesignLabEditableTarget>

          <DesignLabEditableTarget
            targetId="card-surface"
            selectedTargetId={selectedTargetId}
            onSelectTarget={onSelectTarget}
            className="overflow-hidden rounded-[1rem] border"
            style={{
              backgroundColor: "var(--dl-card-bg)",
              borderColor: "var(--dl-card-border)",
            }}
          >
            <div
              className="border-b px-5 py-5 sm:px-6"
              style={{ borderColor: "var(--dl-card-border)" }}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <DesignLabEditableTarget
                    targetId="muted-text"
                    selectedTargetId={selectedTargetId}
                    onSelectTarget={onSelectTarget}
                    as="p"
                    className="text-[10px] font-semibold uppercase tracking-[0.14em]"
                    style={{ color: "var(--dl-muted-text)" }}
                  >
                    Operating board
                  </DesignLabEditableTarget>
                  <DesignLabEditableTarget
                    targetId="header-text"
                    selectedTargetId={selectedTargetId}
                    onSelectTarget={onSelectTarget}
                    as="h3"
                    className="mt-1 text-xl font-bold"
                    style={{ color: "var(--dl-heading-text)" }}
                  >
                    Action · Work · Money
                  </DesignLabEditableTarget>
                  <DesignLabEditableTarget
                    targetId="muted-text"
                    selectedTargetId={selectedTargetId}
                    onSelectTarget={onSelectTarget}
                    as="p"
                    className="mt-1 max-w-2xl text-sm"
                    style={{ color: "var(--dl-muted-text)" }}
                  >
                    Live operating loop from today&apos;s dispatch, office queues, and billing
                    rollups.
                  </DesignLabEditableTarget>
                </div>
                {board.connections.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {board.connections.map((link) => (
                      <DesignLabEditableTarget
                        key={link.id}
                        targetId="card-surface"
                        selectedTargetId={selectedTargetId}
                        onSelectTarget={onSelectTarget}
                        className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px]"
                        style={{
                          backgroundColor: "var(--dl-page-bg)",
                          borderColor: "var(--dl-card-border)",
                          color: "var(--dl-body-text)",
                        }}
                      >
                        <span>{link.from}</span>
                        <ArrowRight className="h-3 w-3" aria-hidden />
                        <span>{link.to}</span>
                      </DesignLabEditableTarget>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid lg:grid-cols-3">
              <div
                className="flex flex-col gap-4 p-4 sm:p-5 lg:p-6 lg:pr-7"
                style={{ borderColor: "var(--dl-card-border)" }}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" aria-hidden />
                    <DesignLabEditableTarget
                      targetId="muted-text"
                      selectedTargetId={selectedTargetId}
                      onSelectTarget={onSelectTarget}
                      as="p"
                      className="text-[10px] font-semibold uppercase tracking-wide"
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
                    className="mt-1 text-base font-semibold"
                    style={{ color: "var(--dl-body-text)" }}
                  >
                    Blockers and follow-ups
                  </DesignLabEditableTarget>
                </div>
                <ul className="flex flex-col gap-2">
                  {board.action.rows.map((row) => (
                    <li key={row.id}>
                      <BoardRow
                        row={row}
                        variant="action"
                        selectedTargetId={selectedTargetId}
                        onSelectTarget={onSelectTarget}
                      />
                    </li>
                  ))}
                </ul>
              </div>

              <div
                className="flex flex-col gap-4 border-t p-4 sm:p-5 lg:border-l lg:border-t-0 lg:p-6"
                style={{ borderColor: "var(--dl-card-border)" }}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" aria-hidden style={{ color: "var(--dl-muted-text)" }} />
                    <DesignLabEditableTarget
                      targetId="muted-text"
                      selectedTargetId={selectedTargetId}
                      onSelectTarget={onSelectTarget}
                      as="p"
                      className="text-[10px] font-semibold uppercase tracking-wide"
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
                    className="mt-1 text-base font-semibold"
                    style={{ color: "var(--dl-body-text)" }}
                  >
                    Today&apos;s field loop
                  </DesignLabEditableTarget>
                  <DesignLabEditableTarget
                    targetId="muted-text"
                    selectedTargetId={selectedTargetId}
                    onSelectTarget={onSelectTarget}
                    as="p"
                    className="mt-1 text-xs"
                    style={{ color: "var(--dl-muted-text)" }}
                  >
                    {board.work.summary}
                  </DesignLabEditableTarget>
                </div>
                <ul className="flex flex-col gap-2">
                  {board.work.jobRows.map((job) => (
                    <li key={job.id}>
                      <DesignLabEditableTarget
                        targetId="card-surface"
                        selectedTargetId={selectedTargetId}
                        onSelectTarget={onSelectTarget}
                        className="rounded-lg border px-3 py-2.5"
                        style={{
                          backgroundColor: "var(--dl-page-bg)",
                          borderColor: "var(--dl-card-border)",
                        }}
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <DesignLabEditableTarget
                            targetId="muted-text"
                            selectedTargetId={selectedTargetId}
                            onSelectTarget={onSelectTarget}
                            as="span"
                            className="text-[11px] tabular-nums"
                            style={{ color: "var(--dl-muted-text)" }}
                          >
                            {job.time}
                          </DesignLabEditableTarget>
                          <DesignLabEditableTarget
                            targetId="success-badge"
                            selectedTargetId={selectedTargetId}
                            onSelectTarget={onSelectTarget}
                            as="span"
                            className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                            style={{
                              backgroundColor: "var(--dl-success-bg)",
                              color: "var(--dl-body-text)",
                            }}
                          >
                            {job.status}
                          </DesignLabEditableTarget>
                        </div>
                        <DesignLabEditableTarget
                          targetId="body-text"
                          selectedTargetId={selectedTargetId}
                          onSelectTarget={onSelectTarget}
                          as="p"
                          className="mt-1 text-sm font-medium"
                          style={{ color: "var(--dl-body-text)" }}
                        >
                          {job.customer}
                        </DesignLabEditableTarget>
                        <DesignLabEditableTarget
                          targetId="muted-text"
                          selectedTargetId={selectedTargetId}
                          onSelectTarget={onSelectTarget}
                          as="p"
                          className="mt-0.5 text-[11px]"
                          style={{ color: "var(--dl-muted-text)" }}
                        >
                          {job.detail}
                        </DesignLabEditableTarget>
                      </DesignLabEditableTarget>
                    </li>
                  ))}
                </ul>
              </div>

              <div
                className="flex flex-col gap-4 border-t p-4 sm:p-5 lg:border-l lg:border-t-0 lg:p-6"
                style={{ borderColor: "var(--dl-card-border)" }}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" aria-hidden style={{ color: "var(--dl-muted-text)" }} />
                    <DesignLabEditableTarget
                      targetId="muted-text"
                      selectedTargetId={selectedTargetId}
                      onSelectTarget={onSelectTarget}
                      as="p"
                      className="text-[10px] font-semibold uppercase tracking-wide"
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
                    className="mt-1 text-base font-semibold"
                    style={{ color: "var(--dl-body-text)" }}
                  >
                    Billing and recovery
                  </DesignLabEditableTarget>
                </div>
                <ul className="flex flex-col gap-2">
                  {board.money.rows.map((row) => (
                    <li key={row.id}>
                      <BoardRow
                        row={row}
                        variant="money"
                        selectedTargetId={selectedTargetId}
                        onSelectTarget={onSelectTarget}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </DesignLabEditableTarget>

          <DesignLabEditableTarget
            targetId="card-surface"
            selectedTargetId={selectedTargetId}
            onSelectTarget={onSelectTarget}
            className="overflow-hidden rounded-[1rem] border"
            style={{
              backgroundColor: "var(--dl-card-bg)",
              borderColor: "var(--dl-card-border)",
            }}
          >
            <div className="px-3 pb-2 pt-4 sm:px-4">
              <DesignLabEditableTarget
                targetId="muted-text"
                selectedTargetId={selectedTargetId}
                onSelectTarget={onSelectTarget}
                as="p"
                className="px-2 text-[10px] font-semibold uppercase tracking-[0.14em] sm:px-3"
                style={{ color: "var(--dl-muted-text)" }}
              >
                Business pulse
              </DesignLabEditableTarget>
              <div className="mt-2 grid sm:grid-cols-4">
                {bands.pulseMetrics.map((metric) => (
                  <div key={metric.id} className="px-2 py-3 sm:px-3">
                    <DesignLabEditableTarget
                      targetId="muted-text"
                      selectedTargetId={selectedTargetId}
                      onSelectTarget={onSelectTarget}
                      as="p"
                      className="text-[10px] font-semibold uppercase tracking-wide"
                      style={{ color: "var(--dl-muted-text)" }}
                    >
                      {metric.label}
                    </DesignLabEditableTarget>
                    <DesignLabEditableTarget
                      targetId="body-text"
                      selectedTargetId={selectedTargetId}
                      onSelectTarget={onSelectTarget}
                      as="p"
                      className="mt-0.5 text-lg font-bold tabular-nums"
                      style={{ color: "var(--dl-body-text)" }}
                    >
                      {metric.value}
                    </DesignLabEditableTarget>
                    <DesignLabEditableTarget
                      targetId="muted-text"
                      selectedTargetId={selectedTargetId}
                      onSelectTarget={onSelectTarget}
                      as="p"
                      className="mt-0.5 text-[11px]"
                      style={{ color: "var(--dl-muted-text)" }}
                    >
                      {metric.delta}
                    </DesignLabEditableTarget>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="grid border-t lg:grid-cols-[1fr_auto]"
              style={{ borderColor: "var(--dl-card-border)" }}
            >
              <div
                className="grid gap-3 p-3 sm:p-4 lg:grid-cols-[1.2fr_0.8fr]"
                style={{ borderColor: "var(--dl-card-border)" }}
              >
                <DesignLabEditableTarget
                  targetId="card-surface"
                  selectedTargetId={selectedTargetId}
                  onSelectTarget={onSelectTarget}
                  className="rounded-lg border px-4 py-4 lg:px-5"
                  style={{
                    backgroundColor: "var(--dl-page-bg)",
                    borderColor: "var(--dl-card-border)",
                  }}
                >
                  <DesignLabEditableTarget
                    targetId="muted-text"
                    selectedTargetId={selectedTargetId}
                    onSelectTarget={onSelectTarget}
                    as="p"
                    className="text-[10px] font-semibold uppercase tracking-wide"
                    style={{ color: "var(--dl-muted-text)" }}
                  >
                    Field activity
                  </DesignLabEditableTarget>
                  <ul className="mt-3 space-y-2">
                    {bands.activities.map((item) => (
                      <li key={item.id} className="flex items-baseline gap-2.5">
                        <span
                          className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: "var(--dl-primary-bg)" }}
                          aria-hidden
                        />
                        <div className="min-w-0">
                          <DesignLabEditableTarget
                            targetId="body-text"
                            selectedTargetId={selectedTargetId}
                            onSelectTarget={onSelectTarget}
                            as="p"
                            className="text-sm font-medium"
                            style={{ color: "var(--dl-body-text)" }}
                          >
                            {item.title}
                          </DesignLabEditableTarget>
                          <DesignLabEditableTarget
                            targetId="muted-text"
                            selectedTargetId={selectedTargetId}
                            onSelectTarget={onSelectTarget}
                            as="p"
                            className="text-[11px]"
                            style={{ color: "var(--dl-muted-text)" }}
                          >
                            {item.time}
                          </DesignLabEditableTarget>
                        </div>
                      </li>
                    ))}
                  </ul>
                </DesignLabEditableTarget>

                <DesignLabEditableTarget
                  targetId="card-surface"
                  selectedTargetId={selectedTargetId}
                  onSelectTarget={onSelectTarget}
                  className="rounded-lg border px-4 py-4 lg:px-5"
                  style={{
                    backgroundColor: "var(--dl-page-bg)",
                    borderColor: "var(--dl-card-border)",
                  }}
                >
                  <DesignLabEditableTarget
                    targetId="muted-text"
                    selectedTargetId={selectedTargetId}
                    onSelectTarget={onSelectTarget}
                    as="p"
                    className="text-[10px] font-semibold uppercase tracking-wide"
                    style={{ color: "var(--dl-muted-text)" }}
                  >
                    Momentum
                  </DesignLabEditableTarget>
                  <ul className="mt-3 space-y-2">
                    {bands.momentumLines.map((line) => (
                      <li key={line.id}>
                        <DesignLabEditableTarget
                          targetId="body-text"
                          selectedTargetId={selectedTargetId}
                          onSelectTarget={onSelectTarget}
                          as="p"
                          className="text-sm leading-snug"
                          style={{ color: "var(--dl-body-text)" }}
                        >
                          {line.text}
                        </DesignLabEditableTarget>
                      </li>
                    ))}
                  </ul>
                </DesignLabEditableTarget>
              </div>

              <DesignLabEditableTarget
                targetId="card-surface"
                selectedTargetId={selectedTargetId}
                onSelectTarget={onSelectTarget}
                className="flex items-center gap-4 border-t px-4 py-4 lg:border-l lg:border-t-0 lg:px-5"
                style={{
                  backgroundColor: "var(--dl-page-bg)",
                  borderColor: "var(--dl-card-border)",
                }}
              >
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold"
                  style={{
                    borderColor: "var(--dl-primary-bg)",
                    color: "var(--dl-heading-text)",
                  }}
                >
                  {bands.systemDock.score}
                </div>
                <div className="min-w-0">
                  <DesignLabEditableTarget
                    targetId="muted-text"
                    selectedTargetId={selectedTargetId}
                    onSelectTarget={onSelectTarget}
                    as="p"
                    className="text-[10px] font-semibold uppercase tracking-wide"
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
                    {bands.systemDock.label}
                  </DesignLabEditableTarget>
                  <DesignLabEditableTarget
                    targetId="muted-text"
                    selectedTargetId={selectedTargetId}
                    onSelectTarget={onSelectTarget}
                    as="p"
                    className="mt-1 text-[11px]"
                    style={{ color: "var(--dl-muted-text)" }}
                  >
                    {bands.systemDock.statusText} · {bands.systemDock.notificationText}
                  </DesignLabEditableTarget>
                </div>
              </DesignLabEditableTarget>
            </div>
          </DesignLabEditableTarget>
        </MasterContentStack>

        <DesignLabEditableTarget
          targetId="muted-text"
          selectedTargetId={selectedTargetId}
          onSelectTarget={onSelectTarget}
          as="p"
          className="mt-4 text-center text-[11px] lg:hidden"
          style={{ color: "var(--dl-muted-text)" }}
        >
          Dashboard replica uses desktop layout. Widen the canvas for the full M2 board.
        </DesignLabEditableTarget>
      </MasterPageCanvas>
    </MasterShellPage>
  );
}
