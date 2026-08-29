import Link from "next/link";
import {
  Briefcase,
  Mail,
  Phone,
  Receipt,
} from "lucide-react";
import { CustomerNameLink } from "@/shared/components/customers/CustomerNameLink";
import { formatCurrencyExact } from "@/shared/types/customer";
import type { EstimateDetail } from "@/shared/types/estimate";
import type { InvoiceDetail } from "@/shared/types/invoice";
import {
  SectionHeader,
  altairMcCardClass,
  altairMcCardPadClass,
  altairMcGridGapClass,
} from "@/shared/design-system/components";
import { altairCanvasInkLinkClass } from "@/shared/design-system/foundation";

type EstimateDetailNorthStarSideRailProps = {
  estimate: EstimateDetail;
  linkedInvoice?: InvoiceDetail | null;
  canManageCustomers: boolean;
};

export function EstimateDetailNorthStarSideRail({
  estimate,
  linkedInvoice,
  canManageCustomers,
}: EstimateDetailNorthStarSideRailProps) {
  const customerEmail = estimate.customerEmail?.trim();
  const customerPhone = estimate.customerPhone?.trim();

  return (
    <aside className={`no-print flex flex-col ${altairMcGridGapClass}`}>
      <section className="scroll-mt-6 space-y-2">
        <SectionHeader title="Customer" />
        <div className={`${altairMcCardClass} ${altairMcCardPadClass}`}>
          <CustomerNameLink
            customerId={estimate.customerId}
            customerName={estimate.customerName}
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
              <div className="flex items-center gap-2 text-xs text-altair-ink-on-paper-muted">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <span>No email on file</span>
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
              href={`/customers/${estimate.customerId}`}
              className={`mt-2.5 inline-flex text-xs font-semibold ${altairCanvasInkLinkClass}`}
            >
              Open customer
            </Link>
          ) : null}
        </div>
      </section>

      {estimate.jobId ? (
        <section className="scroll-mt-6 space-y-2">
          <SectionHeader title="Related job" />
          <div className={`${altairMcCardClass} ${altairMcCardPadClass}`}>
            <Link
              href={`/work/${estimate.jobId}`}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold ${altairCanvasInkLinkClass}`}
            >
              <Briefcase className="h-3.5 w-3.5 shrink-0" />
              <span className="text-sm font-semibold text-altair-ink-on-paper">
                {estimate.jobNumber ?? "View job"}
              </span>
            </Link>
          </div>
        </section>
      ) : null}

      {linkedInvoice ? (
        <section className="scroll-mt-6 space-y-2">
          <SectionHeader title="Linked invoice" />
          <div className={`${altairMcCardClass} ${altairMcCardPadClass}`}>
            <Link
              href={`/invoices/${linkedInvoice.id}`}
              className={`inline-flex min-w-0 items-center gap-1.5 text-xs font-semibold ${altairCanvasInkLinkClass}`}
            >
              <Receipt className="h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 break-words text-sm font-semibold text-altair-ink-on-paper">
                {linkedInvoice.invoiceNumber} — {formatCurrencyExact(linkedInvoice.total)}
              </span>
            </Link>
          </div>
        </section>
      ) : null}
    </aside>
  );
}
