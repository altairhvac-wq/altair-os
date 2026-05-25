import { FileText, ImageIcon } from "lucide-react";
import {
  formatJobAttachmentFileSize,
  formatJobAttachmentType,
  isJobAttachmentImage,
  type JobAttachment,
} from "@/shared/types/job-attachment";

type JobAttachmentCardProps = {
  attachment: JobAttachment;
};

export function JobAttachmentCard({ attachment }: JobAttachmentCardProps) {
  const isImage = isJobAttachmentImage(attachment.mimeType);
  const fileSizeLabel = formatJobAttachmentFileSize(attachment.fileSize);

  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="relative aspect-[4/3] bg-slate-100">
        {isImage && attachment.signedUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={attachment.signedUrl}
            alt={attachment.caption ?? attachment.fileName}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
            {attachment.fileType === "pdf" ? (
              <FileText className="h-8 w-8 text-slate-400" />
            ) : (
              <ImageIcon className="h-8 w-8 text-slate-400" />
            )}
            <p className="text-xs font-medium text-slate-600">
              {attachment.fileName}
            </p>
          </div>
        )}

        <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700 shadow-sm ring-1 ring-slate-200">
          {formatJobAttachmentType(attachment.attachmentType)}
        </span>
      </div>

      <div className="space-y-1 px-3 py-2.5">
        <p className="truncate text-sm font-semibold text-slate-900">
          {attachment.fileName}
        </p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
          {attachment.uploadedByName ? <span>{attachment.uploadedByName}</span> : null}
          {fileSizeLabel ? <span>{fileSizeLabel}</span> : null}
        </div>
        {attachment.caption ? (
          <p className="line-clamp-2 text-xs text-slate-600">{attachment.caption}</p>
        ) : null}
      </div>
    </article>
  );
}
