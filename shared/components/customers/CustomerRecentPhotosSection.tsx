import Link from "next/link";
import { formatJobAttachmentType, type JobAttachment } from "@/shared/types/job-attachment";

type CustomerRecentPhotosSectionProps = {
  customerId: string;
  attachments: JobAttachment[];
};

export function CustomerRecentPhotosSection({
  customerId,
  attachments,
}: CustomerRecentPhotosSectionProps) {
  if (attachments.length === 0) {
    return null;
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <h2 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        Recent photos
      </h2>

      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {attachments.map((attachment) => (
          <Link
            key={attachment.id}
            href={`/jobs/${attachment.jobId}`}
            className="w-36 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white transition-colors hover:border-cyan-300"
          >
            <div className="aspect-square bg-slate-100">
              {attachment.signedUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={attachment.signedUrl}
                  alt={attachment.fileName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center px-2 text-center text-[11px] font-medium text-slate-600">
                  {attachment.fileName}
                </div>
              )}
            </div>
            <div className="px-2 py-2">
              <p className="truncate text-xs font-semibold text-slate-900">
                {formatJobAttachmentType(attachment.attachmentType)}
              </p>
              <p className="truncate text-[11px] text-slate-500">
                {attachment.fileName}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
