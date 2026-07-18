"use client";

import {
  Camera,
  Package,
  Phone,
  Receipt,
  StickyNote,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { updateJobStatusAction } from "@/app/actions/jobs";
import { CompleteJobSheet } from "@/shared/components/jobs/CompleteJobSheet";
import { StartRouteButton } from "@/shared/components/jobs/StartRouteButton";
import {
  formatActionError,
  formatConnectionCatchError,
} from "@/shared/lib/operational-errors";
import type { ServiceAddressParts } from "@/shared/lib/maps";
import type {
  JobWorkflowAvailableAction,
  JobWorkflowResolution,
} from "@/shared/lib/workflow";
import { formatJobStatus, type JobStatus } from "@/shared/types/job";
import {
  getTargetStatusForAction,
  isTerminalJobStatus,
  type JobWorkflowActionId,
} from "@/shared/types/job-workflow";
import { TechnicianNavigateButton } from "./TechnicianNavigateButton";
import {
  technicianFieldPrimaryActionClass,
  technicianFieldSecondaryActionClass,
  technicianFieldSectionLabelClass,
  technicianFieldUtilityActionClass,
  technicianFieldWorkflowHintClass,
  technicianFieldWorkflowSurfaceClass,
} from "./technician-field-styles";

const TECHNICIAN_STATUS_OPTIONS: {
  value: JobStatus;
  label: string;
}[] = [
  { value: "scheduled", label: "Scheduled" },
  { value: "dispatched", label: "En Route" },
  { value: "arrived", label: "On Site" },
  { value: "in_progress", label: "Work in Progress" },
  { value: "completed", label: "Completed" },
];

const STATUS_RANK: Record<JobStatus, number> = {
  scheduled: 0,
  dispatched: 1,
  arrived: 2,
  in_progress: 3,
  completed: 4,
  cancelled: -1,
};

/** Immediate forward transition from a field status via existing actions. */
const FORWARD_TRANSITION: Partial<
  Record<JobStatus, { actionId: JobWorkflowActionId; targetStatus: JobStatus }>
> = {
  scheduled: { actionId: "dispatch", targetStatus: "dispatched" },
  dispatched: { actionId: "arrive", targetStatus: "arrived" },
  arrived: { actionId: "start_work", targetStatus: "in_progress" },
  in_progress: { actionId: "complete", targetStatus: "completed" },
};

type TechnicianJobCommandCenterProps = {
  jobId: string;
  customerId: string;
  status: JobStatus;
  workflow: JobWorkflowResolution;
  address: ServiceAddressParts;
  customerPhone?: string;
  canUpdateStatus: boolean;
  canCreateEstimate: boolean;
  canApproveOnSite: boolean;
  aiFeaturesEnabled?: boolean;
  disabled?: boolean;
  onStatusUpdated?: (status: JobStatus) => void;
  onCompleteSheetOpenChange?: (open: boolean) => void;
  onCreateQuote?: () => void;
  onContinueQuote?: (estimateId: string) => void;
  onCaptureApproval?: () => void;
  onOpenPhotos?: () => void;
  onOpenNotes?: () => void;
  onOpenMaterials?: () => void;
  onOpenReceipts?: () => void;
};

function isOfficeOnlyBusinessAction(
  action: JobWorkflowAvailableAction | null,
): boolean {
  if (!action || action.source !== "business") {
    return false;
  }

  return (
    action.id === "create_invoice" ||
    action.id === "view_invoice" ||
    action.id === "awaiting_payment"
  );
}

function technicianQuoteLabel(
  actionId:
    | "create_estimate"
    | "finish_send_estimate"
    | "approve_estimate_on_site",
): string {
  switch (actionId) {
    case "create_estimate":
      return "Create Quote";
    case "finish_send_estimate":
      return "Continue Quote";
    case "approve_estimate_on_site":
      return "Capture Approval";
  }
}

function recommendedCopy(
  action: JobWorkflowAvailableAction,
): { title: string; description: string } {
  if (action.source === "business") {
    switch (action.id) {
      case "create_estimate":
        return {
          title: "Create Quote",
          description: "Create a quote for customer approval",
        };
      case "finish_send_estimate":
        return {
          title: "Continue Quote",
          description: "Finish and send the quote for customer approval",
        };
      case "approve_estimate_on_site":
        return {
          title: "Capture Approval",
          description: "Capture customer approval while on site",
        };
      case "awaiting_approval":
        return {
          title: "Waiting for approval",
          description:
            action.hint ??
            "Quote sent — waiting for the customer to approve before work continues",
        };
      case "complete_work":
        return {
          title: "Complete Work",
          description:
            action.hint ?? "Complete work when finished on site",
        };
      default:
        return {
          title: action.label,
          description: action.hint ?? action.label,
        };
    }
  }

  switch (action.id) {
    case "arrive":
      return {
        title: "Arrive On Site",
        description: "Mark arrived when you reach the customer",
      };
    case "start_work":
      return {
        title: "Start Work",
        description: "Start work when you begin the job on site",
      };
    case "complete":
      return {
        title: "Complete Work",
        description: "Complete work when the job is done on site",
      };
    case "dispatch":
      return {
        title: "Start Route",
        description: "Mark yourself en route to this job",
      };
    default:
      return {
        title: action.label,
        description: action.label,
      };
  }
}

function fieldActionButtonLabel(actionId: JobWorkflowActionId): string {
  switch (actionId) {
    case "dispatch":
      return "Start Route";
    case "arrive":
      return "Arrive On Site";
    case "start_work":
      return "Start Work";
    case "complete":
      return "Complete Work";
    default:
      return actionId;
  }
}

function canSelectStatus(
  current: JobStatus,
  target: JobStatus,
  canUpdateStatus: boolean,
): { enabled: boolean; reason?: string } {
  if (target === current) {
    return { enabled: true };
  }

  if (!canUpdateStatus) {
    return {
      enabled: false,
      reason: "You do not have permission to update this job status.",
    };
  }

  if (isTerminalJobStatus(current)) {
    return {
      enabled: false,
      reason: "This job is closed. Status cannot be changed here.",
    };
  }

  if (target === "cancelled") {
    return {
      enabled: false,
      reason: "Jobs cannot be cancelled from this control.",
    };
  }

  const forward = FORWARD_TRANSITION[current];
  if (forward && forward.targetStatus === target) {
    return { enabled: true };
  }

  if (STATUS_RANK[target] < STATUS_RANK[current]) {
    return {
      enabled: false,
      reason: "Use the required intermediate step — backward changes are not available here.",
    };
  }

  return {
    enabled: false,
    reason: `Select ${formatJobStatus(forward?.targetStatus ?? current)} next — status jumps are not allowed.`,
  };
}

export function TechnicianJobCommandCenter({
  jobId,
  customerId,
  status,
  workflow,
  address,
  customerPhone,
  canUpdateStatus,
  canCreateEstimate,
  canApproveOnSite,
  aiFeaturesEnabled = false,
  disabled = false,
  onStatusUpdated,
  onCompleteSheetOpenChange,
  onCreateQuote,
  onContinueQuote,
  onCaptureApproval,
  onOpenPhotos,
  onOpenNotes,
  onOpenMaterials,
  onOpenReceipts,
}: TechnicianJobCommandCenterProps) {
  const router = useRouter();
  const statusSelectId = useId();
  const recommendedId = useId();
  const submitLockRef = useRef(false);
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] =
    useState<JobWorkflowActionId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCompleteSheet, setShowCompleteSheet] = useState(false);

  useEffect(() => {
    onCompleteSheetOpenChange?.(showCompleteSheet);
  }, [onCompleteSheetOpenChange, showCompleteSheet]);

  useEffect(() => {
    return () => {
      onCompleteSheetOpenChange?.(false);
    };
  }, [onCompleteSheetOpenChange]);

  const controlsLocked = disabled || isPending || showCompleteSheet;
  const hasPhone = Boolean(customerPhone?.trim());
  const isTerminal = isTerminalJobStatus(status);

  const primaryAction =
    workflow.primaryAction && !isOfficeOnlyBusinessAction(workflow.primaryAction)
      ? workflow.primaryAction
      : workflow.fieldPrimaryAction
        ? ({ ...workflow.fieldPrimaryAction, source: "field" } as const)
        : null;

  const quoteActionId = (() => {
    const business = workflow.businessAction;
    if (!business) {
      return null;
    }
    if (
      business.id === "create_estimate" ||
      business.id === "finish_send_estimate" ||
      business.id === "approve_estimate_on_site"
    ) {
      return business.id;
    }
    return null;
  })();

  const showQuoteAction =
    Boolean(quoteActionId) &&
    ((quoteActionId === "create_estimate" && canCreateEstimate) ||
      (quoteActionId === "finish_send_estimate" && canCreateEstimate) ||
      (quoteActionId === "approve_estimate_on_site" && canApproveOnSite));

  const recommendedIsQuote =
    primaryAction?.source === "business" &&
    (primaryAction.id === "create_estimate" ||
      primaryAction.id === "finish_send_estimate" ||
      primaryAction.id === "approve_estimate_on_site");

  const recommendedIsWaiting =
    primaryAction?.source === "business" &&
    primaryAction.kind === "status";

  const recommendedIsField =
    primaryAction?.source === "field" ||
    (primaryAction?.source === "business" &&
      primaryAction.id === "complete_work");

  function runFieldAction(actionId: JobWorkflowActionId) {
    if (controlsLocked || submitLockRef.current || !canUpdateStatus) {
      return;
    }

    if (actionId === "complete") {
      setError(null);
      setShowCompleteSheet(true);
      return;
    }

    const target = getTargetStatusForAction(status, actionId);
    if (!target) {
      setError("That status change is not available from the current job status.");
      return;
    }

    setError(null);
    setPendingAction(actionId);
    submitLockRef.current = true;

    startTransition(async () => {
      try {
        const result = await updateJobStatusAction(jobId, actionId, status);

        if (!result.job) {
          setError(
            formatActionError(
              result.error,
              "We couldn't update this job's status. Try again.",
            ),
          );
          if (result.error?.includes("assigned")) {
            router.refresh();
          }
          return;
        }

        if (result.error) {
          setError(
            formatActionError(
              result.error,
              "We couldn't update this job's status. Try again.",
            ),
          );
          onStatusUpdated?.(result.job.status);
          router.refresh();
          return;
        }

        onStatusUpdated?.(result.job.status);
        window.setTimeout(() => router.refresh(), 500);
      } catch {
        setError(
          formatConnectionCatchError(
            "Connection problem. Status was not updated — try again when your signal is stable.",
          ),
        );
      } finally {
        setPendingAction(null);
        submitLockRef.current = false;
      }
    });
  }

  function handleStatusSelect(nextStatus: JobStatus) {
    if (nextStatus === status) {
      return;
    }

    const eligibility = canSelectStatus(status, nextStatus, canUpdateStatus);
    if (!eligibility.enabled) {
      setError(eligibility.reason ?? "That status change is not available.");
      return;
    }

    const forward = FORWARD_TRANSITION[status];
    if (!forward || forward.targetStatus !== nextStatus) {
      setError("That status change is not available from the current job status.");
      return;
    }

    runFieldAction(forward.actionId);
  }

  function handleRecommendedPrimary() {
    if (!primaryAction || controlsLocked) {
      return;
    }

    if (primaryAction.source === "business") {
      if (primaryAction.id === "create_estimate") {
        onCreateQuote?.();
        return;
      }
      if (
        primaryAction.id === "finish_send_estimate" &&
        primaryAction.estimateId
      ) {
        onContinueQuote?.(primaryAction.estimateId);
        return;
      }
      if (primaryAction.id === "approve_estimate_on_site") {
        onCaptureApproval?.();
        return;
      }
      if (primaryAction.id === "complete_work") {
        runFieldAction("complete");
      }
      return;
    }

    if (primaryAction.id === "dispatch") {
      // Start Route is composed separately so navigation opt-in stays with that control.
      return;
    }

    runFieldAction(primaryAction.id);
  }

  const otherFieldActions = workflow.fieldActions.filter((action) => {
    if (action.id === "cancel") {
      return false;
    }
    if (action.id === "dispatch") {
      // Presented via StartRouteButton / status select — avoid duplicate CTA weight.
      return false;
    }
    if (
      primaryAction?.source === "field" &&
      primaryAction.id === action.id
    ) {
      return false;
    }
    if (
      primaryAction?.source === "business" &&
      primaryAction.id === "complete_work" &&
      action.id === "complete"
    ) {
      return false;
    }
    return true;
  });

  /** Start Route is the status transition — not the GPS utility. */
  const showStartRoute =
    canUpdateStatus && status === "scheduled" && !isTerminal;

  const showQuoteInJobActions =
    showQuoteAction &&
    !recommendedIsQuote &&
    quoteActionId !== null;

  const startRouteAsSecondary = Boolean(recommendedIsQuote);

  const recommended =
    primaryAction && !isOfficeOnlyBusinessAction(primaryAction)
      ? recommendedCopy(primaryAction)
      : null;

  const statusDisabledReason =
    isTerminal && status === "completed"
      ? "Work is completed. This job cannot be reopened here."
      : isTerminal
        ? "This job is cancelled."
        : undefined;

  return (
    <>
      <section
        className={`${technicianFieldWorkflowSurfaceClass} space-y-4`}
        aria-label="Job command center"
      >
        <div>
          <label
            htmlFor={statusSelectId}
            className={technicianFieldSectionLabelClass}
          >
            Job Status
          </label>
          <div className="relative mt-2">
            <select
              id={statusSelectId}
              value={status}
              disabled={controlsLocked || isTerminal || !canUpdateStatus}
              aria-describedby={
                statusDisabledReason ? `${statusSelectId}-hint` : undefined
              }
              onChange={(event) => {
                handleStatusSelect(event.target.value as JobStatus);
              }}
              className="min-h-11 w-full touch-manipulation appearance-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 pr-10 text-base font-semibold text-slate-900 outline-none transition-colors focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
            >
              {status === "cancelled" ? (
                <option value="cancelled">Cancelled</option>
              ) : null}
              {TECHNICIAN_STATUS_OPTIONS.map((option) => {
                const eligibility = canSelectStatus(
                  status,
                  option.value,
                  canUpdateStatus,
                );
                const isCurrent = option.value === status;
                return (
                  <option
                    key={option.value}
                    value={option.value}
                    disabled={!isCurrent && !eligibility.enabled}
                  >
                    {option.label}
                    {!isCurrent && !eligibility.enabled ? " (unavailable)" : ""}
                  </option>
                );
              })}
            </select>
            <span
              className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400"
              aria-hidden
            >
              ▼
            </span>
          </div>
          {statusDisabledReason ? (
            <p
              id={`${statusSelectId}-hint`}
              className={`mt-1.5 ${technicianFieldWorkflowHintClass}`}
            >
              {statusDisabledReason}
            </p>
          ) : (
            <p className={`mt-1.5 ${technicianFieldWorkflowHintClass}`}>
              Changes use the same authorized field steps as the buttons below.
            </p>
          )}
        </div>

        {recommended ? (
          <div aria-labelledby={recommendedId}>
            <h3 id={recommendedId} className={technicianFieldSectionLabelClass}>
              Recommended next step
            </h3>
            <p className="mt-2 text-sm font-medium text-slate-800">
              {recommended.description}
            </p>
            {recommendedIsWaiting ? (
              <p
                className="mt-2 rounded-xl bg-indigo-50 px-3 py-2.5 text-sm font-semibold text-indigo-900"
                role="status"
              >
                {recommended.title}
              </p>
            ) : recommendedIsQuote || recommendedIsField ? (
              primaryAction?.source === "field" &&
              primaryAction.id === "dispatch" ? (
                <div className="mt-2">
                  <StartRouteButton
                    jobId={jobId}
                    status={status}
                    serviceAddress={address.serviceAddress}
                    city={address.city}
                    state={address.state}
                    zip={address.zip}
                    canUpdateStatus={canUpdateStatus}
                    layout="block"
                    fieldStyled
                    competingSheetActive={controlsLocked}
                    onStatusUpdated={onStatusUpdated}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  className={`${technicianFieldPrimaryActionClass} mt-2`}
                  disabled={
                    controlsLocked ||
                    (recommendedIsField && !canUpdateStatus) ||
                    (recommendedIsQuote &&
                      primaryAction?.source === "business" &&
                      primaryAction.id === "create_estimate" &&
                      !onCreateQuote) ||
                    (recommendedIsQuote &&
                      primaryAction?.source === "business" &&
                      primaryAction.id === "finish_send_estimate" &&
                      !onContinueQuote) ||
                    (recommendedIsQuote &&
                      primaryAction?.source === "business" &&
                      primaryAction.id === "approve_estimate_on_site" &&
                      !onCaptureApproval)
                  }
                  aria-describedby={recommendedId}
                  onClick={handleRecommendedPrimary}
                >
                  {isPending && pendingAction
                    ? "Saving…"
                    : recommended.title}
                </button>
              )
            ) : null}
          </div>
        ) : !isTerminal ? (
          <div>
            <h3 className={technicianFieldSectionLabelClass}>
              Recommended next step
            </h3>
            <p className={`mt-2 ${technicianFieldWorkflowHintClass}`}>
              {status === "scheduled"
                ? "Start route when you leave, or create a quote if the customer needs pricing first."
                : "Use job actions below based on what is happening on site."}
            </p>
          </div>
        ) : null}

        {!isTerminal ? (
          <div>
            <h3 className={technicianFieldSectionLabelClass}>Job actions</h3>
            <div className="mt-2 flex flex-col gap-2">
              {showStartRoute ? (
                <StartRouteButton
                  jobId={jobId}
                  status={status}
                  serviceAddress={address.serviceAddress}
                  city={address.city}
                  state={address.state}
                  zip={address.zip}
                  canUpdateStatus={canUpdateStatus}
                  layout="block"
                  fieldStyled
                  fieldSecondary={startRouteAsSecondary}
                  competingSheetActive={controlsLocked}
                  onStatusUpdated={onStatusUpdated}
                />
              ) : null}

              {otherFieldActions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  disabled={controlsLocked || !canUpdateStatus}
                  onClick={() => runFieldAction(action.id)}
                  className={technicianFieldSecondaryActionClass}
                >
                  {isPending && pendingAction === action.id
                    ? "Saving…"
                    : fieldActionButtonLabel(action.id)}
                </button>
              ))}

              {showQuoteInJobActions && quoteActionId ? (
                <button
                  type="button"
                  disabled={controlsLocked}
                  className={technicianFieldSecondaryActionClass}
                  onClick={() => {
                    if (quoteActionId === "create_estimate") {
                      onCreateQuote?.();
                      return;
                    }
                    if (
                      quoteActionId === "finish_send_estimate" &&
                      workflow.businessAction?.estimateId
                    ) {
                      onContinueQuote?.(workflow.businessAction.estimateId);
                      return;
                    }
                    if (quoteActionId === "approve_estimate_on_site") {
                      onCaptureApproval?.();
                    }
                  }}
                >
                  {technicianQuoteLabel(quoteActionId)}
                </button>
              ) : null}

              {!showStartRoute &&
              otherFieldActions.length === 0 &&
              !showQuoteInJobActions ? (
                <p className={technicianFieldWorkflowHintClass}>
                  No additional field actions right now. Use the recommended
                  step or quick tools.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        <div>
          <h3 className={technicianFieldSectionLabelClass}>Quick tools</h3>
          <div className="mt-2 grid grid-cols-4 gap-2">
            <TechnicianNavigateButton
              address={address}
              disabled={controlsLocked}
            />
            {hasPhone ? (
              <a
                href={`tel:${customerPhone}`}
                className={technicianFieldUtilityActionClass}
                aria-label="Call customer"
              >
                <Phone className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                Call
              </a>
            ) : (
              <span
                className={`${technicianFieldUtilityActionClass} opacity-40`}
                aria-disabled
                title="No phone on file"
              >
                <Phone className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                Call
              </span>
            )}
            <button
              type="button"
              disabled={controlsLocked || !onOpenPhotos || isTerminal}
              onClick={onOpenPhotos}
              className={technicianFieldUtilityActionClass}
              aria-label="Open photos"
            >
              <Camera className="h-4 w-4 shrink-0 text-violet-600" aria-hidden />
              Photos
            </button>
            <button
              type="button"
              disabled={controlsLocked || !onOpenNotes}
              onClick={onOpenNotes}
              className={technicianFieldUtilityActionClass}
              aria-label="Open notes and job history"
            >
              <StickyNote
                className="h-4 w-4 shrink-0 text-amber-700"
                aria-hidden
              />
              Notes
            </button>
          </div>
          {(onOpenMaterials || onOpenReceipts) && !isTerminal ? (
            <div className="mt-2 grid grid-cols-2 gap-2">
              {onOpenMaterials ? (
                <button
                  type="button"
                  disabled={controlsLocked}
                  onClick={onOpenMaterials}
                  className={technicianFieldUtilityActionClass}
                  aria-label="Log materials"
                >
                  <Package
                    className="h-4 w-4 shrink-0 text-cyan-700"
                    aria-hidden
                  />
                  Materials
                </button>
              ) : null}
              {onOpenReceipts ? (
                <button
                  type="button"
                  disabled={controlsLocked}
                  onClick={onOpenReceipts}
                  className={technicianFieldUtilityActionClass}
                  aria-label="Log receipts"
                >
                  <Receipt
                    className="h-4 w-4 shrink-0 text-amber-600"
                    aria-hidden
                  />
                  Receipts
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {error ? (
          <p className="break-words text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </section>

      {showCompleteSheet ? (
        <CompleteJobSheet
          jobId={jobId}
          customerId={customerId}
          currentStatus={status}
          aiFeaturesEnabled={aiFeaturesEnabled}
          onClose={() => setShowCompleteSheet(false)}
          onCompleted={(nextStatus, outcome) => {
            if (outcome === "success") {
              onStatusUpdated?.(nextStatus);
            }
          }}
        />
      ) : null}
    </>
  );
}
