"use client";

import { useState } from "react";
import type { InvoiceActivity } from "@/shared/types/invoice-activity";
import type { InvoicePayment } from "@/shared/types/invoice-payment";
import type { InvoiceDetail } from "@/shared/types/invoice";
import type { BillingCompanyContact } from "@/shared/lib/billing-company-contact";
import type { BillingSignature } from "@/shared/types/billing-signature";
import type { InvoiceDeleteDependencies } from "@/shared/lib/invoice-lifecycle";
import {
  canRecordInvoicePayment,
  getRecordPaymentBlockReason,
} from "@/shared/types/invoice-payment";
import { InvoiceActivityTimeline } from "@/shared/components/invoices/InvoiceActivityTimeline";
import { InvoiceDetailActionBar } from "@/shared/components/invoices/InvoiceDetailActionBar";
import { InvoiceLifecycleControl } from "@/shared/components/invoices/InvoiceLifecycleControl";
import { InvoiceMessageAiAssistant } from "@/shared/components/invoices/InvoiceMessageAiAssistant";
import { InvoicePaymentHistory } from "@/shared/components/invoices/InvoicePaymentHistory";
import { InvoiceInternalTestCheckoutButton } from "@/shared/components/invoices/InvoiceInternalTestCheckoutButton";
import { RecordPaymentForm } from "@/shared/components/invoices/RecordPaymentForm";
import { FocusedDocumentOverlayFooter } from "@/shared/components/layout/FocusedDocumentOverlay";
import {
  SectionHeader,
  altairMcCardClass,
  altairMcCardPadClass,
  altairMcGridGapClass,
} from "@/shared/design-system/components";
import { InvoiceDetailNorthStarHeader } from "./InvoiceDetailNorthStarHeader";
import { InvoiceDetailNorthStarSideRail } from "./InvoiceDetailNorthStarSideRail";
import { NorthStarAdminInvoiceDocument } from "./NorthStarAdminInvoiceDocument";

type InvoiceDetailNorthStarBodyProps = {
  invoice: InvoiceDetail;
  activities: InvoiceActivity[];
  payments: InvoicePayment[];
  company: BillingCompanyContact;
  companyTimeZone: string;
  canManageBilling: boolean;
  canManageCustomers: boolean;
  canCaptureSignature: boolean;
  signature?: BillingSignature | null;
  customerEmailBlockReason: string | null;
  lastEmailSentMessage: string | null;
  presentation: "page" | "overlay";
  aiFeaturesEnabled: boolean;
  deleteDependencies: InvoiceDeleteDependencies;
  onlinePaymentsEnabled?: boolean;
  smsSendingConfigured?: boolean;
};

function MobileStickyActions({
  invoice,
  payments,
  canManageBilling,
  paymentModalOpen,
  setPaymentModalOpen,
  customerEmailBlockReason,
  lastEmailSentMessage,
  variant,
}: {
  invoice: InvoiceDetail;
  payments: InvoicePayment[];
  canManageBilling: boolean;
  paymentModalOpen: boolean;
  setPaymentModalOpen: (open: boolean) => void;
  customerEmailBlockReason: string | null;
  lastEmailSentMessage: string | null;
  variant: "sticky" | "overlay-footer";
}) {
  if (!canManageBilling) {
    return null;
  }

  const canRecordPayment = canRecordInvoicePayment(invoice);
  const recordPaymentBlockReason = getRecordPaymentBlockReason(invoice);

  const actions = (
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
        customerEmailBlockReason={customerEmailBlockReason}
        lastEmailSentMessage={lastEmailSentMessage}
        variant={variant}
        northStar
      />
    </>
  );

  if (variant === "overlay-footer") {
    return <FocusedDocumentOverlayFooter>{actions}</FocusedDocumentOverlayFooter>;
  }

  return actions;
}

export function InvoiceDetailNorthStarBody({
  invoice,
  activities,
  payments,
  company,
  companyTimeZone,
  canManageBilling,
  canManageCustomers,
  canCaptureSignature: _canCaptureSignature,
  signature,
  customerEmailBlockReason,
  lastEmailSentMessage,
  presentation,
  aiFeaturesEnabled,
  deleteDependencies,
  onlinePaymentsEnabled = false,
  smsSendingConfigured = false,
}: InvoiceDetailNorthStarBodyProps) {
  const isOverlay = presentation === "overlay";
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const canRecordPayment = canRecordInvoicePayment(invoice);
  const recordPaymentBlockReason = getRecordPaymentBlockReason(invoice);

  return (
    <div className={`flex flex-col ${altairMcGridGapClass}`}>
      <InvoiceDetailNorthStarHeader
        invoice={invoice}
        paymentCount={payments.length}
        canManageBilling={canManageBilling}
        customerEmailBlockReason={customerEmailBlockReason}
        lastEmailSentMessage={lastEmailSentMessage}
        variant={isOverlay ? "overlay" : "page"}
      />

      {canManageBilling ? (
        <div className="no-print">
          <InvoiceMessageAiAssistant
            invoiceId={invoice.id}
            aiFeaturesEnabled={aiFeaturesEnabled}
          />
        </div>
      ) : null}

      {/*
        Single document instance (critical for print/PDF). Side rail first on
        mobile; document + payments + activity left / rail right on desktop.
      */}
      <div
        className={`flex flex-col ${altairMcGridGapClass} lg:grid lg:grid-cols-[minmax(0,1.55fr)_minmax(20rem,0.95fr)] lg:items-start`}
      >
        <aside
          className={`no-print order-1 flex min-w-0 flex-col ${altairMcGridGapClass} lg:order-2`}
        >
          <InvoiceDetailNorthStarSideRail
            invoice={invoice}
            canManageCustomers={canManageCustomers}
            canManageBilling={canManageBilling}
            onlinePaymentsEnabled={onlinePaymentsEnabled}
            smsSendingConfigured={smsSendingConfigured}
          />
        </aside>

        <div
          className={`order-2 flex min-w-0 flex-col ${altairMcGridGapClass} lg:order-1`}
        >
          <NorthStarAdminInvoiceDocument
            invoice={invoice}
            company={company}
            signature={signature}
            companyTimeZone={companyTimeZone}
            logoUrl={company.logoUrl}
          />

          <section className="no-print scroll-mt-6 space-y-2">
            <SectionHeader title="Payments" />
            <div className={`${altairMcCardClass} ${altairMcCardPadClass}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  {canManageBilling && canRecordPayment ? (
                    <p className="text-xs text-altair-ink-on-paper-muted">
                      Record a payment when the customer pays all or part of the
                      balance due.
                    </p>
                  ) : canManageBilling &&
                    !canRecordPayment &&
                    recordPaymentBlockReason ? (
                    <p className="text-xs text-altair-ink-on-paper-muted">
                      {recordPaymentBlockReason}
                    </p>
                  ) : !canManageBilling ? (
                    <p className="text-xs text-altair-ink-on-paper-muted">
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
              <div className="mt-3">
                <InvoicePaymentHistory payments={payments} northStar />
              </div>
              <InvoiceInternalTestCheckoutButton
                invoice={invoice}
                canManageBilling={canManageBilling}
              />
            </div>
          </section>

          <div className="no-print">
            <InvoiceActivityTimeline activities={activities} northStar />
          </div>
        </div>
      </div>

      {canManageBilling ? (
        <div className="no-print">
          <InvoiceLifecycleControl
            invoice={invoice}
            deleteDependencies={deleteDependencies}
            canManage={canManageBilling}
          />
        </div>
      ) : null}

      <MobileStickyActions
        invoice={invoice}
        payments={payments}
        canManageBilling={canManageBilling}
        paymentModalOpen={paymentModalOpen}
        setPaymentModalOpen={setPaymentModalOpen}
        customerEmailBlockReason={customerEmailBlockReason}
        lastEmailSentMessage={lastEmailSentMessage}
        variant={isOverlay ? "overlay-footer" : "sticky"}
      />
    </div>
  );
}
