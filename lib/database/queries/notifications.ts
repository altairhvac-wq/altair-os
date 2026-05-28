import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type {
  NotificationInsert,
  NotificationRow,
} from "@/lib/database/types/core-tables";
import type { NotificationType } from "@/lib/database/types/enums";
import type { Notification } from "@/shared/types/notification";

function mapNotificationRow(row: NotificationRow): Notification {
  return {
    id: row.id,
    companyId: row.company_id,
    userId: row.user_id ?? undefined,
    roleTarget: row.role_target ?? undefined,
    type: row.type,
    title: row.title,
    message: row.message,
    entityType: row.entity_type ?? undefined,
    entityId: row.entity_id ?? undefined,
    readAt: row.read_at ?? undefined,
    createdAt: row.created_at,
    metadata:
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {},
  };
}

export async function insertNotification(
  input: NotificationInsert,
): Promise<{ data: Notification | null; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notifications")
    .insert(input)
    .select("*")
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? "Failed to create notification." };
  }

  return { data: mapNotificationRow(data as NotificationRow), error: null };
}

export async function insertNotifications(
  inputs: NotificationInsert[],
): Promise<{ error: string | null }> {
  if (inputs.length === 0) {
    return { error: null };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("notifications").insert(inputs);

  if (error) {
    return { error: error.message ?? "Failed to create notifications." };
  }

  return { error: null };
}

export const getUserNotifications = cache(async function getUserNotifications(
  companyId: string,
  userId: string,
  options?: { limit?: number; types?: readonly NotificationType[] },
): Promise<Notification[]> {
  const supabase = await createClient();
  const limit = options?.limit ?? 50;

  let query = supabase
    .from("notifications")
    .select("*")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (options?.types && options.types.length > 0) {
    query = query.in("type", [...options.types]);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[getUserNotifications] query failed:", {
      companyId,
      userId,
      error,
    });
    return [];
  }

  return ((data ?? []) as NotificationRow[]).map(mapNotificationRow);
});

export const getUnreadNotificationCount = cache(
  async function getUnreadNotificationCount(
    companyId: string,
    userId: string,
    options?: { types?: readonly NotificationType[] },
  ): Promise<number> {
  const supabase = await createClient();

  let query = supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .is("read_at", null);

  if (options?.types && options.types.length > 0) {
    query = query.in("type", [...options.types]);
  }

  const { count, error } = await query;

  if (error) {
    console.error("[getUnreadNotificationCount] query failed:", {
      companyId,
      userId,
      error,
    });
    return 0;
  }

  return count ?? 0;
  },
);

export async function markNotificationRead(
  companyId: string,
  userId: string,
  notificationId: string,
): Promise<{ error: string | null }> {
  if (!notificationId.trim()) {
    return { error: "Notification not found." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .eq("id", notificationId);

  if (error) {
    return { error: error.message ?? "Failed to mark notification as read." };
  }

  return { error: null };
}

export async function markAllNotificationsRead(
  companyId: string,
  userId: string,
  options?: { types?: readonly NotificationType[] },
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  let query = supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .is("read_at", null);

  if (options?.types && options.types.length > 0) {
    query = query.in("type", [...options.types]);
  }

  const { error } = await query;

  if (error) {
    return { error: error.message ?? "Failed to mark all notifications as read." };
  }

  return { error: null };
}

export { mapNotificationRow };
