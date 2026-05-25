import type { CustomerStatus } from "@/shared/types/customer";

export type CustomerActivityType = "customer_created";

export type CustomerActivityMetadata = {
  customer_name?: string;
  status?: CustomerStatus;
};

export type CustomerActivity = {
  id: string;
  customerId: string;
  eventType: CustomerActivityType;
  metadata: CustomerActivityMetadata;
  actorId?: string;
  actorName?: string;
  createdAt: string;
};

const ACTIVITY_TYPE_LABELS: Record<CustomerActivityType, string> = {
  customer_created: "Customer created",
};

export function formatCustomerActivityLabel(activity: CustomerActivity): string {
  return ACTIVITY_TYPE_LABELS[activity.eventType];
}

export function formatCustomerActivityDetails(
  activity: CustomerActivity,
): string | null {
  const { metadata, eventType } = activity;

  switch (eventType) {
    case "customer_created":
      return metadata.customer_name ?? null;
    default:
      return null;
  }
}

export function formatCustomerActivityTimestamp(isoDate: string): string {
  const date = new Date(isoDate);

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
