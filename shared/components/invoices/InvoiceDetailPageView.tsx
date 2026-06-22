"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CustomerNameLink } from "@/shared/components/customers/CustomerNameLink";
import { ArrowLeft, Briefcase, FileText, Mail, Phone, Printer, User } from "lucide-react";
import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";
import { formatCurrency, formatDate } from "@/shared/types/customer";
import {
  canRecordInvoicePayment,
  getRecordPaymentBlockReason,
} from "@/shared/types/invoice-payment";
import type { InvoiceActivity } from "@/shared/types/invoice-activity";
import type { InvoicePayment } from "@/shared/types/invoice-payment";
import type { InvoiceDetail } from "@/shared/types/invoice";
import {
  formatBillingEmailSentMessage,
  getLastInvoiceEmailSentInfo,
} from "@/shared/lib/billing-email-sent";
import type { BillingCompanyContact } from "@/shared/lib/billing-company-contact";
import { getCustomerEmailSendBlockReason } from "@/shared/lib/operational-errors";
import { BillingMobileAmountHeader } from "@/shared/components/billing/BillingMobileAmountHeader";
import { InvoiceDocumentSection } from "@/shared/components/billing/InvoiceDocumentSection";
import { InvoiceActivityTimeline } from "./InvoiceActivityTimeline";
import { InvoiceDetailActionBar } from "./InvoiceDetailActionBar";
import { InvoicePaymentHistory } from "./InvoicePaymentHistory";
import { InvoiceStatusActions } from "./InvoiceStatusActions";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";
import { RecordPaymentForm } from "./RecordPaymentForm";
import { InvoicePaymentCollectionCard } from "./InvoicePaymentCollectionCard";
import { InvoiceInternalTestCheckoutButton } from "./InvoiceInternalTestCheckoutButton";
import { InvoiceMessageAiAssistant } from "./InvoiceMessageAiAssistant";
import { InvoiceLifecycleControl } from "./InvoiceLifecycleControl";
import { InvoiceDetailNorthStarBody } from "./north-star-m5d";

import type { BillingSignature } from "@/shared/types/billing-signature";
import type { InvoiceDeleteDependencies } from "@/shared/lib/invoice-lifecycle";
import { adminCardSectionClass } from "@/shared/lib/admin-density";
import { FocusedDocumentOverlayFooter } from "@/shared/components/layout/FocusedDocumentOverlay";
import {
  MasterContentStack,
  MasterDetailPageLayout,
  MasterPageCanvas,
  masterDetailOverlayBodyInsetClass,
} from "@/shared/design-system/shell";
import {
  northStarDetailTokens as dt,
  northStarInvoiceDocumentTokens as idt,
} from "@/shared/design-system/north-star/tokens";

type InvoiceDetailPageViewProps = {
  invoice: InvoiceDetail;
  activities: InvoiceActivity[];
  payments: InvoicePayment[];
  company: BillingCompanyContact;
  companyTimeZone: string;
  canManageBilling: boolean;
  canManageCustomers?: boolean;
  canCaptureSignature?: boolean;
  signature?: BillingSignature | null;
  presentation?: "page" | "overlay";
  aiFeaturesEnabled?: boolean;
  deleteDependencies: InvoiceDeleteDependencies;
  onlinePaymentsEnabled?: boolean;
};

export function InvoiceDetailPageView(props: InvoiceDetailPageViewProps) {
  if (isNorthStarShellEnabled()) {
    return <NorthStarInvoiceDetailPageView {...props} />;
  }

  return <LegacyInvoiceDetailPageView {...props} />;
}

function NorthStarInvoiceDetailPageView({
  invoice,
  activities,
  payments,
  company,
  companyTimeZone,
  canManageBilling,
  canManageCustomers = false,
  canCaptureSignature = false,
  signature,
  presentation = "page",
  aiFeaturesEnabled = false,
  deleteDependencies,
  onlinePaymentsEnabled = false,
}: InvoiceDetailPageViewProps) {
  const isOverlay = presentation === "overlay";
  const customerEmail = invoice.customerEmail?.trim();
  const customerEmailBlockReason = getCustomerEmailSendBlockReason(customerEmail);
  const lastEmailSentInfo = useMemo(
    () => getLastInvoiceEmailSentInfo(activities, customerEmail),
    [activities, customerEmail],
  );
  const lastEmailSentMessage = lastEmailSentInfo
    ? formatBillingEmailSentMessage(lastEmailSentInfo, companyTimeZone)
    : null;

  function handlePrint() {
    window.print();
  }

  const body = (
    <InvoiceDetailNorthStarBody
      invoice={invoice}
      activities={activities}
      payments={payments}
      company={company}
      companyTimeZone={companyTimeZone}
      canManageBilling={canManageBilling}
      canManageCustomers={canManageCustomers}
      canCaptureSignature={canCaptureSignature}
      signature={signature}
      customerEmailBlockReason={customerEmailBlockReason}
      lastEmailSentMessage={lastEmailSentMessage}
      presentation={presentation}
      aiFeaturesEnabled={aiFeaturesEnabled}
      deleteDependencies={deleteDependencies}
      onlinePaymentsEnabled={onlinePaymentsEnabled}
    />
  );

  if (isOverlay) {
    return (
      <MasterPageCanvas
        width="detail"
        className={`${masterDetailOverlayBodyInsetClass} ${idt.overlayBodyCanvas}`}
      >
        <MasterContentStack density="default">{body}</MasterContentStack>
      </MasterPageCanvas>
    );
  }

  const pageBackLink = (
    <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Link href="/invoices" className={dt.backLink}>
        <ArrowLeft className="h-4 w-4 shrink-0" />
        Back to invoices
      </Link>
      <button type="button" onClick={handlePrint} className={dt.secondaryAction}>
        <Printer className="h-4 w-4" />
        Print / Save PDF
      </button>
    </div>
  );

  return (
    <MasterDetailPageLayout
      backLink={pageBackLink}
      className={`${dt.pageCanvas} overflow-x-hidden print:max-w-none print:pb-0`}
      canvasWidth="detailWide"
    >
      {body}
    </MasterDetailPageLayout>
  );
}

function LegacyInvoiceDetailPageView({
  invoice,
  activities,
  payments,
  company,
  companyTimeZone,
  canManageBilling,
  canManageCustomers = false,
  canCaptureSignature = false,
  signature,
  presentation = "page",
  aiFeaturesEnabled = false,
  deleteDependencies,
  onlinePaymentsEnabled = false,
}: InvoiceDetailPageViewProps) {
  const isOverlay = presentation === "overlay";
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const customerEmail = invoice.customerEmail?.trim();
  const customerPhone = invoice.customerPhone?.trim();
  const canRecordPayment = canRecordInvoicePayment(invoice);
  const recordPaymentBlockReason = getRecordPaymentBlockReason(invoice);
  const customerEmailBlockReason = getCustomerEmailSendBlockReason(customerEmail);
  const lastEmailSentInfo = useMemo(
    () => getLastInvoiceEmailSentInfo(activities, customerEmail),
    [activities, customerEmail],
  );
  const lastEmailSentMessage = lastEmailSentInfo
    ? formatBillingEmailSentMessage(lastEmailSentInfo, companyTimeZone)
    : null;

  function handlePrint() {
    window.print();
  }

  const headerActions = (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <button
        type="button"
        onClick={handlePrint}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
      >
        <Printer className="h-4 w-4" />
        Print / Save PDF
      </button>
    </div>
  );

  const pageBackLink = (
    <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Link
        href="/invoices"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4 shrink-0" />
        Back to invoices
      </Link>
      {headerActions}
    </div>
  );

  const pageBody = (
    <>
      <section className="no-print overflow-x-hidden admin-card">
        <div className="border-b border-slate-100 bg-white px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              {!isOverlay ? (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Invoice
                  </p>
                  <h1 className="mt-1 break-words text-2xl font-bold text-slate-900">
                    {invoice.invoiceNumber}
                  </h1>
                </>
              ) : null}
              <div
                className={`flex flex-wrap items-center gap-2 ${isOverlay ? "" : "mt-3"}`}
              >
                {!isOverlay ? (
                  <>
                    <InvoiceStatusBadge status={invoice.status} />
                    <span className="hidden text-sm font-semibold text-slate-900 sm:inline">
                      {formatCurrency(invoice.total)}
                    </span>
                    <span className="hidden text-sm text-slate-500 sm:inline">
                      Balance {formatCurrency(invoice.balanceDue)}
                    </span>
                  </>
                ) : null}
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
              {lastEmailSentMessage ? (
                <p className="mt-3 text-xs text-slate-500">{lastEmailSentMessage}</p>
              ) : null}
            </div>

            <div className={`${isOverlay ? "w-full" : "hidden sm:block"}`}>
              <InvoiceStatusActions
                invoice={invoice}
                paymentCount={payments.length}
                canManageBilling={canManageBilling}
                customerEmailBlockReason={customerEmailBlockReason}
                lastEmailSentMessage={lastEmailSentMessage}
              />
            </div>
          </div>
        </div>

        {canManageBilling ? (
          <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
            <InvoiceMessageAiAssistant
              invoiceId={invoice.id}
              aiFeaturesEnabled={aiFeaturesEnabled}
            />
          </div>
        ) : null}

        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-3">
          <section className={`${adminCardSectionClass} lg:col-span-2`}>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Customer
            </h2>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 shrink-0 text-slate-400" />
                <CustomerNameLink
                  customerId={invoice.customerId}
                  customerName={invoice.customerName}
                  canManageCustomers={canManageCustomers}
                  className="min-w-0 break-words text-sm text-slate-700"
                />
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
                    No email on file
                    {canManageCustomers ? (
                      <>
                        {" "}
                        —{" "}
                        <Link
                          href={`/customers/${invoice.customerId}`}
                          className="font-semibold text-cyan-700 hover:text-cyan-800"
                        >
                          add one on the customer record
                        </Link>{" "}
                      </>
                    ) : null}
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
              <section className={adminCardSectionClass}>
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
              <section className={`${adminCardSectionClass} border-dashed`}>
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
              <section className={adminCardSectionClass}>
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

            {canManageBilling && canRecordPayment ? (
              <InvoicePaymentCollectionCard
                invoiceId={invoice.id}
                jobId={invoice.jobId ?? undefined}
                balanceDue={invoice.balanceDue}
                onlinePaymentsEnabled={onlinePaymentsEnabled}
              />
            ) : null}
          </div>
        </div>
      </section>

      <InvoiceDocumentSection
        invoice={invoice}
        company={company}
        signature={signature}
        companyTimeZone={companyTimeZone}
        logoUrl={company.logoUrl}
        canCaptureSignature={canCaptureSignature}
        signatureCaptureContext={{
          entityId: invoice.id,
          documentNumber: invoice.invoiceNumber,
          customerId: invoice.customerId,
          jobId: invoice.jobId,
        }}
      />

      <section className={`no-print min-w-0 ${adminCardSectionClass}`}>
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
        <InvoiceInternalTestCheckoutButton
          invoice={invoice}
          canManageBilling={canManageBilling}
        />
      </section>

      {canManageBilling ? (
        <div className="no-print">
          <InvoiceLifecycleControl
            invoice={invoice}
            deleteDependencies={deleteDependencies}
            canManage={canManageBilling}
          />
        </div>
      ) : null}

      <div className="no-print">
        <InvoiceActivityTimeline activities={activities} />
      </div>

      {canManageBilling ? (
        <>
          <RecordPaymentForm
            invoice={invoice}
            open={paymentModalOpen}
            onOpenChange={setPaymentModalOpen}
            showTrigger={false}
          />
          {isOverlay ? (
            <FocusedDocumentOverlayFooter>
              <InvoiceDetailActionBar
                invoice={invoice}
                paymentCount={payments.length}
                canManageBilling={canManageBilling}
                onRecordPayment={() => setPaymentModalOpen(true)}
                canRecordPayment={canRecordPayment}
                recordPaymentBlockReason={recordPaymentBlockReason}
                customerEmailBlockReason={customerEmailBlockReason}
                lastEmailSentMessage={lastEmailSentMessage}
                variant="overlay-footer"
              />
            </FocusedDocumentOverlayFooter>
          ) : (
            <InvoiceDetailActionBar
              invoice={invoice}
              paymentCount={payments.length}
              canManageBilling={canManageBilling}
              onRecordPayment={() => setPaymentModalOpen(true)}
              canRecordPayment={canRecordPayment}
              recordPaymentBlockReason={recordPaymentBlockReason}
              customerEmailBlockReason={customerEmailBlockReason}
              lastEmailSentMessage={lastEmailSentMessage}
              variant="sticky"
            />
          )}
        </>
      ) : null}
    </>
  );

  if (isOverlay) {
    return (
      <MasterPageCanvas width="detail" className={masterDetailOverlayBodyInsetClass}>
        <MasterContentStack density="default">{pageBody}</MasterContentStack>
      </MasterPageCanvas>
    );
  }

  return (
    <MasterDetailPageLayout
      backLink={pageBackLink}
      className="overflow-x-hidden print:max-w-none print:pb-0"
    >
      {pageBody}
    </MasterDetailPageLayout>
  );
}
