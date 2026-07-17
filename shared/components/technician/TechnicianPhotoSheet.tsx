"use client";

import { useState } from "react";
import { Camera } from "lucide-react";
import { JobAttachmentUploadBox } from "@/shared/components/jobs/JobAttachmentUploadBox";
import {
  MobileSheet,
  MobileSheetBody,
  MobileSheetFooter,
  MobileSheetHeader,
  MobileSheetHeaderIcon,
  MobileSheetPanel,
} from "@/shared/components/ui/mobile-sheet";

type TechnicianPhotoSheetProps = {
  jobId: string;
  jobNumber: string;
  onClose: () => void;
  onUploaded?: () => void;
};

const TITLE_ID = "technician-photo-sheet-title";

export function TechnicianPhotoSheet({
  jobId,
  jobNumber,
  onClose,
  onUploaded,
}: TechnicianPhotoSheetProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);

  return (
    <MobileSheet
      onClose={onClose}
      closeDisabled={isUploading}
      ariaLabelledBy={TITLE_ID}
    >
      <MobileSheetPanel>
        <MobileSheetHeader
          titleId={TITLE_ID}
          title="Add job photo"
          subtitle={`${jobNumber} — snap or upload on site`}
          onClose={onClose}
          closeDisabled={isUploading}
          icon={
            <MobileSheetHeaderIcon className="bg-violet-50 ring-1 ring-violet-600/15">
              <Camera className="h-5 w-5 text-violet-600" />
            </MobileSheetHeaderIcon>
          }
        />
        <MobileSheetBody className="pb-2">
          {uploadedCount > 0 ? (
            <p className="mb-3 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-800">
              {uploadedCount === 1
                ? "1 photo saved — add another or done"
                : `${uploadedCount} photos saved — add another or done`}
            </p>
          ) : null}
          <JobAttachmentUploadBox
            jobId={jobId}
            defaultAttachmentType="general"
            compact
            captureEnvironment
            showTypeSelector={false}
            onPendingChange={setIsUploading}
            onUploaded={() => {
              setUploadedCount((current) => current + 1);
              onUploaded?.();
            }}
          />
        </MobileSheetBody>
        {uploadedCount > 0 ? (
          <MobileSheetFooter>
            <button
              type="button"
              disabled={isUploading}
              onClick={onClose}
              className="inline-flex min-h-12 w-full touch-manipulation items-center justify-center rounded-xl bg-cyan-600 px-4 py-3 text-base font-bold text-white shadow-sm transition-colors hover:bg-cyan-700 active:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Done
            </button>
          </MobileSheetFooter>
        ) : null}
      </MobileSheetPanel>
    </MobileSheet>
  );
}
