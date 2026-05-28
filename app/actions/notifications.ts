"use server";

import { revalidatePath } from "next/cache";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import {
  getUnreadNotificationCount,
  getUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/database/services/notifications";
import type { NotificationType } from "@/lib/database/types/enums";
import type { Notification } from "@/shared/types/notification";

export type NotificationActionResult = {
  error?: string;
  notifications?: Notification[];
  unreadCount?: number;
};

function revalidateNotificationPaths() {
  revalidatePath("/", "layout");
  revalidatePath("/jobs", "layout");
  revalidatePath("/technician", "layout");
  revalidatePath("/tech", "layout");
  revalidatePath("/tech/notifications");
}

export async function markNotificationReadAction(
  notificationId: string,
): Promise<NotificationActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." };
  }

  if (!notificationId.trim()) {
    return { error: "Notification not found." };
  }

  const { error } = await markNotificationRead(
    context.company.id,
    context.user.id,
    notificationId,
  );

  if (error) {
    return { error };
  }

  revalidateNotificationPaths();

  const [notifications, unreadCount] = await Promise.all([
    getUserNotifications(context.company.id, context.user.id, { limit: 20 }),
    getUnreadNotificationCount(context.company.id, context.user.id),
  ]);

  return { notifications, unreadCount };
}

export async function markAllNotificationsReadAction(options?: {
  types?: readonly NotificationType[];
}): Promise<NotificationActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." };
  }

  const { error } = await markAllNotificationsRead(
    context.company.id,
    context.user.id,
    options,
  );

  if (error) {
    return { error };
  }

  revalidateNotificationPaths();

  const [notifications, unreadCount] = await Promise.all([
    getUserNotifications(context.company.id, context.user.id, {
      limit: 20,
      types: options?.types,
    }),
    getUnreadNotificationCount(context.company.id, context.user.id, {
      types: options?.types,
    }),
  ]);

  return { notifications, unreadCount };
}

export async function getNotificationsAction(
  limit = 20,
): Promise<NotificationActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." };
  }

  const [notifications, unreadCount] = await Promise.all([
    getUserNotifications(context.company.id, context.user.id, { limit }),
    getUnreadNotificationCount(context.company.id, context.user.id),
  ]);

  return { notifications, unreadCount };
}
