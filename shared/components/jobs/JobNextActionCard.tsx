"use client";

import { ArrowRight, CheckCircle2, Clock3, XCircle } from "lucide-react";
import type { JobBusinessAction } from "@/shared/lib/job-next-business-action";
import type { JobWorkflowDocument } from "@/shared/lib/jobs/job-workflow-documents";
import type {
  JobWorkflowAvailableAction,
  JobWorkflowResolution,
} from "@/shared/lib/workflow";
import { JOB_DETAIL_NEXT_ACTION_ANCHOR } from "@/shared/lib/jobs/job-detail-anchors";
import {
  jobDetailMutedTextClass,
  jobDetailSectionSubtitleClass,
  resolveJobDetailSectionClass,
} from "@/shared/components/jobs/job-detail-section-styles";
import { JobBusinessActionGuide } from "@/shared/components/jobs/JobBusinessActionGuide";
import { JobWorkflowActions } from "@/shared/components/jobs/JobWorkflowActions";
import { StartRouteButton } from "@/shared/components/jobs/StartRouteButton";
import { northStarDetailTokens as dt } from "@/shared/design-system/north-star/tokens";
import type { JobStatus } from "@/shared/types/job";

type JobNextActionCardProps = {
  workflow: Pick<
    JobWorkflowResolution,
    | "primaryAction"
    | "businessAction"
    | "currentStage"
    | "isCancelled"
    | "isTerminal"
    | "canAdvance"
    | "jobStatus"
  >;
  jobId: string;
  customerId: string;
  status: JobStatus;
  serviceAddress: string;
  city: string;
  state: string;
  zip: string;
  canUpdateStatus: boolean;
  aiFeaturesEnabled?: boolean;
  northStar?: boolean;
  className?: string;
  onStatusUpdated?: (status: JobStatus) => void;
  onOpenDocument?: (document: JobWorkflowDocument) => void;
};

function actionHint(action: JobWorkflowAvailableAction | null): string | null {
  if (!action || action.source !== "business") {
    return null;
  }

  return action.hint ?? null;
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

function isWaitingStatusAction(
  action: JobWorkflowAvailableAction | null,
): boolean {
  return action?.source === "business" && action.kind === "status";
}

function isRecordPaymentAction(
  action: JobWorkflowAvailableAction | null,
): action is Extract<JobWorkflowAvailableAction, { source: "business" }> {
  return action?.source === "business" && action.id === "awaiting_payment";
}

function isCreateEstimateAction(
  action: JobWorkflowAvailableAction | null,
): boolean {
  return action?.source === "business" && action.id === "create_estimate";
}

function shouldOfferStartRoute(
  workflow: JobNextActionCardProps["workflow"],
  canUpdateStatus: boolean,
): boolean {
  if (!canUpdateStatus || workflow.isTerminal || workflow.primaryAction) {
    return false;
  }

  return (
    workflow.jobStatus === "scheduled" || workflow.jobStatus === "dispatched"
  );
}

export function JobNextActionCard({
  workflow,
  jobId,
  customerId,
  status,
  serviceAddress,
  city,
  state,
  zip,
  canUpdateStatus,
  aiFeaturesEnabled = false,
  northStar = false,
  className,
  onStatusUpdated,
  onOpenDocument,
}: JobNextActionCardProps) {
  const titleId = "job-next-action-title";
  const descriptionId = "job-next-action-description";
  const label = resolveDisplayLabel(workflow);
  const primaryAction = workflow.primaryAction;
  const hint = actionHint(primaryAction);
  const waiting = isWaitingStatusAction(primaryAction);
  const recordPayment = isRecordPaymentAction(primaryAction);
  const complete =
    !primaryAction &&
    !workflow.isCancelled &&
    workflow.isTerminal &&
    workflow.currentStage?.id === "completed";
  const cancelled = workflow.isCancelled;
  const offerStartRoute = shouldOfferStartRoute(workflow, canUpdateStatus);

  const shellClass = northStar
    ? `${dt.compactSectionSurface} sticky top-0 z-20 scroll-mt-6 border border-[rgba(201,164,77,0.28)] bg-gradient-to-br from-[#FFF9EA] via-[#FBF7EF] to-[#F3EBDD]`
    : `${resolveJobDetailSectionClass(false)} sticky top-0 z-20 scroll-mt-6 border-cyan-200/80 bg-gradient-to-br from-cyan-50/90 via-white to-slate-50 dark:border-cyan-700/50 dark:from-cyan-950/40 dark:via-slate-950 dark:to-slate-900`;

  const eyebrowClass = northStar
    ? "text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8A6324]"
    : "text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-800 dark:text-cyan-300";

  const labelClass = northStar
    ? "text-lg font-bold tracking-tight text-[#17130E] sm:text-xl"
    : "text-lg font-bold tracking-tight text-slate-950 sm:text-xl dark:text-white";

  const ctaClass = northStar
    ? `${dt.primaryAction} min-h-11 w-full justify-center px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A44D] focus-visible:ring-offset-2 sm:w-auto sm:min-w-[12rem] sm:text-sm`
    : "inline-flex min-h-11 w-full touch-manipulation items-center justify-center gap-1.5 rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 focus-visible:ring-offset-2 sm:w-auto sm:min-w-[12rem] dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400";

  const statusBannerClass = cancelled
    ? northStar
      ? "border-[rgba(100,116,139,0.35)] bg-[#F3EBDD] text-[#4F4638]"
      : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
    : waiting && !recordPayment
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
      : waiting && !recordPayment
        ? Clock3
        : null;

  const description =
    hint ??
    (workflow.currentStage && primaryAction
      ? `Current stage: ${workflow.currentStage.label}`
      : null);

  const showFieldActions =
    primaryAction?.source === "field" && canUpdateStatus && !cancelled;

  const showBusinessCta =
    primaryAction?.source === "business" &&
    primaryAction.kind === "cta" &&
    !cancelled;

  const showRecordPaymentCta =
    recordPayment && Boolean(primaryAction.href) && !cancelled;

  function handleCreateEstimate() {
    onOpenDocument?.({ kind: "estimate-create" });
  }

  function handleFinishEstimate(estimateId: string) {
    onOpenDocument?.({ kind: "estimate-view", estimateId });
  }

  function handleOfficeCta(action: JobBusinessAction) {
    switch (action.id) {
      case "create_estimate":
        onOpenDocument?.({ kind: "estimate-create" });
        return;
      case "finish_send_estimate":
      case "approve_estimate_on_site":
        if (action.estimateId) {
          onOpenDocument?.({
            kind:
              action.id === "approve_estimate_on_site"
                ? "estimate-approval"
                : "estimate-view",
            estimateId: action.estimateId,
          });
        }
        return;
      case "create_invoice":
        onOpenDocument?.({
          kind: "invoice-create",
          estimateId: action.estimateId,
        });
        return;
      case "view_invoice":
        if (action.invoiceId) {
          onOpenDocument?.({
            kind: "invoice-view",
            invoiceId: action.invoiceId,
          });
        }
        return;
      case "awaiting_payment":
        if (action.invoiceId) {
          onOpenDocument?.({
            kind: "payment",
            invoiceId: action.invoiceId,
          });
        }
        return;
      default:
        return;
    }
  }

  return (
    <section
      id={JOB_DETAIL_NEXT_ACTION_ANCHOR}
      data-job-section={JOB_DETAIL_NEXT_ACTION_ANCHOR}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className={`${shellClass} ${className ?? ""}`}
      tabIndex={-1}
    >
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <p className={eyebrowClass}>Next action</p>
          <h2 id={titleId} className={`mt-0.5 ${labelClass}`}>
            {label}
          </h2>
          {description ? (
            <p
              id={descriptionId}
              className={`mt-1 max-w-2xl ${
                hint
                  ? jobDetailSectionSubtitleClass(northStar)
                  : jobDetailMutedTextClass(northStar)
              }`}
            >
              {description}
            </p>
          ) : null}
        </div>

        <div
          className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[14rem] sm:items-stretch [&_a]:min-h-11 [&_button]:min-h-11 sm:[&_a]:w-auto sm:[&_button]:w-auto [&_a]:focus-visible:outline-none [&_a]:focus-visible:ring-2 [&_a]:focus-visible:ring-offset-2 [&_button]:focus-visible:outline-none [&_button]:focus-visible:ring-2 [&_button]:focus-visible:ring-offset-2"
          aria-label={`Primary workflow action: ${label}`}
        >
          {showFieldActions ? (
            <JobWorkflowActions
              jobId={jobId}
              customerId={customerId}
              status={status}
              canUpdateStatus={canUpdateStatus}
              aiFeaturesEnabled={aiFeaturesEnabled}
              layout="stack"
              primarySize="hero"
              showMobileHint={false}
              onStatusUpdated={onStatusUpdated}
            />
          ) : null}

          {showBusinessCta && workflow.businessAction ? (
            <JobBusinessActionGuide
              action={{ ...workflow.businessAction, hint: undefined }}
              layout="compact"
              presentation="cta"
              onFieldEstimateClick={
                isCreateEstimateAction(primaryAction)
                  ? handleCreateEstimate
                  : undefined
              }
              onFieldFinishEstimateClick={handleFinishEstimate}
              onOfficeCtaClick={onOpenDocument ? handleOfficeCta : undefined}
            />
          ) : null}

          {showRecordPaymentCta &&
          primaryAction &&
          "invoiceId" in primaryAction &&
          primaryAction.invoiceId ? (
            <button
              type="button"
              className={ctaClass}
              aria-label="Record payment for this job"
              onClick={() =>
                onOpenDocument?.({
                  kind: "payment",
                  invoiceId: primaryAction.invoiceId!,
                })
              }
            >
              Record Payment
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}

          {offerStartRoute ? (
            <StartRouteButton
              jobId={jobId}
              status={status}
              serviceAddress={serviceAddress}
              city={city}
              state={state}
              zip={zip}
              canUpdateStatus={canUpdateStatus}
              layout="inline"
              onStatusUpdated={onStatusUpdated}
            />
          ) : null}

          {statusBannerClass && StatusIcon ? (
            <div
              className={`inline-flex min-h-11 w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold sm:w-auto ${statusBannerClass}`}
              role="status"
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
        </div>
      </div>
    </section>
  );
}
