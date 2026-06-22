import Link from "next/link";
import {
  Briefcase,
  FileText,
  Mail,
  Phone,
} from "lucide-react";
import { CustomerNameLink } from "@/shared/components/customers/CustomerNameLink";
import type { InvoiceDetail } from "@/shared/types/invoice";
import { canRecordInvoicePayment } from "@/shared/types/invoice-payment";
import { InvoicePaymentCollectionCard } from "@/shared/components/invoices/InvoicePaymentCollectionCard";
import {
  northStarDetailTokens as dt,
  northStarInvoiceDocumentTokens as idt,
} from "@/shared/design-system/north-star/tokens";

type InvoiceDetailNorthStarSideRailProps = {
  invoice: InvoiceDetail;
  canManageCustomers: boolean;
  canManageBilling: boolean;
  onlinePaymentsEnabled?: boolean;
  smsSendingConfigured?: boolean;
};

export function InvoiceDetailNorthStarSideRail({
  invoice,
  canManageCustomers,
  canManageBilling,
  onlinePaymentsEnabled = false,
  smsSendingConfigured = false,
}: InvoiceDetailNorthStarSideRailProps) {
  const customerEmail = invoice.customerEmail?.trim();
  const customerPhone = invoice.customerPhone?.trim();

  return (
    <aside className="no-print flex flex-col gap-2.5">
      <section className={`${dt.compactSectionSurface} scroll-mt-6`}>
        <h2 className={`${dt.sectionTitle} ${idt.ivoryPrimary}`}>Customer</h2>

        <div className="mt-1.5">
          <CustomerNameLink
            customerId={invoice.customerId}
            customerName={invoice.customerName}
            canManageCustomers={canManageCustomers}
            linkClassName={`min-w-0 break-words text-sm font-semibold ${idt.ivoryPrimary} transition-colors hover:text-[#8A6324]`}
          />

          <div className="mt-1.5 space-y-0.5">
            {customerEmail ? (
              <a
                href={`mailto:${customerEmail}`}
                className={`${dt.ivoryMetaRow} break-all hover:text-[#17130E]`}
              >
                <Mail className={dt.metaIcon} />
                <span className={idt.ivorySecondary}>{customerEmail}</span>
              </a>
            ) : (
              <div className={dt.ivoryMetaRow}>
                <Mail className={dt.metaIcon} />
                <span className={idt.ivoryMuted}>
                  No email on file
                  {canManageCustomers ? (
                    <>
                      {" "}
                      —{" "}
                      <Link
                        href={`/customers/${invoice.customerId}`}
                        className={`font-semibold ${idt.ivoryLink}`}
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
              <a
                href={`tel:${customerPhone}`}
                className={`${dt.ivoryMetaRow} hover:text-[#17130E]`}
              >
                <Phone className={dt.metaIcon} />
                <span className={idt.ivorySecondary}>{customerPhone}</span>
              </a>
            ) : null}
          </div>

          {canManageCustomers ? (
            <Link
              href={`/customers/${invoice.customerId}`}
              className={`mt-1.5 inline-flex text-xs font-semibold ${idt.ivoryLink}`}
            >
              Open customer
            </Link>
          ) : null}
        </div>
      </section>

      {invoice.jobId ? (
        <section className={`${dt.compactSectionSurface} scroll-mt-6`}>
          <h2 className={`${dt.sectionTitle} ${idt.ivoryPrimary}`}>Related job</h2>
          <Link
            href={`/jobs/${invoice.jobId}`}
            className={`mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold ${idt.ivoryLink}`}
          >
            <Briefcase className="h-3.5 w-3.5 shrink-0" />
            <span className={`text-sm font-semibold ${idt.ivoryPrimary}`}>
              {invoice.jobNumber ?? "View job"}
            </span>
          </Link>
        </section>
      ) : (
        <section className={`${dt.compactSectionSurface} scroll-mt-6 border-dashed`}>
          <h2 className={`${dt.sectionTitle} ${idt.ivoryPrimary}`}>Related job</h2>
          <p className={`mt-1.5 text-xs ${idt.ivoryMuted}`}>No job linked</p>
        </section>
      )}

      {invoice.estimateId ? (
        <section className={`${dt.compactSectionSurface} scroll-mt-6`}>
          <h2 className={`${dt.sectionTitle} ${idt.ivoryPrimary}`}>Source estimate</h2>
          <Link
            href={`/estimates/${invoice.estimateId}`}
            className={`mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold ${idt.ivoryLink}`}
          >
            <FileText className="h-3.5 w-3.5 shrink-0" />
            <span className={`text-sm font-semibold ${idt.ivoryPrimary}`}>
              {invoice.estimateNumber ?? "View estimate"}
            </span>
          </Link>
        </section>
      ) : null}

      {canManageBilling && canRecordInvoicePayment(invoice) ? (
        <InvoicePaymentCollectionCard
          invoiceId={invoice.id}
          jobId={invoice.jobId ?? undefined}
          balanceDue={invoice.balanceDue}
          onlinePaymentsEnabled={onlinePaymentsEnabled}
          smsSendingConfigured={smsSendingConfigured}
          northStar
        />
      ) : null}
    </aside>
  );
}
