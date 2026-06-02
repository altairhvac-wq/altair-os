import { formatDateTimeInTimeZone } from "@/shared/lib/datetime";
import type { CustomerStatus } from "@/shared/types/customer";

export type CustomerActivityType =
  | "customer_created"
  | "customer_archived"
  | "customer_restored"
  | "customer_deleted"
  | "customer_moved_to_trash"
  | "customer_restored_from_trash"
  | "customer_permanently_deleted"
  | "equipment_added"
  | "equipment_updated"
  | "warranty_expiration_recorded";

export type CustomerActivityMetadata = {
  customer_name?: string;
  status?: CustomerStatus;
  delete_after?: string;
  equipment_id?: string;
  equipment_name?: string;
  job_id?: string;
  job_number?: string;
  changed_fields?: string[];
  warranty_expires_at?: string;
  previous_warranty_expires_at?: string;
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
  customer_archived: "Customer archived",
  customer_restored: "Customer restored",
  customer_deleted: "Customer deleted",
  customer_moved_to_trash: "Moved to Recently Deleted",
  customer_restored_from_trash: "Restored from Recently Deleted",
  customer_permanently_deleted: "Permanently deleted",
  equipment_added: "Equipment added",
  equipment_updated: "Equipment updated",
  warranty_expiration_recorded: "Warranty recorded",
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
    case "customer_archived":
    case "customer_restored":
    case "customer_deleted":
    case "customer_moved_to_trash":
    case "customer_restored_from_trash":
    case "customer_permanently_deleted":
      return metadata.customer_name ?? null;
    case "equipment_added":
    case "equipment_updated":
      if (metadata.equipment_name && metadata.job_number) {
        return `${metadata.equipment_name} · Job ${metadata.job_number}`;
      }
      return metadata.equipment_name ?? null;
    case "warranty_expiration_recorded":
      if (metadata.equipment_name && metadata.warranty_expires_at) {
        return `${metadata.equipment_name} · expires ${metadata.warranty_expires_at}`;
      }
      return metadata.equipment_name ?? null;
    default:
      return null;
  }
}

export function formatCustomerActivityTimestamp(
  isoDate: string,
  timeZone?: string,
): string {
  return formatDateTimeInTimeZone(isoDate, timeZone, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
