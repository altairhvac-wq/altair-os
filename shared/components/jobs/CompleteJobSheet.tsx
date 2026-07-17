"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronDown, StickyNote } from "lucide-react";
import {
  createCustomerEquipmentAction,
  updateCustomerEquipmentAction,
} from "@/app/actions/customer-equipment";
import { getTechnicianTimeDashboardAction, shouldPromptShiftClockOutAfterJobCompleteAction } from "@/app/actions/time-entries";
import { updateJobStatusAction } from "@/app/actions/jobs";
import { CompleteWorkClockOutPrompt } from "@/shared/components/technician/CompleteWorkClockOutPrompt";
import {
  CompleteJobEquipmentPanel,
  EMPTY_COMPLETE_JOB_EQUIPMENT_PAYLOAD,
  type CompleteJobEquipmentPayload,
} from "@/shared/components/equipment/CompleteJobEquipmentPanel";
import { validateCustomerEquipmentFormData } from "@/shared/types/customer-equipment";
import { CompletionNotesAiAssistant } from "@/shared/components/jobs/CompletionNotesAiAssistant";
import { CompleteJobPhotosPanel } from "@/shared/components/jobs/CompleteJobPhotosPanel";
import {
  technicianFieldCloseoutCancelActionClass,
  technicianFieldCloseoutCompleteActionClass,
  technicianFieldCloseoutInputClass,
  technicianFieldCloseoutLabelClass,
  technicianFieldCloseoutPrimaryCardClass,
  technicianFieldJobDetailsClass,
  technicianFieldJobDetailsSummaryClass,
  technicianFieldSectionLabelClass,
  technicianFieldWorkflowHintClass,
} from "@/shared/components/technician/technician-field-styles";
import {
  MobileSheet,
  MobileSheetBody,
  MobileSheetFooter,
  MobileSheetHeader,
  MobileSheetHeaderIcon,
  MobileSheetPanel,
  MobileSheetSuccess,
} from "@/shared/components/ui/mobile-sheet";
import { formatConnectionCatchError } from "@/shared/lib/operational-errors";
import type { JobStatus } from "@/shared/types/job";

type CompleteJobSheetProps = {
  jobId: string;
  customerId: string;
  currentStatus: JobStatus;
  aiFeaturesEnabled?: boolean;
  onClose: () => void;
  onCompleted?: (
    status: JobStatus,
    outcome: "success" | "partial",
  ) => void;
};

const TITLE_ID = "complete-job-sheet-title";

const optionalDetailsClass = technicianFieldJobDetailsClass;
const optionalSummaryClass = `${technicianFieldJobDetailsSummaryClass} justify-between`;

function formatRetryError(message: string) {
  return `${message} Your entries are saved below — review and tap Complete work to try again.`;
}

export function CompleteJobSheet({
  jobId,
  customerId,
  currentStatus,
  aiFeaturesEnabled = false,
  onClose,
  onCompleted,
}: CompleteJobSheetProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const submitLockRef = useRef(false);
  const hadPartialSuccessRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successSubtitle, setSuccessSubtitle] = useState(
    "Saved for office review",
  );
  const [showClockOutPrompt, setShowClockOutPrompt] = useState(false);
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);
  const [completionNotes, setCompletionNotes] = useState("");
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [equipmentPayload, setEquipmentPayload] =
    useState<CompleteJobEquipmentPayload>(EMPTY_COMPLETE_JOB_EQUIPMENT_PAYLOAD);

  const closeDisabled = isPending || showSuccess || isPhotoUploading;
  const formDisabled = isPending || showSuccess;

  function handleClose() {
    if (hadPartialSuccessRef.current) {
      hadPartialSuccessRef.current = false;
      router.refresh();
    }
    onClose();
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLockRef.current || isPending || showSuccess) {
      return;
    }

    setError(null);
    submitLockRef.current = true;

    startTransition(async () => {
      let completedSuccessfully = false;

      try {
        if (equipmentPayload.mode === "create" && equipmentPayload.data) {
          const validationError = validateCustomerEquipmentFormData(
            equipmentPayload.data,
          );
          if (validationError) {
            setError(formatRetryError(validationError));
            return;
          }

          const equipmentResult = await createCustomerEquipmentAction(
            customerId,
            equipmentPayload.data,
            jobId,
          );

          if (equipmentResult.error) {
            setError(formatRetryError(equipmentResult.error));
            return;
          }
        }

        if (
          equipmentPayload.mode === "update" &&
          equipmentPayload.equipmentId &&
          equipmentPayload.data
        ) {
          const validationError = validateCustomerEquipmentFormData(
            equipmentPayload.data,
          );
          if (validationError) {
            setError(formatRetryError(validationError));
            return;
          }

          const equipmentResult = await updateCustomerEquipmentAction(
            equipmentPayload.equipmentId,
            equipmentPayload.data,
            jobId,
          );

          if (equipmentResult.error) {
            setError(formatRetryError(equipmentResult.error));
            return;
          }
        }

        const result = await updateJobStatusAction(
          jobId,
          "complete",
          currentStatus,
          {
            completionNotes: completionNotes.trim() || undefined,
            followUpNotes: followUpNotes.trim() || undefined,
          },
        );

        if (!result.job) {
          setError(
            formatRetryError(result.error ?? "Could not complete this job."),
          );
          return;
        }

        if (result.error) {
          hadPartialSuccessRef.current = true;
          onCompleted?.(result.job.status, "partial");
          setError(
            `${result.error} The job is marked complete, but the office may still need to review something. You can close this form safely.`,
          );
          return;
        }

        onCompleted?.(result.job.status, "success");
        router.refresh();
        completedSuccessfully = true;
      } catch {
        setError(
          formatRetryError(
            formatConnectionCatchError(
              "Connection problem. The job may not be complete yet.",
            ),
          ),
        );
        return;
      } finally {
        if (!completedSuccessfully) {
          submitLockRef.current = false;
        }
      }

      // Clock-out prompt fetches are best-effort after a successful complete.
      // Do not surface a "not complete" error if only these follow-ups fail.
      try {
        const [timeResult, promptResult] = await Promise.all([
          getTechnicianTimeDashboardAction(),
          shouldPromptShiftClockOutAfterJobCompleteAction(jobId),
        ]);

        if (timeResult.state?.openClockEntry && promptResult.shouldPrompt) {
          setShowClockOutPrompt(true);
          setShowSuccess(true);
          return;
        }
      } catch {
        // Job already completed — fall through to success close.
      } finally {
        submitLockRef.current = false;
      }

      setShowSuccess(true);
      window.setTimeout(() => {
        handleClose();
      }, 700);
    });
  }

  function handleClockOutPromptClose() {
    setShowClockOutPrompt(false);
    handleClose();
  }

  return (
    <>
    <MobileSheet
      onClose={handleClose}
      closeDisabled={closeDisabled}
      ariaLabelledBy={TITLE_ID}
      variant="responsive"
      zIndex={60}
    >
      <MobileSheetPanel maxWidth="lg" responsiveRounded>
        <MobileSheetHeader
          titleId={TITLE_ID}
          title="Complete work"
          subtitle="Tell us what you did, then submit when ready."
          onClose={handleClose}
          closeDisabled={closeDisabled}
          icon={
            <MobileSheetHeaderIcon className="bg-emerald-50 ring-1 ring-emerald-600/15">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </MobileSheetHeaderIcon>
          }
        />

        {showSuccess ? (
          <MobileSheetSuccess
            title="Job completed"
            subtitle={successSubtitle}
          />
        ) : (
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <MobileSheetBody className="space-y-5 pb-2">
              {isPending ? (
                <p
                  className="rounded-xl bg-emerald-50/80 px-3.5 py-3 text-sm font-medium text-emerald-800"
                  role="status"
                  aria-live="polite"
                >
                  Completing job… Please wait. Do not close this form until it
                  finishes.
                </p>
              ) : (
                <p className={technicianFieldWorkflowHintClass}>
                  Start with what you did on site. Photos, equipment, and
                  follow-up notes are optional.
                </p>
              )}

              <fieldset disabled={formDisabled} className="space-y-5">
                <section>
                  <h3 className={technicianFieldSectionLabelClass}>
                    What you did
                  </h3>
                  <div className={`${technicianFieldCloseoutPrimaryCardClass} mt-2 space-y-3`}>
                    <div>
                      <label htmlFor="completion-notes" className={technicianFieldCloseoutLabelClass}>
                        Completion notes
                      </label>
                      <textarea
                        id="completion-notes"
                        rows={4}
                        value={completionNotes}
                        onChange={(event) => setCompletionNotes(event.target.value)}
                        placeholder="What was done on site?"
                        className={technicianFieldCloseoutInputClass}
                      />
                      <CompletionNotesAiAssistant
                        jobId={jobId}
                        notes={completionNotes}
                        onNotesChange={setCompletionNotes}
                        followUpNotes={followUpNotes}
                        aiFeaturesEnabled={aiFeaturesEnabled}
                        disabled={formDisabled}
                        variant="field"
                      />
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className={technicianFieldSectionLabelClass}>
                    Optional
                  </h3>
                  <div className="mt-2 space-y-2">
                    <details
                      className={optionalDetailsClass}
                      open={followUpOpen}
                      onToggle={(event) => {
                        setFollowUpOpen(
                          (event.currentTarget as HTMLDetailsElement).open,
                        );
                      }}
                    >
                      <summary className={optionalSummaryClass}>
                        <span className="inline-flex items-center gap-1.5">
                          <StickyNote className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                          Follow-up recommendation
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                            followUpOpen ? "rotate-180" : ""
                          }`}
                          aria-hidden
                        />
                      </summary>
                      <div className="px-3 pb-3 pt-1">
                        <label htmlFor="follow-up-notes" className="sr-only">
                          Follow-up recommendation
                        </label>
                        <textarea
                          id="follow-up-notes"
                          rows={3}
                          value={followUpNotes}
                          onChange={(event) => setFollowUpNotes(event.target.value)}
                          placeholder="Any recommended follow-up for the office?"
                          className={technicianFieldCloseoutInputClass}
                        />
                      </div>
                    </details>

                    <CompleteJobEquipmentPanel
                      customerId={customerId}
                      value={equipmentPayload}
                      onChange={setEquipmentPayload}
                    />

                    <CompleteJobPhotosPanel
                      jobId={jobId}
                      onPendingChange={setIsPhotoUploading}
                    />
                  </div>
                </section>
              </fieldset>
            </MobileSheetBody>

            <MobileSheetFooter className={error ? "flex-col gap-3" : "flex-col gap-2.5"}>
              {error ? (
                <p
                  className="w-full break-words rounded-xl bg-red-50/80 px-3 py-2.5 text-sm text-red-700"
                  role="alert"
                  aria-live="polite"
                >
                  {error}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={closeDisabled}
                className={technicianFieldCloseoutCompleteActionClass}
              >
                {isPending ? "Completing job…" : "Complete work"}
              </button>
              <button
                type="button"
                onClick={handleClose}
                disabled={closeDisabled}
                className={technicianFieldCloseoutCancelActionClass}
              >
                Cancel
              </button>
            </MobileSheetFooter>
          </form>
        )}
      </MobileSheetPanel>
    </MobileSheet>

    {showClockOutPrompt ? (
      <CompleteWorkClockOutPrompt
        onClose={handleClockOutPromptClose}
        onStayClockedIn={handleClockOutPromptClose}
      />
    ) : null}
    </>
  );
}
