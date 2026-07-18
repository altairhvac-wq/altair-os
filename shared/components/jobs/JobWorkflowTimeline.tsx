"use client";

import Link from "next/link";
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
import { scrollToJobDetailSection } from "@/shared/lib/jobs/job-detail-scroll";
import {
  jobDetailMutedTextClass,
  jobDetailSectionSubtitleClass,
  jobDetailSectionTitleClass,
  resolveJobDetailSectionClass,
} from "@/shared/components/jobs/job-detail-section-styles";

type JobWorkflowTimelineProps = {
  stages: CanonicalWorkflowStage[];
  progress?: Pick<JobWorkflowProgress, "percent" | "completedCount" | "totalCount">;
  destinationContext?: JobWorkflowStageDestinationContext;
  northStar?: boolean;
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
): string {
  switch (state) {
    case "complete":
      return northStar
        ? "border-[rgba(16,185,129,0.45)] bg-emerald-500 text-white"
        : "border-emerald-600 bg-emerald-600 text-white dark:border-emerald-400 dark:bg-emerald-500";
    case "current":
      return northStar
        ? "border-[#C9A44D] bg-gradient-to-b from-[#E6D092] to-[#B88A2E] text-[#17130E] ring-2 ring-[rgba(201,164,77,0.28)]"
        : "border-cyan-700 bg-cyan-600 text-white ring-2 ring-cyan-500/30 dark:border-cyan-300 dark:bg-cyan-500 dark:ring-cyan-400/30";
    case "skipped":
      return northStar
        ? "border-[rgba(138,99,36,0.22)] bg-[#F3EBDD] text-[#8A6324]"
        : "border-slate-300 bg-slate-100 text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-500";
    default:
      return northStar
        ? "border-[rgba(138,99,36,0.28)] bg-[#FFF9EA] text-[#8A6324]"
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
        ? "font-medium text-[#8A6324] line-through decoration-[rgba(138,99,36,0.35)]"
        : "font-medium text-slate-400 line-through dark:text-slate-500";
    default:
      return northStar
        ? "font-medium text-[#64748B]"
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
      : "bg-[rgba(138,99,36,0.18)]";
  }

  return filled
    ? "bg-emerald-500 dark:bg-emerald-400"
    : "bg-slate-200 dark:bg-slate-700";
}

function StageMarker({
  state,
  northStar,
}: {
  state: CanonicalWorkflowStageState;
  northStar: boolean;
}) {
  const iconClass = "h-3 w-3";

  return (
    <span
      className={`relative z-[1] flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${stageMarkerClass(state, northStar)}`}
      aria-hidden="true"
    >
      {state === "complete" ? (
        <Check className={iconClass} strokeWidth={2.5} />
      ) : state === "skipped" ? (
        <Minus className={iconClass} strokeWidth={2.5} />
      ) : state === "current" ? (
        <Circle className="h-2 w-2 fill-current" strokeWidth={0} />
      ) : (
        <Circle className="h-1.5 w-1.5" strokeWidth={2} />
      )}
    </span>
  );
}

function navigateDestination(destination: JobWorkflowStageDestination) {
  if (destination.kind === "section") {
    scrollToJobDetailSection(destination.sectionId, {
      updateHash: true,
      focus: true,
    });
    return;
  }

  if (destination.kind === "href") {
    window.location.assign(destination.href);
  }
}

function StageControl({
  stage,
  destination,
  northStar,
  explanationId,
  onExplain,
}: {
  stage: CanonicalWorkflowStage;
  destination: JobWorkflowStageDestination;
  northStar: boolean;
  explanationId: string;
  onExplain: (reason: string) => void;
}) {
  const accessibleName = `${stage.label}, ${STATE_LABEL[stage.state]}`;
  const interactiveClass = `group flex w-[4.75rem] shrink-0 flex-col items-center gap-1 rounded-md px-0.5 py-0.5 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 sm:w-auto sm:min-w-[4.5rem] sm:max-w-[5.5rem] ${
    northStar
      ? "focus-visible:ring-[#C9A44D]"
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

  if (destination.kind === "href") {
    return (
      <Link
        href={destination.href}
        className={`${interactiveClass} hover:bg-black/[0.03]`}
        aria-label={`${accessibleName}. Open ${destination.label}`}
      >
        {label}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={`${interactiveClass} hover:bg-black/[0.03]`}
      aria-label={`${accessibleName}. Go to ${destination.label}`}
      onClick={() => navigateDestination(destination)}
    >
      {label}
    </button>
  );
}

export function JobWorkflowTimeline({
  stages,
  progress,
  destinationContext,
  northStar = false,
  className,
}: JobWorkflowTimelineProps) {
  const listRef = useRef<HTMLOListElement>(null);
  const [lockedReason, setLockedReason] = useState<string | null>(null);
  const explanationId = "job-workflow-stage-explanation";

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
    canViewBilling: false,
    showBillingSection: false,
    showEquipmentSection: false,
    estimates: [],
    invoices: [],
  };

  return (
    <section
      aria-labelledby={titleId}
      className={`${resolveJobDetailSectionClass(northStar, true)} py-2.5 sm:py-3 ${className ?? ""}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          <h2 id={titleId} className={jobDetailSectionTitleClass(northStar)}>
            Workflow
          </h2>
          <p className={`${jobDetailSectionSubtitleClass(northStar)} mt-0`}>
            {currentStage ? (
              <>
                Current:{" "}
                <span className="font-semibold text-inherit">
                  {currentStage.label}
                </span>
              </>
            ) : (
              "Job journey map"
            )}
          </p>
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
        className="mt-2.5 flex items-start gap-0 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {stages.map((stage, index) => {
          const isLast = index === stages.length - 1;
          const prev = index > 0 ? stages[index - 1] : null;
          const destination = resolveJobWorkflowStageDestination(stage, context);

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
              />
            </li>
          );
        })}
      </ol>

      {lockedReason ? (
        <p
          id={explanationId}
          className={`mt-1.5 text-[11px] ${
            northStar ? "text-[#8A6324]" : "text-slate-600"
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
