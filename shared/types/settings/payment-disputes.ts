import type { PaymentDisputeStatus } from "@/lib/payments/payment-disputes";
import { isOpenPaymentDisputeStatus } from "@/lib/payments/payment-disputes";
import type { StatusPillTone } from "@/shared/design-system/components/StatusPill";

export type PaymentDisputeListViewItem = {
  id: string;
  providerDisputeId: string;
  amount: number;
  currency: string;
  reason: string | null;
  status: PaymentDisputeStatus;
  evidenceDueBy: string | null;
  providerCreatedAt: string | null;
  createdAt: string;
  invoiceId: string | null;
  invoiceNumber: string | null;
  providerPaymentIntentId: string | null;
};

export const PAYMENT_DISPUTE_STATUS_LABELS: Record<PaymentDisputeStatus, string> =
  {
    warning_needs_response: "Inquiry — needs response",
    warning_under_review: "Inquiry — under review",
    warning_closed: "Inquiry closed",
    needs_response: "Needs response",
    under_review: "Under review",
    won: "Won",
    lost: "Lost",
    prevented: "Prevented",
  };

export function paymentDisputeStatusTone(
  status: PaymentDisputeStatus,
): StatusPillTone {
  switch (status) {
    case "needs_response":
    case "warning_needs_response":
      return "danger";
    case "under_review":
    case "warning_under_review":
      return "warning";
    case "won":
    case "prevented":
      return "success";
    case "lost":
      return "danger";
    case "warning_closed":
      return "neutral";
    default:
      return "neutral";
  }
}

export function formatPaymentDisputeReason(reason: string | null): string {
  if (!reason) {
    return "—";
  }

  return reason
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function isPaymentDisputeOpen(status: PaymentDisputeStatus): boolean {
  return isOpenPaymentDisputeStatus(status);
}
