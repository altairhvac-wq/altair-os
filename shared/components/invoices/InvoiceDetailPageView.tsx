import Link from "next/link";
import {
  ArrowLeft,
  Briefcase,
  FileText,
  Mail,
  Phone,
  User,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/shared/types/customer";
import {
  calculateLineItemTotal,
  formatTaxRate,
  type InvoiceDetail,
} from "@/shared/types/invoice";
import type { InvoiceActivity } from "@/shared/types/invoice-activity";
import type { InvoicePayment } from "@/shared/types/invoice-payment";
import { InvoiceActivityTimeline } from "./InvoiceActivityTimeline";
import { InvoicePaymentHistory } from "./InvoicePaymentHistory";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";
import { RecordPaymentForm } from "./RecordPaymentForm";

type InvoiceDetailPageViewProps = {
  invoice: InvoiceDetail;
  activities: InvoiceActivity[];
  payments: InvoicePayment[];
  canManageBilling: boolean;
};

export function InvoiceDetailPageView({
  invoice,
  activities,
  payments,
  canManageBilling,
}: InvoiceDetailPageViewProps) {
  const customerEmail = invoice.customerEmail?.trim();
  const customerPhone = invoice.customerPhone?.trim();

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Link
        href="/invoices"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to invoices
      </Link>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Invoice
              </p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">
                {invoice.invoiceNumber}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <InvoiceStatusBadge status={invoice.status} />
                <span className="text-sm font-semibold text-slate-900">
                  {formatCurrency(invoice.total)}
                </span>
                <span className="text-sm text-slate-500">
                  Balance {formatCurrency(invoice.balanceDue)}
                </span>
                <span className="text-sm text-slate-500">
                  Issued {formatDate(invoice.issueDate)}
                </span>
                <span className="text-sm text-slate-500">
                  Due {formatDate(invoice.dueDate)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-3">
          <section className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 lg:col-span-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Customer
            </h2>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-slate-400" />
                {invoice.customerName}
              </div>
              {customerEmail ? (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-400" />
                  {customerEmail}
                </div>
              ) : null}
              {customerPhone ? (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-slate-400" />
                  {customerPhone}
                </div>
              ) : null}
            </div>
          </section>

          <div className="space-y-5">
            {invoice.jobId ? (
              <section className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Linked job
                </h2>
                <Link
                  href={`/jobs/${invoice.jobId}`}
                  className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-cyan-700 transition-colors hover:text-cyan-800"
                >
                  <Briefcase className="h-4 w-4" />
                  {invoice.jobNumber ?? "View job"}
                </Link>
              </section>
            ) : (
              <section className="rounded-xl border border-dashed border-slate-200 bg-slate-50/40 p-4">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Linked job
                </h2>
                <p className="mt-3 text-sm text-slate-500">No job linked</p>
              </section>
            )}

            {invoice.estimateId ? (
              <section className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Source estimate
                </h2>
                <Link
                  href={`/estimates/${invoice.estimateId}`}
                  className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-cyan-700 transition-colors hover:text-cyan-800"
                >
                  <FileText className="h-4 w-4" />
                  {invoice.estimateNumber ?? "View estimate"}
                </Link>
              </section>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Line items
        </h2>
        <div className="mt-4 space-y-2">
          {invoice.lineItems.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-slate-200 bg-white px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {item.name}
                  </p>
                  {item.description ? (
                    <p className="mt-0.5 text-xs text-slate-500">
                      {item.description}
                    </p>
                  ) : null}
                </div>
                {!item.taxable ? (
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Non-taxable
                  </span>
                ) : null}
              </div>
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

        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3">
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>Subtotal</span>
            <span>{formatCurrency(invoice.subtotal)}</span>
          </div>
          {invoice.taxRate > 0 || invoice.taxAmount ? (
            <div className="mt-2 flex items-center justify-between text-sm text-slate-600">
              <span>
                Tax
                {invoice.taxRate > 0
                  ? ` (${formatTaxRate(invoice.taxRate)}%)`
                  : ""}
              </span>
              <span>{formatCurrency(invoice.taxAmount ?? 0)}</span>
            </div>
          ) : null}
          <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-sm font-bold text-slate-900">
            <span>Total</span>
            <span>{formatCurrency(invoice.total)}</span>
          </div>
          {invoice.amountPaid > 0 ? (
            <div className="mt-2 flex items-center justify-between text-sm text-emerald-700">
              <span>Paid</span>
              <span>{formatCurrency(invoice.amountPaid)}</span>
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Payments
        </h2>
        <div className="mt-4 space-y-4">
          {canManageBilling ? <RecordPaymentForm invoice={invoice} /> : null}
          <InvoicePaymentHistory payments={payments} />
        </div>
      </section>

      {invoice.notes ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Notes
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            {invoice.notes}
          </p>
        </section>
      ) : null}

      <InvoiceActivityTimeline activities={activities} />
    </div>
  );
}
