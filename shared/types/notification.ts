import type {
  NotificationEntityType,
  NotificationType,
} from "@/lib/database/types/enums";
import { isBillingSensitiveNotificationType } from "@/shared/lib/billing-activity-visibility";

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

export const TECHNICIAN_NOTIFICATION_TYPES = [
  "job_assigned",
  "expense_rejected",
  "time_clocked_in",
  "time_clocked_out",
] as const satisfies readonly NotificationType[];

export type NotificationAccess = {
  canManageCustomers?: boolean;
  canViewBilling?: boolean;
  canViewJobs?: boolean;
  canViewCompanyExpenses?: boolean;
};

export function buildNotificationAccess(input: {
  canManageCustomers: boolean;
  canViewBilling: boolean;
  canViewAllJobs: boolean;
  canViewCompanyExpenses: boolean;
  canViewAssignedJobs?: boolean;
}): NotificationAccess {
  return {
    canManageCustomers: input.canManageCustomers,
    canViewBilling: input.canViewBilling,
    canViewJobs: input.canViewAllJobs || input.canViewAssignedJobs === true,
    canViewCompanyExpenses: input.canViewCompanyExpenses,
  };
}

export function isTechnicianRelevantNotification(
  notification: Pick<Notification, "type">,
): boolean {
  return (TECHNICIAN_NOTIFICATION_TYPES as readonly NotificationType[]).includes(
    notification.type,
  );
}

export function filterNotificationsForTechnicianView(
  notifications: Notification[],
): Notification[] {
  return notifications.filter(isTechnicianRelevantNotification);
}

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

export function getNotificationHref(
  notification: Notification,
  access?: NotificationAccess,
): string | null {
  if (!notification.entityType || !notification.entityId) {
    return null;
  }

  switch (notification.entityType) {
    case "job":
      if (access?.canViewJobs === false) {
        return null;
      }
      return `/jobs/${notification.entityId}`;
    case "estimate":
      if (access?.canViewBilling === false) {
        return null;
      }
      return `/estimates/${notification.entityId}`;
    case "invoice":
      if (access?.canViewBilling === false) {
        return null;
      }
      return `/invoices/${notification.entityId}`;
    case "expense":
      if (access?.canViewCompanyExpenses === false) {
        return null;
      }
      return `/expenses?selected=${notification.entityId}`;
    case "customer":
      if (access?.canManageCustomers === false) {
        return null;
      }
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
      return `/tech/receipts?selected=${notification.entityId}`;
    case "time_entry":
      return "/technician";
    default:
      return null;
  }
}

export function formatNotificationTitleForAccess(
  notification: Notification,
  canViewBilling: boolean,
): string {
  if (canViewBilling || !isBillingSensitiveNotificationType(notification.type)) {
    return notification.title;
  }

  switch (notification.type) {
    case "estimate_approved":
      return "Estimate approved";
    case "invoice_paid":
      return "Invoice paid";
    case "draft_invoice_ready":
      return "Draft invoice ready";
    case "expense_submitted":
      return "Expense submitted";
    default:
      return notification.title;
  }
}

export function formatNotificationMessageForAccess(
  notification: Notification,
  canViewBilling: boolean,
): string {
  if (canViewBilling || !isBillingSensitiveNotificationType(notification.type)) {
    return notification.message;
  }

  switch (notification.type) {
    case "estimate_approved":
      return "An estimate was approved.";
    case "invoice_paid":
      return "An invoice was paid in full.";
    case "draft_invoice_ready":
      return "A draft invoice is ready for office review.";
    case "expense_submitted":
      return "A technician submitted an expense for review.";
    default:
      return notification.message;
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
    case "draft_invoice_ready":
      return "Draft invoice ready";
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
