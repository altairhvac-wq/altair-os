"use client";

import { useMemo } from "react";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { PageSummaryStrip } from "@/shared/components/layout/PageSummaryStrip";
import { isDateOnlyOnOperationalDay } from "@/shared/lib/billing-workflow-list";
import { getInvoiceWorkflowGroup } from "@/shared/lib/invoice-workflow-list";
import { useCompanyTimezone } from "@/shared/lib/company-timezone";
import { getDateOnlyInTimeZone } from "@/shared/lib/datetime";
import { formatCurrency } from "@/shared/types/customer";
import {
  hasInvoiceUnpaidBalance,
  isActiveInvoice,
  type Invoice,
} from "@/shared/types/invoice";

type InvoiceSummaryCardsProps = {
  invoices: Invoice[];
  highlightedLabels?: Array<
    "Needs attention" | "Overdue" | "Due today" | "Unpaid total" | "Paid this month"
  >;
};

export function InvoiceSummaryCards({
  invoices,
  highlightedLabels = [],
}: InvoiceSummaryCardsProps) {
  const timeZone = useCompanyTimezone();

  const summary = useMemo(() => {
    const currentMonth = getDateOnlyInTimeZone(new Date(), timeZone).slice(0, 7);
    const todayContext = { timeZone };
    let needsAttention = 0;
    let overdue = 0;
    let dueToday = 0;
    let unpaidTotal = 0;
    let paidThisMonth = 0;

    for (const invoice of invoices) {
      if (!isActiveInvoice(invoice)) {
        continue;
      }

      if (getInvoiceWorkflowGroup(invoice.status) === "needs_attention") {
        needsAttention += 1;
      }

      if (invoice.status === "overdue") {
        overdue += 1;
      }

      if (isDateOnlyOnOperationalDay(invoice.dueDate, todayContext)) {
        dueToday += 1;
      }

      if (hasInvoiceUnpaidBalance(invoice)) {
        unpaidTotal += invoice.balanceDue;
      }

      if (invoice.status === "paid" && invoice.paidAt) {
        const paidMonth = getDateOnlyInTimeZone(
          new Date(invoice.paidAt),
          timeZone,
        ).slice(0, 7);

        if (paidMonth === currentMonth) {
          paidThisMonth += invoice.total;
        }
      }
    }

    return { needsAttention, overdue, dueToday, unpaidTotal, paidThisMonth };
  }, [invoices, timeZone]);

  const cards = [
    {
      label: "Needs attention" as const,
      mobileLabel: "Attention",
      value: String(summary.needsAttention),
      description: "Overdue, sent, or partial",
      icon: AlertCircle,
      iconClassName: "admin-metric-icon-amber",
    },
    {
      label: "Overdue" as const,
      mobileLabel: "Overdue",
      value: String(summary.overdue),
      description: "Past due invoices",
      icon: Clock,
      iconClassName: "admin-metric-icon-rose",
    },
    {
      label: "Due today" as const,
      mobileLabel: "Today",
      value: String(summary.dueToday),
      description: "Payments expected today",
      icon: CalendarClock,
      iconClassName: "admin-metric-icon-teal",
    },
    {
      label: "Unpaid total" as const,
      mobileLabel: "Unpaid",
      value: formatCurrency(summary.unpaidTotal),
      description: "Outstanding balance",
      icon: Clock,
      iconClassName: "admin-metric-icon-amber",
    },
    {
      label: "Paid this month" as const,
      mobileLabel: "Paid",
      value: formatCurrency(summary.paidThisMonth),
      description: "Collected this period",
      icon: CheckCircle2,
      iconClassName: "admin-metric-icon-emerald",
    },
  ];

  return (
    <PageSummaryStrip
      lgColumnsClass="lg:grid-cols-5"
      cards={cards.map((card) => ({
        ...card,
        highlighted: highlightedLabels.includes(card.label),
      }))}
    />
  );
}
