"use server";

import { revalidatePath } from "next/cache";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import {
  archiveCustomer,
  createCustomer,
  deleteCustomer,
  getCustomerById,
  getCustomerDeleteDependencies,
  restoreCustomer,
  updateCustomer,
} from "@/lib/database/queries/customers";
import {
  recordCustomerArchivedActivity,
  recordCustomerCreatedActivity,
  recordCustomerDeletedActivity,
  recordCustomerRestoredActivity,
} from "@/lib/database/services/customer-activity";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import {
  canDeleteCustomer,
  getArchiveCustomerBlockReason,
  getDeleteCustomerBlockReason,
  getRestoreCustomerBlockReason,
} from "@/shared/lib/customer-lifecycle";
import {
  normalizeCustomerFormData,
  validateCustomerFormData,
  type Customer,
  type CustomerFormData,
} from "@/shared/types/customer";

export type CreateCustomerActionResult = {
  error?: string;
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

  const normalized = normalizeCustomerFormData(data);
  const validationError = validateCustomerFormData(normalized);
  if (validationError) {
    return { error: validationError };
  }

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
  return { customer };
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

export async function deleteCustomerAction(
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
  const blockReason = getDeleteCustomerBlockReason(dependencies);
  if (blockReason || !canDeleteCustomer(dependencies)) {
    return { error: blockReason ?? "This customer cannot be deleted." };
  }

  await recordCustomerDeletedActivity({
    companyId: context.company.id,
    customerId: existing.id,
    actorId: context.user.id,
    customerName: existing.name,
  });

  const { success, error } = await deleteCustomer(
    context.company.id,
    customerId,
  );

  if (!success || error) {
    return { error: error ?? "We couldn't delete this customer. Try again." };
  }

  revalidateCustomerPaths();
  return { deleted: true };
}
