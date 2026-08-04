import {
  hasInvoiceUnpaidBalance,
  type Invoice,
  type InvoiceStatus,
} from "@/shared/types/invoice";
import { buildSalesHubHref } from "@/shared/lib/sales/sales-hub";

export const INVOICE_PAGE_CASH_FLOW_HREF = buildSalesHubHref("invoices", {
  focus: "cash-flow",
});
export const INVOICE_PAGE_OVERDUE_HREF = buildSalesHubHref("invoices", {
  focus: "cash-flow",
  status: "overdue",
});
export const INVOICE_PAGE_UNPAID_HREF = buildSalesHubHref("invoices", {
  focus: "cash-flow",
  status: "unpaid",
});
export const INVOICE_PAGE_DRAFT_HREF = buildSalesHubHref("invoices", {
  status: "draft",
});

export type InvoicePageFocus = "cash-flow";

export type InvoiceListStatusFilter = InvoiceStatus | "all" | "unpaid";

export type InvoicePageFocusState = {
  focus: InvoicePageFocus | null;
  statusFilter: InvoiceListStatusFilter;
  jobClearHref: string;
  sectionEyebrow: string | null;
};

const VALID_FOCUS_PARAMS = new Set(["cash-flow"]);

type InvoicePageHrefInput = {
  customerId?: string;
  jobId?: string;
  create?: string;
  status?: string;
  focus?: string;
};

function buildInvoicesHref(
  input: InvoicePageHrefInput,
  options?: { includeJobId?: boolean; includeFocusQuery?: boolean },
): string {
  const includeJobId = options?.includeJobId !== false;
  const includeFocusQuery = options?.includeFocusQuery !== false;
  const params: Record<string, string | undefined> = {};

  if (input.customerId) {
    params.customerId = input.customerId;
  }

  if (includeJobId && input.jobId) {
    params.jobId = input.jobId;
  }

  if (input.create === "1") {
    params.create = "1";
  }

  if (includeFocusQuery) {
    const statusFilter = resolveStatusFilter(input.status);

    if (statusFilter === "unpaid" || statusFilter === "overdue") {
      params.status = statusFilter;
    } else if (statusFilter !== "all") {
      params.status = statusFilter;
    }

    if (input.focus && VALID_FOCUS_PARAMS.has(input.focus)) {
      params.focus = input.focus;
    }
  }

  return buildSalesHubHref("invoices", params);
}

function resolveStatusFilter(statusParam: string | undefined): InvoiceListStatusFilter {
  if (!statusParam) {
    return "all";
  }

  if (statusParam === "unpaid") {
    return "unpaid";
  }

  if (statusParam === "overdue") {
    return "overdue";
  }

  const knownStatuses: InvoiceStatus[] = [
    "draft",
    "sent",
    "partially_paid",
    "paid",
    "void",
    "cancelled",
  ];

  if ((knownStatuses as string[]).includes(statusParam)) {
    return statusParam as InvoiceStatus;
  }

  return "all";
}

export function parseInvoicePageSearchParams(input: {
  status?: string;
  focus?: string;
  customerId?: string;
  jobId?: string;
  create?: string;
}): InvoicePageFocusState {
  const focus =
    input.focus && VALID_FOCUS_PARAMS.has(input.focus)
      ? (input.focus as InvoicePageFocus)
      : null;

  const statusFilter = resolveStatusFilter(input.status);
  const jobClearHref = buildInvoicesHref(input, { includeJobId: false });

  const sectionEyebrow =
    focus === "cash-flow" || statusFilter === "overdue" || statusFilter === "unpaid"
      ? "Cash flow"
      : null;

  return {
    focus,
    statusFilter,
    jobClearHref,
    sectionEyebrow,
  };
}

export function matchesInvoiceListStatusFilter(
  invoice: Invoice,
  statusFilter: InvoiceListStatusFilter,
): boolean {
  if (statusFilter === "all") {
    return true;
  }

  if (statusFilter === "unpaid") {
    return hasInvoiceUnpaidBalance(invoice);
  }

  return invoice.status === statusFilter;
}

const CASH_FLOW_STATUS_PRIORITY: Record<InvoiceStatus, number> = {
  overdue: 0,
  partially_paid: 1,
  sent: 2,
  draft: 3,
  paid: 4,
  void: 5,
  cancelled: 6,
};

export function sortInvoicesForCashFlowFocus(invoices: Invoice[]): Invoice[] {
  return [...invoices].sort((left, right) => {
    const leftUnpaid = hasInvoiceUnpaidBalance(left) ? 0 : 1;
    const rightUnpaid = hasInvoiceUnpaidBalance(right) ? 0 : 1;

    if (leftUnpaid !== rightUnpaid) {
      return leftUnpaid - rightUnpaid;
    }

    const leftPriority = CASH_FLOW_STATUS_PRIORITY[left.status];
    const rightPriority = CASH_FLOW_STATUS_PRIORITY[right.status];

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return right.balanceDue - left.balanceDue;
  });
}
