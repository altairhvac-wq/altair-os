"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import {
  createCustomerEquipmentAction,
  updateCustomerEquipmentAction,
} from "@/app/actions/customer-equipment";
import { updateJobStatusAction } from "@/app/actions/jobs";
import {
  CompleteJobEquipmentPanel,
  EMPTY_COMPLETE_JOB_EQUIPMENT_PAYLOAD,
  type CompleteJobEquipmentPayload,
} from "@/shared/components/equipment/CompleteJobEquipmentPanel";
import { validateCustomerEquipmentFormData } from "@/shared/types/customer-equipment";
import { CompleteJobPhotosPanel } from "@/shared/components/jobs/CompleteJobPhotosPanel";
import {
  MobileSheet,
  MobileSheetBody,
  MobileSheetFooter,
  MobileSheetHeader,
  MobileSheetHeaderIcon,
  MobileSheetPanel,
  MobileSheetSuccess,
} from "@/shared/components/ui/mobile-sheet";
import type { JobStatus } from "@/shared/types/job";

type CompleteJobSheetProps = {
  jobId: string;
  customerId: string;
  currentStatus: JobStatus;
  onClose: () => void;
  onCompleted?: (
    status: JobStatus,
    outcome: "success" | "partial",
  ) => void;
};

const TITLE_ID = "complete-job-sheet-title";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

const labelClass = "mb-1.5 block text-xs font-semibold text-slate-600";

function formatRetryError(message: string) {
  return `${message} Your entries are saved below — review and tap Complete work to try again.`;
}

export function CompleteJobSheet({
  jobId,
  customerId,
  currentStatus,
  onClose,
  onCompleted,
}: CompleteJobSheetProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const submitLockRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);
  const [completionNotes, setCompletionNotes] = useState("");
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [equipmentPayload, setEquipmentPayload] =
    useState<CompleteJobEquipmentPayload>(EMPTY_COMPLETE_JOB_EQUIPMENT_PAYLOAD);

  const closeDisabled = isPending || showSuccess || isPhotoUploading;
  const formDisabled = isPending || showSuccess;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLockRef.current || isPending || showSuccess) {
      return;
    }

    setError(null);
    submitLockRef.current = true;

    startTransition(async () => {
      if (equipmentPayload.mode === "create" && equipmentPayload.data) {
        const validationError = validateCustomerEquipmentFormData(
          equipmentPayload.data,
        );
        if (validationError) {
          setError(formatRetryError(validationError));
          submitLockRef.current = false;
          return;
        }

        const equipmentResult = await createCustomerEquipmentAction(
          customerId,
          equipmentPayload.data,
          jobId,
        );

        if (equipmentResult.error) {
          setError(formatRetryError(equipmentResult.error));
          submitLockRef.current = false;
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
          submitLockRef.current = false;
          return;
        }

        const equipmentResult = await updateCustomerEquipmentAction(
          equipmentPayload.equipmentId,
          equipmentPayload.data,
          jobId,
        );

        if (equipmentResult.error) {
          setError(formatRetryError(equipmentResult.error));
          submitLockRef.current = false;
          return;
        }
      }

      const result = await updateJobStatusAction(jobId, "complete", currentStatus, {
        completionNotes: completionNotes.trim() || undefined,
        followUpNotes: followUpNotes.trim() || undefined,
      });

      if (!result.job) {
        setError(
          formatRetryError(result.error ?? "Could not complete this job."),
        );
        submitLockRef.current = false;
        return;
      }

      if (result.error) {
        onCompleted?.(result.job.status, "partial");
        setError(
          `${result.error} The job is marked complete, but the office may still need to review something. You can close this form safely.`,
        );
        submitLockRef.current = false;
        router.refresh();
        return;
      }

      onCompleted?.(result.job.status, "success");
      router.refresh();
      setShowSuccess(true);
      window.setTimeout(() => {
        onClose();
      }, 700);
    });
  }

  return (
    <MobileSheet
      onClose={onClose}
      closeDisabled={closeDisabled}
      ariaLabelledBy={TITLE_ID}
      variant="responsive"
      zIndex={60}
    >
      <MobileSheetPanel maxWidth="lg" responsiveRounded>
        <MobileSheetHeader
          titleId={TITLE_ID}
          title="Complete work"
          subtitle="Submitting marks this job finished for dispatch. The office still reviews billing, labor, and any follow-up notes."
          onClose={onClose}
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
            subtitle="Saved for office review"
          />
        ) : (
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <MobileSheetBody className="space-y-4">
              {isPending ? (
                <p
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm font-medium text-emerald-800"
                  role="status"
                  aria-live="polite"
                >
                  Completing job… Please wait. Do not close this form until it
                  finishes.
                </p>
              ) : (
                <p className="text-xs leading-relaxed text-slate-500">
                  Add notes and optional photos, then submit once. If submission
                  fails, your entries stay here so you can retry.
                </p>
              )}

              <fieldset disabled={formDisabled} className="space-y-4">
                <div>
                  <label htmlFor="completion-notes" className={labelClass}>
                    Completion notes
                  </label>
                  <textarea
                    id="completion-notes"
                    rows={4}
                    value={completionNotes}
                    onChange={(event) => setCompletionNotes(event.target.value)}
                    placeholder="What was done on site?"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="follow-up-notes" className={labelClass}>
                    Follow-up recommendation{" "}
                    <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <textarea
                    id="follow-up-notes"
                    rows={3}
                    value={followUpNotes}
                    onChange={(event) => setFollowUpNotes(event.target.value)}
                    placeholder="Any recommended follow-up for the office?"
                    className={inputClass}
                  />
                </div>

                <CompleteJobEquipmentPanel
                  customerId={customerId}
                  value={equipmentPayload}
                  onChange={setEquipmentPayload}
                />

                <CompleteJobPhotosPanel
                  jobId={jobId}
                  onPendingChange={setIsPhotoUploading}
                />
              </fieldset>
            </MobileSheetBody>

            <MobileSheetFooter className={error ? "flex-col" : undefined}>
              {error ? (
                <p
                  className="w-full break-words text-sm text-red-600"
                  role="alert"
                  aria-live="polite"
                >
                  {error}
                </p>
              ) : null}
              <div className="flex w-full gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={closeDisabled}
                  className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={closeDisabled}
                  className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending ? "Completing job…" : "Complete work"}
                </button>
              </div>
            </MobileSheetFooter>
          </form>
        )}
      </MobileSheetPanel>
    </MobileSheet>
  );
}
