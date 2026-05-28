"use client";

import { useState } from "react";
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
import type { InvoiceDetail } from "@/shared/types/invoice";
import {
  canRecordInvoicePayment,
  getRecordPaymentBlockReason,
} from "@/shared/types/invoice-payment";
import type { InvoiceActivity } from "@/shared/types/invoice-activity";
import type { InvoicePayment } from "@/shared/types/invoice-payment";
import { BillingLineItemsList } from "@/shared/components/billing/BillingLineItemsList";
import { BillingMobileAmountHeader } from "@/shared/components/billing/BillingMobileAmountHeader";
import { BillingTotalsSummary } from "@/shared/components/billing/BillingTotalsSummary";
import { InvoiceActivityTimeline } from "./InvoiceActivityTimeline";
import { InvoiceDetailActionBar } from "./InvoiceDetailActionBar";
import { InvoicePaymentHistory } from "./InvoicePaymentHistory";
import { InvoiceStatusActions } from "./InvoiceStatusActions";
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
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const customerEmail = invoice.customerEmail?.trim();
  const customerPhone = invoice.customerPhone?.trim();
  const canRecordPayment = canRecordInvoicePayment(invoice);
  const recordPaymentBlockReason = getRecordPaymentBlockReason(invoice);

  return (
    <div className="mx-auto min-w-0 max-w-5xl space-y-5 overflow-x-hidden pb-2">
      <Link
        href="/invoices"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4 shrink-0" />
        Back to invoices
      </Link>

      <section className="overflow-hidden admin-card">
        <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Invoice
              </p>
              <h1 className="mt-1 break-words text-2xl font-bold text-slate-900">
                {invoice.invoiceNumber}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <InvoiceStatusBadge status={invoice.status} />
                <span className="hidden text-sm font-semibold text-slate-900 sm:inline">
                  {formatCurrency(invoice.total)}
                </span>
                <span className="hidden text-sm text-slate-500 sm:inline">
                  Balance {formatCurrency(invoice.balanceDue)}
                </span>
                <span className="text-sm text-slate-500">
                  Issued {formatDate(invoice.issueDate)}
                </span>
                <span className="text-sm text-slate-500">
                  Due {formatDate(invoice.dueDate)}
                </span>
              </div>
              <BillingMobileAmountHeader
                total={invoice.total}
                balanceDue={invoice.balanceDue}
              />
            </div>

            <div className="hidden sm:block">
              <InvoiceStatusActions
                invoice={invoice}
                paymentCount={payments.length}
                canManageBilling={canManageBilling}
              />
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
                <User className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="min-w-0 break-words">{invoice.customerName}</span>
              </div>
              {customerEmail ? (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="min-w-0 break-all">{customerEmail}</span>
                </div>
              ) : (
                <div className="flex items-start gap-2 text-slate-500">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <span>
                    No email on file —{" "}
                    <Link
                      href={`/customers/${invoice.customerId}`}
                      className="font-semibold text-cyan-700 hover:text-cyan-800"
                    >
                      add one on the customer record
                    </Link>{" "}
                    to send this invoice.
                  </span>
                </div>
              )}
              {customerPhone ? (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                  {customerPhone}
                </div>
              ) : null}
            </div>
          </section>

          <div className="space-y-5">
            {invoice.jobId ? (
              <section className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Related job
                </h2>
                <Link
                  href={`/jobs/${invoice.jobId}`}
                  className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-cyan-700 transition-colors hover:text-cyan-800"
                >
                  <Briefcase className="h-4 w-4 shrink-0" />
                  {invoice.jobNumber ?? "View job"}
                </Link>
                <p className="mt-1 text-xs text-slate-500">
                  Open the job for schedule, notes, and field updates.
                </p>
              </section>
            ) : (
              <section className="rounded-xl border border-dashed border-slate-200 bg-slate-50/40 p-4">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Related job
                </h2>
                <p className="mt-3 text-sm font-medium text-slate-700">
                  No job linked
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Link a job when creating the invoice to keep field work and billing together.
                </p>
              </section>
            )}

            {invoice.estimateId ? (
              <section className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Source estimate
                </h2>
                <Link
                  href={`/estimates/${invoice.estimateId}`}
                  className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-cyan-700 transition-colors hover:text-cyan-800"
                >
                  <FileText className="h-4 w-4 shrink-0" />
                  {invoice.estimateNumber ?? "View estimate"}
                </Link>
                <p className="mt-1 text-xs text-slate-500">
                  View the original estimate this invoice was created from.
                </p>
              </section>
            ) : null}
          </div>
        </div>
      </section>

      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Line items
        </h2>
        <div className="mt-4">
          <BillingLineItemsList
            items={invoice.lineItems}
            documentLabel="invoice"
          />
        </div>

        <div className="mt-4">
          <BillingTotalsSummary
            subtotal={invoice.subtotal}
            taxRate={invoice.taxRate}
            taxAmount={invoice.taxAmount ?? 0}
            total={invoice.total}
            amountPaid={invoice.amountPaid}
            balanceDue={invoice.balanceDue}
          />
        </div>
      </section>

      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Payments
            </h2>
            {canManageBilling && canRecordPayment ? (
              <p className="mt-1 text-xs text-slate-500">
                Record a payment when the customer pays all or part of the balance due.
              </p>
            ) : canManageBilling && !canRecordPayment && recordPaymentBlockReason ? (
              <p className="mt-1 text-xs text-slate-500">
                {recordPaymentBlockReason}
              </p>
            ) : !canManageBilling ? (
              <p className="mt-1 text-xs text-slate-500">
                Payment history for this invoice.
              </p>
            ) : null}
          </div>
          {canManageBilling ? (
            <div className="hidden sm:block">
              <RecordPaymentForm invoice={invoice} />
            </div>
          ) : null}
        </div>
        <div className="mt-4">
          <InvoicePaymentHistory payments={payments} />
        </div>
      </section>

      {invoice.notes ? (
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Notes
          </h2>
          <p className="mt-3 break-words text-sm leading-relaxed text-slate-600">
            {invoice.notes}
          </p>
        </section>
      ) : null}

      <InvoiceActivityTimeline activities={activities} />

      {canManageBilling ? (
        <>
          <RecordPaymentForm
            invoice={invoice}
            open={paymentModalOpen}
            onOpenChange={setPaymentModalOpen}
            showTrigger={false}
          />
          <InvoiceDetailActionBar
            invoice={invoice}
            paymentCount={payments.length}
            canManageBilling={canManageBilling}
            onRecordPayment={() => setPaymentModalOpen(true)}
            canRecordPayment={canRecordPayment}
            recordPaymentBlockReason={recordPaymentBlockReason}
            variant="sticky"
          />
        </>
      ) : null}
    </div>
  );
}
