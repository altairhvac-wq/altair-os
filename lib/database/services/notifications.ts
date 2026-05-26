import {
  COMPANY_ROLE_PERMISSIONS,
  type CompanyPermission,
} from "@/lib/database/types/roles";
import type { CompanyRole, Json } from "@/lib/database/types/enums";
import type { NotificationEntityType, NotificationType } from "@/lib/database/types/enums";
import {
  getUnreadNotificationCount,
  getUserNotifications,
  insertNotification,
  insertNotifications,
  listActiveMemberUserIdsByRoles,
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
  fireAndForget(createNotification(input));
}

export function dispatchNotificationsForPermission(
  input: Omit<CreateNotificationsForRoleInput, "roles"> & {
    permission: CompanyPermission;
  },
): void {
  fireAndForget(createNotificationsForPermission(input));
}

export {
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
};

export type { Notification };
