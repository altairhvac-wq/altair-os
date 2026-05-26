import Link from "next/link";
import {
  ArrowLeft,
  Briefcase,
  Mail,
  Phone,
  Receipt,
  User,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/shared/types/customer";
import {
  calculateLineItemTotal,
  formatTaxRate,
  type EstimateDetail,
} from "@/shared/types/estimate";
import type { InvoiceDetail } from "@/shared/types/invoice";
import type { EstimateActivity } from "@/shared/types/estimate-activity";
import { EstimateActivityTimeline } from "./EstimateActivityTimeline";
import { EstimateStatusActions } from "./EstimateStatusActions";
import { EstimateStatusBadge } from "./EstimateStatusBadge";

type EstimateDetailPageViewProps = {
  estimate: EstimateDetail;
  activities: EstimateActivity[];
  linkedInvoice?: InvoiceDetail | null;
  canManageEstimates: boolean;
};

export function EstimateDetailPageView({
  estimate,
  activities,
  linkedInvoice,
  canManageEstimates,
}: EstimateDetailPageViewProps) {
  const customerEmail = estimate.customerEmail?.trim();
  const customerPhone = estimate.customerPhone?.trim();

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Link
        href="/estimates"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to estimates
      </Link>

      <section className="overflow-hidden admin-card">
        <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Estimate
              </p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">
                {estimate.estimateNumber}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <EstimateStatusBadge status={estimate.status} />
                <span className="text-sm font-semibold text-slate-900">
                  {formatCurrency(estimate.total)}
                </span>
                <span className="text-sm text-slate-500">
                  Created {formatDate(estimate.createdAt)}
                </span>
                {estimate.validUntil ? (
                  <span className="text-sm text-slate-500">
                    Valid until {formatDate(estimate.validUntil)}
                  </span>
                ) : null}
              </div>
            </div>

            <EstimateStatusActions
              estimate={estimate}
              canManageEstimates={canManageEstimates}
            />
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
                {estimate.customerName}
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

          {estimate.jobId ? (
            <section className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Linked job
              </h2>
              <Link
                href={`/jobs/${estimate.jobId}`}
                className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-cyan-700 transition-colors hover:text-cyan-800"
              >
                <Briefcase className="h-4 w-4" />
                {estimate.jobNumber ?? "View job"}
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

          {linkedInvoice ? (
            <section className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 lg:col-span-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Linked invoice
              </h2>
              <Link
                href={`/invoices/${linkedInvoice.id}`}
                className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-cyan-700 transition-colors hover:text-cyan-800"
              >
                <Receipt className="h-4 w-4" />
                {linkedInvoice.invoiceNumber} — {formatCurrency(linkedInvoice.total)}
              </Link>
            </section>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Line items
        </h2>
        <div className="mt-4 space-y-2">
          {estimate.lineItems.map((item) => (
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
            <span>{formatCurrency(estimate.subtotal)}</span>
          </div>
          {estimate.taxRate > 0 || estimate.tax ? (
            <div className="mt-2 flex items-center justify-between text-sm text-slate-600">
              <span>
                Tax
                {estimate.taxRate > 0
                  ? ` (${formatTaxRate(estimate.taxRate)}%)`
                  : ""}
              </span>
              <span>{formatCurrency(estimate.tax ?? 0)}</span>
            </div>
          ) : null}
          <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-sm font-bold text-slate-900">
            <span>Total</span>
            <span>{formatCurrency(estimate.total)}</span>
          </div>
        </div>
      </section>

      {estimate.notes ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Notes
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            {estimate.notes}
          </p>
        </section>
      ) : null}

      <EstimateActivityTimeline activities={activities} />
    </div>
  );
}
