import { InvoiceDetailLoadingState } from "@/shared/components/invoices/InvoiceDetailLoadingState";
import { InvoiceDetailOverlayShell } from "@/shared/components/invoices/InvoiceDetailOverlayShell";

export default function InterceptedInvoiceDetailLoading() {
  return (
    <InvoiceDetailOverlayShell title="Loading invoice…">
      <InvoiceDetailLoadingState />
    </InvoiceDetailOverlayShell>
  );
}
