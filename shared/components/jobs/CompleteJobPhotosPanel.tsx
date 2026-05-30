"use client";

import { JobAttachmentUploadBox } from "@/shared/components/jobs/JobAttachmentUploadBox";

type CompleteJobPhotosPanelProps = {
  jobId: string;
  onPendingChange?: (isPending: boolean) => void;
};

export function CompleteJobPhotosPanel({
  jobId,
  onPendingChange,
}: CompleteJobPhotosPanelProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3">
        <p className="text-sm font-semibold text-slate-900">Job photos</p>
        <p className="mt-0.5 text-xs text-slate-500">
          Add before/after or completion photos before marking work complete.
        </p>
      </div>
      <JobAttachmentUploadBox
        jobId={jobId}
        defaultAttachmentType="after"
        compact
        captureEnvironment
        showTypeSelector={false}
        onPendingChange={onPendingChange}
      />
    </div>
  );
}
