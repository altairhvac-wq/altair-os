import { InvoiceDetailOverlayLoadingState } from "@/shared/components/invoices/InvoiceDetailOverlayLoadingState";
import { InvoiceDetailOverlayShell } from "@/shared/components/invoices/InvoiceDetailOverlayShell";

export default function InterceptedInvoiceDetailLoading() {
  return (
    <InvoiceDetailOverlayShell title="Loading invoice…">
      <InvoiceDetailOverlayLoadingState />
    </InvoiceDetailOverlayShell>
  );
}
