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
import { adminCardSectionClass } from "@/shared/lib/admin-density";

type JobAttachmentsSectionProps = {
  jobId: string;
  attachments: JobAttachment[];
  canUpload: boolean;
};

type FilterValue = "all" | JobAttachmentType;

export function JobAttachmentsSection({
  jobId,
  attachments,
  canUpload,
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
    <section className={adminCardSectionClass}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 ring-1 ring-blue-600/10">
            <Camera className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Photos & attachments
            </h2>
            <p className="mt-1 text-sm text-slate-600">
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
                    ? "bg-cyan-600 text-white"
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
        <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center">
          <p className="text-sm font-medium text-slate-700">
            {attachments.length === 0
              ? "No attachments yet"
              : "No attachments in this category"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
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
