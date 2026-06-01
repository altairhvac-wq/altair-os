"use client";

import { useMemo } from "react";
import {
  CheckCircle2,
  Clock,
  FileText,
  Send,
} from "lucide-react";
import { PageSummaryStrip } from "@/shared/components/layout/PageSummaryStrip";
import { getEstimateWorkflowGroup } from "@/shared/lib/estimate-workflow-list";
import { useCompanyTimezone } from "@/shared/lib/company-timezone";
import { getDateOnlyInTimeZone } from "@/shared/lib/datetime";
import { formatCurrency } from "@/shared/types/customer";
import type { Estimate } from "@/shared/types/estimate";

type EstimateSummaryCardsProps = {
  estimates: Estimate[];
};

export function EstimateSummaryCards({ estimates }: EstimateSummaryCardsProps) {
  const timeZone = useCompanyTimezone();

  const summary = useMemo(() => {
    const currentMonth = getDateOnlyInTimeZone(new Date(), timeZone).slice(0, 7);
    let needsAction = 0;
    let sentWaiting = 0;
    let approvedThisMonth = 0;
    let openValue = 0;

    for (const estimate of estimates) {
      if (getEstimateWorkflowGroup(estimate.status) === "needs_action") {
        needsAction += 1;
        openValue += estimate.total;
      }

      if (estimate.status === "sent") {
        sentWaiting += 1;
      }

      if (estimate.status === "approved" && estimate.approvedAt) {
        const approvedMonth = getDateOnlyInTimeZone(
          new Date(estimate.approvedAt),
          timeZone,
        ).slice(0, 7);

        if (approvedMonth === currentMonth) {
          approvedThisMonth += 1;
        }
      }
    }

    return { needsAction, sentWaiting, approvedThisMonth, openValue };
  }, [estimates, timeZone]);

  return (
    <PageSummaryStrip
      cards={[
        {
          label: "Needs action",
          mobileLabel: "Action",
          value: String(summary.needsAction),
          description: "Drafts and pending follow-up",
          icon: Clock,
          iconClassName: "admin-metric-icon-amber",
        },
        {
          label: "Sent / waiting",
          mobileLabel: "Sent",
          value: String(summary.sentWaiting),
          description: "Awaiting customer response",
          icon: Send,
          iconClassName: "admin-metric-icon-teal",
        },
        {
          label: "Approved this month",
          mobileLabel: "Approved",
          value: String(summary.approvedThisMonth),
          description: "Closed wins this period",
          icon: CheckCircle2,
          iconClassName: "admin-metric-icon-emerald",
        },
        {
          label: "Open value",
          mobileLabel: "Value",
          value: formatCurrency(summary.openValue),
          description: "Estimated total in pipeline",
          icon: FileText,
          iconClassName: "admin-metric-icon-slate",
        },
      ]}
    />
  );
}
