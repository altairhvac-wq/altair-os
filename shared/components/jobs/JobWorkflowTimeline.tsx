"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Circle, Minus } from "lucide-react";
import type {
  CanonicalWorkflowStage,
  CanonicalWorkflowStageState,
  JobWorkflowProgress,
} from "@/shared/lib/workflow";
import {
  resolveJobWorkflowStageDestination,
  type JobWorkflowStageDestination,
  type JobWorkflowStageDestinationContext,
} from "@/shared/lib/jobs/job-workflow-stage-destinations";
import type { JobWorkflowDocument } from "@/shared/lib/jobs/job-workflow-documents";
import { scrollToJobDetailSection } from "@/shared/lib/jobs/job-detail-scroll";
import {
  jobDetailMutedTextClass,
  jobDetailSectionSubtitleClass,
  jobDetailSectionTitleClass,
  resolveJobDetailSectionClass,
} from "@/shared/components/jobs/job-detail-section-styles";
import {
  adminSegmentedControlClass,
  adminSegmentedItemActiveClass,
  adminSegmentedItemClass,
} from "@/shared/design-system/shell/tokens";

type JobWorkflowTimelineProps = {
  stages: CanonicalWorkflowStage[];
  progress?: Pick<JobWorkflowProgress, "percent" | "completedCount" | "totalCount">;
  destinationContext?: JobWorkflowStageDestinationContext;
  onOpenDocument?: (
    document: JobWorkflowDocument,
    trigger: HTMLElement | null,
  ) => void;
  northStar?: boolean;
  /** Strip outer card chrome when embedded in a combined workflow row. */
  compact?: boolean;
  /** Denser dots/labels for the Job Detail top bar. Implies compact chrome. */
  inline?: boolean;
  className?: string;
};

const STATE_LABEL: Record<CanonicalWorkflowStageState, string> = {
  complete: "Completed",
  current: "Current",
  upcoming: "Upcoming",
  skipped: "Skipped",
};

function stageMarkerClass(
  state: CanonicalWorkflowStageState,
  northStar: boolean,
  inline = false,
): string {
  switch (state) {
    case "complete":
      return northStar
        ? "border-[rgba(16,185,129,0.45)] bg-emerald-500 text-white"
        : "border-emerald-600 bg-emerald-600 text-white dark:border-emerald-400 dark:bg-emerald-500";
    case "current":
      if (northStar) {
        return inline
          ? "border-[#C2A05A] bg-gradient-to-b from-[#E8D9AC] to-[#A4823A] text-[#17130E] ring-1 ring-[rgba(194,160,90,0.28)]"
          : "border-[#C2A05A] bg-gradient-to-b from-[#E8D9AC] to-[#A4823A] text-[#17130E] ring-2 ring-[rgba(194,160,90,0.28)]";
      }
      return inline
        ? "border-cyan-700 bg-cyan-600 text-white ring-1 ring-cyan-500/30 dark:border-cyan-300 dark:bg-cyan-500 dark:ring-cyan-400/30"
        : "border-cyan-700 bg-cyan-600 text-white ring-2 ring-cyan-500/30 dark:border-cyan-300 dark:bg-cyan-500 dark:ring-cyan-400/30";
    case "skipped":
      return northStar
        ? "border-[rgba(119,89,27,0.22)] bg-[#F3EBDD] text-[#77591B]"
        : "border-slate-300 bg-slate-100 text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-500";
    default:
      return northStar
        ? "border-[rgba(119,89,27,0.28)] bg-[#FFF9EA] text-[#77591B]"
        : "border-slate-300 bg-white text-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-500";
  }
}

function stageLabelClass(
  state: CanonicalWorkflowStageState,
  northStar: boolean,
): string {
  switch (state) {
    case "current":
      return northStar
        ? "font-bold text-[#17130E]"
        : "font-bold text-slate-950 dark:text-white";
    case "complete":
      return northStar
        ? "font-semibold text-[#4F4638]"
        : "font-semibold text-slate-700 dark:text-slate-200";
    case "skipped":
      return northStar
        ? "font-medium text-[#77591B] line-through decoration-[rgba(119,89,27,0.35)]"
        : "font-medium text-slate-400 line-through dark:text-slate-500";
    default:
      return northStar
        ? "font-medium text-[#7C7259]"
        : "font-medium text-slate-500 dark:text-slate-400";
  }
}

function connectorClass(
  prevState: CanonicalWorkflowStageState,
  northStar: boolean,
): string {
  const filled = prevState === "complete" || prevState === "current";

  if (northStar) {
    return filled
      ? "bg-[rgba(16,185,129,0.55)]"
      : "bg-[rgba(119,89,27,0.18)]";
  }

  return filled
    ? "bg-emerald-500 dark:bg-emerald-400"
    : "bg-slate-200 dark:bg-slate-700";
}

function StageMarker({
  state,
  northStar,
  inline = false,
}: {
  state: CanonicalWorkflowStageState;
  northStar: boolean;
  inline?: boolean;
}) {
  const iconClass = inline ? "h-2.5 w-2.5" : "h-3 w-3";
  const sizeClass = inline ? "h-3.5 w-3.5 border" : "h-5 w-5 border-2";

  return (
    <span
      className={`relative z-[1] flex shrink-0 items-center justify-center rounded-full ${sizeClass} ${stageMarkerClass(state, northStar, inline)}`}
      aria-hidden="true"
    >
      {state === "complete" ? (
        <Check className={iconClass} strokeWidth={2.5} />
      ) : state === "skipped" ? (
        <Minus className={iconClass} strokeWidth={2.5} />
      ) : state === "current" ? (
        <Circle
          className={inline ? "h-1.5 w-1.5 fill-current" : "h-2 w-2 fill-current"}
          strokeWidth={0}
        />
      ) : (
        <Circle
          className={inline ? "h-1 w-1" : "h-1.5 w-1.5"}
          strokeWidth={2}
        />
      )}
    </span>
  );
}

function destinationOpenLabel(destination: JobWorkflowStageDestination): string {
  if (destination.kind === "locked") {
    return destination.reason;
  }

  if (destination.kind === "section") {
    return `Go to ${destination.label}`;
  }

  return `Open ${destination.label}`;
}

function stageSegmentClass(state: CanonicalWorkflowStageState): string {
  switch (state) {
    case "current":
      return adminSegmentedItemActiveClass;
    case "complete":
      return "text-slate-800";
    case "skipped":
      return "text-slate-400 line-through decoration-slate-300";
    default:
      return "text-slate-400";
  }
}

function StageSegmentLabel({ stage }: { stage: CanonicalWorkflowStage }) {
  return (
    <>
      {stage.state === "complete" ? (
        <Check className="h-3 w-3 shrink-0" strokeWidth={2.5} aria-hidden="true" />
      ) : null}
      <span>{stage.label}</span>
      <span className="sr-only">{STATE_LABEL[stage.state]}</span>
    </>
  );
}

function StageControl({
  stage,
  destination,
  northStar,
  inline = false,
  explanationId,
  onExplain,
  onOpenDocument,
}: {
  stage: CanonicalWorkflowStage;
  destination: JobWorkflowStageDestination;
  northStar: boolean;
  inline?: boolean;
  explanationId: string;
  onExplain: (reason: string) => void;
  onOpenDocument?: (
    document: JobWorkflowDocument,
    trigger: HTMLElement | null,
  ) => void;
}) {
  const accessibleName = `${stage.label}, ${STATE_LABEL[stage.state]}`;

  if (inline) {
    const segmentClass = `${adminSegmentedItemClass} !flex-none inline-flex shrink-0 items-center gap-1 px-2.5 py-1.5 text-[11px] sm:px-3 sm:text-sm ${stageSegmentClass(stage.state)}`;

    if (destination.kind === "locked") {
      return (
        <button
          type="button"
          className={`${segmentClass} cursor-default`}
          aria-label={`${accessibleName}. ${destination.reason}`}
          aria-describedby={explanationId}
          onClick={() => onExplain(destination.reason)}
        >
          <StageSegmentLabel stage={stage} />
        </button>
      );
    }

    return (
      <button
        type="button"
        className={segmentClass}
        aria-label={`${accessibleName}. ${destinationOpenLabel(destination)}`}
        onClick={(event) => {
          if (destination.kind === "section") {
            scrollToJobDetailSection(destination.sectionId, {
              updateHash: true,
              focus: true,
            });
            return;
          }

          if (destination.kind === "document") {
            onOpenDocument?.(destination.document, event.currentTarget);
          }
        }}
      >
        <StageSegmentLabel stage={stage} />
      </button>
    );
  }

  const interactiveClass = `group flex w-[4.75rem] shrink-0 flex-col items-center gap-1 rounded-md px-0.5 py-0.5 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 sm:w-auto sm:min-w-[4.5rem] sm:max-w-[5.5rem] ${
    northStar
      ? "focus-visible:ring-[#C2A05A]"
      : "focus-visible:ring-cyan-600"
  }`;

  const label = (
    <>
      <StageMarker state={stage.state} northStar={northStar} />
      <span
        className={`max-w-full text-[10px] leading-tight sm:text-[11px] ${stageLabelClass(stage.state, northStar)}`}
      >
        {stage.label}
      </span>
      <span className="sr-only">{STATE_LABEL[stage.state]}</span>
    </>
  );

  if (destination.kind === "locked") {
    return (
      <button
        type="button"
        className={`${interactiveClass} cursor-default opacity-80`}
        aria-label={`${accessibleName}. ${destination.reason}`}
        aria-describedby={explanationId}
        onClick={() => onExplain(destination.reason)}
      >
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`${interactiveClass} hover:bg-black/[0.03]`}
      aria-label={`${accessibleName}. ${destinationOpenLabel(destination)}`}
      onClick={(event) => {
        if (destination.kind === "section") {
          scrollToJobDetailSection(destination.sectionId, {
            updateHash: true,
            focus: true,
          });
          return;
        }

        if (destination.kind === "document") {
          onOpenDocument?.(destination.document, event.currentTarget);
        }
      }}
    >
      {label}
    </button>
  );
}

export function JobWorkflowTimeline({
  stages,
  progress,
  destinationContext,
  onOpenDocument,
  northStar = false,
  compact = false,
  inline = false,
  className,
}: JobWorkflowTimelineProps) {
  const listRef = useRef<HTMLOListElement>(null);
  const [lockedReason, setLockedReason] = useState<string | null>(null);
  const explanationId = "job-workflow-stage-explanation";
  const isCompact = compact || inline;

  useEffect(() => {
    const list = listRef.current;
    if (!list) {
      return;
    }

    const current = list.querySelector<HTMLElement>('[aria-current="step"]');
    if (!current) {
      return;
    }

    const listRect = list.getBoundingClientRect();
    const itemRect = current.getBoundingClientRect();
    const offset =
      itemRect.left - listRect.left - listRect.width / 2 + itemRect.width / 2;
    list.scrollBy({ left: offset, behavior: "smooth" });
  }, [stages]);

  if (stages.length === 0) {
    return null;
  }

  const titleId = "job-workflow-timeline-title";
  const currentStage = stages.find((stage) => stage.state === "current");
  const context: JobWorkflowStageDestinationContext = destinationContext ?? {
    stages,
    primaryAction: null,
    jobId: "",
    customerId: "",
    canViewBilling: false,
    canCreateEstimate: false,
    canEditJob: false,
    canAssignTechnician: false,
    canUpdateStatus: false,
    estimates: [],
    invoices: [],
    jobStatus: "scheduled",
  };

  const shellClass = isCompact
    ? "min-w-0"
    : `${resolveJobDetailSectionClass(northStar, true)} py-2.5 sm:py-3`;

  if (inline) {
    return (
      <section
        aria-labelledby={titleId}
        className={`${shellClass} ${className ?? ""}`}
      >
        <h2 id={titleId} className="sr-only">
          Workflow
          {currentStage ? ` · ${currentStage.label}` : ""}
        </h2>
        {progress ? (
          <span className="sr-only">
            {progress.percent}% complete, {progress.completedCount} of{" "}
            {progress.totalCount} stages
          </span>
        ) : null}

        <ol
          ref={listRef}
          className={`${adminSegmentedControlClass} !flex min-w-0 max-w-full flex-1 overflow-x-auto`}
          aria-label="Job workflow progress"
        >
          {stages.map((stage) => {
            const destination = resolveJobWorkflowStageDestination(
              stage,
              context,
            );

            return (
              <li
                key={stage.id}
                className="flex shrink-0"
                aria-current={stage.state === "current" ? "step" : undefined}
              >
                <StageControl
                  stage={stage}
                  destination={destination}
                  northStar={northStar}
                  inline
                  explanationId={explanationId}
                  onExplain={setLockedReason}
                  onOpenDocument={onOpenDocument}
                />
              </li>
            );
          })}
        </ol>

        {lockedReason ? (
          <p
            id={explanationId}
            className="mt-1 text-[10px] text-slate-600"
            role="status"
            aria-live="polite"
          >
            {lockedReason}
          </p>
        ) : (
          <span id={explanationId} className="sr-only" />
        )}
      </section>
    );
  }

  return (
    <section
      aria-labelledby={titleId}
      className={`${shellClass} ${className ?? ""}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5">
        <div className="min-w-0">
          <h2
            id={titleId}
            className={
              isCompact
                ? "text-xs font-bold tracking-tight text-altair-ink-on-paper"
                : jobDetailSectionTitleClass(northStar)
            }
          >
            Workflow
            {isCompact && currentStage ? (
              <span className="ml-1 font-medium text-altair-ink-on-paper-muted">
                · {currentStage.label}
              </span>
            ) : null}
          </h2>
          {!isCompact ? (
            <p className={`${jobDetailSectionSubtitleClass(northStar)} mt-0`}>
              {currentStage ? (
                <>
                  Stage:{" "}
                  <span className="font-semibold text-inherit">
                    {currentStage.label}
                  </span>
                </>
              ) : (
                "Job journey map"
              )}
            </p>
          ) : null}
        </div>
        {progress ? (
          <p
            className={jobDetailMutedTextClass(northStar)}
            aria-label={`${progress.percent} percent complete, ${progress.completedCount} of ${progress.totalCount} stages`}
          >
            {progress.percent}% · {progress.completedCount}/
            {progress.totalCount}
          </p>
        ) : null}
      </div>

      <ol
        ref={listRef}
        className={`${isCompact ? "mt-1.5" : "mt-2.5"} flex items-start gap-0 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
      >
        {stages.map((stage, index) => {
          const isLast = index === stages.length - 1;
          const prev = index > 0 ? stages[index - 1] : null;
          const destination = resolveJobWorkflowStageDestination(
            stage,
            context,
          );

          return (
            <li
              key={stage.id}
              className="relative flex shrink-0 flex-col items-center px-1"
              aria-current={stage.state === "current" ? "step" : undefined}
            >
              {prev ? (
                <span
                  aria-hidden="true"
                  className={`absolute right-1/2 top-2.5 h-0.5 w-[calc(50%+0.35rem)] ${connectorClass(prev.state, northStar)}`}
                />
              ) : null}
              {!isLast ? (
                <span
                  aria-hidden="true"
                  className={`absolute left-1/2 top-2.5 h-0.5 w-[calc(50%+0.35rem)] ${connectorClass(stage.state, northStar)}`}
                />
              ) : null}

              <StageControl
                stage={stage}
                destination={destination}
                northStar={northStar}
                explanationId={explanationId}
                onExplain={setLockedReason}
                onOpenDocument={onOpenDocument}
              />
            </li>
          );
        })}
      </ol>

      {lockedReason ? (
        <p
          id={explanationId}
          className={`mt-1.5 text-[11px] ${
            northStar ? "text-[#77591B]" : "text-slate-600"
          }`}
          role="status"
          aria-live="polite"
        >
          {lockedReason}
        </p>
      ) : (
        <span id={explanationId} className="sr-only" />
      )}
    </section>
  );
}
