import Link from "next/link";
import {
  Briefcase,
  Mail,
  Phone,
  Receipt,
} from "lucide-react";
import { CustomerNameLink } from "@/shared/components/customers/CustomerNameLink";
import { formatCurrency } from "@/shared/types/customer";
import type { EstimateDetail } from "@/shared/types/estimate";
import type { InvoiceDetail } from "@/shared/types/invoice";
import { EstimateStatusBadge } from "@/shared/components/estimates/EstimateStatusBadge";
import { northStarDetailTokens as dt, northStarEstimateDocumentTokens as edt } from "@/shared/design-system/north-star/tokens";

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
    <aside className="no-print flex flex-col gap-2.5">
      <section className={`${dt.compactSectionSurface} scroll-mt-6`}>
        <h2 className={`${dt.sectionTitle} ${edt.ivoryPrimary}`}>Customer</h2>

        <div className="mt-1.5">
          <CustomerNameLink
            customerId={estimate.customerId}
            customerName={estimate.customerName}
            canManageCustomers={canManageCustomers}
            linkClassName={`min-w-0 break-words text-sm font-semibold ${edt.ivoryPrimary} transition-colors hover:text-[#8A6324]`}
          />

          <div className="mt-1.5 space-y-0.5">
            {customerEmail ? (
              <a
                href={`mailto:${customerEmail}`}
                className={`${dt.ivoryMetaRow} break-all hover:text-[#17130E]`}
              >
                <Mail className={dt.metaIcon} />
                <span className={edt.ivorySecondary}>{customerEmail}</span>
              </a>
            ) : (
              <div className={dt.ivoryMetaRow}>
                <Mail className={dt.metaIcon} />
                <span className={edt.ivoryMuted}>No email on file</span>
              </div>
            )}

            {customerPhone ? (
              <a
                href={`tel:${customerPhone}`}
                className={`${dt.ivoryMetaRow} hover:text-[#17130E]`}
              >
                <Phone className={dt.metaIcon} />
                <span className={edt.ivorySecondary}>{customerPhone}</span>
              </a>
            ) : null}
          </div>

          {canManageCustomers ? (
            <Link
              href={`/customers/${estimate.customerId}`}
              className={`mt-1.5 inline-flex text-xs font-semibold ${edt.ivoryLink}`}
            >
              Open customer
            </Link>
          ) : null}
        </div>
      </section>

      {estimate.jobId ? (
        <section className={`${dt.compactSectionSurface} scroll-mt-6`}>
          <h2 className={`${dt.sectionTitle} ${edt.ivoryPrimary}`}>Related job</h2>
          <Link
            href={`/jobs/${estimate.jobId}`}
            className={`mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold ${edt.ivoryLink}`}
          >
            <Briefcase className="h-3.5 w-3.5 shrink-0" />
            <span className={`text-sm font-semibold ${edt.ivoryPrimary}`}>
              {estimate.jobNumber ?? "View job"}
            </span>
          </Link>
        </section>
      ) : null}

      {linkedInvoice ? (
        <section className={`${dt.compactSectionSurface} scroll-mt-6`}>
          <h2 className={`${dt.sectionTitle} ${edt.ivoryPrimary}`}>Linked invoice</h2>
          <Link
            href={`/invoices/${linkedInvoice.id}`}
            className={`mt-1.5 inline-flex min-w-0 items-center gap-1.5 text-xs font-semibold ${edt.ivoryLink}`}
          >
            <Receipt className="h-3.5 w-3.5 shrink-0" />
            <span className={`min-w-0 break-words text-sm font-semibold ${edt.ivoryPrimary}`}>
              {linkedInvoice.invoiceNumber} — {formatCurrency(linkedInvoice.total)}
            </span>
          </Link>
        </section>
      ) : null}
    </aside>
  );
}
