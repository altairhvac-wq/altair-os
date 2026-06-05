"use server";

import { revalidatePath } from "next/cache";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import {
  archiveCustomer,
  createCustomer,
  getCustomerById,
  getCustomerDeleteDependencies,
  moveCustomerToTrash,
  permanentlyDeleteCustomer,
  restoreCustomer,
  restoreCustomerFromTrash,
  updateCustomer,
} from "@/lib/database/queries/customers";
import {
  recordCustomerArchivedActivity,
  recordCustomerCreatedActivity,
  recordCustomerMovedToTrashActivity,
  recordCustomerPermanentlyDeletedActivity,
  recordCustomerRestoredActivity,
  recordCustomerRestoredFromTrashActivity,
} from "@/lib/database/services/customer-activity";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import {
  canPermanentlyDeleteCustomer,
  getArchiveCustomerBlockReason,
  getMoveCustomerToTrashBlockReason,
  getPermanentDeleteCustomerBlockReason,
  getRestoreCustomerBlockReason,
  getRestoreCustomerFromTrashBlockReason,
} from "@/shared/lib/customer-lifecycle";
import {
  normalizeCustomerFormData,
  validateCustomerFormData,
  type Customer,
  type CustomerFormData,
  type LegacyCustomerStatus,
} from "@/shared/types/customer";

export type CreateCustomerActionResult = {
  error?: string;
  warning?: string;
  customer?: Customer;
};

export type UpdateCustomerActionResult = {
  error?: string;
  customer?: Customer;
};

export type CustomerLifecycleActionResult = {
  error?: string;
  customer?: Customer;
  deleted?: boolean;
};

function revalidateCustomerPaths(customerId?: string) {
  revalidatePath("/customers");
  revalidatePath("/jobs");
  revalidatePath("/estimates");
  revalidatePath("/invoices");

  if (customerId) {
    revalidatePath(`/customers/${customerId}`);
  }
}

export async function createCustomerAction(
  data: CustomerFormData,
): Promise<CreateCustomerActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE };
  }

  if (!context.permissions.manageCustomers) {
    return { error: "You do not have permission to create customers." };
  }

  const requestedStatus = data.status as LegacyCustomerStatus;
  const normalized = normalizeCustomerFormData(data);
  const validationError = validateCustomerFormData(normalized);
  if (validationError) {
    return { error: validationError };
  }

  const warning =
    requestedStatus === "lead"
      ? "Use Leads to track prospects before they become customers."
      : undefined;

  const { customer, error } = await createCustomer(
    context.company.id,
    normalized,
  );

  if (error || !customer) {
    return { error: error ?? "We couldn't save this customer. Check the details and try again." };
  }

  await recordCustomerCreatedActivity({
    companyId: context.company.id,
    customerId: customer.id,
    actorId: context.user.id,
    customerName: customer.name,
    status: customer.status,
  });

  revalidateCustomerPaths(customer.id);
  return { customer, warning };
}

export async function updateCustomerAction(
  customerId: string,
  data: CustomerFormData,
): Promise<UpdateCustomerActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE };
  }

  if (!context.permissions.manageCustomers) {
    return { error: "You do not have permission to edit customers." };
  }

  const normalized = normalizeCustomerFormData(data);
  const validationError = validateCustomerFormData(normalized, {
    requireContact: false,
  });
  if (validationError) {
    return { error: validationError };
  }

  const existing = await getCustomerById(context.company.id, customerId);
  if (!existing) {
    return { error: "Customer not found." };
  }

  const { customer, error } = await updateCustomer(
    context.company.id,
    customerId,
    normalized,
  );

  if (error || !customer) {
    return { error: error ?? "We couldn't save your changes. Try again." };
  }

  revalidateCustomerPaths(customerId);
  return { customer };
}

export async function archiveCustomerAction(
  customerId: string,
): Promise<CustomerLifecycleActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE };
  }

  if (!context.permissions.manageCustomers) {
    return { error: "You do not have permission to archive customers." };
  }

  const existing = await getCustomerById(context.company.id, customerId);
  if (!existing) {
    return { error: "Customer not found." };
  }

  const blockReason = getArchiveCustomerBlockReason(existing);
  if (blockReason) {
    return { error: blockReason };
  }

  const { customer, error } = await archiveCustomer(
    context.company.id,
    customerId,
  );

  if (error || !customer) {
    return { error: error ?? "We couldn't archive this customer. Try again." };
  }

  await recordCustomerArchivedActivity({
    companyId: context.company.id,
    customerId: customer.id,
    actorId: context.user.id,
    customerName: customer.name,
  });

  revalidateCustomerPaths(customerId);
  return { customer };
}

export async function restoreCustomerAction(
  customerId: string,
): Promise<CustomerLifecycleActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE };
  }

  if (!context.permissions.manageCustomers) {
    return { error: "You do not have permission to restore customers." };
  }

  const existing = await getCustomerById(context.company.id, customerId);
  if (!existing) {
    return { error: "Customer not found." };
  }

  const blockReason = getRestoreCustomerBlockReason(existing);
  if (blockReason) {
    return { error: blockReason };
  }

  const { customer, error } = await restoreCustomer(
    context.company.id,
    customerId,
  );

  if (error || !customer) {
    return { error: error ?? "We couldn't restore this customer. Try again." };
  }

  await recordCustomerRestoredActivity({
    companyId: context.company.id,
    customerId: customer.id,
    actorId: context.user.id,
    customerName: customer.name,
  });

  revalidateCustomerPaths(customerId);
  return { customer };
}

export async function moveCustomerToTrashAction(
  customerId: string,
): Promise<CustomerLifecycleActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE };
  }

  if (!context.permissions.manageCustomers) {
    return { error: "You do not have permission to delete customers." };
  }

  const existing = await getCustomerById(context.company.id, customerId);
  if (!existing) {
    return { error: "Customer not found." };
  }

  const blockReason = getMoveCustomerToTrashBlockReason(existing);
  if (blockReason) {
    return { error: blockReason };
  }

  const { customer, error } = await moveCustomerToTrash(
    context.company.id,
    customerId,
  );

  if (error || !customer) {
    return {
      error: error ?? "We couldn't move this customer to Recently Deleted. Try again.",
    };
  }

  await recordCustomerMovedToTrashActivity({
    companyId: context.company.id,
    customerId: customer.id,
    actorId: context.user.id,
    customerName: customer.name,
    deleteAfter: customer.deleteAfter,
  });

  revalidateCustomerPaths(customerId);
  return { customer };
}

export async function restoreCustomerFromTrashAction(
  customerId: string,
): Promise<CustomerLifecycleActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE };
  }

  if (!context.permissions.manageCustomers) {
    return { error: "You do not have permission to restore customers." };
  }

  const existing = await getCustomerById(context.company.id, customerId);
  if (!existing) {
    return { error: "Customer not found." };
  }

  const blockReason = getRestoreCustomerFromTrashBlockReason(existing);
  if (blockReason) {
    return { error: blockReason };
  }

  const { customer, error } = await restoreCustomerFromTrash(
    context.company.id,
    customerId,
  );

  if (error || !customer) {
    return { error: error ?? "We couldn't restore this customer. Try again." };
  }

  await recordCustomerRestoredFromTrashActivity({
    companyId: context.company.id,
    customerId: customer.id,
    actorId: context.user.id,
    customerName: customer.name,
  });

  revalidateCustomerPaths(customerId);
  return { customer };
}

export async function permanentlyDeleteCustomerAction(
  customerId: string,
): Promise<CustomerLifecycleActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE };
  }

  if (!context.permissions.manageCustomers) {
    return { error: "You do not have permission to delete customers." };
  }

  const existing = await getCustomerById(context.company.id, customerId);
  if (!existing) {
    return { error: "Customer not found." };
  }

  const dependencies = await getCustomerDeleteDependencies(
    context.company.id,
    customerId,
  );
  const blockReason = getPermanentDeleteCustomerBlockReason(
    existing,
    dependencies,
  );
  if (blockReason || !canPermanentlyDeleteCustomer(existing, dependencies)) {
    return { error: blockReason ?? "This customer cannot be permanently deleted." };
  }

  await recordCustomerPermanentlyDeletedActivity({
    companyId: context.company.id,
    customerId: existing.id,
    actorId: context.user.id,
    customerName: existing.name,
  });

  const { success, error } = await permanentlyDeleteCustomer(
    context.company.id,
    customerId,
  );

  if (!success || error) {
    return {
      error: error ?? "We couldn't permanently delete this customer. Try again.",
    };
  }

  revalidateCustomerPaths();
  return { deleted: true };
}
