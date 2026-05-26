import type {
  NotificationEntityType,
  NotificationType,
} from "@/lib/database/types/enums";

export type Notification = {
  id: string;
  companyId: string;
  userId?: string;
  roleTarget?: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: NotificationEntityType;
  entityId?: string;
  readAt?: string;
  createdAt: string;
  metadata: Record<string, unknown>;
};

export function isNotificationUnread(notification: Notification): boolean {
  return !notification.readAt;
}

export function formatNotificationTimestamp(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) {
    return "Just now";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function getNotificationHref(notification: Notification): string | null {
  if (!notification.entityType || !notification.entityId) {
    return null;
  }

  switch (notification.entityType) {
    case "job":
      return `/jobs/${notification.entityId}`;
    case "estimate":
      return `/estimates/${notification.entityId}`;
    case "invoice":
      return `/invoices/${notification.entityId}`;
    case "expense":
      return `/expenses?selected=${notification.entityId}`;
    case "customer":
      return `/customers/${notification.entityId}`;
    case "time_entry":
      return "/time";
    default:
      return null;
  }
}

export function getTechnicianNotificationHref(
  notification: Notification,
): string | null {
  if (!notification.entityType || !notification.entityId) {
    return null;
  }

  switch (notification.entityType) {
    case "job":
      return "/technician";
    case "expense":
      return "/tech/receipts";
    case "time_entry":
      return "/tech/time";
    default:
      return null;
  }
}

export function getNotificationTypeLabel(type: NotificationType): string {
  switch (type) {
    case "job_assigned":
      return "Job assigned";
    case "job_completed":
      return "Job completed";
    case "estimate_approved":
      return "Estimate approved";
    case "invoice_paid":
      return "Invoice paid";
    case "expense_submitted":
      return "Expense submitted";
    case "expense_rejected":
      return "Expense rejected";
    case "time_clocked_in":
      return "Clocked in";
    case "time_clocked_out":
      return "Clocked out";
    default:
      return "Notification";
  }
}
