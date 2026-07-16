import {
  StatusPill,
  type StatusPillSize,
  type StatusPillTone,
} from "@/shared/design-system/components";
import { formatCustomerStatusLabel, type Customer } from "@/shared/types/customer";

const CUSTOMER_STATUS_TONE: Record<Customer["status"], StatusPillTone> = {
  active: "success",
  inactive: "neutral",
};

type CustomerStatusBadgeProps = {
  status: Customer["status"];
  size?: StatusPillSize;
  className?: string;
};

/**
 * Customer domain adapter: owns the mapping from a Customer status value to
 * its exact existing label and a canonical StatusPill semantic tone. Color,
 * surface, and typography belong to StatusPill — this component never
 * exposes a raw Tailwind color to callers.
 */
export function CustomerStatusBadge({ status, size, className }: CustomerStatusBadgeProps) {
  return (
    <StatusPill tone={CUSTOMER_STATUS_TONE[status]} size={size} className={className}>
      {formatCustomerStatusLabel(status)}
    </StatusPill>
  );
}
