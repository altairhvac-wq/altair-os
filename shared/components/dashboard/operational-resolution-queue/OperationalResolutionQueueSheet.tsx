"use client";

import {
  Briefcase,
  ClipboardList,
  DollarSign,
  FileText,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { OperationalResolutionQueueItemAdapter } from "@/shared/components/dashboard/operational-resolution-queue/OperationalResolutionQueueItemAdapter";
import {
  MobileSheet,
  MobileSheetBody,
  MobileSheetFooter,
  MobileSheetHeader,
  MobileSheetHeaderIcon,
  MobileSheetPanel,
  MobileSheetSuccess,
} from "@/shared/components/ui/mobile-sheet";
import type { MobileActionCard } from "@/shared/lib/mobile-action-dashboard";
import type { MobileActionSheetData } from "@/shared/lib/mobile-action-dashboard";
import {
  buildOperationalResolutionQueue,
  getOperationalResolutionQueuePresentation,
  type OperationalResolutionQueueItem,
  type OperationalResolutionQueuePresentation,
} from "@/shared/lib/operational-resolution-queue";

type OperationalResolutionQueueSheetProps = {
  card: MobileActionCard;
  sheetData: MobileActionSheetData;
  onClose: () => void;
};

const QUEUE_ICONS: Record<
  OperationalResolutionQueuePresentation["icon"],
  typeof Users
> = {
  users: Users,
  briefcase: Briefcase,
  dollar: DollarSign,
  file: FileText,
  clipboard: ClipboardList,
};

export function OperationalResolutionQueueSheet({
  card,
  sheetData,
  onClose,
}: OperationalResolutionQueueSheetProps) {
  const queueType = card.queueType;

  if (!queueType) {
    return null;
  }

  const titleId = `operational-resolution-queue-${card.id}`;
  const presentation = getOperationalResolutionQueuePresentation(
    queueType,
    card.label,
    card.description,
  );
  const Icon = QUEUE_ICONS[presentation.icon];

  const initialQueue = useMemo(
    () =>
      buildOperationalResolutionQueue({
        queueType,
        unassignedJobs: sheetData.unassignedJobs,
        readyToInvoiceJobs: sheetData.readyToInvoiceJobs,
        completedWorkReviewJobs: sheetData.completedWorkReviewJobs,
        overdueInvoices: sheetData.overdueInvoices,
        unpaidInvoicesNeedingFollowUp: sheetData.unpaidInvoicesNeedingFollowUp,
        unpaidInvoiceFollowUpThresholdDays:
          sheetData.unpaidInvoiceFollowUpThresholdDays,
        unsentInvoices: sheetData.unsentInvoices,
        unsentEstimates: sheetData.unsentEstimates,
        staleSentEstimates: sheetData.staleSentEstimates,
        staleSentEstimateThresholdDays: sheetData.staleSentEstimateThresholdDays,
        acceptedEstimatesNeedingScheduling:
          sheetData.acceptedEstimatesNeedingScheduling,
        newLeadsNeedingContact: sheetData.newLeadsNeedingContact,
        leadsReadyForEstimate: sheetData.leadsReadyForEstimate,
        leadFollowUps: sheetData.leadFollowUps,
        stalledJobs: sheetData.stalledJobs,
        stalledJobInactivityThresholdDays:
          sheetData.stalledJobInactivityThresholdDays,
        technicians: sheetData.technicians,
        assignableTechnicians: sheetData.assignableTechnicians,
        technicianStatuses: sheetData.technicianStatuses,
        todayJobs: sheetData.todayJobs,
        access: sheetData.access,
        totalCount: card.count,
      }),
    [card.count, queueType, sheetData],
  );

  const [items, setItems] = useState<OperationalResolutionQueueItem[]>(
    () => initialQueue.items,
  );
  const hiddenCount = initialQueue.hiddenCount;
  const currentItem = items[0] ?? null;
  const remaining = items.length;
  const isComplete = remaining === 0;

  function handleResolved(itemId: string) {
    setItems((current) => current.filter((item) => item.id !== itemId));
  }

  const remainingLabel =
    remaining === 1
      ? "1 remaining"
      : `${remaining} remaining`;

  return (
    <MobileSheet
      onClose={onClose}
      ariaLabelledBy={titleId}
      variant="responsive"
      zIndex={60}
    >
      <MobileSheetPanel maxWidth="lg" maxHeight="90">
        <MobileSheetHeader
          titleId={titleId}
          title={presentation.title}
          subtitle={
            isComplete
              ? "Queue complete"
              : `${remainingLabel}${hiddenCount > 0 ? ` · +${hiddenCount} more on full list` : ""}`
          }
          onClose={onClose}
          safeAreaTop
          icon={
            <MobileSheetHeaderIcon className={presentation.iconClassName}>
              <Icon className="h-4 w-4" />
            </MobileSheetHeaderIcon>
          }
        />

        <MobileSheetBody className="flex min-h-[280px] flex-col">
          {isComplete ? (
            <MobileSheetSuccess
              title={presentation.completionTitle}
              subtitle={
                hiddenCount > 0
                  ? `${hiddenCount} more may remain on the full list.`
                  : presentation.completionSubtitle
              }
            />
          ) : currentItem ? (
            <OperationalResolutionQueueItemAdapter
              key={currentItem.id}
              item={currentItem}
              sheetData={{
                items,
                access: sheetData.access,
                technicians: sheetData.technicians,
                assignableTechnicians: sheetData.assignableTechnicians,
                technicianStatuses: sheetData.technicianStatuses,
                todayJobs: sheetData.todayJobs,
                hiddenCount,
              }}
              onResolved={handleResolved}
            />
          ) : null}
        </MobileSheetBody>

        <MobileSheetFooter>
          {isComplete ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex min-h-10 flex-1 items-center justify-center rounded-lg bg-cyan-600 px-4 text-sm font-semibold text-white hover:bg-cyan-700"
              >
                Return to dashboard
              </button>
              {presentation.relatedHref && presentation.relatedLabel ? (
                <Link
                  href={presentation.relatedHref}
                  className="inline-flex min-h-10 flex-1 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {presentation.relatedLabel}
                </Link>
              ) : null}
            </>
          ) : presentation.relatedHref && presentation.relatedLabel ? (
            <Link
              href={presentation.relatedHref}
              className="inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {presentation.relatedLabel}
            </Link>
          ) : null}
        </MobileSheetFooter>
      </MobileSheetPanel>
    </MobileSheet>
  );
}
