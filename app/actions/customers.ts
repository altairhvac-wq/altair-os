"use server";

import { revalidatePath } from "next/cache";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import {
  createCustomer,
  getCustomerById,
  updateCustomer,
} from "@/lib/database/queries/customers";
import { recordCustomerCreatedActivity } from "@/lib/database/services/customer-activity";
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

export async function createCustomerAction(
  data: CustomerFormData,
): Promise<CreateCustomerActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." };
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
    return { error: error ?? "Failed to create customer." };
  }

  await recordCustomerCreatedActivity({
    companyId: context.company.id,
    customerId: customer.id,
    actorId: context.user.id,
    customerName: customer.name,
    status: customer.status,
  });

  revalidatePath("/customers");
  return { customer };
}

export async function updateCustomerAction(
  customerId: string,
  data: CustomerFormData,
): Promise<UpdateCustomerActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." };
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
    return { error: error ?? "Failed to update customer." };
  }

  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);
  return { customer };
}
