"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { assignJobAction } from "@/app/actions/dispatch";
import { DispatchTechnicianRecommendation } from "@/shared/components/dashboard/operational-resolution-queue/DispatchTechnicianRecommendation";
import { recommendTechnicianForJob } from "@/shared/lib/dispatch-recommendations";
import {
  resendEstimateEmailAction,
  updateEstimateStatusAction,
} from "@/app/actions/estimates";
import { resendInvoiceEmailAction, sendInvoiceAction } from "@/app/actions/invoices";
import {
  MobileActionButton,
} from "@/shared/components/dashboard/mobile-action-sheets/MobileActionRecordRow";
import { OperationalResolutionQueueItemView } from "@/shared/components/dashboard/operational-resolution-queue/OperationalResolutionQueueItemView";
import type {
  OperationalResolutionQueueItem,
  OperationalResolutionQueueSheetData,
} from "@/shared/lib/operational-resolution-queue";
import { getReadyToInvoiceHref } from "@/shared/lib/operational-resolution-queue";
import { canBatchSendEstimate } from "@/shared/lib/estimate-batch-send";
import { canBatchSendInvoice } from "@/shared/lib/invoice-batch-send";
import { hasValidCustomerEmailForSend } from "@/shared/lib/operational-errors";
import { formatCurrency } from "@/shared/types/customer";
import { formatDispatchStatus } from "@/shared/types/dispatch";
import { formatJobStatus } from "@/shared/types/job";
import { canResendEstimateEmail } from "@/shared/types/estimate";
import { canResendInvoiceEmail } from "@/shared/types/invoice";
import { canRecordInvoicePayment } from "@/shared/types/invoice-payment";

type OperationalResolutionQueueItemAdapterProps = {
  item: OperationalResolutionQueueItem;
  sheetData: OperationalResolutionQueueSheetData;
  onResolved: (itemId: string) => void;
};

export function OperationalResolutionQueueItemAdapter({
  item,
  sheetData,
  onResolved,
}: OperationalResolutionQueueItemAdapterProps) {
  switch (item.queueType) {
    case "unassigned_job":
      return (
        <UnassignedJobQueueItemAdapter
          item={item}
          sheetData={sheetData}
          onResolved={onResolved}
        />
      );
    case "ready_to_invoice":
      return <ReadyToInvoiceQueueItemAdapter item={item} />;
    case "overdue_invoice":
      return (
        <OverdueInvoiceQueueItemAdapter
          item={item}
          sheetData={sheetData}
          onResolved={onResolved}
        />
      );
    case "unsent_invoice":
      return (
        <UnsentInvoiceQueueItemAdapter
          item={item}
          sheetData={sheetData}
          onResolved={onResolved}
        />
      );
    case "unsent_estimate":
      return (
        <UnsentEstimateQueueItemAdapter
          item={item}
          sheetData={sheetData}
          onResolved={onResolved}
        />
      );
    case "stale_sent_estimate":
      return (
        <StaleSentEstimateQueueItemAdapter
          item={item}
          sheetData={sheetData}
          onResolved={onResolved}
        />
      );
    case "needs_review":
      return <NeedsReviewQueueItemAdapter item={item} />;
    case "lead_follow_up":
      return <LeadFollowUpQueueItemAdapter item={item} onResolved={onResolved} />;
    case "stalled_job":
      return <StalledJobQueueItemAdapter item={item} onResolved={onResolved} />;
    default:
      return null;
  }
}

function StalledJobQueueItemAdapter({
  item,
  onResolved,
}: {
  item: Extract<OperationalResolutionQueueItem, { queueType: "stalled_job" }>;
  onResolved: (itemId: string) => void;
}) {
  const statusMeta = formatJobStatus(item.entry.status);

  return (
    <OperationalResolutionQueueItemView
      item={{ ...item, meta: `${statusMeta} · ${item.entry.daysSinceActivity}d inactive` }}
    >
      {item.openHref ? (
        <MobileActionButton
          label={item.primaryAction.label}
          href={item.openHref}
          onClick={() => onResolved(item.id)}
        />
      ) : null}
      <MobileActionButton
        label="Open dispatch"
        href="/dispatch"
        variant="secondary"
      />
    </OperationalResolutionQueueItemView>
  );
}

function LeadFollowUpQueueItemAdapter({
  item,
  onResolved,
}: {
  item: Extract<OperationalResolutionQueueItem, { queueType: "lead_follow_up" }>;
  onResolved: (itemId: string) => void;
}) {
  return (
    <OperationalResolutionQueueItemView item={item}>
      {item.openHref ? (
        <MobileActionButton
          label={item.primaryAction.label}
          href={item.openHref}
          onClick={() => onResolved(item.id)}
        />
      ) : null}
      {item.lead.phone ? (
        <MobileActionButton
          label="Call lead"
          href={`tel:${item.lead.phone}`}
          variant="secondary"
        />
      ) : null}
    </OperationalResolutionQueueItemView>
  );
}

function UnassignedJobQueueItemAdapter({
  item,
  sheetData,
  onResolved,
}: {
  item: Extract<OperationalResolutionQueueItem, { queueType: "unassigned_job" }>;
  sheetData: OperationalResolutionQueueSheetData;
  onResolved: (itemId: string) => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [showTechnicianSelector, setShowTechnicianSelector] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { technicians } = sheetData;
  const canAssign = item.primaryAction.enabled;
  const recommendation = useMemo(
    () =>
      canAssign
        ? recommendTechnicianForJob({
            job: item.job,
            technicians: sheetData.assignableTechnicians,
            technicianStatuses: sheetData.technicianStatuses,
            todayJobs: sheetData.todayJobs,
          })
        : null,
    [
      canAssign,
      item.job,
      sheetData.assignableTechnicians,
      sheetData.technicianStatuses,
      sheetData.todayJobs,
    ],
  );
  const showRecommendation =
    Boolean(recommendation) && !showTechnicianSelector;

  function handleAssign(technicianId: string) {
    if (!technicianId || isPending) {
      return;
    }

    setError(null);

    startTransition(async () => {
      try {
        const result = await assignJobAction(item.job.id, technicianId);

        if (result.error) {
          setError(result.error);
          return;
        }

        onResolved(item.id);
        router.refresh();
      } catch {
        setError("We couldn't assign this job. Try again.");
      }
    });
  }

  return (
    <OperationalResolutionQueueItemView
      item={{ ...item, meta: formatDispatchStatus(item.job.status) }}
      error={error}
    >
      {showRecommendation && recommendation ? (
        <DispatchTechnicianRecommendation
          recommendation={recommendation}
          canAssign={canAssign}
          isPending={isPending}
          onAccept={() => handleAssign(recommendation.technicianId)}
          onChooseOther={() => setShowTechnicianSelector(true)}
        />
      ) : null}
      {canAssign && (!recommendation || showTechnicianSelector) ? (
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {item.primaryAction.label}
          </span>
          <select
            aria-label={`Assign technician for ${item.title}`}
            defaultValue=""
            disabled={isPending}
            onChange={(event) => {
              const technicianId = event.target.value;
              if (technicianId) {
                handleAssign(technicianId);
              }
            }}
            className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800"
          >
            <option value="">Choose technician…</option>
            {technicians.map((tech) => (
              <option key={tech.id} value={tech.id}>
                {tech.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {item.openHref ? (
        <MobileActionButton
          label="Open job"
          href={item.openHref}
          variant="secondary"
        />
      ) : null}
    </OperationalResolutionQueueItemView>
  );
}

function ReadyToInvoiceQueueItemAdapter({
  item,
}: {
  item: Extract<OperationalResolutionQueueItem, { queueType: "ready_to_invoice" }>;
}) {
  const canCreate = item.primaryAction.enabled;

  return (
    <OperationalResolutionQueueItemView item={item}>
      {canCreate ? (
        <MobileActionButton
          label={item.primaryAction.label}
          href={getReadyToInvoiceHref(item.entry.jobId)}
        />
      ) : null}
      {item.openHref ? (
        <MobileActionButton
          label="Open job"
          href={item.openHref}
          variant="secondary"
        />
      ) : null}
    </OperationalResolutionQueueItemView>
  );
}

function NeedsReviewQueueItemAdapter({
  item,
}: {
  item: Extract<OperationalResolutionQueueItem, { queueType: "needs_review" }>;
}) {
  return (
    <OperationalResolutionQueueItemView item={item}>
      {item.openHref ? (
        <MobileActionButton label={item.primaryAction.label} href={item.openHref} />
      ) : null}
    </OperationalResolutionQueueItemView>
  );
}

function OverdueInvoiceQueueItemAdapter({
  item,
  sheetData,
  onResolved,
}: {
  item: Extract<OperationalResolutionQueueItem, { queueType: "overdue_invoice" }>;
  sheetData: OperationalResolutionQueueSheetData;
  onResolved: (itemId: string) => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { access } = sheetData;
  const invoice = item.invoice;
  const canManage = access.canViewBilling;
  const canResend =
    canManage &&
    canResendInvoiceEmail(invoice.status) &&
    hasValidCustomerEmailForSend(invoice.customerEmail);
  const canRecordPayment =
    canManage &&
    canRecordInvoicePayment({
      status: invoice.status,
      balanceDue: invoice.balanceDue,
    });

  function handleResend() {
    if (isPending) {
      return;
    }

    setError(null);

    startTransition(async () => {
      try {
        const result = await resendInvoiceEmailAction(invoice.id);

        if (result.error) {
          setError(result.error);
          return;
        }

        onResolved(item.id);
        router.refresh();
      } catch {
        setError("We couldn't resend this invoice. Try again.");
      }
    });
  }

  const balanceMeta = `${formatCurrency(invoice.balanceDue)} due`;

  return (
    <OperationalResolutionQueueItemView
      item={{ ...item, meta: balanceMeta }}
      error={error}
    >
      {canRecordPayment ? (
        <MobileActionButton
          label={item.primaryAction.label}
          href={`/invoices/${invoice.id}`}
        />
      ) : null}
      {canResend ? (
        <MobileActionButton
          label="Resend invoice"
          onClick={handleResend}
          pending={isPending}
          variant={canRecordPayment ? "secondary" : "primary"}
        />
      ) : null}
      {item.openHref ? (
        <MobileActionButton
          label="Open invoice"
          href={item.openHref}
          variant="secondary"
        />
      ) : null}
    </OperationalResolutionQueueItemView>
  );
}

function UnsentInvoiceQueueItemAdapter({
  item,
  sheetData,
  onResolved,
}: {
  item: Extract<OperationalResolutionQueueItem, { queueType: "unsent_invoice" }>;
  sheetData: OperationalResolutionQueueSheetData;
  onResolved: (itemId: string) => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const canSend =
    item.primaryAction.enabled && canBatchSendInvoice(item.invoice);

  function handleSend() {
    if (isPending) {
      return;
    }

    setError(null);

    startTransition(async () => {
      try {
        const result = await sendInvoiceAction(item.invoice.id);

        if (result.error) {
          setError(result.error);
          return;
        }

        onResolved(item.id);
        router.refresh();
      } catch {
        setError("We couldn't send this invoice. Try again.");
      }
    });
  }

  return (
    <OperationalResolutionQueueItemView item={item} error={error}>
      {canSend ? (
        <MobileActionButton
          label={item.primaryAction.label}
          onClick={handleSend}
          pending={isPending}
        />
      ) : null}
      {item.openHref ? (
        <MobileActionButton
          label="Open invoice"
          href={item.openHref}
          variant="secondary"
        />
      ) : null}
    </OperationalResolutionQueueItemView>
  );
}

function StaleSentEstimateQueueItemAdapter({
  item,
  sheetData,
  onResolved,
}: {
  item: Extract<
    OperationalResolutionQueueItem,
    { queueType: "stale_sent_estimate" }
  >;
  sheetData: OperationalResolutionQueueSheetData;
  onResolved: (itemId: string) => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { access } = sheetData;
  const estimate = item.estimate;
  const canResend =
    access.canViewBilling &&
    canResendEstimateEmail(estimate.status) &&
    hasValidCustomerEmailForSend(estimate.customerEmail);

  function handleResend() {
    if (isPending) {
      return;
    }

    setError(null);

    startTransition(async () => {
      try {
        const result = await resendEstimateEmailAction(estimate.id);

        if (result.error) {
          setError(result.error);
          return;
        }

        onResolved(item.id);
        router.refresh();
      } catch {
        setError("We couldn't resend this estimate. Try again.");
      }
    });
  }

  return (
    <OperationalResolutionQueueItemView item={item} error={error}>
      {canResend ? (
        <MobileActionButton
          label={item.primaryAction.label}
          onClick={handleResend}
          pending={isPending}
        />
      ) : null}
      {item.openHref ? (
        <MobileActionButton
          label="Open estimate"
          href={item.openHref}
          variant={canResend ? "secondary" : "primary"}
        />
      ) : null}
    </OperationalResolutionQueueItemView>
  );
}

function UnsentEstimateQueueItemAdapter({
  item,
  sheetData,
  onResolved,
}: {
  item: Extract<OperationalResolutionQueueItem, { queueType: "unsent_estimate" }>;
  sheetData: OperationalResolutionQueueSheetData;
  onResolved: (itemId: string) => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const canSend =
    item.primaryAction.enabled && canBatchSendEstimate(item.estimate);

  function handleSend() {
    if (isPending) {
      return;
    }

    setError(null);

    startTransition(async () => {
      try {
        const result = await updateEstimateStatusAction(
          item.estimate.id,
          "draft",
          "sent",
        );

        if (result.error) {
          setError(result.error);
          return;
        }

        onResolved(item.id);
        router.refresh();
      } catch {
        setError("We couldn't send this estimate. Try again.");
      }
    });
  }

  return (
    <OperationalResolutionQueueItemView item={item} error={error}>
      {canSend ? (
        <MobileActionButton
          label={item.primaryAction.label}
          onClick={handleSend}
          pending={isPending}
        />
      ) : null}
      {item.openHref ? (
        <MobileActionButton
          label="Open estimate"
          href={item.openHref}
          variant="secondary"
        />
      ) : null}
    </OperationalResolutionQueueItemView>
  );
}
