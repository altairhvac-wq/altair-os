import { Check, Circle, Minus } from "lucide-react";
import type {
  CanonicalWorkflowStage,
  CanonicalWorkflowStageState,
  JobWorkflowProgress,
} from "@/shared/lib/workflow";
import {
  jobDetailMutedTextClass,
  jobDetailSectionSubtitleClass,
  jobDetailSectionTitleClass,
  resolveJobDetailSectionClass,
} from "@/shared/components/jobs/job-detail-section-styles";

type JobWorkflowTimelineProps = {
  stages: CanonicalWorkflowStage[];
  progress?: Pick<JobWorkflowProgress, "percent" | "completedCount" | "totalCount">;
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
        ? "border-[#C9A44D] bg-gradient-to-b from-[#E6D092] to-[#B88A2E] text-[#17130E] ring-4 ring-[rgba(201,164,77,0.22)]"
        : "border-cyan-700 bg-cyan-600 text-white ring-4 ring-cyan-500/25 dark:border-cyan-300 dark:bg-cyan-500 dark:ring-cyan-400/30";
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
  const iconClass = "h-3.5 w-3.5";

  return (
    <span
      className={`relative z-[1] flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${stageMarkerClass(state, northStar)}`}
      aria-hidden="true"
    >
      {state === "complete" ? (
        <Check className={iconClass} strokeWidth={2.5} />
      ) : state === "skipped" ? (
        <Minus className={iconClass} strokeWidth={2.5} />
      ) : state === "current" ? (
        <Circle className="h-2.5 w-2.5 fill-current" strokeWidth={0} />
      ) : (
        <Circle className="h-2 w-2" strokeWidth={2} />
      )}
    </span>
  );
}

export function JobWorkflowTimeline({
  stages,
  progress,
  northStar = false,
  className,
}: JobWorkflowTimelineProps) {
  if (stages.length === 0) {
    return null;
  }

  const titleId = "job-workflow-timeline-title";
  const currentStage = stages.find((stage) => stage.state === "current");

  return (
    <section
      aria-labelledby={titleId}
      className={`${resolveJobDetailSectionClass(northStar)} ${className ?? ""}`}
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <h2 id={titleId} className={jobDetailSectionTitleClass(northStar)}>
            Workflow
          </h2>
          <p className={`mt-0.5 ${jobDetailSectionSubtitleClass(northStar)}`}>
            Where this job is in the journey
            {currentStage ? (
              <>
                {" "}
                ·{" "}
                <span className="font-semibold text-inherit">
                  {currentStage.label}
                </span>
              </>
            ) : null}
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

      <ol className="mt-4 flex flex-col gap-0 sm:flex-row sm:flex-wrap sm:items-start sm:gap-y-3">
        {stages.map((stage, index) => {
          const isLast = index === stages.length - 1;
          const prev = index > 0 ? stages[index - 1] : null;

          return (
            <li
              key={stage.id}
              className="relative flex min-w-0 flex-1 basis-full sm:basis-[calc(20%-0.5rem)] sm:flex-col sm:items-center sm:px-1 lg:basis-[calc(10%-0.35rem)]"
              aria-current={stage.state === "current" ? "step" : undefined}
            >
              {/* Mobile vertical connector */}
              {!isLast ? (
                <span
                  aria-hidden="true"
                  className={`absolute left-[0.8125rem] top-7 bottom-0 w-0.5 sm:hidden ${connectorClass(stage.state, northStar)}`}
                />
              ) : null}

              {/* Desktop horizontal connector from previous */}
              {prev ? (
                <span
                  aria-hidden="true"
                  className={`absolute right-1/2 top-3.5 hidden h-0.5 w-[calc(50%+0.5rem)] sm:block ${connectorClass(prev.state, northStar)}`}
                />
              ) : null}
              {!isLast ? (
                <span
                  aria-hidden="true"
                  className={`absolute left-1/2 top-3.5 hidden h-0.5 w-[calc(50%+0.5rem)] sm:block ${connectorClass(stage.state, northStar)}`}
                />
              ) : null}

              <div className="relative flex items-start gap-3 sm:flex-col sm:items-center sm:gap-2 sm:text-center">
                <StageMarker state={stage.state} northStar={northStar} />
                <div className="min-w-0 pb-4 sm:pb-0">
                  <p
                    className={`text-xs leading-snug sm:text-[11px] ${stageLabelClass(stage.state, northStar)}`}
                  >
                    {stage.label}
                  </p>
                  <span className="sr-only">{STATE_LABEL[stage.state]}</span>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
