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
  SectionHeader,
  altairMcCardClass,
  altairMcCardPadClass,
  altairMcGridGapClass,
} from "@/shared/design-system/components";
import { altairCanvasInkLinkClass } from "@/shared/design-system/foundation";

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
    <aside className={`no-print flex flex-col ${altairMcGridGapClass}`}>
      <section className="scroll-mt-6 space-y-2">
        <SectionHeader title="Customer" />
        <div className={`${altairMcCardClass} ${altairMcCardPadClass}`}>
          <CustomerNameLink
            customerId={invoice.customerId}
            customerName={invoice.customerName}
            canManageCustomers={canManageCustomers}
            linkClassName="min-w-0 break-words text-sm font-semibold text-altair-ink-on-paper transition-colors hover:text-altair-brass"
          />

          <div className="mt-2 space-y-1.5 rounded-lg border border-altair-border bg-[var(--surface-tile)] px-2.5 py-2">
            {customerEmail ? (
              <a
                href={`mailto:${customerEmail}`}
                className="flex min-w-0 items-center gap-2 break-all text-xs text-altair-ink-on-paper-secondary transition-colors hover:text-altair-ink-on-paper"
              >
                <Mail className="h-3.5 w-3.5 shrink-0 text-altair-ink-on-paper-muted" />
                <span>{customerEmail}</span>
              </a>
            ) : (
              <div className="flex items-start gap-2 text-xs text-altair-ink-on-paper-muted">
                <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  No email on file
                  {canManageCustomers ? (
                    <>
                      {" "}
                      —{" "}
                      <Link
                        href={`/customers/${invoice.customerId}`}
                        className={`font-semibold ${altairCanvasInkLinkClass}`}
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
                className="flex items-center gap-2 text-xs text-altair-ink-on-paper-secondary transition-colors hover:text-altair-ink-on-paper"
              >
                <Phone className="h-3.5 w-3.5 shrink-0 text-altair-ink-on-paper-muted" />
                <span>{customerPhone}</span>
              </a>
            ) : null}
          </div>

          {canManageCustomers ? (
            <Link
              href={`/customers/${invoice.customerId}`}
              className={`mt-2.5 inline-flex text-xs font-semibold ${altairCanvasInkLinkClass}`}
            >
              Open customer
            </Link>
          ) : null}
        </div>
      </section>

      {invoice.jobId ? (
        <section className="scroll-mt-6 space-y-2">
          <SectionHeader title="Related job" />
          <div className={`${altairMcCardClass} ${altairMcCardPadClass}`}>
            <Link
              href={`/work/${invoice.jobId}`}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold ${altairCanvasInkLinkClass}`}
            >
              <Briefcase className="h-3.5 w-3.5 shrink-0" />
              <span className="text-sm font-semibold text-altair-ink-on-paper">
                {invoice.jobNumber ?? "View job"}
              </span>
            </Link>
          </div>
        </section>
      ) : (
        <section className="scroll-mt-6 space-y-2">
          <SectionHeader title="Related job" />
          <div
            className={`${altairMcCardClass} ${altairMcCardPadClass} border-dashed`}
          >
            <p className="text-xs text-altair-ink-on-paper-muted">No job linked</p>
          </div>
        </section>
      )}

      {invoice.estimateId ? (
        <section className="scroll-mt-6 space-y-2">
          <SectionHeader title="Source estimate" />
          <div className={`${altairMcCardClass} ${altairMcCardPadClass}`}>
            <Link
              href={`/estimates/${invoice.estimateId}`}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold ${altairCanvasInkLinkClass}`}
            >
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span className="text-sm font-semibold text-altair-ink-on-paper">
                {invoice.estimateNumber ?? "View estimate"}
              </span>
            </Link>
          </div>
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
