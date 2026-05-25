"use server";

import { revalidatePath } from "next/cache";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { createCustomer } from "@/lib/database/queries/customers";
import type { Customer, CustomerFormData } from "@/shared/types/customer";

export type CreateCustomerActionResult = {
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

  const { customer, error } = await createCustomer(context.company.id, data);

  if (error || !customer) {
    return { error: error ?? "Failed to create customer." };
  }

  revalidatePath("/customers");
  return { customer };
}
