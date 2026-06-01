"use client";

import {
  MobileActionButton,
  MobileActionRecordRow,
} from "@/shared/components/dashboard/mobile-action-sheets/MobileActionRecordRow";
import type { MobileActionSheetData } from "@/shared/lib/mobile-action-dashboard";
import { formatCurrency } from "@/shared/types/customer";

type ReadyToInvoiceActionContentProps = {
  sheetData: MobileActionSheetData;
  totalCount: number;
};

function buildCreateInvoiceHref(jobId: string): string {
  const params = new URLSearchParams({ create: "1", jobId });
  return `/invoices?${params.toString()}`;
}

export function ReadyToInvoiceActionContent({
  sheetData,
  totalCount,
}: ReadyToInvoiceActionContentProps) {
  const { readyToInvoiceJobs, access } = sheetData;
  const canCreateInvoice = access.canViewBilling;
  const hiddenCount = Math.max(0, totalCount - readyToInvoiceJobs.length);

  if (readyToInvoiceJobs.length === 0) {
    return (
      <p className="text-sm text-slate-600">
        No completed jobs in the preview. Open reports for the full queue.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="space-y-1.5">
        {readyToInvoiceJobs.map((job) => {
          const revenueHint =
            job.approvedEstimateAmount != null
              ? `Est. ${formatCurrency(job.approvedEstimateAmount)}`
              : job.daysSinceCompletion > 0
                ? `${job.daysSinceCompletion}d since completion`
                : undefined;

          return (
            <MobileActionRecordRow
              key={job.jobId}
              title={`Job ${job.jobNumber}`}
              subtitle={job.customerName}
              meta={revenueHint}
              actions={
                <>
                  {canCreateInvoice ? (
                    <MobileActionButton
                      label="Create invoice"
                      href={buildCreateInvoiceHref(job.jobId)}
                    />
                  ) : null}
                  <MobileActionButton
                    label="Open job"
                    href={`/jobs/${job.jobId}`}
                    variant="secondary"
                  />
                </>
              }
            />
          );
        })}
      </ul>

      {hiddenCount > 0 ? (
        <p className="text-center text-xs font-medium text-slate-500">
          +{hiddenCount} more in reports
        </p>
      ) : null}

      <MobileActionButton
        label="View invoicing queue"
        href="/reports?queue=invoicing"
        variant="secondary"
      />
    </div>
  );
}
