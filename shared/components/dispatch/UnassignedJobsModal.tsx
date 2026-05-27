"use client";

import { Inbox } from "lucide-react";
import type { DispatchJob } from "@/shared/types/dispatch";
import {
  MobileSheet,
  MobileSheetBody,
  MobileSheetHeader,
  MobileSheetHeaderIcon,
  MobileSheetPanel,
} from "@/shared/components/ui/mobile-sheet";
import { DispatchJobCard } from "./DispatchJobCard";

type UnassignedJobsModalProps = {
  jobs: DispatchJob[];
  selectedJobId: string | null;
  onSelectJob: (job: DispatchJob) => void;
  onClose: () => void;
};

const TITLE_ID = "unassigned-jobs-modal-title";

export function UnassignedJobsModal({
  jobs,
  selectedJobId,
  onSelectJob,
  onClose,
}: UnassignedJobsModalProps) {
  return (
    <MobileSheet
      onClose={onClose}
      ariaLabelledBy={TITLE_ID}
      variant="responsive"
    >
      <MobileSheetPanel
        maxWidth="2xl"
        tone="amber"
        responsiveRounded
        className="sm:max-h-[80vh]"
      >
        <MobileSheetHeader
          titleId={TITLE_ID}
          title="Unassigned Jobs"
          subtitle={`${jobs.length} ${jobs.length === 1 ? "job" : "jobs"} need assignment`}
          onClose={onClose}
          headerClassName="border-amber-200/80 bg-amber-50/40"
          icon={
            <MobileSheetHeaderIcon className="h-9 w-9 bg-amber-100 text-amber-700">
              <Inbox className="h-4 w-4" />
            </MobileSheetHeaderIcon>
          }
          trailing={
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
              {jobs.length}
            </span>
          }
        />

        <MobileSheetBody unstyled className="p-3 sm:p-4">
          {jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-amber-200 bg-amber-50/30 px-4 py-10 text-center">
              <p className="text-sm font-medium text-slate-600">
                No unassigned jobs match your filters
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Adjust search or filters to see the queue
              </p>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {jobs.map((job) => (
                <DispatchJobCard
                  key={job.id}
                  job={job}
                  compact
                  isSelected={selectedJobId === job.id}
                  onSelect={onSelectJob}
                />
              ))}
            </div>
          )}
        </MobileSheetBody>
      </MobileSheetPanel>
    </MobileSheet>
  );
}
