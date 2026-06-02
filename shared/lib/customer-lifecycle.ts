import type { Customer } from "@/shared/types/customer";

export type CustomerDeleteDependencies = {
  jobCount: number;
  estimateCount: number;
  invoiceCount: number;
  invoicePaymentCount: number;
};

export type CustomerLifecycleActionId = "archive" | "restore" | "delete";

export function isCustomerArchived(
  customer: Pick<Customer, "archivedAt">,
): boolean {
  return Boolean(customer.archivedAt);
}

export function getCustomerLifecycleState(
  customer: Pick<Customer, "archivedAt">,
): "active" | "archived" {
  return isCustomerArchived(customer) ? "archived" : "active";
}

export function getArchiveCustomerBlockReason(
  customer: Pick<Customer, "archivedAt">,
): string | null {
  if (isCustomerArchived(customer)) {
    return "This customer is already archived.";
  }

  return null;
}

export function canArchiveCustomer(
  customer: Pick<Customer, "archivedAt">,
): boolean {
  return getArchiveCustomerBlockReason(customer) === null;
}

export function getRestoreCustomerBlockReason(
  customer: Pick<Customer, "archivedAt">,
): string | null {
  if (!isCustomerArchived(customer)) {
    return "This customer is not archived.";
  }

  return null;
}

export function canRestoreCustomer(
  customer: Pick<Customer, "archivedAt">,
): boolean {
  return getRestoreCustomerBlockReason(customer) === null;
}

export function getDeleteCustomerBlockReason(
  dependencies: CustomerDeleteDependencies,
): string | null {
  const blockers: string[] = [];

  if (dependencies.jobCount > 0) {
    blockers.push(
      `${dependencies.jobCount} job${dependencies.jobCount === 1 ? "" : "s"}`,
    );
  }

  if (dependencies.estimateCount > 0) {
    blockers.push(
      `${dependencies.estimateCount} estimate${dependencies.estimateCount === 1 ? "" : "s"}`,
    );
  }

  if (dependencies.invoiceCount > 0) {
    blockers.push(
      `${dependencies.invoiceCount} invoice${dependencies.invoiceCount === 1 ? "" : "s"}`,
    );
  }

  if (dependencies.invoicePaymentCount > 0) {
    blockers.push(
      `${dependencies.invoicePaymentCount} invoice payment${dependencies.invoicePaymentCount === 1 ? "" : "s"}`,
    );
  }

  if (blockers.length === 0) {
    return null;
  }

  return `This customer has ${blockers.join(", ")}. Delete is only allowed when there are no jobs, estimates, invoices, or invoice payments.`;
}

export function canDeleteCustomer(
  dependencies: CustomerDeleteDependencies,
): boolean {
  return getDeleteCustomerBlockReason(dependencies) === null;
}

export function getBulkArchiveCustomerBlockReason(
  customer: Pick<Customer, "archivedAt">,
): string | null {
  return getArchiveCustomerBlockReason(customer);
}

export function getBulkRestoreCustomerBlockReason(
  customer: Pick<Customer, "archivedAt">,
): string | null {
  return getRestoreCustomerBlockReason(customer);
}

export function getBulkDeleteCustomerBlockReason(
  dependencies: CustomerDeleteDependencies,
): string | null {
  return getDeleteCustomerBlockReason(dependencies);
}

export function formatBulkCustomersResultMessage(input: {
  successCount: number;
  failureCount: number;
  actionLabel: string;
}): string {
  const { successCount, failureCount, actionLabel } = input;

  if (successCount === 0 && failureCount === 0) {
    return "No customers were updated.";
  }

  if (failureCount === 0) {
    return `${actionLabel} applied to ${successCount} customer${
      successCount === 1 ? "" : "s"
    }.`;
  }

  if (successCount === 0) {
    return `${failureCount} customer${failureCount === 1 ? "" : "s"} could not be updated.`;
  }

  return `${actionLabel} applied to ${successCount} customer${
    successCount === 1 ? "" : "s"
  }. ${failureCount} could not be updated.`;
}

export function isBulkCustomerActionDestructive(
  actionId: CustomerLifecycleActionId,
): boolean {
  return actionId === "delete";
}

export function resolveBulkCustomerLifecycleActions(
  lifecycleFilter: "active" | "archived",
): CustomerLifecycleActionId[] {
  if (lifecycleFilter === "archived") {
    return ["restore", "delete"];
  }

  return ["archive", "delete"];
}
