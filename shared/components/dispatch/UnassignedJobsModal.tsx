"use client";

import { Inbox } from "lucide-react";
import type { DispatchJob } from "@/shared/types/dispatch";
import { northStarDispatchTokens as dt } from "@/shared/design-system/north-star/tokens";
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
  northStar?: boolean;
};

const TITLE_ID = "unassigned-jobs-modal-title";

export function UnassignedJobsModal({
  jobs,
  selectedJobId,
  onSelectJob,
  onClose,
  northStar = false,
}: UnassignedJobsModalProps) {
  return (
    <MobileSheet
      onClose={onClose}
      ariaLabelledBy={TITLE_ID}
      variant="responsive"
    >
      <MobileSheetPanel
        maxWidth="2xl"
        tone={northStar ? undefined : "amber"}
        responsiveRounded
        unstyled={northStar}
        className={
          northStar
            ? dt.unassignedSheetPanel
            : "flex h-[90dvh] max-h-[90dvh] min-h-0 flex-col sm:h-auto sm:max-h-[80vh]"
        }
      >
        {northStar ? (
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(214,190,120,0.32)] to-transparent"
            aria-hidden
          />
        ) : null}
        <MobileSheetHeader
          titleId={TITLE_ID}
          title="Unassigned Jobs"
          subtitle={`${jobs.length} ${jobs.length === 1 ? "job" : "jobs"} need assignment`}
          onClose={onClose}
          safeAreaTop
          headerClassName={
            northStar
              ? dt.unassignedSheetHeader
              : "border-amber-200/80 bg-amber-50/40"
          }
          icon={
            <MobileSheetHeaderIcon
              className={
                northStar
                  ? dt.unassignedSheetHeaderIcon
                  : "h-9 w-9 bg-amber-100 text-amber-700"
              }
            >
              <Inbox className="h-4 w-4" />
            </MobileSheetHeaderIcon>
          }
          trailing={
            northStar ? (
              <span className={dt.unassignedSheetBadge}>{jobs.length}</span>
            ) : (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                {jobs.length}
              </span>
            )
          }
        />

        <MobileSheetBody
          unstyled
          className={
            northStar
              ? `min-w-0 max-w-full overflow-x-hidden bg-[#261f17] p-3 pb-[max(5.5rem,calc(1.25rem+env(safe-area-inset-bottom)))] sm:p-4 sm:pb-[max(4rem,calc(1rem+env(safe-area-inset-bottom)))]`
              : "min-w-0 max-w-full overflow-x-hidden p-3 pb-[max(5rem,calc(1rem+env(safe-area-inset-bottom)))] sm:p-4 sm:pb-[max(4rem,calc(1rem+env(safe-area-inset-bottom)))]"
          }
        >
          {jobs.length === 0 ? (
            northStar ? (
              <div className={dt.unassignedSheetEmpty}>
                <p className="text-sm font-medium text-[#D7CDBD]">
                  No unassigned jobs match your filters
                </p>
                <p className="mt-1 text-xs text-[#AEB6C2]">
                  Adjust search or filters to see the queue
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-amber-200 bg-amber-50/30 px-4 py-10 text-center">
                <p className="text-sm font-medium text-slate-600">
                  No unassigned jobs match your filters
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Adjust search or filters to see the queue
                </p>
              </div>
            )
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {jobs.map((job) => (
                <DispatchJobCard
                  key={job.id}
                  job={job}
                  compact
                  isSelected={selectedJobId === job.id}
                  onSelect={onSelectJob}
                  northStar={northStar}
                />
              ))}
            </div>
          )}
        </MobileSheetBody>
      </MobileSheetPanel>
    </MobileSheet>
  );
}
