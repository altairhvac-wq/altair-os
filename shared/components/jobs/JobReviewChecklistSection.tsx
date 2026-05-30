import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
} from "lucide-react";
import type { JobInvoiceSummary } from "@/shared/lib/job-next-business-action";
import { isActiveInvoice } from "@/shared/types/invoice";
import type { JobStatus } from "@/shared/types/job";
import type { JobProfitabilitySnapshot } from "@/shared/types/job-profitability";
import {
  isValidOfficeReviewQueueCustomerId,
  isValidOfficeReviewQueueJobId,
  isValidQueueActionHref,
  jobProfitabilityHeadingAnchor,
  safeBuildQueueActionHref,
} from "@/shared/types/office-review-queue";
import {
  resolveCompletedWorkReviewReasons,
  resolveCompletedWorkReviewSeverity,
  type CompletedWorkReviewSeverity,
} from "@/shared/types/reports";

export type JobReviewChecklistItemId =
  | "invoice_exists"
  | "open_labor_entries"
  | "pending_expenses"
  | "profitability_completeness"
  | "missing_material_costs"
  | "rejected_expenses"
  | "excluded_material_expenses";

export type JobReviewChecklistItemStatus = "ok" | "needs_attention";

export type JobReviewChecklistItemSeverity = "info" | "warning" | "critical";

export type JobReviewChecklistItem = {
  id: JobReviewChecklistItemId;
  label: string;
  status: JobReviewChecklistItemStatus;
  severity: JobReviewChecklistItemSeverity | null;
  detail: string;
  href: string;
};

type JobReviewChecklistSectionProps = {
  jobId: string;
  jobStatus: JobStatus;
  customerId: string;
  snapshot: JobProfitabilitySnapshot;
  invoices?: JobInvoiceSummary[];
};

type OfficeReviewAction = {
  id:
    | "create_invoice"
    | "view_invoice"
    | "review_expenses"
    | "review_labor"
    | "view_profitability";
  label: string;
  href: string;
  external?: boolean;
};

function selectNewestActiveInvoiceSummary(
  invoices: JobInvoiceSummary[],
): JobInvoiceSummary | null {
  return (
    invoices
      .filter((invoice) => isActiveInvoice(invoice))
      .sort(
        (left, right) =>
          Date.parse(right.createdAt) - Date.parse(left.createdAt),
      )[0] ?? null
  );
}

function profitabilityAnchor(jobId: string): string {
  return jobProfitabilityHeadingAnchor(jobId);
}

function profitabilityWarningsAnchor(jobId: string): string {
  return `#job-profitability-warnings-${jobId}`;
}

function materialsAnchor(jobId: string): string {
  return `#job-materials-heading-${jobId}`;
}

function expensesAnchor(jobId: string): string {
  return `#job-expense-receipts-heading-${jobId}`;
}

/**
 * Derives checklist rows from the same profitability completeness flags used by
 * completed-work-review-report — no duplicate queries or heuristics.
 */
export function buildJobReviewChecklistItems(
  snapshot: JobProfitabilitySnapshot,
  jobId: string,
): JobReviewChecklistItem[] {
  const { completeness } = snapshot;

  return [
    {
      id: "invoice_exists",
      label: "Invoice exists",
      status: completeness.noActiveInvoices ? "needs_attention" : "ok",
      severity: completeness.noActiveInvoices ? "warning" : null,
      detail: completeness.noActiveInvoices
        ? "No active invoice linked to this job"
        : `${snapshot.activeInvoiceCount} active invoice${snapshot.activeInvoiceCount === 1 ? "" : "s"}`,
      href: profitabilityAnchor(jobId),
    },
    {
      id: "open_labor_entries",
      label: "Labor entries closed",
      status:
        completeness.openLaborEntryCount > 0 ? "needs_attention" : "ok",
      severity: completeness.openLaborEntryCount > 0 ? "warning" : null,
      detail:
        completeness.openLaborEntryCount > 0
          ? `${completeness.openLaborEntryCount} open labor entr${completeness.openLaborEntryCount === 1 ? "y" : "ies"}`
          : "All job labor entries are closed",
      href: profitabilityAnchor(jobId),
    },
    {
      id: "pending_expenses",
      label: "Expenses reviewed",
      status:
        completeness.excludedPendingExpenseCount > 0 ? "needs_attention" : "ok",
      severity:
        completeness.excludedPendingExpenseCount > 0 ? "warning" : null,
      detail:
        completeness.excludedPendingExpenseCount > 0
          ? `${completeness.excludedPendingExpenseCount} draft or submitted expense${completeness.excludedPendingExpenseCount === 1 ? "" : "s"} pending approval`
          : "No pending expenses on this job",
      href: expensesAnchor(jobId),
    },
    {
      id: "profitability_completeness",
      label: "Expense amounts complete",
      status:
        completeness.expensesMissingAmountCount > 0 ? "needs_attention" : "ok",
      severity:
        completeness.expensesMissingAmountCount > 0 ? "warning" : null,
      detail:
        completeness.expensesMissingAmountCount > 0
          ? `${completeness.expensesMissingAmountCount} approved expense${completeness.expensesMissingAmountCount === 1 ? "" : "s"} missing an amount`
          : "All approved expenses have amounts recorded",
      href: profitabilityWarningsAnchor(jobId),
    },
    {
      id: "missing_material_costs",
      label: "Material costs recorded",
      status:
        completeness.materialsMissingUnitCostCount > 0 ? "needs_attention" : "ok",
      severity:
        completeness.materialsMissingUnitCostCount > 0 ? "warning" : null,
      detail:
        completeness.materialsMissingUnitCostCount > 0
          ? `${completeness.materialsMissingUnitCostCount} material line${completeness.materialsMissingUnitCostCount === 1 ? "" : "s"} missing unit cost`
          : "All logged materials have unit costs",
      href: materialsAnchor(jobId),
    },
    {
      id: "rejected_expenses",
      label: "No rejected expenses",
      status:
        completeness.excludedRejectedExpenseCount > 0 ? "needs_attention" : "ok",
      severity:
        completeness.excludedRejectedExpenseCount > 0 ? "warning" : null,
      detail:
        completeness.excludedRejectedExpenseCount > 0
          ? `${completeness.excludedRejectedExpenseCount} rejected expense${completeness.excludedRejectedExpenseCount === 1 ? "" : "s"} on this job`
          : "No rejected expenses on this job",
      href: expensesAnchor(jobId),
    },
    {
      id: "excluded_material_expenses",
      label: "Material expense overlap resolved",
      status:
        completeness.excludedMaterialsExpenseCount > 0 ? "needs_attention" : "ok",
      severity:
        completeness.excludedMaterialsExpenseCount > 0 ? "info" : null,
      detail:
        completeness.excludedMaterialsExpenseCount > 0
          ? `${completeness.excludedMaterialsExpenseCount} materials-category expense${completeness.excludedMaterialsExpenseCount === 1 ? "" : "s"} excluded to avoid double-counting`
          : "No overlapping materials expenses",
      href: expensesAnchor(jobId),
    },
  ];
}

function resolveOverallSeverity(
  snapshot: JobProfitabilitySnapshot,
): CompletedWorkReviewSeverity | null {
  const reasons = resolveCompletedWorkReviewReasons(snapshot);
  if (reasons.length === 0) {
    return null;
  }

  return resolveCompletedWorkReviewSeverity(reasons);
}

function buildOfficeReviewActions(
  jobId: string,
  customerId: string,
  snapshot: JobProfitabilitySnapshot,
  invoices: JobInvoiceSummary[] = [],
): OfficeReviewAction[] {
  if (!isValidOfficeReviewQueueJobId(jobId)) {
    return [];
  }

  const invoiceParams: Record<string, string> = {
    create: "1",
    jobId,
  };

  if (isValidOfficeReviewQueueCustomerId(customerId)) {
    invoiceParams.customerId = customerId;
  }

  const activeInvoice = selectNewestActiveInvoiceSummary(invoices);
  const invoiceActions: OfficeReviewAction[] = [];

  if (snapshot.completeness.noActiveInvoices) {
    invoiceActions.push({
      id: "create_invoice",
      label: "Create invoice",
      href: safeBuildQueueActionHref("/invoices", invoiceParams) ?? "",
      external: true,
    });
  } else if (activeInvoice) {
    const viewHref = safeBuildQueueActionHref(
      `/invoices/${encodeURIComponent(activeInvoice.id)}`,
    );
    if (viewHref) {
      invoiceActions.push({
        id: "view_invoice",
        label:
          activeInvoice.status === "draft"
            ? "View draft invoice"
            : "View invoice",
        href: viewHref,
        external: true,
      });
    }
  }

  const candidates: OfficeReviewAction[] = [
    ...invoiceActions,
    {
      id: "review_expenses",
      label: "Review expenses",
      href: safeBuildQueueActionHref("/expenses", { jobId }) ?? "",
      external: true,
    },
    {
      id: "review_labor",
      label: "Review labor",
      href: safeBuildQueueActionHref("/time", { jobId }) ?? "",
      external: true,
    },
    {
      id: "view_profitability",
      label: "View profitability",
      href: profitabilityAnchor(jobId),
    },
  ];

  return candidates.filter((action) => isValidQueueActionHref(action.href));
}

function severityBadgeClassName(
  severity: JobReviewChecklistItemSeverity,
): string {
  switch (severity) {
    case "critical":
      return "bg-rose-100 text-rose-800";
    case "warning":
      return "bg-amber-100 text-amber-800";
    case "info":
      return "bg-sky-100 text-sky-800";
  }
}

function overallSeverityBadgeClassName(
  severity: CompletedWorkReviewSeverity,
): string {
  return severity === "critical"
    ? "bg-rose-100 text-rose-800"
    : "bg-amber-100 text-amber-800";
}

function ChecklistStatusIcon({
  status,
}: {
  status: JobReviewChecklistItemStatus;
}) {
  if (status === "ok") {
    return (
      <CheckCircle2
        className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
        aria-hidden="true"
      />
    );
  }

  return (
    <AlertTriangle
      className="mt-0.5 h-4 w-4 shrink-0 text-amber-700"
      aria-hidden="true"
    />
  );
}

export function JobReviewChecklistSection({
  jobId,
  jobStatus,
  customerId,
  snapshot,
  invoices = [],
}: JobReviewChecklistSectionProps) {
  if (jobStatus !== "completed") {
    return null;
  }

  const items = buildJobReviewChecklistItems(snapshot, jobId);
  const attentionCount = items.filter(
    (item) => item.status === "needs_attention",
  ).length;
  const overallSeverity = resolveOverallSeverity(snapshot);
  const actions = buildOfficeReviewActions(jobId, customerId, snapshot, invoices);

  return (
    <section
      aria-labelledby={`job-review-checklist-heading-${jobId}`}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 ring-1 ring-violet-600/10">
            <ClipboardCheck className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2
                id={`job-review-checklist-heading-${jobId}`}
                className="text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Office review checklist
              </h2>
              {overallSeverity ? (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${overallSeverityBadgeClassName(overallSeverity)}`}
                >
                  {overallSeverity}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Resolve blockers before invoicing and closure. Uses the same rules
              as the Needs review report.
            </p>
          </div>
        </div>
      </div>

      {attentionCount === 0 ? (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-emerald-200/80 bg-emerald-50/60 px-4 py-3">
          <CheckCircle2
            className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700"
            aria-hidden="true"
          />
          <div>
            <p className="text-sm font-semibold text-emerald-900">
              All review checks passed
            </p>
            <p className="mt-0.5 text-sm text-emerald-900/80">
              No invoice, labor, expense, or profitability blockers detected.
            </p>
          </div>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-100">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-slate-50 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-2.5">
                  <ChecklistStatusIcon status={item.status} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">
                        {item.label}
                      </p>
                      {item.severity ? (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${severityBadgeClassName(item.severity)}`}
                        >
                          {item.severity}
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
                          ok
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-slate-600">{item.detail}</p>
                  </div>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-cyan-600 sm:mt-1">
                  Go to section
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {actions.map((action) =>
          action.external ? (
            <Link
              key={action.id}
              href={action.href}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              {action.label}
              <ExternalLink className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            </Link>
          ) : (
            <Link
              key={action.id}
              href={action.href}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              {action.label}
            </Link>
          ),
        )}
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Navigational shortcuts only — no approvals, assignments, or
        notifications yet. Does not validate accounting or payroll readiness.
      </p>
    </section>
  );
}
