import { getCustomerLifecycleState } from "@/shared/lib/customer-lifecycle";
import {
  mapCustomerToFormData,
  validateCustomerFormData,
  type Customer,
} from "@/shared/types/customer";

/**
 * `all` is every customer still in the book (not archived, not deleted),
 * whatever state its contact details are in. It is the default view.
 *
 * The default used to be `active`, which means "complete profile": email AND
 * phone AND full service address. A company that imported a list without
 * emails, or whose phone column was not matched, landed on "Add your first
 * customer" with every imported row hidden under a filter the empty page did
 * not even show (retention audit 2026-11-12). The `active` key stays as it is
 * for deep links; its label is "Complete" so it is not read as the status.
 */
export type CustomerWorkQueue =
  | "all"
  | "active"
  | "needs-info"
  | "inactive"
  | "past";

export const CUSTOMER_WORK_QUEUE_ORDER: readonly CustomerWorkQueue[] = [
  "all",
  "active",
  "needs-info",
  "inactive",
  "past",
];

export const CUSTOMER_WORK_QUEUE_LABELS: Record<CustomerWorkQueue, string> = {
  all: "All",
  active: "Complete",
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

/** Every customer still in the book: not archived, not deleted. */
export function isCustomerBookQueue(customer: Customer): boolean {
  return !isCustomerPastQueue(customer);
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
    all: isCustomerBookQueue,
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
  return "all";
}

const CUSTOMER_WORK_QUEUE_SET = new Set<CustomerWorkQueue>(
  CUSTOMER_WORK_QUEUE_ORDER,
);

export function isCustomerWorkQueue(value: string): value is CustomerWorkQueue {
  return CUSTOMER_WORK_QUEUE_SET.has(value as CustomerWorkQueue);
}

export function resolveInitialCustomerWorkQueue(
  initialQueue?: string | null,
): CustomerWorkQueue {
  if (
    initialQueue &&
    isCustomerWorkQueue(initialQueue) &&
    initialQueue !== "past"
  ) {
    return initialQueue;
  }

  return resolveDefaultCustomerWorkQueue();
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
