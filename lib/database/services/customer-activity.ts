import { recordCustomerActivity } from "@/lib/database/queries/customer-activities";
import type { CustomerStatus } from "@/shared/types/customer";

export async function recordCustomerCreatedActivity(input: {
  companyId: string;
  customerId: string;
  actorId: string;
  customerName: string;
  status: CustomerStatus;
}): Promise<void> {
  const { error } = await recordCustomerActivity({
    company_id: input.companyId,
    customer_id: input.customerId,
    actor_id: input.actorId,
    event_type: "customer_created",
    metadata: {
      customer_name: input.customerName,
      status: input.status,
    },
  });

  if (error) {
    console.error("[recordCustomerCreatedActivity] failed:", {
      customerId: input.customerId,
      error,
    });
  }
}

export async function recordCustomerArchivedActivity(input: {
  companyId: string;
  customerId: string;
  actorId: string;
  customerName: string;
}): Promise<void> {
  const { error } = await recordCustomerActivity({
    company_id: input.companyId,
    customer_id: input.customerId,
    actor_id: input.actorId,
    event_type: "customer_archived",
    metadata: {
      customer_name: input.customerName,
    },
  });

  if (error) {
    console.error("[recordCustomerArchivedActivity] failed:", {
      customerId: input.customerId,
      error,
    });
  }
}

export async function recordCustomerRestoredActivity(input: {
  companyId: string;
  customerId: string;
  actorId: string;
  customerName: string;
}): Promise<void> {
  const { error } = await recordCustomerActivity({
    company_id: input.companyId,
    customer_id: input.customerId,
    actor_id: input.actorId,
    event_type: "customer_restored",
    metadata: {
      customer_name: input.customerName,
    },
  });

  if (error) {
    console.error("[recordCustomerRestoredActivity] failed:", {
      customerId: input.customerId,
      error,
    });
  }
}

export async function recordCustomerDeletedActivity(input: {
  companyId: string;
  customerId: string;
  actorId: string;
  customerName: string;
}): Promise<void> {
  const { error } = await recordCustomerActivity({
    company_id: input.companyId,
    customer_id: input.customerId,
    actor_id: input.actorId,
    event_type: "customer_deleted",
    metadata: {
      customer_name: input.customerName,
    },
  });

  if (error) {
    console.error("[recordCustomerDeletedActivity] failed:", {
      customerId: input.customerId,
      error,
    });
  }
}

export async function recordCustomerMovedToTrashActivity(input: {
  companyId: string;
  customerId: string;
  actorId: string;
  customerName: string;
  deleteAfter?: string;
}): Promise<void> {
  const { error } = await recordCustomerActivity({
    company_id: input.companyId,
    customer_id: input.customerId,
    actor_id: input.actorId,
    event_type: "customer_moved_to_trash",
    metadata: {
      customer_name: input.customerName,
      delete_after: input.deleteAfter,
    },
  });

  if (error) {
    console.error("[recordCustomerMovedToTrashActivity] failed:", {
      customerId: input.customerId,
      error,
    });
  }
}

export async function recordCustomerRestoredFromTrashActivity(input: {
  companyId: string;
  customerId: string;
  actorId: string;
  customerName: string;
}): Promise<void> {
  const { error } = await recordCustomerActivity({
    company_id: input.companyId,
    customer_id: input.customerId,
    actor_id: input.actorId,
    event_type: "customer_restored_from_trash",
    metadata: {
      customer_name: input.customerName,
    },
  });

  if (error) {
    console.error("[recordCustomerRestoredFromTrashActivity] failed:", {
      customerId: input.customerId,
      error,
    });
  }
}

export async function recordCustomerPermanentlyDeletedActivity(input: {
  companyId: string;
  customerId: string;
  actorId: string;
  customerName: string;
}): Promise<void> {
  const { error } = await recordCustomerActivity({
    company_id: input.companyId,
    customer_id: input.customerId,
    actor_id: input.actorId,
    event_type: "customer_permanently_deleted",
    metadata: {
      customer_name: input.customerName,
    },
  });

  if (error) {
    console.error("[recordCustomerPermanentlyDeletedActivity] failed:", {
      customerId: input.customerId,
      error,
    });
  }
}
