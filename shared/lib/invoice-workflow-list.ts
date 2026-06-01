import type { BillingWorkflowListSection } from "@/shared/lib/billing-workflow-list";
import type { Invoice, InvoiceStatus } from "@/shared/types/invoice";
import type { InvoiceListStatusFilter } from "@/shared/lib/invoice-page-focus";

export type InvoiceWorkflowGroup =
  | "needs_attention"
  | "drafts"
  | "paid"
  | "closed";

const INVOICE_WORKFLOW_GROUP_ORDER: readonly InvoiceWorkflowGroup[] = [
  "needs_attention",
  "drafts",
  "paid",
  "closed",
];

const INVOICE_WORKFLOW_GROUP_LABELS: Record<InvoiceWorkflowGroup, string> = {
  needs_attention: "Needs attention",
  drafts: "Drafts",
  paid: "Paid",
  closed: "Closed",
};

const NEEDS_ATTENTION_STATUSES = new Set<string>([
  "overdue",
  "sent",
  "partially_paid",
]);

const DRAFT_STATUSES = new Set<string>(["draft"]);

const PAID_STATUSES = new Set<string>(["paid"]);

const CLOSED_STATUSES = new Set<string>([
  "void",
  "cancelled",
  "uncollectible",
]);

const NEEDS_ATTENTION_STATUS_ORDER: Partial<Record<InvoiceStatus, number>> = {
  overdue: 0,
  partially_paid: 1,
  sent: 2,
};

function compareDateOnlyAscending(left: string, right: string): number {
  if (left === right) {
    return 0;
  }

  return left.localeCompare(right);
}

function compareInvoiceRecency(left: Invoice, right: Invoice): number {
  const leftTime = Date.parse(left.createdAt);
  const rightTime = Date.parse(right.createdAt);

  if (Number.isFinite(leftTime) && Number.isFinite(rightTime)) {
    if (leftTime !== rightTime) {
      return rightTime - leftTime;
    }
  } else if (left.createdAt !== right.createdAt) {
    return right.createdAt.localeCompare(left.createdAt);
  }

  return left.id.localeCompare(right.id);
}

function comparePaidInvoices(left: Invoice, right: Invoice): number {
  const leftPaidAt = left.paidAt ?? left.createdAt;
  const rightPaidAt = right.paidAt ?? right.createdAt;
  const paidCompare = compareDateOnlyAscending(rightPaidAt, leftPaidAt);

  if (paidCompare !== 0) {
    return paidCompare;
  }

  return left.id.localeCompare(right.id);
}

function compareInvoicesWithinWorkflowGroup(
  left: Invoice,
  right: Invoice,
  group: InvoiceWorkflowGroup,
): number {
  if (group === "needs_attention") {
    const leftStatusOrder =
      NEEDS_ATTENTION_STATUS_ORDER[left.status] ?? Number.MAX_SAFE_INTEGER;
    const rightStatusOrder =
      NEEDS_ATTENTION_STATUS_ORDER[right.status] ?? Number.MAX_SAFE_INTEGER;

    if (leftStatusOrder !== rightStatusOrder) {
      return leftStatusOrder - rightStatusOrder;
    }

    if (left.status === "overdue" && right.status === "overdue") {
      const dueCompare = compareDateOnlyAscending(left.dueDate, right.dueDate);
      if (dueCompare !== 0) {
        return dueCompare;
      }

      return left.id.localeCompare(right.id);
    }

    return compareInvoiceRecency(left, right);
  }

  if (group === "paid") {
    return comparePaidInvoices(left, right);
  }

  return compareInvoiceRecency(left, right);
}

export function getInvoiceWorkflowGroup(
  status: InvoiceStatus | string,
): InvoiceWorkflowGroup {
  if (NEEDS_ATTENTION_STATUSES.has(status)) {
    return "needs_attention";
  }

  if (DRAFT_STATUSES.has(status)) {
    return "drafts";
  }

  if (PAID_STATUSES.has(status)) {
    return "paid";
  }

  if (CLOSED_STATUSES.has(status)) {
    return "closed";
  }

  return "closed";
}

export function sortInvoicesForWorkflow(invoices: Invoice[]): Invoice[] {
  return [...invoices].sort((left, right) => {
    const leftGroup = getInvoiceWorkflowGroup(left.status);
    const rightGroup = getInvoiceWorkflowGroup(right.status);
    const leftGroupOrder = INVOICE_WORKFLOW_GROUP_ORDER.indexOf(leftGroup);
    const rightGroupOrder = INVOICE_WORKFLOW_GROUP_ORDER.indexOf(rightGroup);

    if (leftGroupOrder !== rightGroupOrder) {
      return leftGroupOrder - rightGroupOrder;
    }

    return compareInvoicesWithinWorkflowGroup(left, right, leftGroup);
  });
}

export function shouldGroupInvoicesForWorkflow(
  statusFilter: InvoiceListStatusFilter,
  prioritizeCashFlow: boolean,
): boolean {
  return statusFilter === "all" && !prioritizeCashFlow;
}

export function groupInvoicesForWorkflow(
  invoices: Invoice[],
): BillingWorkflowListSection<Invoice>[] {
  const sorted = sortInvoicesForWorkflow(invoices);
  const grouped = new Map<InvoiceWorkflowGroup, Invoice[]>();

  for (const invoice of sorted) {
    const group = getInvoiceWorkflowGroup(invoice.status);
    const existing = grouped.get(group) ?? [];
    existing.push(invoice);
    grouped.set(group, existing);
  }

  return INVOICE_WORKFLOW_GROUP_ORDER.flatMap((group) => {
    const items = grouped.get(group);
    if (!items || items.length === 0) {
      return [];
    }

    return [
      {
        id: group,
        label: INVOICE_WORKFLOW_GROUP_LABELS[group],
        items,
      },
    ];
  });
}

export function prepareInvoicesForListView(
  invoices: Invoice[],
  statusFilter: InvoiceListStatusFilter,
  prioritizeCashFlow: boolean,
): {
  sections: BillingWorkflowListSection<Invoice>[];
  showSectionHeaders: boolean;
} {
  if (shouldGroupInvoicesForWorkflow(statusFilter, prioritizeCashFlow)) {
    return {
      sections: groupInvoicesForWorkflow(invoices),
      showSectionHeaders: true,
    };
  }

  return {
    sections: [
      {
        id: "filtered",
        label: "",
        items: prioritizeCashFlow
          ? invoices
          : sortInvoicesForWorkflow(invoices),
      },
    ],
    showSectionHeaders: false,
  };
}
