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
import { northStarDetailTokens as dt } from "@/shared/design-system/north-star/tokens";
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
  canCaptureSignature,
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

  const documentSection = (
    <NorthStarAdminInvoiceDocument
      invoice={invoice}
      company={company}
      signature={signature}
      companyTimeZone={companyTimeZone}
      logoUrl={company.logoUrl}
    />
  );

  const sideRail = (
    <InvoiceDetailNorthStarSideRail
      invoice={invoice}
      canManageCustomers={canManageCustomers}
      canManageBilling={canManageBilling}
      onlinePaymentsEnabled={onlinePaymentsEnabled}
      smsSendingConfigured={smsSendingConfigured}
    />
  );

  const paymentsSection = (
    <section className={`no-print ${dt.compactSectionSurface}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className={`${dt.sectionTitle} text-[#17130E]`}>Payments</h2>
          {canManageBilling && canRecordPayment ? (
            <p className={`mt-1 text-xs ${dt.ivoryCardMuted}`}>
              Record a payment when the customer pays all or part of the balance due.
            </p>
          ) : canManageBilling && !canRecordPayment && recordPaymentBlockReason ? (
            <p className={`mt-1 text-xs ${dt.ivoryCardMuted}`}>
              {recordPaymentBlockReason}
            </p>
          ) : !canManageBilling ? (
            <p className={`mt-1 text-xs ${dt.ivoryCardMuted}`}>
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
    </section>
  );

  const activitySection = (
    <div className="no-print">
      <InvoiceActivityTimeline activities={activities} northStar />
    </div>
  );

  const workspace = (
    <>
      <div className="flex flex-col gap-2.5 lg:hidden">
        <div className="no-print space-y-2.5">{sideRail}</div>
        {documentSection}
        {paymentsSection}
        {activitySection}
      </div>

      <div className={`hidden lg:grid ${dt.workspaceGrid}`}>
        <div className={dt.workspaceMain}>
          {documentSection}
          {paymentsSection}
          {activitySection}
        </div>
        <aside className={dt.workspaceSide}>{sideRail}</aside>
      </div>
    </>
  );

  return (
    <>
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

      {workspace}

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
    </>
  );
}
