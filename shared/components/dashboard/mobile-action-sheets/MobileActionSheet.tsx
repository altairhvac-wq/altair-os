"use client";

import {
  AlertCircle,
  AlertTriangle,
  Briefcase,
  ChevronRight,
  ClipboardList,
  DollarSign,
  FileText,
  Info,
  Users,
} from "lucide-react";
import {
  MobileSheet,
  MobileSheetBody,
  MobileSheetHeader,
  MobileSheetHeaderIcon,
  MobileSheetPanel,
} from "@/shared/components/ui/mobile-sheet";
import { EstimatesNotSentActionContent } from "@/shared/components/dashboard/mobile-action-sheets/EstimatesNotSentActionContent";
import { InvoicesNotSentActionContent } from "@/shared/components/dashboard/mobile-action-sheets/InvoicesNotSentActionContent";
import { OverdueInvoicesActionContent } from "@/shared/components/dashboard/mobile-action-sheets/OverdueInvoicesActionContent";
import { ReadyToInvoiceActionContent } from "@/shared/components/dashboard/mobile-action-sheets/ReadyToInvoiceActionContent";
import { UnassignedJobsActionContent } from "@/shared/components/dashboard/mobile-action-sheets/UnassignedJobsActionContent";
import type {
  MobileActionCard,
  MobileActionSheetData,
  MobileActionSheetType,
} from "@/shared/lib/mobile-action-dashboard";

type MobileActionSheetProps = {
  card: MobileActionCard;
  sheetData: MobileActionSheetData;
  onClose: () => void;
};

const SHEET_ICONS: Record<
  MobileActionSheetType,
  { icon: typeof Users; className: string }
> = {
  "unassigned-jobs": {
    icon: Users,
    className: "bg-amber-100 text-amber-700",
  },
  "ready-to-invoice": {
    icon: Briefcase,
    className: "bg-cyan-100 text-cyan-700",
  },
  "overdue-invoices": {
    icon: DollarSign,
    className: "bg-rose-100 text-rose-700",
  },
  "invoices-not-sent": {
    icon: FileText,
    className: "bg-amber-100 text-amber-700",
  },
  "estimates-not-sent": {
    icon: ClipboardList,
    className: "bg-cyan-100 text-cyan-700",
  },
};

function MobileActionSheetContent({
  card,
  sheetData,
}: {
  card: MobileActionCard;
  sheetData: MobileActionSheetData;
}) {
  switch (card.sheetType) {
    case "unassigned-jobs":
      return (
        <UnassignedJobsActionContent
          sheetData={sheetData}
          totalCount={card.count}
        />
      );
    case "ready-to-invoice":
      return (
        <ReadyToInvoiceActionContent
          sheetData={sheetData}
          totalCount={card.count}
        />
      );
    case "overdue-invoices":
      return (
        <OverdueInvoicesActionContent
          sheetData={sheetData}
          totalCount={card.count}
        />
      );
    case "invoices-not-sent":
      return (
        <InvoicesNotSentActionContent
          sheetData={sheetData}
          totalCount={card.count}
        />
      );
    case "estimates-not-sent":
      return (
        <EstimatesNotSentActionContent
          sheetData={sheetData}
          totalCount={card.count}
        />
      );
    default:
      return null;
  }
}

export function MobileActionSheet({
  card,
  sheetData,
  onClose,
}: MobileActionSheetProps) {
  if (!card.sheetType) {
    return null;
  }

  const titleId = `mobile-action-sheet-${card.id}`;
  const iconConfig = SHEET_ICONS[card.sheetType];
  const Icon = iconConfig.icon;

  return (
    <MobileSheet
      onClose={onClose}
      ariaLabelledBy={titleId}
      variant="bottom"
      zIndex={60}
      rootClassName="lg:hidden"
    >
      <MobileSheetPanel maxWidth="lg" maxHeight="85">
        <MobileSheetHeader
          titleId={titleId}
          title={card.label}
          subtitle={card.description}
          onClose={onClose}
          safeAreaTop
          icon={
            <MobileSheetHeaderIcon className={iconConfig.className}>
              <Icon className="h-4 w-4" />
            </MobileSheetHeaderIcon>
          }
        />
        <MobileSheetBody>
          <MobileActionSheetContent card={card} sheetData={sheetData} />
        </MobileSheetBody>
      </MobileSheetPanel>
    </MobileSheet>
  );
}

export const MOBILE_ACTION_SEVERITY_STYLES = {
  critical: {
    row: "border-slate-200/90 bg-white border-l-[3px] border-l-rose-500",
    badge: "bg-rose-100 text-rose-800",
    icon: AlertTriangle,
    iconClass: "text-rose-600",
  },
  warning: {
    row: "border-slate-200/90 bg-white border-l-[3px] border-l-amber-400",
    badge: "bg-amber-100 text-amber-800",
    icon: AlertCircle,
    iconClass: "text-amber-600",
  },
  info: {
    row: "border-slate-200/80 bg-white",
    badge: "bg-slate-100 text-slate-600",
    icon: Info,
    iconClass: "text-slate-400",
  },
} as const;

export function MobileActionCardChevron() {
  return (
    <ChevronRight className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
  );
}
