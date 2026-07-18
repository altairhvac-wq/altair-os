import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, XCircle } from "lucide-react";
import type {
  JobWorkflowAvailableAction,
  JobWorkflowResolution,
} from "@/shared/lib/workflow";
import {
  jobDetailMutedTextClass,
  jobDetailSectionSubtitleClass,
  resolveJobDetailSectionClass,
} from "@/shared/components/jobs/job-detail-section-styles";
import { northStarDetailTokens as dt } from "@/shared/design-system/north-star/tokens";

type JobNextActionCardProps = {
  workflow: Pick<
    JobWorkflowResolution,
    "primaryAction" | "currentStage" | "isCancelled" | "isTerminal" | "canAdvance"
  >;
  northStar?: boolean;
  className?: string;
};

function actionHint(action: JobWorkflowAvailableAction | null): string | null {
  if (!action || action.source !== "business") {
    return null;
  }

  return action.hint ?? null;
}

function actionHref(action: JobWorkflowAvailableAction | null): string | null {
  if (!action || action.source !== "business") {
    return null;
  }

  return action.href ?? null;
}

function isStatusAction(action: JobWorkflowAvailableAction | null): boolean {
  return action?.source === "business" && action.kind === "status";
}

function resolveDisplayLabel(
  workflow: JobNextActionCardProps["workflow"],
): string {
  if (workflow.primaryAction) {
    return workflow.primaryAction.label;
  }

  if (workflow.isCancelled) {
    return "Cancelled";
  }

  if (workflow.currentStage) {
    return workflow.currentStage.label;
  }

  return "No next action";
}

export function JobNextActionCard({
  workflow,
  northStar = false,
  className,
}: JobNextActionCardProps) {
  const titleId = "job-next-action-title";
  const label = resolveDisplayLabel(workflow);
  const hint = actionHint(workflow.primaryAction);
  const href = actionHref(workflow.primaryAction);
  const waiting = isStatusAction(workflow.primaryAction);
  const complete =
    !workflow.primaryAction &&
    !workflow.isCancelled &&
    workflow.isTerminal &&
    workflow.currentStage?.id === "completed";
  const cancelled = workflow.isCancelled;

  const shellClass = northStar
    ? `${dt.sectionSurface} border border-[rgba(201,164,77,0.28)] bg-gradient-to-br from-[#FFF9EA] via-[#FBF7EF] to-[#F3EBDD] shadow-[0_10px_28px_-18px_rgba(138,99,36,0.35)]`
    : `${resolveJobDetailSectionClass(false)} border-cyan-200/80 bg-gradient-to-br from-cyan-50/90 via-white to-slate-50 shadow-[0_10px_28px_-18px_rgba(8,145,178,0.35)] dark:border-cyan-700/50 dark:from-cyan-950/40 dark:via-slate-950 dark:to-slate-900`;

  const eyebrowClass = northStar
    ? "text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8A6324]"
    : "text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-800 dark:text-cyan-300";

  const labelClass = northStar
    ? "text-xl font-bold tracking-tight text-[#17130E] sm:text-2xl"
    : "text-xl font-bold tracking-tight text-slate-950 sm:text-2xl dark:text-white";

  const ctaClass = northStar
    ? `${dt.primaryAction} min-h-11 w-full justify-center px-4 text-sm sm:w-auto`
    : "inline-flex min-h-11 w-full touch-manipulation items-center justify-center gap-1.5 rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 focus-visible:ring-offset-2 sm:w-auto dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400";

  const statusBannerClass = cancelled
    ? northStar
      ? "border-[rgba(100,116,139,0.35)] bg-[#F3EBDD] text-[#4F4638]"
      : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
    : waiting
      ? northStar
        ? "border-[rgba(245,158,11,0.35)] bg-[rgba(254,243,199,0.55)] text-[#92400E]"
        : "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-100"
      : complete
        ? northStar
          ? "border-[rgba(16,185,129,0.35)] bg-emerald-50 text-emerald-900"
          : "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-700/50 dark:bg-emerald-950/40 dark:text-emerald-100"
        : null;

  const StatusIcon = cancelled
    ? XCircle
    : complete
      ? CheckCircle2
      : waiting
        ? Clock3
        : null;

  return (
    <section
      aria-labelledby={titleId}
      className={`${shellClass} ${className ?? ""}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <p className={eyebrowClass}>Next action</p>
          <h2 id={titleId} className={`mt-1 ${labelClass}`}>
            {label}
          </h2>
          {hint ? (
            <p className={`mt-1.5 max-w-2xl ${jobDetailSectionSubtitleClass(northStar)}`}>
              {hint}
            </p>
          ) : workflow.currentStage && workflow.primaryAction ? (
            <p className={`mt-1.5 ${jobDetailMutedTextClass(northStar)}`}>
              Current stage: {workflow.currentStage.label}
            </p>
          ) : null}
        </div>

        <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:items-end">
          {href && !waiting && !cancelled ? (
            <Link href={href} className={ctaClass}>
              {label}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : null}

          {href && waiting ? (
            <Link
              href={href}
              className={
                northStar
                  ? `${dt.secondaryAction} min-h-11 w-full justify-center px-4 text-sm sm:w-auto`
                  : "inline-flex min-h-11 w-full touch-manipulation items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-sm font-semibold text-amber-950 transition-colors hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 sm:w-auto dark:border-amber-600 dark:bg-slate-900 dark:text-amber-100 dark:hover:bg-amber-950/50"
              }
            >
              View details
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : null}

          {statusBannerClass && StatusIcon ? (
            <div
              className={`inline-flex min-h-11 w-full items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-semibold sm:w-auto ${statusBannerClass}`}
            >
              <StatusIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                {cancelled
                  ? "No further workflow actions"
                  : complete
                    ? "Job workflow complete"
                    : "Waiting on this step"}
              </span>
            </div>
          ) : null}

          {!href &&
          workflow.primaryAction &&
          !waiting &&
          workflow.canAdvance ? (
            <p className={`text-xs ${jobDetailMutedTextClass(northStar)}`}>
              Use the workflow controls below to continue.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
