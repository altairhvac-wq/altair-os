import { Calendar, FileText, Receipt, User, Wrench, X } from "lucide-react";
import { formatCurrency, formatDate } from "@/shared/types/customer";
import {
  calculateLineItemTotal,
  type Invoice,
  type InvoiceFormData,
} from "@/shared/types/invoice";
import { InvoiceForm } from "./InvoiceForm";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";

type PanelMode = "detail" | "create" | "empty";

type InvoiceDetailsPanelProps = {
  mode: PanelMode;
  invoice: Invoice | null;
  onClose: () => void;
  onCreateSubmit: (data: InvoiceFormData) => void;
  onCreateCancel: () => void;
};

export function InvoiceDetailsPanel({
  mode,
  invoice,
  onClose,
  onCreateSubmit,
  onCreateCancel,
}: InvoiceDetailsPanelProps) {
  const title =
    mode === "create"
      ? "New invoice"
      : mode === "detail" && invoice
        ? invoice.invoiceNumber
        : "Invoice details";

  return (
    <aside className="flex min-h-[12rem] min-w-0 flex-[1_1_45%] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:h-full lg:min-h-0 lg:w-[400px] lg:flex-none lg:shrink-0">
      <div className="flex shrink-0 items-start justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {mode === "create"
              ? "Add line items and set due date"
              : mode === "detail"
                ? "Invoice details and payment summary"
                : "Select an invoice from the list"}
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
              <Receipt className="h-6 w-6 text-slate-400" />
            </div>
            <p className="mt-4 text-sm font-medium text-slate-700">
              No invoice selected
            </p>
            <p className="mt-1 max-w-[220px] text-xs text-slate-500">
              Click a row in the table to view full invoice details here.
            </p>
          </div>
        ) : null}

        {mode === "create" ? (
          <InvoiceForm onSubmit={onCreateSubmit} onCancel={onCreateCancel} />
        ) : null}

        {mode === "detail" && invoice ? (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-slate-900">
                    {formatCurrency(invoice.balanceDue)}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Balance due of {formatCurrency(invoice.total)} total
                  </p>
                  {invoice.amountPaid > 0 ? (
                    <p className="mt-1 text-xs text-emerald-600">
                      {formatCurrency(invoice.amountPaid)} paid
                    </p>
                  ) : null}
                </div>
                <InvoiceStatusBadge status={invoice.status} />
              </div>
            </div>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Customer
              </h3>
              <div className="mt-2 flex items-center gap-2 text-sm text-slate-700">
                <User className="h-4 w-4 text-slate-400" />
                {invoice.customerName}
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Job
              </h3>
              <div className="mt-2 space-y-2 text-sm text-slate-700">
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-slate-400" />
                  {invoice.jobType}
                </div>
                {invoice.jobNumber ? (
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-400" />
                    {invoice.jobNumber}
                  </div>
                ) : null}
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Dates
              </h3>
              <div className="mt-2 space-y-2 text-sm text-slate-700">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  Issued {formatDate(invoice.issuedAt)}
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  Due {formatDate(invoice.dueDate)}
                </div>
                {invoice.paidAt ? (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    Paid {formatDate(invoice.paidAt)}
                  </div>
                ) : null}
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Line items
              </h3>
              <div className="mt-2 space-y-2">
                {invoice.lineItems.map((item) => (
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
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.tax ? (
                <div className="mt-2 flex items-center justify-between text-sm text-slate-600">
                  <span>Tax</span>
                  <span>{formatCurrency(invoice.tax)}</span>
                </div>
              ) : null}
              <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-sm font-bold text-slate-900">
                <span>Total</span>
                <span>{formatCurrency(invoice.total)}</span>
              </div>
            </section>

            {invoice.notes ? (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Notes
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {invoice.notes}
                </p>
              </section>
            ) : null}

            <div className="flex gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                className="flex-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
              >
                Send invoice
              </button>
              <button
                type="button"
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Record payment
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
