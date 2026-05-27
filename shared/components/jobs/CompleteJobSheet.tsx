"use client";

import { useState, useTransition } from "react";
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
import { CompleteJobPhotosPanel } from "@/shared/components/jobs/CompleteJobPhotosPanel";
import {
  MobileSheet,
  MobileSheetBody,
  MobileSheetFooter,
  MobileSheetHeader,
  MobileSheetHeaderIcon,
  MobileSheetPanel,
} from "@/shared/components/ui/mobile-sheet";
import type { JobStatus } from "@/shared/types/job";

type CompleteJobSheetProps = {
  jobId: string;
  customerId: string;
  currentStatus: JobStatus;
  onClose: () => void;
  onCompleted?: (status: JobStatus) => void;
};

const TITLE_ID = "complete-job-sheet-title";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20";

const labelClass = "mb-1.5 block text-xs font-semibold text-slate-600";

export function CompleteJobSheet({
  jobId,
  customerId,
  currentStatus,
  onClose,
  onCompleted,
}: CompleteJobSheetProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [completionNotes, setCompletionNotes] = useState("");
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [equipmentPayload, setEquipmentPayload] =
    useState<CompleteJobEquipmentPayload>(EMPTY_COMPLETE_JOB_EQUIPMENT_PAYLOAD);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      if (equipmentPayload.mode === "create" && equipmentPayload.data) {
        if (!equipmentPayload.data.name.trim()) {
          setError("Equipment name is required when adding equipment.");
          return;
        }

        const equipmentResult = await createCustomerEquipmentAction(
          customerId,
          equipmentPayload.data,
          jobId,
        );

        if (equipmentResult.error) {
          setError(equipmentResult.error);
          return;
        }
      }

      if (
        equipmentPayload.mode === "update" &&
        equipmentPayload.equipmentId &&
        equipmentPayload.data
      ) {
        if (!equipmentPayload.data.name.trim()) {
          setError("Equipment name is required when updating equipment.");
          return;
        }

        const equipmentResult = await updateCustomerEquipmentAction(
          equipmentPayload.equipmentId,
          equipmentPayload.data,
          jobId,
        );

        if (equipmentResult.error) {
          setError(equipmentResult.error);
          return;
        }
      }

      const result = await updateJobStatusAction(jobId, "complete", currentStatus, {
        completionNotes: completionNotes.trim() || undefined,
        followUpNotes: followUpNotes.trim() || undefined,
      });

      if (result.error || !result.job) {
        setError(result.error ?? "Failed to complete job.");
        return;
      }

      onCompleted?.(result.job.status);
      onClose();
      router.refresh();
    });
  }

  return (
    <MobileSheet
      onClose={onClose}
      closeDisabled={isPending}
      ariaLabelledBy={TITLE_ID}
      variant="responsive"
      zIndex={60}
    >
      <MobileSheetPanel maxWidth="lg" responsiveRounded>
        <MobileSheetHeader
          titleId={TITLE_ID}
          title="Complete work"
          subtitle="Add notes before marking this job complete."
          onClose={onClose}
          closeDisabled={isPending}
          icon={
            <MobileSheetHeaderIcon className="bg-emerald-50 ring-1 ring-emerald-600/15">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </MobileSheetHeaderIcon>
          }
        />

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <MobileSheetBody className="space-y-4">
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

            <CompleteJobPhotosPanel jobId={jobId} />

            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </MobileSheetBody>

          <MobileSheetFooter>
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Completing..." : "Complete work"}
            </button>
          </MobileSheetFooter>
        </form>
      </MobileSheetPanel>
    </MobileSheet>
  );
}
