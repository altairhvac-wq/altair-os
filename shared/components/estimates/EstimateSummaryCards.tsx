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
          value: String(summary.needsAction),
          description: "Drafts and pending follow-up",
          icon: Clock,
          iconClassName: "text-amber-600 bg-amber-50",
        },
        {
          label: "Sent / waiting",
          value: String(summary.sentWaiting),
          description: "Awaiting customer response",
          icon: Send,
          iconClassName: "text-sky-600 bg-sky-50",
        },
        {
          label: "Approved this month",
          value: String(summary.approvedThisMonth),
          description: "Closed wins this period",
          icon: CheckCircle2,
          iconClassName: "text-emerald-600 bg-emerald-50",
        },
        {
          label: "Open value",
          value: formatCurrency(summary.openValue),
          description: "Estimated total in pipeline",
          icon: FileText,
          iconClassName: "text-indigo-600 bg-indigo-50",
        },
      ]}
    />
  );
}
