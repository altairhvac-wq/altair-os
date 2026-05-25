import { Calendar, FileText, User, X } from "lucide-react";
import { formatCurrency, formatDate } from "@/shared/types/customer";
import {
  calculateLineItemTotal,
  type Estimate,
  type EstimateFormData,
} from "@/shared/types/estimate";
import { EstimateForm } from "./EstimateForm";
import { EstimateStatusBadge } from "./EstimateStatusBadge";

type PanelMode = "detail" | "create" | "empty";

type EstimateDetailsPanelProps = {
  mode: PanelMode;
  estimate: Estimate | null;
  onClose: () => void;
  onCreateSubmit: (data: EstimateFormData) => void;
  onCreateCancel: () => void;
};

export function EstimateDetailsPanel({
  mode,
  estimate,
  onClose,
  onCreateSubmit,
  onCreateCancel,
}: EstimateDetailsPanelProps) {
  const title =
    mode === "create"
      ? "New estimate"
      : mode === "detail" && estimate
        ? estimate.estimateNumber
        : "Estimate details";

  return (
    <aside className="flex min-h-[12rem] min-w-0 flex-[1_1_45%] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:h-full lg:min-h-0 lg:w-[400px] lg:flex-none lg:shrink-0">
      <div className="flex shrink-0 items-start justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {mode === "create"
              ? "Add line items and send to your customer"
              : mode === "detail"
                ? "Estimate details and line items"
                : "Select an estimate from the list"}
          </p>
        </div>
        {mode !== "empty" ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        {mode === "empty" ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
              <FileText className="h-6 w-6 text-slate-400" />
            </div>
            <p className="mt-4 text-sm font-medium text-slate-700">
              No estimate selected
            </p>
            <p className="mt-1 max-w-[220px] text-xs text-slate-500">
              Click a row in the table to view full estimate details here.
            </p>
          </div>
        ) : null}

        {mode === "create" ? (
          <EstimateForm onSubmit={onCreateSubmit} onCancel={onCreateCancel} />
        ) : null}

        {mode === "detail" && estimate ? (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-slate-900">
                    {formatCurrency(estimate.total)}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {estimate.lineItems.length}{" "}
                    {estimate.lineItems.length === 1 ? "line item" : "line items"}
                  </p>
                </div>
                <EstimateStatusBadge status={estimate.status} />
              </div>
            </div>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Customer
              </h3>
              <div className="mt-2 flex items-center gap-2 text-sm text-slate-700">
                <User className="h-4 w-4 text-slate-400" />
                {estimate.customerName}
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Dates
              </h3>
              <div className="mt-2 space-y-2 text-sm text-slate-700">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  Created {formatDate(estimate.createdAt)}
                </div>
                {estimate.validUntil ? (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    Valid until {formatDate(estimate.validUntil)}
                  </div>
                ) : null}
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Line items
              </h3>
              <div className="mt-2 space-y-2">
                {estimate.lineItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2.5"
                  >
                    <p className="text-sm font-medium text-slate-900">
                      {item.description}
                    </p>
                    <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                      <span>
                        {item.quantity} × {formatCurrency(item.unitPrice)}
                      </span>
                      <span className="font-semibold text-slate-700">
                        {formatCurrency(
                          calculateLineItemTotal(item.quantity, item.unitPrice),
                        )}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white px-4 py-3">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Subtotal</span>
                <span>{formatCurrency(estimate.subtotal)}</span>
              </div>
              {estimate.tax ? (
                <div className="mt-2 flex items-center justify-between text-sm text-slate-600">
                  <span>Tax</span>
                  <span>{formatCurrency(estimate.tax)}</span>
                </div>
              ) : null}
              <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-sm font-bold text-slate-900">
                <span>Total</span>
                <span>{formatCurrency(estimate.total)}</span>
              </div>
            </section>

            {estimate.notes ? (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Notes
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {estimate.notes}
                </p>
              </section>
            ) : null}

            <div className="flex gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                className="flex-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
              >
                Send estimate
              </button>
              <button
                type="button"
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Convert to job
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
