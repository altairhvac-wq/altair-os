"use client";

import { useMemo, useState } from "react";
import { Camera } from "lucide-react";
import { JobAttachmentCard } from "./JobAttachmentCard";
import { JobAttachmentUploadBox } from "./JobAttachmentUploadBox";
import {
  JOB_ATTACHMENT_TYPE_OPTIONS,
  type JobAttachment,
  type JobAttachmentType,
} from "@/shared/types/job-attachment";
import { JOB_DETAIL_ATTACHMENTS_ANCHOR } from "@/shared/lib/jobs/job-detail-anchors";
import {
  jobDetailEmptyHintClass,
  jobDetailEmptyStateClass,
  jobDetailEmptyTitleClass,
  jobDetailSectionIconWrapClass,
  jobDetailSectionSubtitleClass,
  jobDetailSectionTitleClass,
  resolveJobDetailSectionClass,
} from "@/shared/components/jobs/job-detail-section-styles";

type JobAttachmentsSectionProps = {
  jobId: string;
  attachments: JobAttachment[];
  canUpload: boolean;
  northStar?: boolean;
};

type FilterValue = "all" | JobAttachmentType;

export function JobAttachmentsSection({
  jobId,
  attachments,
  canUpload,
  northStar = false,
}: JobAttachmentsSectionProps) {
  const [filter, setFilter] = useState<FilterValue>("all");

  const filteredAttachments = useMemo(() => {
    if (filter === "all") {
      return attachments;
    }

    return attachments.filter(
      (attachment) => attachment.attachmentType === filter,
    );
  }, [attachments, filter]);

  const filterOptions: { value: FilterValue; label: string }[] = [
    { value: "all", label: "All" },
    ...JOB_ATTACHMENT_TYPE_OPTIONS.map((option) => ({
      value: option.value,
      label: option.label,
    })),
  ];

  return (
    <section
      id={northStar ? JOB_DETAIL_ATTACHMENTS_ANCHOR : undefined}
      className={`${resolveJobDetailSectionClass(northStar)} scroll-mt-6`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={jobDetailSectionIconWrapClass(northStar)}>
            <Camera className={northStar ? "h-4 w-4" : "h-5 w-5 text-blue-600"} />
          </div>
          <div>
            <h2 className={jobDetailSectionTitleClass(northStar)}>
              Photos & attachments
            </h2>
            <p className={jobDetailSectionSubtitleClass(northStar)}>
              Before/after photos, diagnostics, and job documentation
            </p>
          </div>
        </div>
      </div>

      {canUpload ? (
        <div className="mt-4">
          <JobAttachmentUploadBox jobId={jobId} />
        </div>
      ) : null}

      {attachments.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {filterOptions.map((option) => {
            const isActive = filter === option.value;
            const count =
              option.value === "all"
                ? attachments.length
                : attachments.filter(
                    (attachment) => attachment.attachmentType === option.value,
                  ).length;

            if (option.value !== "all" && count === 0) {
              return null;
            }

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilter(option.value)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  isActive
                    ? northStar
                      ? "bg-[#C9A44D] text-[#17130E]"
                      : "bg-cyan-600 text-white"
                    : northStar
                      ? "bg-[#EFE4CB] text-[#4F4638] hover:bg-[#E6D092]/40"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {option.label}
                {count > 0 ? ` (${count})` : ""}
              </button>
            );
          })}
        </div>
      ) : null}

      {filteredAttachments.length === 0 ? (
        <div className={`mt-4 ${jobDetailEmptyStateClass(northStar)}`}>
          <p className={jobDetailEmptyTitleClass(northStar)}>
            {attachments.length === 0
              ? "No attachments yet"
              : "No attachments in this category"}
          </p>
          <p className={jobDetailEmptyHintClass(northStar)}>
            {canUpload
              ? "Upload before/after photos or job documentation from the field."
              : "Attachments uploaded for this job will appear here."}
          </p>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAttachments.map((attachment) => (
            <JobAttachmentCard key={attachment.id} attachment={attachment} />
          ))}
        </div>
      )}
    </section>
  );
}
