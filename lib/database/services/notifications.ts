import {
  COMPANY_ROLE_PERMISSIONS,
  type CompanyPermission,
} from "@/lib/database/types/roles";
import type { CompanyRole, Json } from "@/lib/database/types/enums";
import type { NotificationEntityType, NotificationType } from "@/lib/database/types/enums";
import { listActiveMemberUserIdsByRoles } from "@/lib/database/queries/notification-role-targeting";
import {
  getUnreadNotificationCount,
  getUserNotifications,
  insertNotification,
  insertNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/database/queries/notifications";
import type { Notification } from "@/shared/types/notification";

export type CreateNotificationInput = {
  companyId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: NotificationEntityType;
  entityId?: string;
  metadata?: Json;
};

export type CreateNotificationsForRoleInput = {
  companyId: string;
  roles: readonly CompanyRole[];
  type: NotificationType;
  title: string;
  message: string;
  entityType?: NotificationEntityType;
  entityId?: string;
  metadata?: Record<string, unknown>;
  excludeUserIds?: string[];
};

function fireAndForget(promise: Promise<void>): void {
  void promise.catch((error) => {
    console.error("[notifications] side-effect failed:", error);
  });
}

function rolesForPermission(permission: CompanyPermission): readonly CompanyRole[] {
  return COMPANY_ROLE_PERMISSIONS[permission];
}

export async function createNotification(
  input: CreateNotificationInput,
): Promise<void> {
  const { error } = await insertNotification({
    company_id: input.companyId,
    user_id: input.userId,
    type: input.type,
    title: input.title,
    message: input.message,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    metadata: (input.metadata ?? {}) as Json,
  });

  if (error) {
    console.error("[createNotification] failed:", {
      userId: input.userId,
      type: input.type,
      error,
    });
  }
}

/** Fan-out to active members by role; resolves recipients via notification-role-targeting. */
export async function createNotificationsForRole(
  input: CreateNotificationsForRoleInput,
): Promise<void> {
  const userIds = await listActiveMemberUserIdsByRoles(input.companyId, input.roles, {
    excludeUserIds: input.excludeUserIds,
  });

  if (userIds.length === 0) {
    return;
  }

  const rows = userIds.map((userId) => ({
    company_id: input.companyId,
    user_id: userId,
    type: input.type,
    title: input.title,
    message: input.message,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    metadata: (input.metadata ?? {}) as Json,
  }));

  const { error } = await insertNotifications(rows);

  if (error) {
    console.error("[createNotificationsForRole] failed:", {
      roles: input.roles,
      type: input.type,
      error,
    });
  }
}

export async function createNotificationsForPermission(
  input: Omit<CreateNotificationsForRoleInput, "roles"> & {
    permission: CompanyPermission;
  },
): Promise<void> {
  await createNotificationsForRole({
    ...input,
    roles: rolesForPermission(input.permission),
  });
}

export function dispatchNotification(input: CreateNotificationInput): void {
  if (!input.companyId?.trim() || !input.userId?.trim()) {
    console.warn("[dispatchNotification] skipped: missing company or user", {
      type: input.type,
      companyId: input.companyId,
      userId: input.userId,
    });
    return;
  }

  fireAndForget(createNotification(input));
}

export function dispatchNotificationsForPermission(
  input: Omit<CreateNotificationsForRoleInput, "roles"> & {
    permission: CompanyPermission;
  },
): void {
  if (!input.companyId?.trim()) {
    console.warn("[dispatchNotificationsForPermission] skipped: missing company", {
      type: input.type,
      permission: input.permission,
    });
    return;
  }

  fireAndForget(createNotificationsForPermission(input));
}

export {
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
};

export type { Notification };
