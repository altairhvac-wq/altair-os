import {
  OPERATIONAL_INVOICE_STATUS_STYLES,
  OPERATIONAL_STATUS_BADGE_BASE,
} from "@/shared/lib/operational-status-styles";
import { formatInvoiceStatus, type InvoiceStatus } from "@/shared/types/invoice";

type InvoiceStatusBadgeProps = {
  status: InvoiceStatus;
  className?: string;
};

export function InvoiceStatusBadge({
  status,
  className = "",
}: InvoiceStatusBadgeProps) {
  return (
    <span
      className={`${OPERATIONAL_STATUS_BADGE_BASE} ${OPERATIONAL_INVOICE_STATUS_STYLES[status]} ${className}`}
    >
      {formatInvoiceStatus(status)}
    </span>
  );
}
