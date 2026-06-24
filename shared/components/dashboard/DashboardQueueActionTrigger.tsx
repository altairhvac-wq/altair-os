"use client";

import type { CompanyAccessScope } from "@/lib/database/access-control";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { OperationalResolutionQueueSheet } from "@/shared/components/dashboard/operational-resolution-queue/OperationalResolutionQueueSheet";
import type { MobileActionSeverity } from "@/shared/lib/mobile-action-dashboard";
import {
  buildMobileActionCards,
  buildMobileActionSheetData,
  getMobileActionCardByQueueType,
  type MobileActionCard,
} from "@/shared/lib/mobile-action-dashboard";
import type { OperationalResolutionQueueType } from "@/shared/lib/operational-resolution-queue";
import type { DashboardData } from "@/shared/types/dashboard";

export type DashboardQueueActionTarget = {
  id: string;
  label: string;
  description?: string;
  count?: number | null;
  severity?: MobileActionSeverity;
  queueType?: OperationalResolutionQueueType;
  href?: string;
};

type DashboardQueueActionTriggerProps = {
  action: DashboardQueueActionTarget;
  data: DashboardData;
  children: ReactNode;
  className?: string;
};

function resolveQueueCanFix(
  queueType: OperationalResolutionQueueType,
  access: CompanyAccessScope,
): boolean {
  switch (queueType) {
    case "unassigned_job":
      return access.canViewTechnicianRoster;
    case "needs_review":
    case "stalled_job":
      return false;
    case "lead_follow_up":
    case "new_lead_contact":
    case "lead_estimate_ready":
      return access.canManageCustomers;
    case "overdue_invoice":
    case "ready_to_invoice":
    case "unsent_invoice":
    case "unsent_estimate":
    case "stale_sent_estimate":
      return access.canViewBilling;
    default:
      return false;
  }
}

function resolveActionCard(
  action: DashboardQueueActionTarget,
  cards: MobileActionCard[],
  access: CompanyAccessScope,
): MobileActionCard | null {
  if (!action.queueType) {
    return null;
  }

  const existing = getMobileActionCardByQueueType(cards, action.queueType);
  if (existing) {
    return existing;
  }

  const count = action.count ?? 1;
  const severity = action.severity ?? "warning";

  return {
    id: action.id,
    label: action.label,
    count: count > 0 ? count : 1,
    severity,
    description: action.description ?? action.label,
    category:
      action.queueType === "unassigned_job" ||
      action.queueType === "needs_review" ||
      action.queueType === "stalled_job" ||
      action.queueType === "lead_follow_up" ||
      action.queueType === "new_lead_contact" ||
      action.queueType === "lead_estimate_ready"
        ? "critical-operations"
        : "money-actions",
    queueType: action.queueType,
    canFix: resolveQueueCanFix(action.queueType, access),
  };
}

export function DashboardQueueActionTrigger({
  action,
  data,
  children,
  className,
}: DashboardQueueActionTriggerProps) {
  const [activeCard, setActiveCard] = useState<MobileActionCard | null>(null);
  const actionCards = useMemo(() => buildMobileActionCards(data), [data]);
  const sheetData = useMemo(() => buildMobileActionSheetData(data), [data]);

  if (action.queueType) {
    return (
      <>
        <button
          type="button"
          onClick={() => {
            const card = resolveActionCard(action, actionCards, data.access);
            if (card) {
              setActiveCard(card);
            }
          }}
          className={className}
        >
          {children}
        </button>
        {activeCard?.queueType ? (
          <OperationalResolutionQueueSheet
            card={activeCard}
            sheetData={sheetData}
            onClose={() => setActiveCard(null)}
          />
        ) : null}
      </>
    );
  }

  if (action.href) {
    return (
      <Link href={action.href} className={className}>
        {children}
      </Link>
    );
  }

  return <div className={className}>{children}</div>;
}
