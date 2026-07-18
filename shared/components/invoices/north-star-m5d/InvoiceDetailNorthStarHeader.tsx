import { formatDate } from "@/shared/types/customer";
import type { InvoiceDetail } from "@/shared/types/invoice";
import { InvoiceStatusActions } from "@/shared/components/invoices/InvoiceStatusActions";
import { InvoiceStatusBadge } from "@/shared/components/invoices/InvoiceStatusBadge";
import { northStarDetailTokens as dt } from "@/shared/design-system/north-star/tokens";
import { formatInvoiceRelationshipLine } from "@/shared/lib/documents/relationship-labels";

type InvoiceDetailNorthStarHeaderProps = {
  invoice: InvoiceDetail;
  paymentCount: number;
  canManageBilling: boolean;
  customerEmailBlockReason: string | null;
  lastEmailSentMessage: string | null;
  variant?: "page" | "overlay";
};

function InvoiceDetailNorthStarCommandPlate({
  invoice,
  paymentCount,
  canManageBilling,
  customerEmailBlockReason,
  lastEmailSentMessage,
}: Pick<
  InvoiceDetailNorthStarHeaderProps,
  | "invoice"
  | "paymentCount"
  | "canManageBilling"
  | "customerEmailBlockReason"
  | "lastEmailSentMessage"
>) {
  if (!canManageBilling) {
    return null;
  }

  return (
    <div className={`${dt.commandPlate} no-print hidden sm:flex sm:flex-wrap sm:items-center sm:justify-end sm:gap-2`}>
      <InvoiceStatusActions
        invoice={invoice}
        paymentCount={paymentCount}
        canManageBilling={canManageBilling}
        customerEmailBlockReason={customerEmailBlockReason}
        lastEmailSentMessage={lastEmailSentMessage}
        northStar
      />
    </div>
  );
}

export function InvoiceDetailNorthStarHeader({
  invoice,
  paymentCount,
  canManageBilling,
  customerEmailBlockReason,
  lastEmailSentMessage,
  variant = "page",
}: InvoiceDetailNorthStarHeaderProps) {
  const commandPlate = (
    <InvoiceDetailNorthStarCommandPlate
      invoice={invoice}
      paymentCount={paymentCount}
      canManageBilling={canManageBilling}
      customerEmailBlockReason={customerEmailBlockReason}
      lastEmailSentMessage={lastEmailSentMessage}
    />
  );

  if (variant === "overlay") {
    return commandPlate;
  }

  return (
    <>
      <div className={`${dt.heroShell} no-print`}>
        <div aria-hidden="true" className={dt.heroAccentRail} />

        <div className="min-w-0">
          <p className={dt.heroEyebrow}>Invoice</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className={dt.heroTitle}>{invoice.invoiceNumber}</h1>
            <InvoiceStatusBadge status={invoice.status} />
          </div>

          <div className={`mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 ${dt.heroMeta}`}>
            <span>
              {formatInvoiceRelationshipLine({
                jobNumber: invoice.jobNumber,
                estimateNumber: invoice.estimateNumber,
                customerName: invoice.customerName,
              })}
            </span>
          </div>
          <div className={`mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 ${dt.heroMeta}`}>
            <span>Issued {formatDate(invoice.issueDate)}</span>
            <span className="text-[#8A6324]">·</span>
            <span>Due {formatDate(invoice.dueDate)}</span>
          </div>
        </div>
      </div>

      {commandPlate}
    </>
  );
}
