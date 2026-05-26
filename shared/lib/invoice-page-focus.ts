import {
  hasInvoiceUnpaidBalance,
  type Invoice,
  type InvoiceStatus,
} from "@/shared/types/invoice";

export const INVOICE_PAGE_CASH_FLOW_HREF = "/invoices?focus=cash-flow";
export const INVOICE_PAGE_OVERDUE_HREF =
  "/invoices?focus=cash-flow&status=overdue";
export const INVOICE_PAGE_UNPAID_HREF = "/invoices?focus=cash-flow&status=unpaid";

export type InvoicePageFocus = "cash-flow";

export type InvoiceListStatusFilter = InvoiceStatus | "all" | "unpaid";

export type InvoicePageFocusState = {
  focus: InvoicePageFocus | null;
  statusFilter: InvoiceListStatusFilter;
  banner: {
    title: string;
    description: string;
    clearHref: string;
  } | null;
  jobClearHref: string;
  highlightedSummaryLabels: Array<"Unpaid" | "Overdue" | "Paid">;
  sectionEyebrow: string | null;
  sectionDescription: string | null;
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
  const params = new URLSearchParams();
  const includeJobId = options?.includeJobId !== false;
  const includeFocusQuery = options?.includeFocusQuery !== false;

  if (input.customerId) {
    params.set("customerId", input.customerId);
  }

  if (includeJobId && input.jobId) {
    params.set("jobId", input.jobId);
  }

  if (input.create === "1") {
    params.set("create", "1");
  }

  if (includeFocusQuery) {
    const statusFilter = resolveStatusFilter(input.status);

    if (statusFilter === "unpaid" || statusFilter === "overdue") {
      params.set("status", statusFilter);
    } else if (statusFilter !== "all") {
      params.set("status", statusFilter);
    }

    if (input.focus && VALID_FOCUS_PARAMS.has(input.focus)) {
      params.set("focus", input.focus);
    }
  }

  const query = params.toString();
  return query ? `/invoices?${query}` : "/invoices";
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

function resolveBannerCopy(
  focus: InvoicePageFocus | null,
  statusFilter: InvoiceListStatusFilter,
): Pick<InvoicePageFocusState, "banner">["banner"] {
  if (statusFilter === "overdue") {
    return {
      title: "Overdue collection follow-up",
      description:
        "Review past-due invoices and follow up with customers to protect cash flow.",
      clearHref: "",
    };
  }

  if (statusFilter === "unpaid") {
    return {
      title: "Open invoices awaiting payment",
      description:
        "Sent and partially paid invoices with an outstanding balance — prioritize follow-up on the largest balances.",
      clearHref: "",
    };
  }

  if (focus === "cash-flow") {
    return {
      title: "Cash flow collection view",
      description:
        "Overdue and unpaid invoices are prioritized below. Clear the view to return to the full invoice list.",
      clearHref: "",
    };
  }

  return null;
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

  const cashFlowClearHref = buildInvoicesHref(input, {
    includeFocusQuery: false,
  });
  const jobClearHref = buildInvoicesHref(input, { includeJobId: false });

  const bannerTemplate = resolveBannerCopy(focus, statusFilter);
  const banner = bannerTemplate
    ? { ...bannerTemplate, clearHref: cashFlowClearHref }
    : null;

  const highlightedSummaryLabels: InvoicePageFocusState["highlightedSummaryLabels"] =
    [];

  if (focus === "cash-flow" || statusFilter === "unpaid") {
    highlightedSummaryLabels.push("Unpaid");
  }

  if (focus === "cash-flow" || statusFilter === "overdue") {
    highlightedSummaryLabels.push("Overdue");
  }

  const sectionEyebrow =
    focus === "cash-flow" || statusFilter === "overdue" || statusFilter === "unpaid"
      ? "Cash flow"
      : null;

  const sectionDescription =
    statusFilter === "overdue"
      ? "Past-due invoices needing collection follow-up"
      : statusFilter === "unpaid"
        ? "Open balances awaiting customer payment"
        : focus === "cash-flow"
          ? "Prioritizing overdue and unpaid balances for collections"
          : null;

  return {
    focus,
    statusFilter,
    banner,
    jobClearHref,
    highlightedSummaryLabels,
    sectionEyebrow,
    sectionDescription,
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
