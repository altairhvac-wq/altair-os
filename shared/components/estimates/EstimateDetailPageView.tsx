"use client";

import { useMemo } from "react";
import Link from "next/link";
import { CustomerNameLink } from "@/shared/components/customers/CustomerNameLink";
import {
  ArrowLeft,
  Briefcase,
  Mail,
  Phone,
  Printer,
  Receipt,
  User,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/shared/types/customer";
import type { EstimateDetail } from "@/shared/types/estimate";
import type { InvoiceDetail } from "@/shared/types/invoice";
import type { EstimateActivity } from "@/shared/types/estimate-activity";
import type { BillingCompanyContact } from "@/shared/lib/billing-company-contact";
import {
  formatBillingEmailSentMessage,
  getLastEstimateEmailSentInfo,
} from "@/shared/lib/billing-email-sent";
import { getCustomerEmailSendBlockReason } from "@/shared/lib/operational-errors";
import { BillingMobileAmountHeader } from "@/shared/components/billing/BillingMobileAmountHeader";
import { EstimateDocumentSection } from "@/shared/components/billing/EstimateDocumentSection";
import { EstimateActivityTimeline } from "./EstimateActivityTimeline";
import { EstimateStatusActions } from "./EstimateStatusActions";
import { EstimateStatusBadge } from "./EstimateStatusBadge";

import type { BillingSignature } from "@/shared/types/billing-signature";
import { adminCardSectionClass } from "@/shared/lib/admin-density";
import { FocusedDocumentOverlayFooter } from "@/shared/components/layout/FocusedDocumentOverlay";
import {
  MasterContentStack,
  MasterDetailPageLayout,
  MasterPageCanvas,
  masterDetailOverlayBodyInsetClass,
} from "@/shared/design-system/shell";

type EstimateDetailPageViewProps = {
  estimate: EstimateDetail;
  activities: EstimateActivity[];
  linkedInvoice?: InvoiceDetail | null;
  company: BillingCompanyContact;
  companyTimeZone: string;
  canManageEstimates: boolean;
  canManageCustomers?: boolean;
  canCaptureSignature?: boolean;
  signature?: BillingSignature | null;
  presentation?: "page" | "overlay";
};

export function EstimateDetailPageView({
  estimate,
  activities,
  linkedInvoice,
  company,
  companyTimeZone,
  canManageEstimates,
  canManageCustomers = false,
  canCaptureSignature = false,
  signature,
  presentation = "page",
}: EstimateDetailPageViewProps) {
  const isOverlay = presentation === "overlay";
  const customerEmail = estimate.customerEmail?.trim();
  const customerPhone = estimate.customerPhone?.trim();
  const customerEmailBlockReason = getCustomerEmailSendBlockReason(customerEmail);
  const lastEmailSentInfo = useMemo(
    () => getLastEstimateEmailSentInfo(activities, customerEmail),
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
        href="/estimates"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4 shrink-0" />
        Back to estimates
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
                    Estimate
                  </p>
                  <h1 className="mt-1 break-words text-2xl font-bold text-slate-900">
                    {estimate.estimateNumber}
                  </h1>
                </>
              ) : null}
              <div
                className={`flex flex-wrap items-center gap-2 ${isOverlay ? "" : "mt-3"}`}
              >
                {!isOverlay ? (
                  <>
                    <EstimateStatusBadge status={estimate.status} />
                    <span className="hidden text-sm font-semibold text-slate-900 sm:inline">
                      {formatCurrency(estimate.total)}
                    </span>
                  </>
                ) : null}
                <span className="text-sm text-slate-500">
                  Created {formatDate(estimate.createdAt)}
                </span>
                {estimate.validUntil ? (
                  <span className="text-sm text-slate-500">
                    Valid until {formatDate(estimate.validUntil)}
                  </span>
                ) : null}
              </div>
              <BillingMobileAmountHeader total={estimate.total} />
              {lastEmailSentMessage ? (
                <p className="mt-3 text-xs text-slate-500">{lastEmailSentMessage}</p>
              ) : null}
            </div>

            <div className={`${isOverlay ? "w-full" : "hidden sm:block"}`}>
              <EstimateStatusActions
                estimate={estimate}
                canManageEstimates={canManageEstimates}
                customerEmailBlockReason={customerEmailBlockReason}
                lastEmailSentMessage={lastEmailSentMessage}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-3">
          <section className={`${adminCardSectionClass} lg:col-span-2`}>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Customer
            </h2>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 shrink-0 text-slate-400" />
                <CustomerNameLink
                  customerId={estimate.customerId}
                  customerName={estimate.customerName}
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
                          href={`/customers/${estimate.customerId}`}
                          className="font-semibold text-cyan-700 hover:text-cyan-800"
                        >
                          add one on the customer record
                        </Link>{" "}
                      </>
                    ) : null}
                    to send this estimate.
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

          {estimate.jobId ? (
            <section className={adminCardSectionClass}>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Related job
              </h2>
              <Link
                href={`/jobs/${estimate.jobId}`}
                className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-cyan-700 transition-colors hover:text-cyan-800"
              >
                <Briefcase className="h-4 w-4 shrink-0" />
                {estimate.jobNumber ?? "View job"}
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
                Link a job when creating the estimate to keep field work and billing together.
              </p>
            </section>
          )}

          {linkedInvoice ? (
            <section className={`${adminCardSectionClass} lg:col-span-3`}>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Linked invoice
              </h2>
              <Link
                href={`/invoices/${linkedInvoice.id}`}
                className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-cyan-700 transition-colors hover:text-cyan-800"
              >
                <Receipt className="h-4 w-4 shrink-0" />
                <span className="min-w-0 break-words">
                  {linkedInvoice.invoiceNumber} — {formatCurrency(linkedInvoice.total)}
                </span>
              </Link>
            </section>
          ) : null}
        </div>
      </section>

      <EstimateDocumentSection
        estimate={estimate}
        company={company}
        signature={signature}
        companyTimeZone={companyTimeZone}
        logoUrl={company.logoUrl}
        canCaptureSignature={canCaptureSignature}
        signatureCaptureContext={{
          entityId: estimate.id,
          documentNumber: estimate.estimateNumber,
          customerId: estimate.customerId,
          jobId: estimate.jobId,
        }}
      />

      <div className="no-print">
        <EstimateActivityTimeline activities={activities} />
      </div>

      {canManageEstimates ? (
        isOverlay ? (
          <FocusedDocumentOverlayFooter>
            <EstimateStatusActions
              estimate={estimate}
              canManageEstimates={canManageEstimates}
              customerEmailBlockReason={customerEmailBlockReason}
              lastEmailSentMessage={lastEmailSentMessage}
              variant="overlay-footer"
            />
          </FocusedDocumentOverlayFooter>
        ) : (
          <EstimateStatusActions
            estimate={estimate}
            canManageEstimates={canManageEstimates}
            customerEmailBlockReason={customerEmailBlockReason}
            lastEmailSentMessage={lastEmailSentMessage}
            variant="sticky"
          />
        )
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
