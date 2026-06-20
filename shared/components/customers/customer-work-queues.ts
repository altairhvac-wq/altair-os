import { getCustomerLifecycleState } from "@/shared/lib/customer-lifecycle";
import {
  mapCustomerToFormData,
  validateCustomerFormData,
  type Customer,
} from "@/shared/types/customer";

export type CustomerWorkQueue = "active" | "needs-info" | "inactive" | "past";

export const CUSTOMER_WORK_QUEUE_ORDER: readonly CustomerWorkQueue[] = [
  "active",
  "needs-info",
  "inactive",
  "past",
];

export const CUSTOMER_WORK_QUEUE_LABELS: Record<CustomerWorkQueue, string> = {
  active: "Active",
  "needs-info": "Needs info",
  inactive: "Inactive",
  past: "Past",
};

function isCustomerRecordActive(customer: Customer): boolean {
  return getCustomerLifecycleState(customer) === "active";
}

/** Archived and recently deleted customer records. */
export function isCustomerPastQueue(customer: Customer): boolean {
  return !isCustomerRecordActive(customer);
}

/** Active lifecycle customers marked inactive. */
export function isCustomerInactiveQueue(customer: Customer): boolean {
  if (isCustomerPastQueue(customer)) {
    return false;
  }

  return customer.status === "inactive";
}

export function isCustomerMissingImportantInfo(customer: Customer): boolean {
  return (
    validateCustomerFormData(mapCustomerToFormData(customer), {
      requireContact: true,
      requireAddress: true,
    }) !== null
  );
}

/** Active customers missing contact or service location details. */
export function isCustomerNeedsInfoQueue(customer: Customer): boolean {
  if (isCustomerPastQueue(customer) || isCustomerInactiveQueue(customer)) {
    return false;
  }

  return isCustomerMissingImportantInfo(customer);
}

/** Active customers with complete contact and service location details. */
export function isCustomerActiveQueue(customer: Customer): boolean {
  if (
    isCustomerPastQueue(customer) ||
    isCustomerInactiveQueue(customer) ||
    isCustomerNeedsInfoQueue(customer)
  ) {
    return false;
  }

  return customer.status === "active";
}

export function filterCustomersForWorkQueue(
  customers: Customer[],
  queue: CustomerWorkQueue,
): Customer[] {
  const predicate = {
    active: isCustomerActiveQueue,
    "needs-info": isCustomerNeedsInfoQueue,
    inactive: isCustomerInactiveQueue,
    past: isCustomerPastQueue,
  }[queue];

  return customers.filter(predicate);
}

export function countCustomersForWorkQueue(
  customers: Customer[],
  queue: CustomerWorkQueue,
): number {
  return filterCustomersForWorkQueue(customers, queue).length;
}

export function resolveDefaultCustomerWorkQueue(): CustomerWorkQueue {
  return "active";
}

export function resolveCustomerBulkLifecycleFilter(
  workQueue: CustomerWorkQueue,
  pastLifecycleFilter: "archived" | "deleted",
): "active" | "archived" | "deleted" {
  if (workQueue === "past") {
    return pastLifecycleFilter;
  }

  return "active";
}
