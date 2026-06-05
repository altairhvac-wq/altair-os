"use client";

import { useState } from "react";
import { Camera, ChevronDown } from "lucide-react";
import { JobAttachmentUploadBox } from "@/shared/components/jobs/JobAttachmentUploadBox";
import {
  technicianFieldJobDetailsClass,
  technicianFieldJobDetailsSummaryClass,
} from "@/shared/components/technician/technician-field-styles";

type CompleteJobPhotosPanelProps = {
  jobId: string;
  onPendingChange?: (isPending: boolean) => void;
};

const detailsClass = technicianFieldJobDetailsClass;
const summaryClass = `${technicianFieldJobDetailsSummaryClass} justify-between`;

export function CompleteJobPhotosPanel({
  jobId,
  onPendingChange,
}: CompleteJobPhotosPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <details
      className={detailsClass}
      open={open}
      onToggle={(event) => {
        setOpen((event.currentTarget as HTMLDetailsElement).open);
      }}
    >
      <summary className={summaryClass}>
        <span className="inline-flex items-center gap-1.5">
          <Camera className="h-3.5 w-3.5 text-slate-400" aria-hidden />
          Job photos
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </summary>

      {open ? (
        <div className="space-y-3 px-3 pb-3 pt-1">
          <p className="text-xs leading-relaxed text-slate-500">
            Add before/after or completion photos before marking work complete.
          </p>
          <JobAttachmentUploadBox
            jobId={jobId}
            defaultAttachmentType="after"
            compact
            captureEnvironment
            showTypeSelector={false}
            onPendingChange={onPendingChange}
          />
        </div>
      ) : null}
    </details>
  );
}
