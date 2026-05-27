"use client";

import { useEffect } from "react";
import { Camera, X } from "lucide-react";
import { JobAttachmentUploadBox } from "@/shared/components/jobs/JobAttachmentUploadBox";

type TechnicianPhotoSheetProps = {
  jobId: string;
  jobNumber: string;
  onClose: () => void;
  onUploaded?: () => void;
};

export function TechnicianPhotoSheet({
  jobId,
  jobNumber,
  onClose,
  onUploaded,
}: TechnicianPhotoSheetProps) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center p-0"
      role="dialog"
      aria-modal="true"
      aria-labelledby="technician-photo-sheet-title"
    >
      <button
        type="button"
        aria-label="Close photo upload"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40"
      />
      <div className="relative z-10 flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-xl">
        <header className="flex shrink-0 items-center gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 ring-1 ring-violet-600/15">
            <Camera className="h-5 w-5 text-violet-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id="technician-photo-sheet-title"
              className="text-base font-bold text-slate-900"
            >
              Add job photo
            </h2>
            <p className="text-sm text-slate-500">
              {jobNumber} — snap or upload on site
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div
          className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
          data-no-pull-refresh
        >
          <JobAttachmentUploadBox
            jobId={jobId}
            defaultAttachmentType="general"
            compact
            captureEnvironment
            showTypeSelector={false}
            onUploaded={() => {
              onUploaded?.();
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}
