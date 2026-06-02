"use server";

import { revalidatePath } from "next/cache";
import {
  archiveCustomerAction,
  moveCustomerToTrashAction,
  permanentlyDeleteCustomerAction,
  restoreCustomerAction,
  restoreCustomerFromTrashAction,
} from "@/app/actions/customers";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import {
  getCustomerById,
  getCustomerDeleteDependencies,
} from "@/lib/database/queries/customers";
import { formatActionError } from "@/shared/lib/operational-errors";
import {
  getBulkArchiveCustomerBlockReason,
  getBulkMoveCustomerToTrashBlockReason,
  getBulkPermanentDeleteCustomerBlockReason,
  getBulkRestoreCustomerBlockReason,
  getBulkRestoreCustomerFromTrashBlockReason,
} from "@/shared/lib/customer-lifecycle";

export type BulkCustomerActionResultItem = {
  customerId: string;
  customerName: string;
  success: boolean;
  error?: string;
};

export type BulkCustomersActionResult = {
  error?: string;
  results: BulkCustomerActionResultItem[];
  successCount: number;
  failureCount: number;
};

function normalizeCustomerIds(customerIds: string[]): string[] {
  return [...new Set(customerIds.map((id) => id.trim()).filter(Boolean))];
}

async function runBulkCustomerLifecycleAction(
  customerIds: string[],
  action: (customerId: string) => Promise<{ error?: string }>,
  getBlockReason?: (
    customer: Awaited<ReturnType<typeof getCustomerById>>,
    dependencies?: Awaited<ReturnType<typeof getCustomerDeleteDependencies>>,
  ) => string | null,
  needsDeleteDependencies = false,
): Promise<BulkCustomersActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return {
      error: NO_ACTIVE_COMPANY_MESSAGE,
      results: [],
      successCount: 0,
      failureCount: 0,
    };
  }

  if (!context.permissions.manageCustomers) {
    return {
      error: "You do not have permission to manage customers.",
      results: [],
      successCount: 0,
      failureCount: 0,
    };
  }

  const uniqueIds = normalizeCustomerIds(customerIds);

  if (uniqueIds.length === 0) {
    return {
      error: "Select at least one customer.",
      results: [],
      successCount: 0,
      failureCount: 0,
    };
  }

  const results: BulkCustomerActionResultItem[] = [];
  let successCount = 0;
  let failureCount = 0;

  for (const customerId of uniqueIds) {
    const existingCustomer = await getCustomerById(
      context.company.id,
      customerId,
    );

    if (!existingCustomer) {
      results.push({
        customerId,
        customerName: customerId,
        success: false,
        error: "Customer not found.",
      });
      failureCount += 1;
      continue;
    }

    const dependencies = needsDeleteDependencies
      ? await getCustomerDeleteDependencies(context.company.id, customerId)
      : undefined;

    const blockReason = getBlockReason?.(existingCustomer, dependencies);
    if (blockReason) {
      results.push({
        customerId,
        customerName: existingCustomer.name,
        success: false,
        error: blockReason,
      });
      failureCount += 1;
      continue;
    }

    const actionResult = await action(customerId);

    if (actionResult.error) {
      results.push({
        customerId,
        customerName: existingCustomer.name,
        success: false,
        error: formatActionError(
          actionResult.error,
          "This customer could not be updated.",
        ),
      });
      failureCount += 1;
      continue;
    }

    results.push({
      customerId,
      customerName: existingCustomer.name,
      success: true,
    });
    successCount += 1;
  }

  if (successCount > 0) {
    revalidatePath("/customers");
    revalidatePath("/jobs");
    revalidatePath("/estimates");
    revalidatePath("/invoices");
  }

  return {
    results,
    successCount,
    failureCount,
  };
}

export async function bulkArchiveCustomersAction(
  customerIds: string[],
): Promise<BulkCustomersActionResult> {
  return runBulkCustomerLifecycleAction(
    customerIds,
    archiveCustomerAction,
    (customer) =>
      customer ? getBulkArchiveCustomerBlockReason(customer) : "Customer not found.",
  );
}

export async function bulkRestoreCustomersAction(
  customerIds: string[],
): Promise<BulkCustomersActionResult> {
  return runBulkCustomerLifecycleAction(
    customerIds,
    restoreCustomerAction,
    (customer) =>
      customer ? getBulkRestoreCustomerBlockReason(customer) : "Customer not found.",
  );
}

export async function bulkMoveCustomersToTrashAction(
  customerIds: string[],
): Promise<BulkCustomersActionResult> {
  return runBulkCustomerLifecycleAction(
    customerIds,
    moveCustomerToTrashAction,
    (customer) =>
      customer
        ? getBulkMoveCustomerToTrashBlockReason(customer)
        : "Customer not found.",
  );
}

export async function bulkRestoreCustomersFromTrashAction(
  customerIds: string[],
): Promise<BulkCustomersActionResult> {
  return runBulkCustomerLifecycleAction(
    customerIds,
    restoreCustomerFromTrashAction,
    (customer) =>
      customer
        ? getBulkRestoreCustomerFromTrashBlockReason(customer)
        : "Customer not found.",
  );
}

export async function bulkPermanentlyDeleteCustomersAction(
  customerIds: string[],
): Promise<BulkCustomersActionResult> {
  return runBulkCustomerLifecycleAction(
    customerIds,
    permanentlyDeleteCustomerAction,
    (customer, dependencies) =>
      customer && dependencies
        ? getBulkPermanentDeleteCustomerBlockReason(customer, dependencies)
        : "Unable to verify delete eligibility.",
    true,
  );
}
