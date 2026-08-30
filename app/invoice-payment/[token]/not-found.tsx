import { PublicDocumentMessage } from "@/shared/components/public/PublicDocumentMessage";

export const metadata = { title: "Link not found", robots: { index: false, follow: false } };

export default function InvoicePaymentNotFound() {
  return (
    <PublicDocumentMessage
      title="This link is no longer available"
      body="The invoice you're looking for may have been withdrawn, replaced by a newer version, or the link may have expired. Contact the company that sent it and they can send you a fresh one."
    />
  );
}
