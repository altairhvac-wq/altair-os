"use client";

import { Camera } from "lucide-react";
import { JobAttachmentUploadBox } from "@/shared/components/jobs/JobAttachmentUploadBox";
import {
  MobileSheet,
  MobileSheetBody,
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
  return (
    <MobileSheet onClose={onClose} ariaLabelledBy={TITLE_ID}>
      <MobileSheetPanel>
        <MobileSheetHeader
          titleId={TITLE_ID}
          title="Add job photo"
          subtitle={`${jobNumber} — snap or upload on site`}
          onClose={onClose}
          icon={
            <MobileSheetHeaderIcon className="bg-violet-50 ring-1 ring-violet-600/15">
              <Camera className="h-5 w-5 text-violet-600" />
            </MobileSheetHeaderIcon>
          }
        />
        <MobileSheetBody className="pb-[max(1rem,env(safe-area-inset-bottom))]">
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
        </MobileSheetBody>
      </MobileSheetPanel>
    </MobileSheet>
  );
}
