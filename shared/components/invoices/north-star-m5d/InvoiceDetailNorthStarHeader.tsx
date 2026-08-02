import type { InvoiceDetail } from "@/shared/types/invoice";
import { InvoiceStatusActions } from "@/shared/components/invoices/InvoiceStatusActions";
import { InvoiceStatusBadge } from "@/shared/components/invoices/InvoiceStatusBadge";
import {
  SectionHeader,
  altairMcCardClass,
  altairMcCardPadClass,
} from "@/shared/design-system/components";

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
    <div className="no-print flex flex-wrap items-center justify-end gap-2">
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

  // Dates / customer live on the printable document + side rail — keep header
  // to identity (number + status) and actions only.
  return (
    <section className="no-print space-y-2">
      <SectionHeader title="Invoice" />
      <div className={`${altairMcCardClass} ${altairMcCardPadClass}`}>
        <div className="flex flex-wrap items-start justify-between gap-2.5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-altair-ink-on-paper sm:text-xl">
                {invoice.invoiceNumber}
              </h1>
              <InvoiceStatusBadge status={invoice.status} />
            </div>
          </div>
          <div className="hidden sm:block">{commandPlate}</div>
        </div>
      </div>
    </section>
  );
}
