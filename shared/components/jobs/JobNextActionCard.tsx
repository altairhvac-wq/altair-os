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
import { customerDetailChromeActionClass } from "@/shared/components/customers/CustomerDetailActionBar";
import { JobBusinessActionGuide } from "@/shared/components/jobs/JobBusinessActionGuide";
import { JobWorkflowActions } from "@/shared/components/jobs/JobWorkflowActions";
import { StartRouteButton } from "@/shared/components/jobs/StartRouteButton";
import {
  altairMcCardClass,
  altairMcCardPadClass,
  altairMcMetricLabelClass,
} from "@/shared/design-system/components";
import { buttonClassName } from "@/shared/design-system/components/button-styles";
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
  /** Strip outer card chrome when embedded in a combined workflow row. */
  compact?: boolean;
  /** Single-row CTA for the Job Detail top bar. Implies compact chrome. */
  inline?: boolean;
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
  compact = false,
  inline = false,
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
  const isCompact = compact || inline;

  const shellClass = isCompact
    ? "min-w-0 scroll-mt-6"
    : northStar
      ? `${altairMcCardClass} ${altairMcCardPadClass} sticky top-0 z-20 scroll-mt-6`
      : `${resolveJobDetailSectionClass(false)} sticky top-0 z-20 scroll-mt-6 border-cyan-200/80 bg-gradient-to-br from-cyan-50/90 via-white to-slate-50 dark:border-cyan-700/50 dark:from-cyan-950/40 dark:via-slate-950 dark:to-slate-900`;

  const eyebrowClass = inline
    ? "sr-only"
    : northStar
      ? altairMcMetricLabelClass
      : "text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-800 dark:text-cyan-300";

  const nextActionEyebrow = northStar ? "Next command" : "Next action";

  const labelClass = inline
    ? "sr-only"
    : isCompact
      ? "text-sm font-bold tracking-tight text-altair-ink-on-paper"
      : northStar
        ? "text-lg font-bold tracking-tight text-altair-ink-on-paper sm:text-xl"
        : "text-lg font-bold tracking-tight text-slate-950 sm:text-xl dark:text-white";

  const ctaClass = inline
    ? customerDetailChromeActionClass
    : buttonClassName(
        "primary",
        isCompact ? "sm" : "md",
        isCompact
          ? "w-full touch-manipulation"
          : "w-full touch-manipulation sm:w-auto sm:min-w-[12rem]",
      );

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
      ? `Stage: ${workflow.currentStage.label}`
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
      aria-describedby={description && !isCompact ? descriptionId : undefined}
      className={`${shellClass} ${className ?? ""}`}
      tabIndex={-1}
    >
      {inline ? (
        <>
          <p className={eyebrowClass}>{nextActionEyebrow}</p>
          <h2 id={titleId} className={labelClass}>
            {label}
          </h2>
        </>
      ) : null}

      <div
        className={
          inline
            ? undefined
            : isCompact
              ? "flex flex-col gap-2"
              : "flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
        }
      >
        {inline ? null : (
          <div className="min-w-0 flex-1">
            <p className={eyebrowClass}>{nextActionEyebrow}</p>
            <h2 id={titleId} className={`mt-0.5 ${labelClass}`}>
              {label}
            </h2>
            {description && !isCompact ? (
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
        )}

        <div
          className={
            inline
              ? "flex flex-wrap items-center gap-1.5"
              : isCompact
                ? "flex w-full flex-col gap-1.5 [&_a]:min-h-9 [&_button]:min-h-9 [&_a]:focus-visible:outline-none [&_a]:focus-visible:ring-2 [&_a]:focus-visible:ring-offset-2 [&_button]:focus-visible:outline-none [&_button]:focus-visible:ring-2 [&_button]:focus-visible:ring-offset-2"
                : "flex w-full flex-col gap-2 sm:w-auto sm:min-w-[14rem] sm:items-stretch [&_a]:min-h-11 [&_button]:min-h-11 sm:[&_a]:w-auto sm:[&_button]:w-auto [&_a]:focus-visible:outline-none [&_a]:focus-visible:ring-2 [&_a]:focus-visible:ring-offset-2 [&_button]:focus-visible:outline-none [&_button]:focus-visible:ring-2 [&_button]:focus-visible:ring-offset-2"
          }
          aria-label={`Primary workflow action: ${label}`}
        >
          {showFieldActions ? (
            <JobWorkflowActions
              jobId={jobId}
              customerId={customerId}
              status={status}
              canUpdateStatus={canUpdateStatus}
              aiFeaturesEnabled={aiFeaturesEnabled}
              layout={inline ? "row" : "stack"}
              primarySize={inline ? "default" : "hero"}
              primaryClassName={inline ? customerDetailChromeActionClass : undefined}
              showMobileHint={false}
              onStatusUpdated={onStatusUpdated}
            />
          ) : null}

          {showBusinessCta && workflow.businessAction ? (
            <JobBusinessActionGuide
              action={{ ...workflow.businessAction, hint: undefined }}
              layout="compact"
              presentation="cta"
              actionClassName={
                inline ? customerDetailChromeActionClass : undefined
              }
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
              {inline ? null : (
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              )}
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
              className={inline ? customerDetailChromeActionClass : undefined}
              onStatusUpdated={onStatusUpdated}
            />
          ) : null}

          {statusBannerClass && StatusIcon ? (
            <div
              className={`inline-flex items-center gap-1.5 rounded-lg border font-semibold ${
                inline
                  ? "min-h-9 w-auto px-2.5 py-1.5 text-xs"
                  : isCompact
                    ? "min-h-9 w-full px-3 py-1.5 text-sm"
                    : "min-h-11 w-full rounded-xl px-3 py-2.5 text-sm sm:w-auto"
              } ${statusBannerClass}`}
              role="status"
            >
              <StatusIcon
                className={`${inline ? "h-3.5 w-3.5" : "h-4 w-4"} shrink-0`}
                aria-hidden="true"
              />
              <span>
                {cancelled
                  ? "No further workflow actions"
                  : complete
                    ? "Completed"
                    : "Waiting on this step"}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

